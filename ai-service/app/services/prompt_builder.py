import json
from typing import Dict, Any, List
from app.schemas.insights import InsightGenerationRequest
from app.services.deterministic_analytics import (
    calculate_period_summary,
    calculate_period_comparison,
    calculate_platform_distribution,
    calculate_goal_adherence,
)
from app.services.pattern_detector import detect_behavioral_patterns

SYSTEM_PROMPT = """You are the ScrollSense Behavioral Insights Engine.
Your purpose is to provide empowering, empathetic, and actionable digital wellbeing insights based strictly on verified short-video browsing metrics (Instagram Reels & YouTube Shorts on desktop Chrome).

CRITICAL BOUNDARIES & INSTRUCTIONS:
1. NEVER diagnose addiction, ADHD, mental illness, sleep disorders, or medical conditions.
2. NEVER claim that browsing caused anxiety, depression, or reduced productivity based solely on telemetry.
3. NEVER calculate, invent, or hallucinate metrics, session durations, or view counts not present in the input. All numbers must directly reflect the provided data.
4. Distinguish factual observations ("Tracked 45m of Reels today") from hypotheses ("This might indicate a tendency to unwind in the evening").
5. Use nonjudgmental, respectful, constructive habit coaching language.
6. Return your answer ONLY as a valid JSON object matching the requested schema with no extra surrounding text or markdown fences.
"""

def build_prompt_payload(request: InsightGenerationRequest) -> Dict[str, Any]:
    curr_summary = calculate_period_summary(request.currentPeriodDays)
    comparison = calculate_period_comparison(request.currentPeriodDays, request.previousPeriodDays)
    platforms = calculate_platform_distribution(request.platformTotals)
    adherence = calculate_goal_adherence(request.currentPeriodDays, request.dailyGoalMinutes)
    patterns = detect_behavioral_patterns(request)

    prompt_data = {
        "userContext": {
            "timezone": request.timezone,
            "dailyGoalMinutes": request.dailyGoalMinutes,
            "quietHours": request.quietHours.model_dump() if request.quietHours else None,
            "dataQuality": request.dataQuality,
        },
        "currentPeriodMetrics": curr_summary,
        "previousPeriodComparison": comparison,
        "platformDistribution": platforms,
        "goalAdherence": adherence,
        "detectedHabitPatterns": [p.to_dict() for p in patterns],
        "prolongedSessionsCount": request.prolongedSessionsCount,
    }

    user_prompt = f"""Analyze the following verified ScrollSense browsing statistics and generate structured digital wellbeing insights:

```json
{json.dumps(prompt_data, indent=2)}
```

Generate a structured response adhering strictly to this JSON format:
{{
  "summary": "1-2 sentence executive summary of overall usage patterns and key takeaways.",
  "observations": [
    "Specific observation citing exact verified metrics from the data.",
    "Another grounded observation about platform split or session trends."
  ],
  "positiveChanges": [
    "Positive habit signal observed (e.g. goal adherence, reduction in duration, or quiet hours compliance)."
  ],
  "areasToImprove": [
    "Specific behavioral area with room for healthier boundary setting (e.g. prolonged sessions or late browsing)."
  ],
  "recommendations": [
    "Actionable, user-controlled habit change suggestion.",
    "Second practical tip (e.g., setting a break timer or shifting scrolling times)."
  ],
  "suggestedGoal": {{
    "dailyLimitMinutes": 35,
    "reasoning": "Empirical rationale for this achievable target limit."
  }},
  "confidenceNotes": [
    "Context on sample size, heuristic view counts (>=2s dwell), or data sufficiency."
  ]
}}
"""
    return {
        "systemPrompt": SYSTEM_PROMPT,
        "userPrompt": user_prompt,
        "promptData": prompt_data,
    }
