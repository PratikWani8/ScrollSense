from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

class DailyUsagePoint(BaseModel):
    date: str = Field(..., description="Date string in YYYY-MM-DD")
    totalDurationSeconds: int = Field(default=0, ge=0)
    instagramDurationSeconds: int = Field(default=0, ge=0)
    youtubeDurationSeconds: int = Field(default=0, ge=0)
    estimatedInstagramViews: int = Field(default=0, ge=0)
    estimatedYouTubeViews: int = Field(default=0, ge=0)
    sessionCount: int = Field(default=0, ge=0)
    doomscrollScore: int = Field(default=0, ge=0, le=100)

class PlatformSummary(BaseModel):
    durationSeconds: int = Field(default=0, ge=0)
    estimatedViews: int = Field(default=0, ge=0)
    sessionCount: int = Field(default=0, ge=0)

class QuietHoursConfig(BaseModel):
    enabled: bool = False
    startHour: int = 22
    endHour: int = 7

class InsightGenerationRequest(BaseModel):
    userId: str = Field(..., description="Anonymized user identifier")
    timezone: str = Field(default="UTC", description="User's IANA timezone")
    currentPeriodDays: List[DailyUsagePoint] = Field(default_factory=list)
    previousPeriodDays: List[DailyUsagePoint] = Field(default_factory=list)
    platformTotals: Dict[str, PlatformSummary] = Field(default_factory=dict)
    dailyGoalMinutes: int = Field(default=30, ge=5, le=480)
    quietHours: Optional[QuietHoursConfig] = None
    prolongedSessionsCount: int = Field(default=0, ge=0)
    dataQuality: Literal["SUFFICIENT", "PARTIAL", "INSUFFICIENT"] = "SUFFICIENT"

class SuggestedGoal(BaseModel):
    dailyLimitMinutes: int = Field(..., ge=10, le=240)
    reasoning: str

class InsightReportResponse(BaseModel):
    reportId: str
    summary: str
    observations: List[str]
    positiveChanges: List[str]
    areasToImprove: List[str]
    recommendations: List[str]
    suggestedGoal: Optional[SuggestedGoal] = None
    confidenceNotes: List[str]
    dataSufficiency: Literal["SUFFICIENT", "MODERATE", "INSUFFICIENT"] = "SUFFICIENT"
    generatedAt: str
    modelVersion: str
    provider: str
