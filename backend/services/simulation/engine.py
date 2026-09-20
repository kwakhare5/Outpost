"""GROCER v2 Simulation Engine.

Handles deterministic simulation: time control, seeding,
order generation, inventory/batch lifecycle.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import (
    Store, Product, Customer, Supplier, Order, OrderItem,
    Inventory, Batch, Simulation, Scenario, Event,
)
from backend.models.enums import (
    StoreStatus, ProductCategory, OrderStatus, SupplierStatus,
    SimulationStatus,
)
from backend.services.simulation.seed_data import (
    STORES, SUPPLIERS, PRODUCTS, CUSTOMERS,
    SeedProduct, SeedCustomer,
)
from backend.services.simulation.transfer import process_arriving_transfers, clear_active_transfers
from backend.services.simulation.supplier import process_supplier_deliveries, clear_active_pos
from backend.services.simulation.scenarios import (
    get_scenario_config,
    set_current_scenario,
    ScenarioConfig,
)
# Demand Rate Table: category x hour block x weekday (Spec §4)
# Hour blocks:
# 0 = Night (00:00 - 06:00)
# 1 = Morning Peak (06:00 - 11:00) - breakfast, milk, bread, produce
# 2 = Midday Lull (11:00 - 16:00) - staples, packaged snacks
# 3 = Evening Peak (16:00 - 21:00) - dinner ingredients, dairy, fresh vegetables
# 4 = Late Night (21:00 - 24:00) - munchies, impulse snacks
CATEGORY_HOUR_BLOCK_RATES: dict[str, tuple[float, float, float, float, float]] = {
    # Block:      0(Night) 1(Morn) 2(Aftn) 3(Eve) 4(Late)
    "dairy":     (0.25,    1.8,    0.8,    1.6,   0.6),
    "bakery":    (0.20,    1.7,    0.7,    1.4,   0.7),
    "produce":   (0.10,    1.6,    0.8,    1.7,   0.4),
    "staples":   (0.20,    0.8,    1.2,    1.4,   0.6),
    "packaged":  (0.30,    0.7,    1.0,    1.5,   1.8),
}

def get_demand_rate_multiplier(category: str, hour: int, weekday: int) -> float:
    """Calculate demand rate multiplier from category x hour block x weekday rate table."""
    if 0 <= hour < 6:
        block = 0
    elif 6 <= hour < 11:
        block = 1
    elif 11 <= hour < 16:
        block = 2
    elif 16 <= hour < 21:
        block = 3
    else:
        block = 4

    cat_rates = CATEGORY_HOUR_BLOCK_RATES.get(category, (0.5, 1.0, 1.0, 1.0, 1.0))
    hour_mult = cat_rates[block]

    # Weekday adjustment: Mon-Thu = 1.0, Fri = 1.15, Sat-Sun = 1.35
    if weekday in (5, 6):
        day_mult = 1.35
    elif weekday == 4:
        day_mult = 1.15
    else:
        day_mult = 1.0

    return round(hour_mult * day_mult, 3)





class SimulationClock:
    """Manages simulated time for a simulation instance."""

    def __init__(self, start_time: datetime, seed: int = 42):
        self._current_time = start_time
        self._start_time = start_time
        self._seed = seed

    @property
    def now(self) -> datetime:
        return self._current_time

    @property
    def start_time(self) -> datetime:
        return self._start_time

    def advance(self, hours: int) -> datetime:
        """Advance simulation time by N hours. Returns new current time."""
        self._current_time += timedelta(hours=hours)
        return self._current_time

    def reset(self) -> datetime:
        """Reset clock to start time."""
        self._current_time = self._start_time
        return self._current_time


class SimulationEngine:
    """Core simulation engine for GROCER v2.

    Handles:
    - Database seeding (stores, suppliers, products, customers)
    - Initial inventory and batch creation
    - Deterministic order generation over historical days
    - Time advancement with inventory depletion and batch expiry
    - Reset capability
    """

    def __init__(self, seed: int = 42, historical_days: int = 60):
        self.seed = seed
        self.historical_days = historical_days
        self.rng = random.Random(seed)
        self.clock: SimulationClock | None = None
        self._supplier_map: dict[str, uuid.UUID] = {}
        self._store_map: dict[str, uuid.UUID] = {}
        self._product_list: list[SeedProduct] = []
        self.active_scenario: str = "normal"
        self.active_scenario_config: ScenarioConfig = get_scenario_config("normal")

    async def initialize(self, db: AsyncSession) -> Simulation:
        """Seed all base data and generate historical orders.
        
        Returns the created Simulation ORM object.
        """
        # 1. Calculate timeline
        sim_start = datetime.now(timezone.utc) - timedelta(days=self.historical_days)
        self.clock = SimulationClock(sim_start, self.seed)

        # 2. Seed stores, suppliers, products, customers
        await self._seed_base_data(db)

        # 3. Create initial inventory and batches
        await self._create_initial_inventory(db)

        # 4. Generate historical orders day by day
        await self._generate_historical_orders(db)

        # 5. Advance clock to "now" (end of historical period)
        self.clock.advance(self.historical_days * 24)

        # 6. Ensure active batches exist at simulation present time
        await self._expire_batches(db, self.clock.now)
        await self._restock_inventory(db, self.clock.now)

        # 7. Create Simulation record
        simulation = Simulation(
            simulation_id=uuid.uuid4(),
            seed=self.seed,
            current_time=self.clock.now,
            status=SimulationStatus.CREATED,
            configuration={
                'historical_days': self.historical_days,
                'stores': len(STORES),
                'products': len(PRODUCTS),
                'customers': len(CUSTOMERS),
            },
        )
        db.add(simulation)
        await db.commit()
        return simulation

    async def advance_time(self, db: AsyncSession, simulation_id: uuid.UUID, hours: int) -> dict[str, Any]:
        """Advance simulation time, generate new orders, handle batch expiry.
        
        Returns summary of what happened during the time advance.
        """
        if self.clock is None:
            raise RuntimeError('Simulation not initialized. Call initialize() first.')

        old_time = self.clock.now
        new_time = self.clock.advance(hours)

        # Generate orders for the advanced period
        orders_created = await self._generate_orders_for_period(db, old_time, new_time)

        # Handle batch expiry
        expired_batches = await self._expire_batches(db, new_time)

        # Process arriving store transfers & supplier PO deliveries
        delivered_transfers = await process_arriving_transfers(db, new_time)
        delivered_pos = await process_supplier_deliveries(db, new_time)

        # Update simulation record
        sim = await db.get(Simulation, simulation_id)
        if sim:
            sim.current_time = new_time
            sim.status = SimulationStatus.RUNNING

        # Create time advance event
        event = Event(
            event_id=uuid.uuid4(),
            event_type='TIME_ADVANCED',
            timestamp=new_time,
            entity_type='simulation',
            entity_id=simulation_id,
            payload={
                'from': old_time.isoformat(),
                'to': new_time.isoformat(),
                'hours': hours,
                'orders_created': orders_created,
                'batches_expired': expired_batches,
                'transfers_delivered': len(delivered_transfers),
                'pos_delivered': len(delivered_pos),
            },
        )
        db.add(event)
        await db.commit()

        return {
            'current_time': new_time.isoformat(),
            'hours_advanced': hours,
            'orders_created': orders_created,
            'batches_expired': expired_batches,
            'transfers_delivered': len(delivered_transfers),
            'pos_delivered': len(delivered_pos),
        }

    async def reset(self, db: AsyncSession, simulation_id: uuid.UUID) -> dict[str, Any]:
        """Reset simulation: clear generated data, re-seed, restart clock."""
        # Delete in dependency order
        await db.execute(delete(OrderItem))
        await db.execute(delete(Order))
        await db.execute(delete(Event))
        await db.execute(delete(Batch))
        await db.execute(delete(Inventory))
        await db.execute(delete(Customer))
        await db.execute(delete(Product))
        await db.execute(delete(Supplier))
        await db.execute(delete(Store))
        await db.execute(delete(Simulation))
        await db.commit()

        # Clear in-flight transfers and purchase orders
        clear_active_transfers()
        clear_active_pos()

        # Re-initialize RNG and scenario state
        self.rng = random.Random(self.seed)
        self.clock = None
        self.active_scenario = "normal"
        self.active_scenario_config = get_scenario_config("normal")
        set_current_scenario("normal")

        # Re-seed and regenerate
        simulation = await self.initialize(db)
        return {
            'simulation_id': str(simulation.simulation_id),
            'status': 'reset_complete',
            'current_time': self.clock.now.isoformat() if self.clock else None,
        }


    # ---- PRIVATE METHODS ----

    async def _seed_base_data(self, db: AsyncSession) -> None:
        """Seed stores, suppliers, products, and customers."""
        # Stores
        for s in STORES:
            store = Store(
                store_id=s.store_id,
                name=s.name,
                latitude=s.latitude,
                longitude=s.longitude,
                operating_status=StoreStatus.ACTIVE,
            )
            db.add(store)
            self._store_map[s.name] = s.store_id

        # Suppliers
        for s in SUPPLIERS:
            supplier = Supplier(
                supplier_id=s.supplier_id,
                name=s.name,
                lead_time_hours=s.lead_time_hours,
                status=SupplierStatus.ACTIVE,
            )
            db.add(supplier)
            self._supplier_map[s.name] = s.supplier_id

        await db.flush()

        # Products
        self._product_list = list(PRODUCTS)
        for p in PRODUCTS:
            product = Product(
                product_id=p.product_id,
                name=p.name,
                category=ProductCategory(p.category),
                unit=p.unit,
                shelf_life_hours=p.shelf_life_hours,
                base_price=p.base_price,
                supplier_id=self._supplier_map[p.supplier_name],
                substitution_group=p.substitution_group,
            )
            db.add(product)

        await db.flush()

        # Customers
        for c in CUSTOMERS:
            customer = Customer(
                customer_id=c.customer_id,
                name=c.name,
                home_store_id=self._store_map[c.home_store_name],
            )
            db.add(customer)

        await db.flush()

    async def _create_initial_inventory(self, db: AsyncSession) -> None:
        """Create initial inventory and batches for all store-product pairs."""
        for store_seed in STORES:
            for prod_seed in PRODUCTS:
                # Initial quantity: 2-4 days of mean demand
                initial_qty = int(prod_seed.daily_demand_mean * self.rng.uniform(2.0, 4.0))

                inventory = Inventory(
                    id=uuid.uuid4(),
                    store_id=store_seed.store_id,
                    product_id=prod_seed.product_id,
                    quantity=initial_qty,
                )
                db.add(inventory)

                # Create a batch for perishable stock
                batch_received = self.clock.now - timedelta(
                    hours=self.rng.randint(0, min(24, prod_seed.shelf_life_hours // 4))
                )
                batch = Batch(
                    batch_id=uuid.uuid4(),
                    store_id=store_seed.store_id,
                    product_id=prod_seed.product_id,
                    quantity=initial_qty,
                    received_at=batch_received,
                    expires_at=batch_received + timedelta(hours=prod_seed.shelf_life_hours),
                )
                db.add(batch)

        await db.flush()

    async def _generate_historical_orders(self, db: AsyncSession) -> None:
        """Generate orders day by day for the historical period."""
        for day_offset in range(self.historical_days):
            day_start = self.clock.start_time + timedelta(days=day_offset)
            day_end = day_start + timedelta(days=1)
            await self._generate_orders_for_period(db, day_start, day_end)

            # Periodic restocking every 3 days
            if day_offset > 0 and day_offset % 3 == 0:
                await self._restock_inventory(db, day_start)

    async def _generate_orders_for_period(
        self, db: AsyncSession, start: datetime, end: datetime
    ) -> int:
        """Generate orders for all customers within a time period.
        
        Returns count of orders created.
        """
        hours_in_period = (end - start).total_seconds() / 3600
        orders_created = 0

        if not self._store_map:
            store_res = await db.execute(select(Store))
            stores = store_res.scalars().all()
            self._store_map = {s.name: s.store_id for s in stores}

        category_multipliers = (
            self.active_scenario_config.demand_multiplier_by_category
            if self.active_scenario_config
            else {}
        )
        avg_demand_mult = (
            sum(category_multipliers.values()) / len(category_multipliers)
            if category_multipliers
            else 1.0
        )

        for cust_seed in CUSTOMERS:
            # Probability of ordering in this period, scaled by scenario demand intensity (Fix A)
            order_prob = (hours_in_period / (cust_seed.order_frequency_days * 24)) * avg_demand_mult
            if self.rng.random() > order_prob:
                continue

            # Determine order time
            order_time = start + timedelta(
                hours=self.rng.uniform(0, hours_in_period)
            )

            # Weekend demand adjustment (Saturday=5, Sunday=6)
            is_weekend = order_time.weekday() >= 5

            # Pick random products for this order
            num_items = max(1, int(self.rng.gauss(
                cust_seed.avg_items_per_order, 1.5
            )))
            num_items = min(num_items, len(PRODUCTS))
            selected_products = self.rng.sample(PRODUCTS, num_items)

            store_id = self._store_map[cust_seed.home_store_name]
            order_id = uuid.uuid4()

            order = Order(
                order_id=order_id,
                customer_id=cust_seed.customer_id,
                store_id=store_id,
                created_at=order_time,
                status=OrderStatus.DELIVERED,
            )
            db.add(order)

            items_accounting: list[tuple[int, int, int]] = []

            for prod_seed in selected_products:
                # Quantity driven by category x hour block x weekday rate table + scenario multiplier (Spec §4)
                rate_mult = get_demand_rate_multiplier(
                    prod_seed.category, order_time.hour, order_time.weekday()
                )
                cat_mult = category_multipliers.get(prod_seed.category, 1.0)
                combined_mult = rate_mult * cat_mult

                requested_qty = max(1, int(round(self.rng.gauss(1.5, 0.5) * combined_mult)))

                # Deduct from inventory using FIFO batch depletion and reconcile sales accounting
                fulfilled_qty, lost_qty = await self._deduct_inventory(
                    db, store_id, prod_seed.product_id, requested_qty
                )

                item = OrderItem(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    product_id=prod_seed.product_id,
                    quantity=fulfilled_qty,  # Never treat requested demand as completed sales
                    requested_quantity=requested_qty,
                    fulfilled_quantity=fulfilled_qty,
                    lost_quantity=lost_qty,
                    price=prod_seed.base_price,
                )
                db.add(item)
                items_accounting.append((requested_qty, fulfilled_qty, lost_qty))

            # Reconcile overall order status based on sales accounting
            total_fulfilled = sum(f for r, f, l in items_accounting)
            total_lost = sum(l for r, f, l in items_accounting)

            if total_lost == 0:
                order.status = OrderStatus.DELIVERED
            elif total_fulfilled > 0:
                order.status = OrderStatus.PARTIALLY_FULFILLED
            else:
                order.status = OrderStatus.CANCELLED

            orders_created += 1

        if orders_created > 0:
            await db.flush()

        return orders_created

    async def _deduct_inventory(
        self, db: AsyncSession, store_id: uuid.UUID, product_id: uuid.UUID, requested_qty: int
    ) -> tuple[int, int]:
        """Deduct quantity from active batches (FIFO) and synchronize inventory. Floor at 0.
        
        Returns (fulfilled_quantity, lost_quantity).
        Guarantees conservation of demand: fulfilled_quantity + lost_quantity == requested_qty.
        """
        batch_res = await db.execute(
            select(Batch)
            .where(
                Batch.store_id == store_id,
                Batch.product_id == product_id,
                Batch.quantity > 0,
            )
            .order_by(Batch.expires_at.asc(), Batch.received_at.asc())
        )
        batches = batch_res.scalars().all()

        rem = requested_qty
        for b in batches:
            if rem <= 0:
                break
            deduct = min(b.quantity, rem)
            b.quantity -= deduct
            rem -= deduct

        fulfilled_qty = requested_qty - rem
        lost_qty = rem

        inv_res = await db.execute(
            select(Inventory).where(
                Inventory.store_id == store_id,
                Inventory.product_id == product_id,
            )
        )
        inv = inv_res.scalar_one_or_none()
        if inv:
            inv.quantity = sum(b.quantity for b in batches)

        await db.flush()
        return fulfilled_qty, lost_qty



    async def _restock_inventory(self, db: AsyncSession, restock_time: datetime) -> None:
        """Restock inventory for all stores/products (simulated supplier delivery)."""
        restock_naive = restock_time.replace(tzinfo=None) if restock_time.tzinfo else restock_time
        for store_seed in STORES:
            for prod_seed in PRODUCTS:
                # Count unexpired active batches
                active_sum_res = await db.execute(
                    select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                        Batch.store_id == store_seed.store_id,
                        Batch.product_id == prod_seed.product_id,
                        Batch.quantity > 0,
                        Batch.expires_at > restock_naive,
                    )
                )
                active_qty = active_sum_res.scalar()

                if active_qty < prod_seed.daily_demand_mean * 2:
                    restock_qty = int(prod_seed.daily_demand_mean * self.rng.uniform(2.5, 3.5))

                    batch = Batch(
                        batch_id=uuid.uuid4(),
                        store_id=store_seed.store_id,
                        product_id=prod_seed.product_id,
                        quantity=restock_qty,
                        received_at=restock_naive,
                        expires_at=restock_naive + timedelta(hours=prod_seed.shelf_life_hours),
                    )
                    db.add(batch)

                    # Synchronize inventory
                    inv_res = await db.execute(
                        select(Inventory).where(
                            Inventory.store_id == store_seed.store_id,
                            Inventory.product_id == prod_seed.product_id,
                        )
                    )
                    inv = inv_res.scalar_one_or_none()
                    if inv:
                        inv.quantity = active_qty + restock_qty

        await db.flush()

    async def _expire_batches(self, db: AsyncSession, current_time: datetime) -> int:
        """Mark expired batches and deduct from inventory. Returns count of expired batches."""
        result = await db.execute(
            select(Batch).where(
                Batch.expires_at <= current_time,
                Batch.quantity > 0,
            )
        )
        expired = result.scalars().all()

        affected_pairs: set[tuple[uuid.UUID, uuid.UUID]] = set()
        for batch in expired:
            affected_pairs.add((batch.store_id, batch.product_id))
            batch.quantity = 0

        for store_id, product_id in affected_pairs:
            batch_sum_res = await db.execute(
                select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                    Batch.store_id == store_id,
                    Batch.product_id == product_id,
                    Batch.quantity > 0,
                )
            )
            total_active = batch_sum_res.scalar()
            inv_res = await db.execute(
                select(Inventory).where(
                    Inventory.store_id == store_id,
                    Inventory.product_id == product_id,
                )
            )
            inv = inv_res.scalar_one_or_none()
            if inv:
                inv.quantity = total_active

        if expired:
            await db.flush()

        return len(expired)

