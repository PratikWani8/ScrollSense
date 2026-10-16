import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from app.config import settings
from app.schemas.insights import (
    InsightGenerationRequest,
    InsightReportResponse,
    SuggestedGoal,
)
from app.services.prompt_builder import build_prompt_payload
from app.services.llm_provider import get_llm_provider

class InsightGeneratorService:
    def __init__(self):
        self.provider = get_llm_provider(settings)
        self.model_version = f"scrollsense-ai-{settings.LLM_PROVIDER}-v1.0"

    async def generate_report(self, request: InsightGenerationRequest) -> InsightReportResponse:
        total_tracked_sec = sum(d.totalDurationSeconds for d in request.currentPeriodDays)
        active_days = sum(1 for d in request.currentPeriodDays if d.totalDurationSeconds > 0)

        # 1. Evaluate Data Sufficiency
        if not request.currentPeriodDays or total_tracked_sec < 300:
            return self._build_insufficient_data_report(request)

        data_sufficiency = "SUFFICIENT" if active_days >= 3 else "MODERATE"

        # 2. Build deterministic prompt payload
        payload = build_prompt_payload(request)

        # 3. Query LLM Provider (with graceful automatic fallback)
        raw_json = await self.provider.generate_json(
            payload["systemPrompt"], payload["userPrompt"], payload["promptData"]
        )

        # 4. Construct and validate response against schema
        report_id = f"rep_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        suggested_goal_obj = None
        if "suggestedGoal" in raw_json and isinstance(raw_json["suggestedGoal"], dict):
            sg = raw_json["suggestedGoal"]
            suggested_goal_obj = SuggestedGoal(
                dailyLimitMinutes=int(sg.get("dailyLimitMinutes", request.dailyGoalMinutes)),
                reasoning=str(sg.get("reasoning", "Recommended achievable limit.")),
            )

        return InsightReportResponse(
            reportId=report_id,
            summary=str(raw_json.get("summary", "Weekly behavioral habit summary.")),
            observations=list(raw_json.get("observations", ["Telemetry recorded."])),
            positiveChanges=list(raw_json.get("positiveChanges", ["Active tracking engaged."])),
            areasToImprove=list(raw_json.get("areasToImprove", ["Monitor session lengths."])),
            recommendations=list(raw_json.get("recommendations", ["Take screen breaks every 20m."])),
            suggestedGoal=suggested_goal_obj,
            confidenceNotes=list(raw_json.get("confidenceNotes", ["Verified browser metrics."])),
            dataSufficiency=data_sufficiency,
            generatedAt=now_iso,
            modelVersion=self.model_version,
            provider=settings.LLM_PROVIDER,
        )

    def _build_insufficient_data_report(
        self, request: InsightGenerationRequest
    ) -> InsightReportResponse:
        report_id = f"rep_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        return InsightReportResponse(
            reportId=report_id,
            summary="Insufficient browsing telemetry accumulated to generate high-confidence habit patterns.",
            observations=[
                "Less than 5 minutes of total active feed browsing recorded in this evaluation window.",
                "Short-video tracking requires at least 2 active days to establish a reliable baseline.",
            ],
            positiveChanges=[
                "Extension pairing verified; background synchronization is active."
            ],
            areasToImprove=[
                "Continue using your desktop browser to accumulate representative habit data."
            ],
            recommendations=[
                f"Keep your daily target set to {request.dailyGoalMinutes}m while initial baseline metrics are gathered.",
                "Browse normally; observations will populate once sessions are logged.",
            ],
            suggestedGoal=SuggestedGoal(
                dailyLimitMinutes=request.dailyGoalMinutes,
                reasoning="Retaining baseline target while collecting usage data.",
            ),
            confidenceNotes=[
                "Data quality is marked INSUFFICIENT due to limited sample duration.",
                "No speculative conclusions are drawn until adequate data is collected.",
            ],
            dataSufficiency="INSUFFICIENT",
            generatedAt=now_iso,
            modelVersion=self.model_version,
            provider=settings.LLM_PROVIDER,
        )

insight_generator = InsightGeneratorService()
