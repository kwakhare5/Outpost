import uuid
from datetime import datetime, timezone, timedelta
import pytest

from backend.models.core import UTCDateTime, Batch
from backend.services.simulation.engine import SimulationEngine


def test_utcdatetime_aware_becomes_naive_utc():
    # Offset of +05:30 (e.g. Asia/Kolkata)
    tz_ist = timezone(timedelta(hours=5, minutes=30))
    dt_aware = datetime(2026, 10, 18, 14, 30, tzinfo=tz_ist)

    decorator = UTCDateTime()
    bound = decorator.process_bind_param(dt_aware, None)

    # 14:30 +05:30 is 09:00 UTC
    assert bound == datetime(2026, 10, 18, 9, 0)
    assert bound.tzinfo is None


def test_utcdatetime_naive_unchanged():
    dt_naive = datetime(2026, 10, 18, 9, 0)
    decorator = UTCDateTime()
    bound = decorator.process_bind_param(dt_naive, None)
    assert bound == dt_naive
    assert bound.tzinfo is None


def test_utcdatetime_none_unchanged():
    decorator = UTCDateTime()
    bound = decorator.process_bind_param(None, None)
    assert bound is None


@pytest.mark.asyncio
async def test_simulation_clock_start_tzinfo_none(db_session):
    engine = SimulationEngine(seed=42, historical_days=1)
    await engine.initialize(db_session)
    assert engine.clock is not None
    assert engine.clock.now.tzinfo is None


@pytest.mark.asyncio
async def test_aware_datetime_persists_as_naive_utc(db_session):
    tz_ist = timezone(timedelta(hours=5, minutes=30))
    aware_dt = datetime(2026, 10, 18, 14, 30, tzinfo=tz_ist)
    batch = Batch(
        batch_id=uuid.uuid4(),
        store_id=uuid.uuid4(),
        product_id=uuid.uuid4(),
        quantity=10,
        received_at=aware_dt,
        expires_at=aware_dt + timedelta(days=2),
    )
    db_session.add(batch)
    await db_session.flush()
    await db_session.refresh(batch)
    assert batch.received_at.tzinfo is None
    assert batch.received_at == datetime(2026, 10, 18, 9, 0)
