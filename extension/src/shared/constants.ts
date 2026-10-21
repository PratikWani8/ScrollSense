import { UserSettings } from './types';

export const DETECTOR_VERSION = '1.0.0';
export const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  trackingEnabled: true,
  cloudSyncEnabled: false, // Phase 1 is strictly local-first
  videoViewEstimationEnabled: true,
  qualificationThresholdSeconds: 2.0, // Default dwell-time threshold: 2 seconds
  longSessionReminderMinutes: 25,     // Product default: 25 minutes
  dailyShortVideoGoalMinutes: 30,     // Product default: 30 minutes
  breakRemindersEnabled: true,
  intentionLimitNotificationsEnabled: true, // Default enabled
  inPageAlertsEnabled: true,                // Default enabled
  devTestModeEnabled: false,
  quietHours: {
    enabled: true,
    startHour: 23, // 11:00 PM
    endHour: 7,    // 07:00 AM
  },
  dataRetentionDays: 30,
};

export const DEFAULT_PAIRING_STATE = {
  isPaired: false,
  deviceId: '',
  deviceName: 'Chrome Desktop Extension',
  syncStatus: 'UNPAIRED' as const,
  backendUrl: 'http://localhost:5000/api/v1',
};

export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schemaVersion',
  SETTINGS: 'settings',
  PAIRING: 'pairing',
  CURRENT_SESSION: 'currentSession',
  RECENT_SESSIONS: 'recentSessions',
  UNSYNCED_EVENTS: 'unsyncedEvents',
  DAILY_STATS: 'dailyStats',
  RECOVERY_META: 'activeSessionRecovery',
} as const;

export const LIMITS = {
  MAX_RECENT_SESSIONS: 200,
  MAX_UNSYNCED_EVENTS: 1000,
  HEARTBEAT_INTERVAL_MS: 3000,      // 3 seconds between content heartbeats
  HEARTBEAT_TIMEOUT_MS: 12000,      // 12 seconds without heartbeat ends active session
  IDLE_SESSION_TIMEOUT_MS: 60000,   // 1 minute with no video/feed ends session
  ALARM_RECOVERY_NAME: 'scrollsense-session-watchdog',
  ALARM_RECOVERY_INTERVAL_MINUTES: 1, // Periodic check for SW recovery
};

export const ROUTES = {
  INSTAGRAM_REELS_PATTERN: /\/(reels|reel)\/([a-zA-Z0-9_-]+)?/i,
  YOUTUBE_SHORTS_PATTERN: /\/shorts(\/([a-zA-Z0-9_-]+))?/i,
};
