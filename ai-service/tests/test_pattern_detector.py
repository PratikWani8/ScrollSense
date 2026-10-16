import pytest
from app.schemas.insights import InsightGenerationRequest, DailyUsagePoint, PlatformSummary
from app.services.pattern_detector import detect_behavioral_patterns

def test_detect_patterns_goal_and_platform():
    req = InsightGenerationRequest(
        userId="user-123",
        currentPeriodDays=[
            DailyUsagePoint(date="2026-10-01", totalDurationSeconds=1200),
            DailyUsagePoint(date="2026-10-02", totalDurationSeconds=1200),
            DailyUsagePoint(date="2026-10-03", totalDurationSeconds=1200),
        ],
        dailyGoalMinutes=30,
        platformTotals={
            "instagram": PlatformSummary(durationSeconds=3000),
            "youtube": PlatformSummary(durationSeconds=600),
        },
        prolongedSessionsCount=4,
    )
    patterns = detect_behavioral_patterns(req)
    pattern_ids = [p.pattern_id for p in patterns]

    assert "PATTERN_GOAL_ADHERENCE" in pattern_ids
    assert "PATTERN_PROLONGED_BURSTS" in pattern_ids
    assert "PATTERN_PLATFORM_BIAS" in pattern_ids
