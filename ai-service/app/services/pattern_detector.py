from typing import List, Dict, Any
from app.schemas.insights import InsightGenerationRequest
from app.services.deterministic_analytics import (
    calculate_period_summary,
    calculate_period_comparison,
    calculate_platform_distribution,
    calculate_goal_adherence,
)

class DetectedPattern:
    def __init__(self, pattern_id: str, title: str, description: str, category: str):
        self.pattern_id = pattern_id
        self.title = title
        self.description = description
        self.category = category # "POSITIVE", "CONCERN", "NEUTRAL"

    def to_dict(self) -> Dict[str, str]:
        return {
            "patternId": self.pattern_id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
        }

def detect_behavioral_patterns(request: InsightGenerationRequest) -> List[DetectedPattern]:
    """
    Examines deterministic analytics to find observable browsing habits.
    All patterns describe usage metrics and habits without medical conclusions.
    """
    patterns: List[DetectedPattern] = []

    curr_summary = calculate_period_summary(request.currentPeriodDays)
    comparison = calculate_period_comparison(request.currentPeriodDays, request.previousPeriodDays)
    platforms = calculate_platform_distribution(request.platformTotals)
    adherence = calculate_goal_adherence(request.currentPeriodDays, request.dailyGoalMinutes)

    # 1. Goal Adherence
    if adherence["totalDays"] >= 3:
        if adherence["adherenceRatePercent"] >= 75:
            patterns.append(
                DetectedPattern(
                    "PATTERN_GOAL_ADHERENCE",
                    "High Goal Adherence",
                    f"Stayed within configured daily limit ({request.dailyGoalMinutes}m) on {adherence['daysWithinGoal']} of {adherence['totalDays']} tracked days ({adherence['adherenceRatePercent']}%).",
                    "POSITIVE",
                )
            )
        elif adherence["adherenceRatePercent"] <= 40:
            patterns.append(
                DetectedPattern(
                    "PATTERN_GOAL_OVERAGES",
                    "Frequent Goal Overages",
                    f"Exceeded daily limit on {adherence['totalDays'] - adherence['daysWithinGoal']} of {adherence['totalDays']} tracked days.",
                    "CONCERN",
                )
            )

    # 2. Week-over-Week Changes
    if comparison["hasPreviousData"]:
        pct = comparison["durationPercentChange"]
        if pct <= -15.0:
            patterns.append(
                DetectedPattern(
                    "PATTERN_USAGE_DECREASE",
                    "Meaningful Usage Reduction",
                    f"Total short-video duration dropped by {abs(pct)}% compared to the prior period.",
                    "POSITIVE",
                )
            )
        elif pct >= 25.0:
            patterns.append(
                DetectedPattern(
                    "PATTERN_USAGE_SURGE",
                    "Usage Increase",
                    f"Total feed time increased by {pct}% compared to the prior period.",
                    "CONCERN",
                )
            )

    # 3. Prolonged Sessions
    if request.prolongedSessionsCount >= 3:
        patterns.append(
            DetectedPattern(
                "PATTERN_PROLONGED_BURSTS",
                "Prolonged Session Bursts",
                f"{request.prolongedSessionsCount} continuous browsing sessions exceeding 25 minutes recorded this period.",
                "CONCERN",
            )
        )

    # 4. Platform Concentration
    if platforms["dominantPlatform"] in ["Instagram Reels", "YouTube Shorts"]:
        pct = (
            platforms["instagramPercentage"]
            if platforms["dominantPlatform"] == "Instagram Reels"
            else platforms["youtubePercentage"]
        )
        patterns.append(
            DetectedPattern(
                "PATTERN_PLATFORM_BIAS",
                f"{platforms['dominantPlatform']} Concentration",
                f"{pct}% of your short-video browsing was concentrated on {platforms['dominantPlatform']}.",
                "NEUTRAL",
            )
        )

    # 5. Fast Skipping Rate
    total_min = curr_summary["totalDurationMinutes"]
    total_views = curr_summary["totalEstimatedViews"]
    if total_min >= 15 and total_views > 0:
        rate = round(total_views / total_min, 1)
        if rate >= 3.0:
            patterns.append(
                DetectedPattern(
                    "PATTERN_RAPID_SKIPPING",
                    "Rapid Feed Navigation",
                    f"Averaged ~{rate} estimated short-video views per active minute, suggesting rapid skipping between clips.",
                    "NEUTRAL",
                )
            )

    # 6. Quiet Hours Usage
    if request.quietHours and request.quietHours.enabled:
        # If quiet hours enabled and prompt indicates late night activity
        patterns.append(
            DetectedPattern(
                "PATTERN_QUIET_HOURS_CONFIGURED",
                "Quiet Hours Protection Active",
                f"Quiet hours scheduled from {request.quietHours.startHour}:00 to {request.quietHours.endHour}:00 to protect evening rest.",
                "POSITIVE",
            )
        )

    return patterns
