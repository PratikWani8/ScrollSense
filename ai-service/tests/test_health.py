import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

def test_health_check_endpoint():
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/health")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "healthy"
            assert data["service"] == "scrollsense-ai-service"
            assert "fallbackReady" in data
    asyncio.run(_run())
