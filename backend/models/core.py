import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import Float, Numeric, DateTime, Text, JSON, ForeignKey, func, UniqueConstraint, Integer, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship

class UTCDateTime(TypeDecorator):
    """DateTime type that converts time-zone-aware datetimes to naive UTC on bind."""
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: Optional[datetime], dialect: Any) -> Optional[datetime]:
        if value is None:
            return None
        if hasattr(value, "tzinfo") and value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

NaiveUTCDateTime = UTCDateTime


from backend.database import Base
from backend.models.enums import (
    StoreStatus, ProductCategory, OrderStatus, SupplierStatus,
    RiskType, RiskSeverity, ActionType, ActionStatus,
    RecommendationStatus, SimulationStatus, RiskStatus,
    ShipmentStatus, POStatus
)

class Store(Base):
    __tablename__ = 'store'
    
    store_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    operating_status: Mapped[StoreStatus]
    
    customers: Mapped[list["Customer"]] = relationship(back_populates="home_store")

class Supplier(Base):
    __tablename__ = 'supplier'
    
    supplier_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    lead_time_hours: Mapped[int]
    status: Mapped[SupplierStatus]
    
    products: Mapped[list["Product"]] = relationship(back_populates="supplier")

class Product(Base):
    __tablename__ = 'product'
    
    product_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    category: Mapped[ProductCategory]
    unit: Mapped[str]
    shelf_life_hours: Mapped[int]
    base_price: Mapped[float] = mapped_column(Numeric(10, 2))
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('supplier.supplier_id'))
    substitution_group: Mapped[Optional[str]]
    
    supplier: Mapped[Supplier] = relationship(back_populates="products")

class Customer(Base):
    __tablename__ = 'customer'
    
    customer_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    home_store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    
    home_store: Mapped[Store] = relationship(back_populates="customers")
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")

class Order(Base):
    __tablename__ = 'order'
    
    order_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('customer.customer_id'))
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    status: Mapped[OrderStatus]
    
    customer: Mapped[Customer] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_item'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('order.order_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    quantity: Mapped[int]  # Fulfilled completed units
    requested_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    fulfilled_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    lost_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    
    order: Mapped[Order] = relationship(back_populates="items")


class Inventory(Base):
    __tablename__ = 'inventory'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    quantity: Mapped[int]
    
    __table_args__ = (UniqueConstraint('store_id', 'product_id', name='uq_inventory_store_product'),)

class Batch(Base):
    __tablename__ = 'batch'
    
    batch_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    quantity: Mapped[int]
    received_at: Mapped[datetime] = mapped_column(UTCDateTime)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)

class Forecast(Base):
    __tablename__ = 'forecast'
    
    forecast_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    forecast_window_hours: Mapped[int]
    predicted_demand: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    model_name: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

class Risk(Base):
    __tablename__ = 'risk'
    
    risk_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    risk_type: Mapped[RiskType]
    severity: Mapped[RiskSeverity]
    probability: Mapped[float] = mapped_column(Float)
    expected_time: Mapped[datetime] = mapped_column(UTCDateTime)
    status: Mapped[RiskStatus]
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="risk")

class Recommendation(Base):
    __tablename__ = 'recommendation'
    
    recommendation_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    risk_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('risk.risk_id'))
    action_type: Mapped[ActionType]
    quantity: Mapped[int]
    source_store_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey('store.store_id'))
    destination_store_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey('store.store_id'))
    score: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    reason_codes: Mapped[Any] = mapped_column(JSON)
    alternatives: Mapped[Any] = mapped_column(JSON)
    status: Mapped[RecommendationStatus]
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    
    risk: Mapped[Risk] = relationship(back_populates="recommendations")

class Action(Base):
    __tablename__ = 'action'
    
    action_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    recommendation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('recommendation.recommendation_id'))
    action_type: Mapped[ActionType]
    approved_by: Mapped[Optional[str]]
    approved_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime)
    executed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime)
    status: Mapped[ActionStatus]
    failure_reason: Mapped[Optional[str]] = mapped_column(Text)

class Event(Base):
    __tablename__ = 'event'
    
    event_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str]
    timestamp: Mapped[datetime] = mapped_column(UTCDateTime)
    entity_type: Mapped[str]
    entity_id: Mapped[uuid.UUID]
    payload: Mapped[Any] = mapped_column(JSON)

class Scenario(Base):
    __tablename__ = 'scenario'
    
    scenario_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str]
    description: Mapped[str] = mapped_column(Text)
    configuration: Mapped[Any] = mapped_column(JSON)

class Simulation(Base):
    __tablename__ = 'simulation'
    
    simulation_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    scenario_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey('scenario.scenario_id'))
    seed: Mapped[int]
    current_time: Mapped[datetime] = mapped_column(UTCDateTime)
    status: Mapped[SimulationStatus]
    configuration: Mapped[Any] = mapped_column(JSON)

class Shipment(Base):
    __tablename__ = 'shipment'
    
    shipment_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    recommendation_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey('recommendation.recommendation_id'), nullable=True)
    source_store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    destination_store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[ShipmentStatus] = mapped_column(default=ShipmentStatus.DISPATCHED)
    dispatched_at: Mapped[datetime] = mapped_column(UTCDateTime)
    arrival_eta: Mapped[datetime] = mapped_column(UTCDateTime)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    batch_records: Mapped[Any] = mapped_column(JSON)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    traffic_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    van_id: Mapped[str] = mapped_column(default="VAN-MUM-01")

class PurchaseOrder(Base):
    __tablename__ = 'purchase_order'
    
    po_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    po_number: Mapped[str] = mapped_column(default="PO-4471")
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('supplier.supplier_id'))
    destination_store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[POStatus] = mapped_column(default=POStatus.IN_TRANSIT)
    ordered_at: Mapped[datetime] = mapped_column(UTCDateTime)
    arrival_eta: Mapped[datetime] = mapped_column(UTCDateTime)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)

class ReceiptConfirmation(Base):
    __tablename__ = 'receipt_confirmation'
    
    confirmation_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('shipment.shipment_id'))
    sent_units: Mapped[int] = mapped_column(Integer)
    received_units: Mapped[int] = mapped_column(Integer)
    discrepancy_units: Mapped[int] = mapped_column(Integer, default=0)
    discrepancy_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confirmed_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

class OutcomeRecord(Base):
    __tablename__ = 'outcome_record'
    
    outcome_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    recommendation_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('store.store_id'))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('product.product_id'))
    exception_title: Mapped[str]
    action_taken: Mapped[str]
    outcome_status: Mapped[str]
    expected_lost_sales_units: Mapped[int] = mapped_column(Integer, default=0)
    actual_lost_sales_units: Mapped[int] = mapped_column(Integer, default=0)
    measured_vs_expected: Mapped[str]
    waste_units: Mapped[int] = mapped_column(Integer, default=0)
    waste_value_inr: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str] = mapped_column(Text, default="")
    evaluated_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

class RunRecord(Base):
    __tablename__ = 'run_record'

    run_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID]
    seed: Mapped[int] = mapped_column(Integer)
    policy: Mapped[str] = mapped_column(Text)
    window_hours: Mapped[int] = mapped_column(Integer)
    lost_sales_units: Mapped[int] = mapped_column(Integer, default=0)
    waste_units: Mapped[int] = mapped_column(Integer, default=0)
    rupee_loss: Mapped[float] = mapped_column(Float, default=0.0)
    availability_pct: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
