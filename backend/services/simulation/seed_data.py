"""Deterministic seed data catalog for the Outpost simulator.

Defines 5 dark stores, 8 suppliers, 25 products, and 25 customers.
All UUIDs are deterministic via uuid5 for reproducibility.
"""
import uuid
from dataclasses import dataclass, field

# Namespace for deterministic UUIDs
OUTPOST_NS = uuid.UUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

def _id(name: str) -> uuid.UUID:
    """Generate a deterministic UUID from a name."""
    return uuid.uuid5(OUTPOST_NS, name)


@dataclass(frozen=True)
class SeedStore:
    store_id: uuid.UUID
    name: str
    latitude: float
    longitude: float

@dataclass(frozen=True)
class SeedSupplier:
    supplier_id: uuid.UUID
    name: str
    lead_time_hours: int

@dataclass(frozen=True)
class SeedProduct:
    product_id: uuid.UUID
    name: str
    category: str  # matches ProductCategory enum values
    unit: str
    shelf_life_hours: int
    base_price: float
    supplier_name: str  # resolved to supplier_id during seeding
    substitution_group: str | None = None
    # Demand characteristics for simulator
    daily_demand_mean: float = 10.0  # average daily demand per store
    daily_demand_std: float = 3.0   # demand variation
    weekend_multiplier: float = 1.0  # weekend demand factor

@dataclass(frozen=True)
class SeedCustomer:
    customer_id: uuid.UUID
    name: str
    home_store_name: str  # resolved to store_id during seeding
    order_frequency_days: float = 3.0  # avg days between orders
    avg_items_per_order: int = 4


# === 3 DARK STORES (Spec Section 2.1) ===
STORES: list[SeedStore] = [
    SeedStore(_id('store-01'), 'Dark Store Andheri West', 19.1136, 72.8295),
    SeedStore(_id('store-02'), 'Dark Store Bandra', 19.0596, 72.8295),
    SeedStore(_id('store-03'), 'Dark Store Powai', 19.1176, 72.9060),
]

# === 8 REGIONAL FULFILMENT CENTRES (RFCs) ===
SUPPLIERS: list[SeedSupplier] = [
    SeedSupplier(_id('supplier-amul'), 'Bhiwandi RFC (Dairy)', 24),
    SeedSupplier(_id('supplier-mother-dairy'), 'Panvel RFC (Dairy)', 18),
    SeedSupplier(_id('supplier-britannia'), 'Thane RFC (Bakery)', 12),
    SeedSupplier(_id('supplier-modern'), 'Kurla RFC (Bakery)', 12),
    SeedSupplier(_id('supplier-safal'), 'Vashi RFC (Produce)', 8),
    SeedSupplier(_id('supplier-farm-fresh'), 'Nashik RFC (Produce)', 6),
    SeedSupplier(_id('supplier-itc'), 'Taloja RFC (Staples)', 48),
    SeedSupplier(_id('supplier-nestle'), 'Bhiwandi Central RFC (Packaged)', 72),
]

