"""Tests for metrics module (Spec Section 5, Phase 2 Step 2).

Verifies the computation of:
1. Lost sales units
2. Waste units from WASTE_EXPIRED events
3. Rupee loss ((lost + waste) * base_price)
4. Availability percent (fulfilled / requested)
5. Rupee price assumption string inclusion
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from backend.models.core import Product, Order, OrderItem, Event, Store, Customer, Supplier
from backend.models.enums import StoreStatus, ProductCategory, OrderStatus, SupplierStatus
from backend.services.metrics import compute_simulation_metrics, RUPEE_PRICE_ASSUMPTION


@pytest.mark.asyncio
async def test_compute_simulation_metrics_clean(db_session):
    """Test metrics computation with real OrderItems, WASTE_EXPIRED events, and products."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Create Supplier and Products
    supp = Supplier(
        supplier_id=uuid.uuid4(),
        name="Test RFC",
        lead_time_hours=24,
        status=SupplierStatus.ACTIVE,
    )
    prod_a = Product(
        product_id=uuid.uuid4(),
        name="Amul Milk 500ml",
        category=ProductCategory.DAIRY,
        unit="pack",
        shelf_life_hours=72,
        base_price=30.0,
        supplier_id=supp.supplier_id,
    )
    prod_b = Product(
        product_id=uuid.uuid4(),
        name="Whole Wheat Bread",
        category=ProductCategory.BAKERY,
        unit="pack",
        shelf_life_hours=48,
        base_price=50.0,
        supplier_id=supp.supplier_id,
    )
    store = Store(
        store_id=uuid.uuid4(),
        name="Test Store Bandra",
        latitude=19.05,
        longitude=72.82,
        operating_status=StoreStatus.ACTIVE,
    )
    cust = Customer(
        customer_id=uuid.uuid4(),
        name="Aarav Sharma",
        home_store_id=store.store_id,
    )
    db_session.add_all([supp, prod_a, prod_b, store, cust])
    await db_session.flush()

    # 2. Create Order with items
    order = Order(
        order_id=uuid.uuid4(),
        customer_id=cust.customer_id,
        store_id=store.store_id,
        created_at=now,
        status=OrderStatus.DELIVERED,
    )
    db_session.add(order)
    await db_session.flush()

    # Item A: requested 10, fulfilled 8, lost 2
    item_a = OrderItem(
        id=uuid.uuid4(),
        order_id=order.order_id,
        product_id=prod_a.product_id,
        quantity=8,
        requested_quantity=10,
        fulfilled_quantity=8,
        lost_quantity=2,
        price=30.0,
    )
    # Item B: requested 5, fulfilled 5, lost 0
    item_b = OrderItem(
        id=uuid.uuid4(),
        order_id=order.order_id,
        product_id=prod_b.product_id,
        quantity=5,
        requested_quantity=5,
        fulfilled_quantity=5,
        lost_quantity=0,
        price=50.0,
    )
    db_session.add_all([item_a, item_b])

    # 3. Create WASTE_EXPIRED event for Prod B: 3 units expired
    waste_event = Event(
        event_id=uuid.uuid4(),
        event_type="WASTE_EXPIRED",
        timestamp=now,
        entity_type="batch",
        entity_id=uuid.uuid4(),
        payload={
            "store_id": str(store.store_id),
            "product_id": str(prod_b.product_id),
            "units": 3,
        },
    )
    db_session.add(waste_event)
    await db_session.commit()

    # 4. Compute metrics
    metrics = await compute_simulation_metrics(
        db_session,
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
    )

    # Lost sales: 2 units (Prod A: 2, Prod B: 0)
    assert metrics.lost_sales_units == 2

    # Waste units: 3 units (Prod B: 3)
    assert metrics.waste_units == 3

    # Rupee loss:
    # Prod A: (2 lost + 0 waste) * Rs 30 = Rs 60
    # Prod B: (0 lost + 3 waste) * Rs 50 = Rs 150
    # Total = Rs 210.00
    assert metrics.rupee_loss == 210.0

    # Availability: total fulfilled (8 + 5 = 13) / total requested (10 + 5 = 15) = 13/15 = 86.67%
    assert metrics.availability_pct == pytest.approx(86.67, abs=0.01)

    # Rupee price assumption present
    assert RUPEE_PRICE_ASSUMPTION in metrics.rupee_price_assumption
    report = metrics.format_report()
    assert "Rs 210.00" in report
    assert "CNBC-TV18" in report


@pytest.mark.asyncio
async def test_run_record_storage_and_retrieval(db_session):
    """RunRecord model can store and retrieve simulation runs with the four numbers."""
    from backend.models.core import RunRecord

    run_id = uuid.uuid4()
    sim_id = uuid.uuid4()
    record = RunRecord(
        run_id=run_id,
        simulation_id=sim_id,
        seed=42,
        policy="baseline",
        window_hours=168,
        lost_sales_units=45,
        waste_units=12,
        rupee_loss=2340.50,
        availability_pct=91.4,
    )
    db_session.add(record)
    await db_session.commit()

    fetched = await db_session.get(RunRecord, run_id)
    assert fetched is not None
    assert fetched.seed == 42
    assert fetched.policy == "baseline"
    assert fetched.window_hours == 168
    assert fetched.lost_sales_units == 45
    assert fetched.waste_units == 12
    assert fetched.rupee_loss == 2340.50
    assert fetched.availability_pct == 91.4

