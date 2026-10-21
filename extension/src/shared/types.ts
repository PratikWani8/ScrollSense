/**
 * Core type definitions for ScrollSense Chrome Extension.
 */

export type Platform = 'instagram' | 'youtube';

export type FeedType = 'instagram_reels' | 'youtube_shorts';

export type SessionState =
  | 'IDLE'
  | 'FEED_DETECTED'
  | 'TRACKING'
  | 'PAUSED'
  | 'SESSION_ENDED';

export type DetectorStatus =
  | 'IDLE'
  | 'FEED_DETECTED'
  | 'CANDIDATE_ACTIVE'
  | 'DETECTION_UNAVAILABLE'
  | 'UNSUPPORTED_PAGE'
  | 'PAUSED';

export interface DetectorHealth {
  feedDetected: boolean;
  candidateDetected: boolean;
  trackingActive: boolean;
  status: DetectorStatus;
  currentRoute?: string;
  platform?: Platform;
  candidateId?: string;
  confidence: number; // 0.0 to 1.0
  lastError?: string;
  detectorVersion: string;
  updatedAt: number;
}

export interface VideoCandidate {
  candidateId: string; // Privacy-preserving hash
  platform: Platform;
  feedType: FeedType;
  firstSeenAt: number;
  dwellDurationMs: number;
  isQualified: boolean;
  qualifiedAt?: number;
  confidence: number;
}

export interface QualifiedViewEvent {
  eventId: string; // UUIDv4
  sessionId: string;
  candidateId: string;
  platform: Platform;
  feedType: FeedType;
  occurredAt: number;
  dwellDurationSeconds: number;
  detectorVersion: string;
  confidence: number;
}

export interface NavigationEvent {
  eventId: string;
  sessionId: string;
  platform: Platform;
  occurredAt: number;
  fromCandidateId?: string;
  toCandidateId?: string;
}

export type ScrollingIntentionType =
  | 'Learning'
  | 'Entertainment'
  | 'Finding Something Specific'
  | 'Taking a Short Break'
  | 'Other';

export interface SessionIntention {
  type: ScrollingIntentionType;
  plannedDurationSeconds: number; // e.g. 300, 600, 900, 1200, 1800
  isExceeded: boolean;
  completedWithinPlan?: boolean;
  reminderSent: boolean;
  setAt: number;
}

export type TriggerContext =
  | 'Boredom'
  | 'Taking a break'
  | 'Procrastination'
  | 'Stress'
  | 'Habit / Automatic Opening'
  | 'Other';

export interface TrackingSession {
  sessionId: string;
  platform: Platform;
  feedType: FeedType;
  startedAt: number;
  endedAt?: number;
  activeDurationSeconds: number;
  estimatedVideoViews: number;
  navigationEvents: number;
  detectorVersion: string;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  state: SessionState;
  lastHeartbeat: number;
  intention?: SessionIntention;
  userContext?: TriggerContext;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  instagramDurationSeconds: number;
  youtubeDurationSeconds: number;
  totalDurationSeconds: number;
  estimatedInstagramViews: number;
  estimatedYouTubeViews: number;
  sessionCount: number;
  longSessionCount: number;
  doomscrollScore: number;
}

export interface DoomscrollFactor {
  factor: string;
  weight: number;
  scoreDelta: number;
  description: string;
}

export type DoomscrollClassification =
  | 'Within your goal'
  | 'Consider a break'
  | 'High-usage pattern'
  | 'Goal exceeded';

export interface DoomscrollScoreResult {
  score: number; // 0 to 100
  classification: DoomscrollClassification;
  contributingFactors: DoomscrollFactor[];
  interventionRecommended: boolean;
  recommendedAction?: 'TAKE_A_BREAK' | 'GOAL_ALERT' | 'LATE_NIGHT_ALERT';
}

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number; // 0-23 (e.g. 23 = 11 PM)
  endHour: number;   // 0-23 (e.g. 7 = 7 AM)
}

export interface UserSettings {
  trackingEnabled: boolean;
  cloudSyncEnabled: boolean;
  videoViewEstimationEnabled: boolean;
  qualificationThresholdSeconds: number; // Default 2.0s
  longSessionReminderMinutes: number;    // Default 25m
  dailyShortVideoGoalMinutes: number;    // Default 30m
  breakRemindersEnabled: boolean;
  intentionLimitNotificationsEnabled: boolean; // Independent intention-limit desktop notifications
  inPageAlertsEnabled: boolean;                // Independent in-page floating modal alert
  devTestModeEnabled?: boolean;               // Development test mode (e.g. 10s limit)
  quietHours: QuietHoursConfig;
  dataRetentionDays: number;
}

export interface DevicePairingState {
  isPaired: boolean;
  deviceId: string;
  deviceToken?: string;
  deviceName: string;
  lastSyncAt?: number;
  syncStatus: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE' | 'UNPAIRED';
  lastSyncError?: string;
  pendingPairingCode?: string;
  backendUrl: string;
}

export interface StorageSchemaV1 {
  schemaVersion: number;
  settings: UserSettings;
  pairing?: DevicePairingState;
  currentSession: TrackingSession | null;
  recentSessions: TrackingSession[];
  unsyncedEvents: QualifiedViewEvent[];
  dailyStats: Record<string, DailySummary>;
  activeSessionRecovery?: {
    sessionId: string;
    platform: Platform;
    startedAt: number;
    lastHeartbeat: number;
    activeDurationSeconds: number;
    tabId?: number;
    intention?: SessionIntention;
    userContext?: TriggerContext;
  };
}

