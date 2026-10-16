import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx
from app.config import Settings

logger = logging.getLogger("scrollsense.ai.llm")

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_json(
        self, system_prompt: str, user_prompt: str, prompt_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate structured JSON response."""
        pass


class RuleBasedFallbackProvider(BaseLLMProvider):
    """
    Deterministic rule-based synthesizer.
    Guarantees 100% uptime, zero hallucination, zero latency, and zero dependency
    on external third-party LLM APIs.
    """

    async def generate_json(
        self, system_prompt: str, user_prompt: str, prompt_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not prompt_data:
            return self._default_fallback()

        metrics = prompt_data.get("currentPeriodMetrics", {})
        comp = prompt_data.get("previousPeriodComparison", {})
        platforms = prompt_data.get("platformDistribution", {})
        adherence = prompt_data.get("goalAdherence", {})
        patterns = prompt_data.get("detectedHabitPatterns", [])
        goal_min = prompt_data.get("userContext", {}).get("dailyGoalMinutes", 30)

        total_min = metrics.get("totalDurationMinutes", 0)
        avg_daily_min = metrics.get("avgDailyDurationMinutes", 0)
        total_views = metrics.get("totalEstimatedViews", 0)
        active_days = metrics.get("activeDaysCount", 0)
        dominant_platform = platforms.get("dominantPlatform", "Balanced")

        # Summary
        if total_min == 0:
            summary = "No active short-video sessions recorded in this evaluation window."
        elif comp.get("improved"):
            summary = f"Positive habit progression: short-video duration totaled {total_min}m ({avg_daily_min}m/day), showing improved control compared to prior periods."
        elif avg_daily_min <= goal_min:
            summary = f"Steady digital habits maintained: average daily short-video time was {avg_daily_min}m, comfortably within your {goal_min}m goal."
        else:
            summary = f"Active engagement logged: short-video consumption averaged {avg_daily_min}m daily across {active_days} active days, slightly above your {goal_min}m target limit."

        # Observations
        observations = [
            f"Logged a total of {total_min} active minutes (~{total_views} estimated views) across {metrics.get('totalSessions', 0)} browser sessions.",
            f"Platform split was {platforms.get('instagramPercentage', 0)}% Instagram Reels and {platforms.get('youtubePercentage', 0)}% YouTube Shorts ({dominant_platform} primary).",
        ]
        if metrics.get("peakDay"):
            observations.append(
                f"Peak scrolling day was {metrics.get('peakDay')} with {metrics.get('peakDayDurationMinutes', 0)} minutes tracked."
            )

        # Positive changes
        positive_changes = []
        if adherence.get("adherenceRatePercent", 0) >= 50:
            positive_changes.append(
                f"Maintained adherence to your daily goal on {adherence.get('daysWithinGoal', 0)} of {adherence.get('totalDays', 0)} tracked days."
            )
        if comp.get("hasPreviousData") and comp.get("durationPercentChange", 0) < 0:
            positive_changes.append(
                f"Reduced total scrolling duration by {abs(comp.get('durationPercentChange', 0))}% compared to previous records."
            )
        if not positive_changes:
            positive_changes.append("Regular tracking data synchronized successfully, enabling proactive awareness.")

        # Areas to improve
        areas_to_improve = []
        prolonged = prompt_data.get("prolongedSessionsCount", 0)
        if prolonged > 0:
            areas_to_improve.append(
                f"Recorded {prolonged} extended session(s) lasting over 25 continuous minutes."
            )
        if avg_daily_min > goal_min:
            areas_to_improve.append(
                f"Daily average ({avg_daily_min}m) currently exceeds configured target of {goal_min}m."
            )
        if not areas_to_improve:
            areas_to_improve.append("Continue monitoring session lengths to maintain current balanced consumption.")

        # Recommendations
        recommendations = [
            f"Set a 20-minute mid-session reminder to create a natural conscious decision boundary.",
            f"If checking {dominant_platform} during breaks, substitute the final 10 minutes with screen-free hydration or stretching.",
        ]

        # Suggested Goal
        if avg_daily_min > goal_min * 1.5:
            suggested_min = min(120, round((avg_daily_min + goal_min) / 2))
            goal_reasoning = f"Step down incrementally from {avg_daily_min}m towards an achievable {suggested_min}m milestone before tightening to {goal_min}m."
        elif avg_daily_min <= goal_min * 0.7:
            suggested_min = max(15, round(avg_daily_min * 1.1))
            goal_reasoning = f"Your current habits are well under target; {suggested_min}m represents a realistic, sustainable baseline."
        else:
            suggested_min = goal_min
            goal_reasoning = f"Your current {goal_min}m goal matches your routine well; sustain this cadence."

        confidence_notes = [
            "All metrics derive strictly from deterministic browser tab focus tracking.",
            "Video views are heuristic estimates (dwell >= 2.0s), not authoritative platform counters.",
            "Insights are habit-coaching observations and never imply clinical or psychological diagnoses.",
        ]

        return {
            "summary": summary,
            "observations": observations,
            "positiveChanges": positive_changes,
            "areasToImprove": areas_to_improve,
            "recommendations": recommendations,
            "suggestedGoal": {
                "dailyLimitMinutes": suggested_min,
                "reasoning": goal_reasoning,
            },
            "confidenceNotes": confidence_notes,
        }

    def _default_fallback(self) -> Dict[str, Any]:
        return {
            "summary": "Tracking insights are initializing as browsing data is accumulated.",
            "observations": ["Initial baseline tracking recorded."],
            "positiveChanges": ["Telemetry active and synchronized."],
            "areasToImprove": ["Continue browsing normally to establish a 7-day baseline."],
            "recommendations": ["Aim for sessions under 25 minutes to build sustainable habits."],
            "suggestedGoal": {"dailyLimitMinutes": 30, "reasoning": "Standard balanced target."},
            "confidenceNotes": ["Preliminary heuristic observations."],
        }


class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM provider adapter with bounded timeouts and fallbacks."""

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash", timeout: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.fallback = RuleBasedFallbackProvider()

    async def generate_json(
        self, system_prompt: str, user_prompt: str, prompt_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "{}")
                    )
                    return json.loads(raw_text)
                else:
                    logger.warning("Gemini API returned status %s; using fallback", res.status_code)
                    return await self.fallback.generate_json(system_prompt, user_prompt, prompt_data)
        except Exception as e:
            logger.warning("Gemini API call failed (%s); using fallback", str(e))
            return await self.fallback.generate_json(system_prompt, user_prompt, prompt_data)


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider adapter with bounded timeouts and fallbacks."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", timeout: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.fallback = RuleBasedFallbackProvider()

    async def generate_json(
        self, system_prompt: str, user_prompt: str, prompt_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    return json.loads(raw_text)
                else:
                    logger.warning("OpenAI API returned status %s; using fallback", res.status_code)
                    return await self.fallback.generate_json(system_prompt, user_prompt, prompt_data)
        except Exception as e:
            logger.warning("OpenAI API call failed (%s); using fallback", str(e))
            return await self.fallback.generate_json(system_prompt, user_prompt, prompt_data)


def get_llm_provider(cfg: Settings) -> BaseLLMProvider:
    provider = cfg.LLM_PROVIDER.lower()
    if provider == "gemini" and cfg.GEMINI_API_KEY:
        return GeminiProvider(cfg.GEMINI_API_KEY, cfg.LLM_MODEL_NAME, cfg.TIMEOUT_SECONDS)
    elif provider == "openai" and cfg.OPENAI_API_KEY:
        return OpenAIProvider(cfg.OPENAI_API_KEY, cfg.LLM_MODEL_NAME, cfg.TIMEOUT_SECONDS)
    return RuleBasedFallbackProvider()
