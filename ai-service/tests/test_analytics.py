import pytest
from app.schemas.insights import DailyUsagePoint, PlatformSummary
from app.services.deterministic_analytics import (
    calculate_period_summary,
    calculate_period_comparison,
    calculate_platform_distribution,
    calculate_goal_adherence,
)

def test_calculate_period_summary_empty():
    res = calculate_period_summary([])
    assert res["totalDurationMinutes"] == 0
    assert res["activeDaysCount"] == 0
    assert res["peakDay"] is None

def test_calculate_period_summary_active():
    days = [
        DailyUsagePoint(
            date="2026-10-01",
            totalDurationSeconds=1800, # 30m
            instagramDurationSeconds=1200,
            youtubeDurationSeconds=600,
            estimatedInstagramViews=10,
            estimatedYouTubeViews=5,
            sessionCount=2,
            doomscrollScore=25,
        ),
        DailyUsagePoint(
            date="2026-10-02",
            totalDurationSeconds=3600, # 60m
            instagramDurationSeconds=2000,
            youtubeDurationSeconds=1600,
            estimatedInstagramViews=20,
            estimatedYouTubeViews=15,
            sessionCount=3,
            doomscrollScore=50,
        ),
    ]
    res = calculate_period_summary(days)
    assert res["totalDurationSeconds"] == 5400
    assert res["totalDurationMinutes"] == 90
    assert res["avgDailyDurationMinutes"] == 45
    assert res["totalEstimatedViews"] == 50
    assert res["totalSessions"] == 5
    assert res["avgDoomscore"] == 38
    assert res["activeDaysCount"] == 2
    assert res["peakDay"] == "2026-10-02"
    assert res["peakDayDurationMinutes"] == 60

def test_calculate_period_comparison():
    curr = [
        DailyUsagePoint(date="2026-10-08", totalDurationSeconds=1800, sessionCount=1, doomscrollScore=20),
    ]
    prev = [
        DailyUsagePoint(date="2026-10-01", totalDurationSeconds=3600, sessionCount=2, doomscrollScore=40),
    ]
    res = calculate_period_comparison(curr, prev)
    assert res["hasPreviousData"] is True
    assert res["durationDeltaMinutes"] == -30
    assert res["durationPercentChange"] == -50.0
    assert res["improved"] is True

def test_calculate_platform_distribution():
    platforms = {
        "instagram": PlatformSummary(durationSeconds=3000, estimatedViews=25, sessionCount=3),
        "youtube": PlatformSummary(durationSeconds=1000, estimatedViews=10, sessionCount=1),
    }
    res = calculate_platform_distribution(platforms)
    assert res["instagramPercentage"] == 75
    assert res["youtubePercentage"] == 25
    assert res["dominantPlatform"] == "Instagram Reels"

def test_calculate_goal_adherence():
    days = [
        DailyUsagePoint(date="2026-10-01", totalDurationSeconds=1800), # 30m
        DailyUsagePoint(date="2026-10-02", totalDurationSeconds=2700), # 45m
    ]
    # Goal: 30 minutes
    res = calculate_goal_adherence(days, 30)
    assert res["daysWithinGoal"] == 1
    assert res["totalDays"] == 2
    assert res["adherenceRatePercent"] == 50
