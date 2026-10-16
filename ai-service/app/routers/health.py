from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "scrollsense-ai-service",
        "version": "1.0.0",
        "activeProvider": settings.LLM_PROVIDER,
        "fallbackReady": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
