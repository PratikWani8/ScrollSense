/**
 * SessionManager
 *
 * Implements the session state machine:
 * IDLE -> FEED_DETECTED -> TRACKING -> PAUSED -> TRACKING -> SESSION_ENDED
 *
 * Accurately measures active dwell time using discrete timestamp slices
 * instead of naive in-memory timers. Handles tab switching, window focus loss,
 * route changes, suspension recovery, and service worker restarts.
 */

import {
  Platform,
  FeedType,
  SessionState,
  TrackingSession,
  QualifiedViewEvent,
  NavigationEvent,
  ScrollingIntentionType,
  SessionIntention,
  TriggerContext,
} from '../shared/types';
import { DETECTOR_VERSION, LIMITS } from '../shared/constants';
import { generateUUID } from './deduplication';

export interface SessionManagerCallbacks {
  onSessionStarted?: (session: TrackingSession) => void;
  onSessionUpdated?: (session: TrackingSession) => void;
  onSessionEnded?: (session: TrackingSession) => void;
  onStateChanged?: (newState: SessionState, previousState: SessionState) => void;
}

export class SessionManager {
  private currentSession: TrackingSession | null = null;
  private state: SessionState = 'IDLE';

  // Sliced timestamp tracking
  private currentSliceStartTime: number | null = null;
  private accumulatedActiveSeconds: number = 0;

  // External conditions
  private isTabActiveAndVisible: boolean = false;
  private isFeedDetected: boolean = false;
  private isTrackingEnabledByUser: boolean = true;
  private activeTabId: number | null = null;

  private callbacks: SessionManagerCallbacks;

