import {
  Platform,
  FeedType,
  DetectorHealth,
  TrackingSession,
  DailySummary,
  DoomscrollScoreResult,
  UserSettings,
  ScrollingIntentionType,
  TriggerContext,
} from './types';

// Content -> Background Messages
export interface MsgFeedStatusChanged {
  type: 'CONTENT_FEED_STATUS_CHANGED';
  payload: {
    platform: Platform;
    feedType: FeedType;
    isActive: boolean; // True if on reels/shorts route and visible
    currentRoute: string;
    health: DetectorHealth;
  };
}

export interface MsgCandidateChanged {
  type: 'CONTENT_CANDIDATE_CHANGED';
  payload: {
    platform: Platform;
    feedType: FeedType;
    candidateId: string;
    confidence: number;
    timestamp: number;
  };
}

export interface MsgQualifiedView {
  type: 'CONTENT_QUALIFIED_VIEW';
  payload: {
    platform: Platform;
    feedType: FeedType;
    candidateId: string;
    dwellDurationSeconds: number;
    timestamp: number;
    confidence: number;
  };
}

export interface MsgNavigationEvent {
  type: 'CONTENT_NAVIGATION_EVENT';
  payload: {
    platform: Platform;
    timestamp: number;
    fromCandidateId?: string;
    toCandidateId?: string;
  };
}

export interface MsgHeartbeat {
  type: 'CONTENT_HEARTBEAT';
  payload: {
    platform: Platform;
    feedType: FeedType;
    timestamp: number;
    dwellSeconds: number;
  };
}

// Popup -> Background Messages
export interface MsgPopupGetStatus {
  type: 'POPUP_GET_STATUS';
}

export interface MsgPopupToggleTracking {
  type: 'POPUP_TOGGLE_TRACKING';
  payload?: {
    enabled: boolean;
  };
}

export interface MsgPopupResetData {
  type: 'POPUP_RESET_DATA';
}

export interface MsgPopupUpdateSettings {
  type: 'POPUP_UPDATE_SETTINGS';
  payload: Partial<UserSettings>;
}

export interface MsgPopupStartPairing {
  type: 'POPUP_START_PAIRING';
  payload?: {
    backendUrl?: string;
  };
}

export interface MsgPopupCheckPairing {
  type: 'POPUP_CHECK_PAIRING';
}

export interface MsgPopupDisconnectDevice {
  type: 'POPUP_DISCONNECT_DEVICE';
}

export interface MsgPopupToggleSync {
  type: 'POPUP_TOGGLE_SYNC';
  payload?: {
    enabled: boolean;
  };
}

export interface MsgPopupTriggerSync {
  type: 'POPUP_TRIGGER_SYNC';
}

export interface MsgPopupSetIntention {
  type: 'POPUP_SET_INTENTION';
  payload: {
    type: ScrollingIntentionType;
    plannedDurationSeconds: number;
  };
}

export interface MsgPopupSetContext {
  type: 'POPUP_SET_CONTEXT';
  payload: {
    context: TriggerContext;
    sessionId?: string;
  };
}

export interface MsgPopupExtendIntention {
  type: 'POPUP_EXTEND_INTENTION';
  payload: {
    extensionSeconds: number;
  };
}

// Background -> Content Script Messages
export interface MsgBgShowIntentionAlert {
  type: 'BG_SHOW_INTENTION_LIMIT_ALERT';
  payload: {
    sessionId: string;
    intentionType: ScrollingIntentionType;
    plannedDurationSeconds: number;
    activeDurationSeconds: number;
    isTestMode?: boolean;
  };
}

// Content Script -> Background Messages
export interface MsgContentIntentionAction {
  type: 'CONTENT_INTENTION_ACTION';
  payload: {
    sessionId: string;
    action: 'TAKE_A_BREAK' | 'CONTINUE_5_MIN' | 'DISMISS';
  };
}

// Background -> Popup Response
export interface PopupStatusResponse {
  currentSession: TrackingSession | null;
  todaySummary: DailySummary;
  doomscrollResult: DoomscrollScoreResult;
  settings: UserSettings;
  pairing: import('./types').DevicePairingState;
  health: DetectorHealth | null;
  activePlatform: Platform | null;
  unsyncedCount: number;
}

export type ExtensionMessage =
  | MsgFeedStatusChanged
  | MsgCandidateChanged
  | MsgQualifiedView
  | MsgNavigationEvent
  | MsgHeartbeat
  | MsgPopupGetStatus
  | MsgPopupToggleTracking
  | MsgPopupResetData
  | MsgPopupUpdateSettings
  | MsgPopupStartPairing
  | MsgPopupCheckPairing
  | MsgPopupDisconnectDevice
  | MsgPopupToggleSync
  | MsgPopupTriggerSync
  | MsgPopupSetIntention
  | MsgPopupSetContext
  | MsgPopupExtendIntention
  | MsgBgShowIntentionAlert
  | MsgContentIntentionAction;
