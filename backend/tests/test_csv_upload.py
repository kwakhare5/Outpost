"""High-signal domain test: CSV Dark Store Upload & Dynamic Rebalancing Invariant."""
import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app

SAMPLE_CSV = """store_code,store_name,locality,milk_units,capacity,active_orders
ST-01,Andheri East,MIDC Cyber Hub,35,45,14
ST-02,Bandra West,Hill Road,48,50,9
ST-04,Lower Parel,Senapati Bapat,4,30,18
"""

INVALID_CSV = """store_code,store_name,locality,milk_units,capacity,active_orders
ST-01,Andheri East,MIDC,-10,45,14
"""

@pytest.mark.asyncio
async def test_csv_upload_text_generates_recommendation():
    """Verify that uploading store CSV text accurately identifies deficits and formulates transfer."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/stores/upload-csv-text", json={"csv_text": SAMPLE_CSV})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["total_stores"] == 3
        assert data["total_stock"] == 87
        
        # Verify recommendation pair
        rec = data["recommendation"]
        assert rec is not None
        assert rec["sourceStoreCode"] == "ST-02"
        assert rec["destStoreCode"] == "ST-04"
        assert rec["transferUnits"] == 20
        # Verify mass conservation in recommendation
        pre_sum = rec["sourcePreUnits"] + rec["destPreUnits"]
        post_sum = rec["sourcePostUnits"] + rec["destPostUnits"]
        assert pre_sum == post_sum

@pytest.mark.asyncio
async def test_csv_upload_auto_sanitizes_negative_units():
    """Verify friendly auto-sanitization clamps negative units to zero."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/stores/upload-csv-text", json={"csv_text": INVALID_CSV})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_stock"] == 0
        assert data["stores"][0]["milkUnits"] == 0
