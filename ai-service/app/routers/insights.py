from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Depends
from app.config import settings
from app.schemas.insights import InsightGenerationRequest, InsightReportResponse
from app.services.insight_generator import insight_generator

router = APIRouter(prefix="/api/v1/insights", tags=["Insights"])

def verify_internal_key(x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key")):
    """
    Validates internal service key between Node.js backend and FastAPI AI microservice.
    """
    if settings.INTERNAL_API_KEY:
        if not x_internal_key or x_internal_key != settings.INTERNAL_API_KEY:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Invalid or missing X-Internal-Key header.",
            )

@router.post("/generate", response_model=InsightReportResponse, dependencies=[Depends(verify_internal_key)])
async def generate_insight_report(request: InsightGenerationRequest):
    """
    Generate structured, nonjudgmental AI behavioral insights
    based strictly on deterministic aggregated metrics.
    """
    try:
        report = await insight_generator.generate_report(request)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insight report: {str(e)}",
        )

@router.post("/preview", dependencies=[Depends(verify_internal_key)])
async def generate_insight_preview(request: InsightGenerationRequest):

    """
    Generate lightweight summary and top recommendation for quick dashboard preview.
    """
    try:
        report = await insight_generator.generate_report(request)
        return {
            "summary": report.summary,
            "topRecommendation": report.recommendations[0] if report.recommendations else None,
            "dataSufficiency": report.dataSufficiency,
            "suggestedGoal": report.suggestedGoal,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate preview: {str(e)}",
        )