  constructor(callbacks: SessionManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getState(): SessionState {
    return this.state;
  }

  public getActiveTabId(): number | null {
    return this.activeTabId;
  }

  public getCurrentSession(): TrackingSession | null {
    if (!this.currentSession) return null;
    const activeDurationSeconds = this.getActiveDurationSeconds();
    let intention = this.currentSession.intention;
    if (intention && activeDurationSeconds >= intention.plannedDurationSeconds) {
      intention = { ...intention, isExceeded: true };
      this.currentSession.intention = intention;
    }
    return {
      ...this.currentSession,
      activeDurationSeconds,
      intention,
      state: this.state,
    };
  }

  public setIntention(intention: { type: ScrollingIntentionType; plannedDurationSeconds: number }): SessionIntention | null {
    if (!this.currentSession) return null;
    const duration = this.getActiveDurationSeconds();
    const sessionIntention: SessionIntention = {
      type: intention.type,
      plannedDurationSeconds: intention.plannedDurationSeconds,
      isExceeded: duration >= intention.plannedDurationSeconds,
      reminderSent: false,
      setAt: Date.now(),
    };
    this.currentSession.intention = sessionIntention;
    this.emitSessionUpdate();
    return sessionIntention;
  }

  public extendIntention(extensionSeconds: number = 300): SessionIntention | null {
    if (!this.currentSession || !this.currentSession.intention) return null;
    const currentDuration = this.getActiveDurationSeconds();
    const newPlanned = this.currentSession.intention.plannedDurationSeconds + extensionSeconds;
    const isExceeded = currentDuration >= newPlanned;
    const updatedIntention: SessionIntention = {
      ...this.currentSession.intention,
      plannedDurationSeconds: newPlanned,
      isExceeded,
      reminderSent: false, // Reset reminder flag so the extended threshold can trigger alert once reached
    };
    this.currentSession.intention = updatedIntention;
    this.emitSessionUpdate();
    return updatedIntention;
  }

  public markIntentionReminderSent(): void {
    if (this.currentSession && this.currentSession.intention) {
      this.currentSession.intention.reminderSent = true;
      this.currentSession.intention.isExceeded = true;
    }
  }

  public pauseTrackingForBreak(): TrackingSession | null {
    if (!this.currentSession) return null;
    return this.endSession('USER_BREAK');
  }

  public setUserContext(context: TriggerContext): void {
    if (!this.currentSession) return;
    this.currentSession.userContext = context;
    this.emitSessionUpdate();
  }

  public getActiveDurationSeconds(): number {
    let duration = this.accumulatedActiveSeconds;
    if (this.state === 'TRACKING' && this.currentSliceStartTime !== null) {
      const sliceSeconds = Math.max(0, Math.floor((Date.now() - this.currentSliceStartTime) / 1000));
      duration += sliceSeconds;
    }
    return duration;
  }

  /**
   * Called when user enters a supported feed (Instagram Reels or YouTube Shorts).
   */
  public handleFeedDetected(
    platform: Platform,
    feedType: FeedType,
    tabId?: number
  ): void {
    this.isFeedDetected = true;
    if (tabId !== undefined) {
      this.activeTabId = tabId;
    }

    // If an existing session for a different platform is open, end it first
    if (this.currentSession && this.currentSession.platform !== platform) {
      this.endSession('PLATFORM_SWITCH');
    }

    if (!this.currentSession) {
      this.startNewSession(platform, feedType);
    } else {
      this.evaluateStateTransition();
    }
  }

  /**
   * Called when user leaves a supported feed route.
   */
  public handleFeedExit(): void {
    this.isFeedDetected = false;
    if (this.currentSession) {
      this.endSession('FEED_EXIT');
    } else {
      this.transitionTo('IDLE');
    }
  }

  /**
   * Called when tab or window visibility/focus changes.
   */
  public handleVisibilityChange(isVisibleAndFocused: boolean): void {
    this.isTabActiveAndVisible = isVisibleAndFocused;
    this.evaluateStateTransition();
  }

  /**
   * Called when user toggles tracking on/off.
   */
  public handleUserTrackingToggle(enabled: boolean): void {
    this.isTrackingEnabledByUser = enabled;
    this.evaluateStateTransition();
  }

  /**
   * Register a qualified view in the current session.
   */
  public recordQualifiedView(event: QualifiedViewEvent): void {
    if (!this.currentSession) return;
    this.currentSession.estimatedVideoViews += 1;
    this.currentSession.lastHeartbeat = Date.now();
    this.emitSessionUpdate();
  }

  /**
   * Register a navigation event (e.g. scrolled to next short) in the current session.
   */
  public recordNavigationEvent(event: NavigationEvent): void {
    if (!this.currentSession) return;
    this.currentSession.navigationEvents += 1;
    this.currentSession.lastHeartbeat = Date.now();
    this.emitSessionUpdate();
  }

  /**
   * Heartbeat from content script to keep session alive.
   */
  public recordHeartbeat(): void {
    if (!this.currentSession) return;
    this.currentSession.lastHeartbeat = Date.now();
  }

  /**
   * End current session gracefully.
   */
  public endSession(reason: string = 'NORMAL'): TrackingSession | null {
    if (!this.currentSession) return null;

    this.sealCurrentSlice();

    const totalActiveSeconds = this.accumulatedActiveSeconds;
    let finalIntention = this.currentSession.intention;
    if (finalIntention) {
      const isExceeded = totalActiveSeconds > finalIntention.plannedDurationSeconds;
      finalIntention = {
        ...finalIntention,
        isExceeded,
        completedWithinPlan: !isExceeded,
      };
    }

    const endedSession: TrackingSession = {
      ...this.currentSession,
      endedAt: Date.now(),
      activeDurationSeconds: totalActiveSeconds,
      intention: finalIntention,
      state: 'SESSION_ENDED',
    };

    const prevSession = this.currentSession;
    this.currentSession = null;
    this.currentSliceStartTime = null;
    this.accumulatedActiveSeconds = 0;
    this.isFeedDetected = false;

    this.transitionTo('SESSION_ENDED');
    this.transitionTo('IDLE');

    if (this.callbacks.onSessionEnded) {
      this.callbacks.onSessionEnded(endedSession);
    }

    return endedSession;
  }

  /**
   * Restore a session after Service Worker suspension / restart.
   */
  public restoreSession(
    savedSession: TrackingSession,
    tabIsOpenAndActive: boolean
  ): boolean {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - savedSession.lastHeartbeat;

    // If too much time has passed without heartbeat, session expired during suspension
    if (timeSinceLastHeartbeat > LIMITS.HEARTBEAT_TIMEOUT_MS) {
      const finalizedSession: TrackingSession = {
        ...savedSession,
        endedAt: savedSession.lastHeartbeat,
        state: 'SESSION_ENDED',
        dataQuality: 'MEDIUM',
      };
      if (this.callbacks.onSessionEnded) {
        this.callbacks.onSessionEnded(finalizedSession);
      }
      this.transitionTo('IDLE');
      return false;
    }

    // Recover session
    this.currentSession = { ...savedSession };
    this.accumulatedActiveSeconds = savedSession.activeDurationSeconds;
    this.isFeedDetected = true;
    this.isTabActiveAndVisible = tabIsOpenAndActive;

    if (tabIsOpenAndActive && this.isTrackingEnabledByUser) {
      this.currentSliceStartTime = now;
      this.transitionTo('TRACKING');
    } else {
      this.currentSliceStartTime = null;
      this.transitionTo('PAUSED');
    }

    this.emitSessionUpdate();
    return true;
  }

  // --- Internal State Machine Transitions ---

  private startNewSession(platform: Platform, feedType: FeedType): void {
    const now = Date.now();
    this.currentSession = {
      sessionId: generateUUID(),
      platform,
      feedType,
      startedAt: now,
      activeDurationSeconds: 0,
      estimatedVideoViews: 0,
      navigationEvents: 0,
      detectorVersion: DETECTOR_VERSION,
      dataQuality: 'HIGH',
      state: 'FEED_DETECTED',
      lastHeartbeat: now,
    };

    this.accumulatedActiveSeconds = 0;
    this.transitionTo('FEED_DETECTED');

    if (this.callbacks.onSessionStarted) {
      this.callbacks.onSessionStarted(this.currentSession);
    }

    this.evaluateStateTransition();
  }

  private evaluateStateTransition(): void {
    if (!this.currentSession) {
      if (this.isFeedDetected) {
        // Will start when feed is known
      } else {
        this.transitionTo('IDLE');
      }
      return;
    }

    const shouldTrack =
      this.isFeedDetected &&
      this.isTabActiveAndVisible &&
      this.isTrackingEnabledByUser;

    if (shouldTrack) {
      if (this.state !== 'TRACKING') {
        this.startNewSlice();
        this.transitionTo('TRACKING');
      }
    } else {
      if (this.state === 'TRACKING') {
        this.sealCurrentSlice();
        this.transitionTo('PAUSED');
      }
    }
  }

  private startNewSlice(): void {
    this.currentSliceStartTime = Date.now();
  }

  private sealCurrentSlice(): void {
    if (this.currentSliceStartTime !== null) {
      const sliceSeconds = Math.max(0, Math.floor((Date.now() - this.currentSliceStartTime) / 1000));
      this.accumulatedActiveSeconds += sliceSeconds;
      this.currentSliceStartTime = null;
    }
    if (this.currentSession) {
      this.currentSession.activeDurationSeconds = this.accumulatedActiveSeconds;
    }
  }

  private transitionTo(newState: SessionState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    if (this.currentSession) {
      this.currentSession.state = newState;
    }
    if (this.callbacks.onStateChanged) {
      this.callbacks.onStateChanged(newState, oldState);
    }
  }

  private emitSessionUpdate(): void {
    if (this.currentSession && this.callbacks.onSessionUpdated) {
      this.callbacks.onSessionUpdated(this.getCurrentSession()!);
    }
  }
}
