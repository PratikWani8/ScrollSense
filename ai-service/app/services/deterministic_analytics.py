from typing import List, Dict, Any
from app.schemas.insights import DailyUsagePoint, PlatformSummary

def calculate_period_summary(days: List[DailyUsagePoint]) -> Dict[str, Any]:
    """
    Calculate deterministic aggregated metrics for a list of daily tracking points.
    All calculations are pure math — no generative or hallucinated values.
    """
    if not days:
        return {
            "totalDurationSeconds": 0,
            "totalDurationMinutes": 0,
            "avgDailyDurationMinutes": 0,
            "totalEstimatedViews": 0,
            "totalSessions": 0,
            "avgDoomscore": 0,
            "activeDaysCount": 0,
            "peakDay": None,
            "peakDayDurationMinutes": 0,
        }

    total_sec = sum(d.totalDurationSeconds for d in days)
    total_views = sum(d.estimatedInstagramViews + d.estimatedYouTubeViews for d in days)
    total_sessions = sum(d.sessionCount for d in days)
    active_days = [d for d in days if d.totalDurationSeconds > 0]
    active_count = len(active_days)

    avg_doomscore = (
        round(sum(d.doomscrollScore for d in days) / len(days)) if days else 0
    )

    peak_day_obj = max(days, key=lambda d: d.totalDurationSeconds, default=None)
    peak_day = peak_day_obj.date if peak_day_obj else None
    peak_day_min = round(peak_day_obj.totalDurationSeconds / 60) if peak_day_obj else 0

    total_min = round(total_sec / 60)
    avg_daily_min = round(total_min / max(1, len(days)))

    return {
        "totalDurationSeconds": total_sec,
        "totalDurationMinutes": total_min,
        "avgDailyDurationMinutes": avg_daily_min,
        "totalEstimatedViews": total_views,
        "totalSessions": total_sessions,
        "avgDoomscore": avg_doomscore,
        "activeDaysCount": active_count,
        "peakDay": peak_day,
        "peakDayDurationMinutes": peak_day_min,
    }

def calculate_period_comparison(
    current_days: List[DailyUsagePoint], previous_days: List[DailyUsagePoint]
) -> Dict[str, Any]:
    """
    Compare current period vs previous period deterministically.
    """
    curr = calculate_period_summary(current_days)
    prev = calculate_period_summary(previous_days)

    duration_delta_min = curr["totalDurationMinutes"] - prev["totalDurationMinutes"]
    duration_pct_change = (
        round(((curr["totalDurationSeconds"] - prev["totalDurationSeconds"]) / max(1, prev["totalDurationSeconds"])) * 100, 1)
        if prev["totalDurationSeconds"] > 0
        else 0.0
    )

    views_delta = curr["totalEstimatedViews"] - prev["totalEstimatedViews"]
    views_pct_change = (
        round(((curr["totalEstimatedViews"] - prev["totalEstimatedViews"]) / max(1, prev["totalEstimatedViews"])) * 100, 1)
        if prev["totalEstimatedViews"] > 0
        else 0.0
    )

    doomscore_delta = curr["avgDoomscore"] - prev["avgDoomscore"]
    improved = duration_delta_min < 0 or doomscore_delta < 0

    return {
        "hasPreviousData": bool(previous_days and prev["activeDaysCount"] > 0),
        "durationDeltaMinutes": duration_delta_min,
        "durationPercentChange": duration_pct_change,
        "viewsDelta": views_delta,
        "viewsPercentChange": views_pct_change,
        "doomscoreDelta": doomscore_delta,
        "improved": improved,
    }

def calculate_platform_distribution(platforms: Dict[str, PlatformSummary]) -> Dict[str, Any]:
    """
    Deterministically computes platform consumption percentages.
    """
    ig = platforms.get("instagram", PlatformSummary())
    yt = platforms.get("youtube", PlatformSummary())
    total_sec = ig.durationSeconds + yt.durationSeconds

    if total_sec == 0:
        return {
            "instagramSeconds": 0,
            "youtubeSeconds": 0,
            "instagramPercentage": 0,
            "youtubePercentage": 0,
            "dominantPlatform": "None",
        }

    ig_pct = round((ig.durationSeconds / total_sec) * 100)
    yt_pct = 100 - ig_pct

    dominant = "Balanced"
    if ig_pct >= 65:
        dominant = "Instagram Reels"
    elif yt_pct >= 65:
        dominant = "YouTube Shorts"

    return {
        "instagramSeconds": ig.durationSeconds,
        "youtubeSeconds": yt.durationSeconds,
        "instagramPercentage": ig_pct,
        "youtubePercentage": yt_pct,
        "dominantPlatform": dominant,
    }

def calculate_goal_adherence(days: List[DailyUsagePoint], goal_minutes: int) -> Dict[str, Any]:
    """
    Evaluate how frequently the user stayed within their daily goal.
    """
    if not days:
        return {"daysWithinGoal": 0, "totalDays": 0, "adherenceRatePercent": 100}

    goal_sec = goal_minutes * 60
    days_within = sum(1 for d in days if d.totalDurationSeconds <= goal_sec)
    adherence_pct = round((days_within / len(days)) * 100)

    return {
        "daysWithinGoal": days_within,
        "totalDays": len(days),
        "adherenceRatePercent": adherence_pct,
        "goalMinutes": goal_minutes,
    }
