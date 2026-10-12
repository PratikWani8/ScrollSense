export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  preferences: {
    trackingEnabled: boolean;
    videoViewEstimationEnabled: boolean;
    breakRemindersEnabled: boolean;
  };
  dailyGoals: {
    shortVideoMinutes: number;
  };
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
}

export interface OverviewMetrics {
  date: string;
  timezone: string;
  today: {
    totalDurationSeconds: number;
    instagramDurationSeconds: number;
    youtubeDurationSeconds: number;
    estimatedInstagramViews: number;
    estimatedYouTubeViews: number;
    sessionCount: number;
    longestSessionSeconds: number;
    averageSessionSeconds: number;
    doomscrollScore: number;
  };
  goal: {
    dailyLimitSeconds: number;
    progressPercentage: number;
    isGoalExceeded: boolean;
  };
  syncStatus: {
    connectedDeviceCount: number;
    lastSyncAt?: string;
    isSyncActive: boolean;
  };
  recentSessions: TrackingSessionSummary[];
}

export interface TrackingSessionSummary {
  _id?: string;
  sessionId: string;
  platform: 'instagram' | 'youtube';
  feedType: 'instagram_reels' | 'youtube_shorts';
  startedAt: string;
  endedAt?: string;
  activeDurationSeconds: number;
  estimatedVideoViews: number;
  navigationEvents: number;
  detectorVersion: string;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  intention?: SessionIntention;
  userContext?: string;
}

export interface TrendDay {
  date: string;
  totalDurationSeconds: number;
  instagramDurationSeconds: number;
  youtubeDurationSeconds: number;
  estimatedInstagramViews: number;
  estimatedYouTubeViews: number;
  sessionCount: number;
  doomscrollScore: number;
}

export interface PlatformMetrics {
  instagram: {
    totalDurationSeconds: number;
    estimatedViews: number;
    sessionCount: number;
  };
  youtube: {
    totalDurationSeconds: number;
    estimatedViews: number;
    sessionCount: number;
  };
  instagramPercentage: number;
  youtubePercentage: number;
}

export interface HourlyBucket {
  hour: number;
  hourLabel: string;
  instagramSeconds: number;
  youtubeSeconds: number;
  totalSeconds: number;
}

export interface DeviceItem {
  _id?: string;
  deviceId: string;
  deviceName: string;
  extensionVersion: string;
  lastSyncAt?: string;
  syncEnabled: boolean;
  createdAt: string;
}

export interface GoalData {
  _id?: string;
  platform: 'all' | 'instagram' | 'youtube';
  dailyLimitSeconds: number;
  reminderIntervalMinutes: number;
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  enabled: boolean;
}

export interface DoomscrollFactorBreakdown {
  ruleId: string;
  factor: string;
  weight: number;
  scoreDelta: number;
  description: string;
  normalizedValue: number;
}

export interface DoomscrollScoreBreakdown {
  date: string;
  timezone: string;
  score: number;
  classification: string;
  ruleId: string;
  contributingFactors: DoomscrollFactorBreakdown[];
  thresholds: {
    longSessionMinutes: number;
    dailyGoalMinutes: number;
    returnWindowMinutes: number;
    quietHours: {
      enabled: boolean;
      startHour: number;
      endHour: number;
    };
  };
  dataQuality: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';
  interventionRecommended: boolean;
  recommendedAction?: 'TAKE_A_BREAK' | 'GOAL_ALERT' | 'LATE_NIGHT_ALERT' | 'REDUCE_VELOCITY';
  interventionReason?: string;
  activeReminder?: {
    eventId: string;
    detectedAt: string;
    ruleId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    reason?: string;
  } | null;
}

export interface DoomscrollEventItem {
  _id: string;
  detectedAt: string;
  ruleId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  contributingSignals: Array<{
    factor: string;
    scoreDelta: number;
    description: string;
  }>;
  thresholdValues?: Record<string, any>;
  reminderStatus: 'SHOWN' | 'DISMISSED' | 'ACCEPTED';
}

export interface AIInsightReport {
  _id?: string;
  reportId: string;
  periodStart?: string;
  periodEnd?: string;
  summary: string;
  observations: string[];
  positiveChanges: string[];
  areasToImprove: string[];
  recommendations: string[];
  suggestedGoal?: {
    dailyLimitMinutes: number;
    reasoning: string;
  };
  confidenceNotes: string[];
  dataSufficiency: 'SUFFICIENT' | 'MODERATE' | 'INSUFFICIENT';
  modelVersion: string;
  provider: string;
  createdAt?: string;
}

// Advanced Features: Intent-Aware Scrolling
export type ScrollingIntentionType =
  | 'Learning'
  | 'Entertainment'
  | 'Finding Something Specific'
  | 'Taking a Short Break'
  | 'Other';

export interface SessionIntention {
  type: ScrollingIntentionType;
  plannedDurationSeconds: number;
  isExceeded: boolean;
  completedWithinPlan?: boolean;
  reminderSent: boolean;
  setAt: string;
}

export interface IntentionAdherenceMetrics {
  totalSessionsWithIntent: number;
  successfulSessions: number;
  adherenceRatePercentage: number;
  intentBreakdown: Record<string, {
    count: number;
    adheredCount: number;
    adherenceRate: number;
    totalPlannedSeconds: number;
    totalActualSeconds: number;
  }>;
}

export interface CurrentIntentionData {
  hasActiveIntention: boolean;
  session?: TrackingSessionSummary;
}

// Advanced Features: Personal Doomscroll Trigger Map
export interface TriggerHeatmapCell {
  dayOfWeek: number;
  dayLabel: string;
  timeBlock: 'Night' | 'Morning' | 'Afternoon' | 'Evening';
  sessionCount: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  medianDurationSeconds: number;
  prolongedSessionCount: number;
  prolongedSessionRate: number;
}

export interface PersonalTriggerMapData {
  hasSufficientData: boolean;
  totalSessionsAnalyzed: number;
  requiredSessions: number;
  heatmap: TriggerHeatmapCell[];
  timeBlockAverages: Record<string, { totalSessions: number; avgDurationSeconds: number; medianDurationSeconds: number }>;
  dayOfWeekAverages: Record<string, { totalSessions: number; avgDurationSeconds: number }>;
  peakDoomscrollTimeBlocks: string[];
  contextDistribution: Record<string, number>;
  observations: string[];
}

// Advanced Features: Time Reclaimed Score
export interface TimeReclaimedData {
  hasSufficientBaseline: boolean;
  baselineDaysCount: number;
  baselineAverageSeconds: number;
  todayActualSeconds: number;
  todayTimeReclaimedSeconds: number;
  isTodayPositive: boolean;
  weeklyBaselineExpectedSeconds: number;
  weeklyActualSeconds: number;
  weeklyTimeReclaimedSeconds: number;
  isWeeklyPositive: boolean;
  dailyHistory: Array<{
    date: string;
    actualSeconds: number;
    baselineExpectedSeconds: number;
    timeReclaimedSeconds: number;
    isPositive: boolean;
  }>;
}