# === 15 EVERYDAY GROCERY SKUs (Spec Section 2.1) ===
PRODUCTS: list[SeedProduct] = [
    # DAIRY (4 products)
    SeedProduct(_id('prod-toned-milk'), 'Amul Taaza Milk 500ml', 'dairy', 'pack', 72, 28.0, 'Bhiwandi RFC (Dairy)',
               substitution_group='milk', daily_demand_mean=18.0, daily_demand_std=4.0, weekend_multiplier=0.9),
    SeedProduct(_id('prod-curd'), 'Mother Dairy Dahi 400g', 'dairy', 'cup', 96, 40.0, 'Bhiwandi RFC (Dairy)',
               daily_demand_mean=14.0, daily_demand_std=3.0, weekend_multiplier=1.1),
    SeedProduct(_id('prod-butter'), 'Amul Butter 100g', 'dairy', 'pack', 240, 56.0, 'Bhiwandi RFC (Dairy)',
               daily_demand_mean=10.0, daily_demand_std=2.0, weekend_multiplier=1.1),
    SeedProduct(_id('prod-paneer'), 'Paneer 200g', 'dairy', 'pack', 120, 90.0, 'Bhiwandi RFC (Dairy)',
               daily_demand_mean=8.0, daily_demand_std=2.0, weekend_multiplier=1.2),

    # BAKERY (2 products)
    SeedProduct(_id('prod-white-bread'), 'Britannia Bread 400g', 'bakery', 'loaf', 48, 40.0, 'Thane RFC (Bakery)',
               substitution_group='bread', daily_demand_mean=20.0, daily_demand_std=3.5, weekend_multiplier=1.0),
    SeedProduct(_id('prod-pav'), 'Pav Buns 6pc', 'bakery', 'pack', 36, 30.0, 'Thane RFC (Bakery)',
               daily_demand_mean=15.0, daily_demand_std=3.0, weekend_multiplier=1.2),

    # PRODUCE & EGGS (5 products)
    SeedProduct(_id('prod-eggs'), 'Farm Eggs (6)', 'produce', 'pack', 168, 60.0, 'Nashik RFC (Produce)',
               daily_demand_mean=18.0, daily_demand_std=3.0, weekend_multiplier=1.2),
    SeedProduct(_id('prod-bananas'), 'Banana (1 dozen)', 'produce', 'bunch', 72, 60.0, 'Vashi RFC (Produce)',
               daily_demand_mean=16.0, daily_demand_std=3.0, weekend_multiplier=1.1),
    SeedProduct(_id('prod-tomatoes'), 'Tomatoes 1kg', 'produce', 'bag', 96, 40.0, 'Nashik RFC (Produce)',
               daily_demand_mean=20.0, daily_demand_std=4.0, weekend_multiplier=1.0),
    SeedProduct(_id('prod-onions'), 'Onions 1kg', 'produce', 'bag', 168, 35.0, 'Nashik RFC (Produce)',
               daily_demand_mean=18.0, daily_demand_std=3.0, weekend_multiplier=1.0),
    SeedProduct(_id('prod-potatoes'), 'Potatoes 1kg', 'produce', 'bag', 240, 35.0, 'Vashi RFC (Produce)',
               daily_demand_mean=15.0, daily_demand_std=2.5, weekend_multiplier=1.0),

    # STAPLES (3 products)
    SeedProduct(_id('prod-atta'), 'Whole Wheat Atta 5kg', 'staples', 'bag', 2160, 250.0, 'Taloja RFC (Staples)',
               daily_demand_mean=6.0, daily_demand_std=1.5, weekend_multiplier=1.0),
    SeedProduct(_id('prod-toor-dal'), 'Toor Dal 1kg', 'staples', 'bag', 4320, 160.0, 'Taloja RFC (Staples)',
               daily_demand_mean=8.0, daily_demand_std=1.5, weekend_multiplier=1.0),
    SeedProduct(_id('prod-salt'), 'Tata Salt 1kg', 'staples', 'bag', 8640, 28.0, 'Taloja RFC (Staples)',
               daily_demand_mean=10.0, daily_demand_std=1.0, weekend_multiplier=1.0),

    # PACKAGED (1 product)
    SeedProduct(_id('prod-maggi'), 'Maggi Noodles 4-Pack', 'packaged', 'pack', 4320, 56.0, 'Bhiwandi Central RFC (Packaged)',
               daily_demand_mean=14.0, daily_demand_std=3.0, weekend_multiplier=1.3),
]

# === 20 CUSTOMERS across 3 dark stores ===
CUSTOMERS: list[SeedCustomer] = [
    # Store 01 - Andheri West (7 customers)
    SeedCustomer(_id('cust-sharma-family'), 'Sharma Family', 'Dark Store Andheri West', 2.5, 5),
    SeedCustomer(_id('cust-patel-household'), 'Patel Household', 'Dark Store Andheri West', 3.0, 4),
    SeedCustomer(_id('cust-reddy-home'), 'Reddy Home', 'Dark Store Andheri West', 4.0, 3),
    SeedCustomer(_id('cust-singh-family'), 'Singh Family', 'Dark Store Andheri West', 3.5, 4),
    SeedCustomer(_id('cust-das-house'), 'Das House', 'Dark Store Andheri West', 5.0, 3),
    SeedCustomer(_id('cust-mishra-family'), 'Mishra Family', 'Dark Store Andheri West', 3.0, 4),
    SeedCustomer(_id('cust-saxena-home'), 'Saxena Home', 'Dark Store Andheri West', 3.5, 5),
    # Store 02 - Bandra (7 customers)
    SeedCustomer(_id('cust-mehta-family'), 'Mehta Family', 'Dark Store Bandra', 2.0, 6),
    SeedCustomer(_id('cust-joshi-home'), 'Joshi Home', 'Dark Store Bandra', 3.0, 4),
    SeedCustomer(_id('cust-khan-household'), 'Khan Household', 'Dark Store Bandra', 3.5, 5),
    SeedCustomer(_id('cust-desai-family'), 'Desai Family', 'Dark Store Bandra', 4.0, 3),
    SeedCustomer(_id('cust-nair-house'), 'Nair House', 'Dark Store Bandra', 2.5, 4),
    SeedCustomer(_id('cust-kulkarni-family'), 'Kulkarni Family', 'Dark Store Bandra', 2.5, 4),
    SeedCustomer(_id('cust-thakur-home'), 'Thakur Home', 'Dark Store Bandra', 3.0, 5),
    # Store 03 - Powai (6 customers)
    SeedCustomer(_id('cust-gupta-family'), 'Gupta Family', 'Dark Store Powai', 2.0, 5),
    SeedCustomer(_id('cust-verma-home'), 'Verma Home', 'Dark Store Powai', 3.0, 4),
    SeedCustomer(_id('cust-iyer-household'), 'Iyer Household', 'Dark Store Powai', 4.0, 3),
    SeedCustomer(_id('cust-bhatt-family'), 'Bhatt Family', 'Dark Store Powai', 3.5, 5),
    SeedCustomer(_id('cust-shetty-house'), 'Shetty House', 'Dark Store Powai', 5.0, 3),
    SeedCustomer(_id('cust-chopra-family'), 'Chopra Family', 'Dark Store Powai', 4.0, 3),
]
