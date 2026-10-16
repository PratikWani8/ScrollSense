import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.insights import InsightGenerationRequest, DailyUsagePoint, PlatformSummary
from app.services.insight_generator import insight_generator

def test_insufficient_data_report():
    async def _run():
        req = InsightGenerationRequest(
            userId="user-test-1",
            currentPeriodDays=[
                DailyUsagePoint(date="2026-10-01", totalDurationSeconds=60), # 1 minute
            ],
            dailyGoalMinutes=30,
        )
        report = await insight_generator.generate_report(req)
        assert report.dataSufficiency == "INSUFFICIENT"
        assert "Insufficient" in report.summary
        assert len(report.observations) > 0
        assert report.suggestedGoal is not None
        assert report.suggestedGoal.dailyLimitMinutes == 30
    asyncio.run(_run())

def test_full_insight_generation():
    async def _run():
        req = InsightGenerationRequest(
            userId="user-test-2",
            currentPeriodDays=[
                DailyUsagePoint(date="2026-10-01", totalDurationSeconds=1800, sessionCount=2, estimatedInstagramViews=15),
                DailyUsagePoint(date="2026-10-02", totalDurationSeconds=2400, sessionCount=3, estimatedInstagramViews=20),
                DailyUsagePoint(date="2026-10-03", totalDurationSeconds=1200, sessionCount=1, estimatedYouTubeViews=10),
            ],
            previousPeriodDays=[
                DailyUsagePoint(date="2026-09-24", totalDurationSeconds=3600, sessionCount=4),
            ],
            platformTotals={
                "instagram": PlatformSummary(durationSeconds=4200, estimatedViews=35, sessionCount=5),
                "youtube": PlatformSummary(durationSeconds=1200, estimatedViews=10, sessionCount=1),
            },
            dailyGoalMinutes=45,
        )
        report = await insight_generator.generate_report(req)
        assert report.dataSufficiency == "SUFFICIENT"
        assert len(report.summary) > 10
        assert len(report.observations) >= 2
        assert len(report.positiveChanges) >= 1
        assert len(report.areasToImprove) >= 1
        assert len(report.recommendations) >= 2
        assert report.suggestedGoal is not None
        assert report.reportId.startswith("rep_")
    asyncio.run(_run())

def test_insights_router_endpoints():
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "userId": "user-api-test",
                "timezone": "America/New_York",
                "currentPeriodDays": [
                    {
                        "date": "2026-10-01",
                        "totalDurationSeconds": 1800,
                        "instagramDurationSeconds": 1200,
                        "youtubeDurationSeconds": 600,
                        "estimatedInstagramViews": 10,
                        "estimatedYouTubeViews": 5,
                        "sessionCount": 2,
                        "doomscrollScore": 25,
                    },
                    {
                        "date": "2026-10-02",
                        "totalDurationSeconds": 2400,
                        "instagramDurationSeconds": 1800,
                        "youtubeDurationSeconds": 600,
                        "estimatedInstagramViews": 15,
                        "estimatedYouTubeViews": 5,
                        "sessionCount": 3,
                        "doomscrollScore": 30,
                    },
                    {
                        "date": "2026-10-03",
                        "totalDurationSeconds": 1500,
                        "instagramDurationSeconds": 1000,
                        "youtubeDurationSeconds": 500,
                        "estimatedInstagramViews": 8,
                        "estimatedYouTubeViews": 4,
                        "sessionCount": 2,
                        "doomscrollScore": 20,
                    },
                ],
                "dailyGoalMinutes": 35,
            }

            # 1. Test unauthorized rejection without header
            unauth_res = await client.post("/api/v1/insights/generate", json=payload)
            assert unauth_res.status_code == 401

            headers = {"X-Internal-Key": "scrollsense_internal_ai_secret_key"}

            # 2. Test POST /api/v1/insights/generate with valid header
            res = await client.post("/api/v1/insights/generate", json=payload, headers=headers)
            assert res.status_code == 200
            data = res.json()
            assert "reportId" in data
            assert "summary" in data
            assert data["dataSufficiency"] == "SUFFICIENT"
            assert len(data["observations"]) > 0

            # 3. Test POST /api/v1/insights/preview with valid header
            prev_res = await client.post("/api/v1/insights/preview", json=payload, headers=headers)
            assert prev_res.status_code == 200
            prev_data = prev_res.json()
            assert "summary" in prev_data
            assert "topRecommendation" in prev_data
    asyncio.run(_run())
