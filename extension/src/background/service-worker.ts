/**
 * Background Service Worker
 *
 * Manifest V3 background service worker for ScrollSense.
 * Orchestrates session management, tab state, event processing,
 * durable storage persistence, and suspension recovery.
 */

import {
  ExtensionMessage,
  PopupStatusResponse,
} from '../shared/messages';
import {
  Platform,
  FeedType,
  DetectorHealth,
  TrackingSession,
  UserSettings,
} from '../shared/types';
import { LIMITS } from '../shared/constants';
import { StorageManager } from './storage-manager';
import { TabStateManager, detectFeedFromUrl } from './tab-state-manager';
import { SessionManager } from '../tracking/session-manager';
import { EventProcessor, getTodayDateString } from '../tracking/event-processor';
import { DoomscrollEngine } from '../tracking/doomscroll-engine';
import { SyncManager } from './sync-manager';

class BackgroundController {
  private sessionManager!: SessionManager;
  private eventProcessor!: EventProcessor;
  private tabStateManager!: TabStateManager;
  private syncManager!: SyncManager;
  private settings!: UserSettings;
  private latestHealth: DetectorHealth | null = null;
  private activePlatform: Platform | null = null;
  private activeFeedTabId: number | null = null;
  private activeSessionTickerId: ReturnType<typeof setInterval> | null = null;

  private isInitialized: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // 1. Initialize Storage & Settings
    const storageData = await StorageManager.initialize();
    this.settings = storageData.settings;

    // 2. Initialize Event Processor
    this.eventProcessor = new EventProcessor(
      storageData.dailyStats,
      storageData.recentSessions,
      storageData.unsyncedEvents
    );

    // 3. Initialize Sync Manager
    this.syncManager = new SyncManager();

    // 4. Initialize Session Manager
    this.sessionManager = new SessionManager({
      onSessionStarted: (session) => this.handleSessionStarted(session),
      onSessionUpdated: (session) => this.handleSessionUpdated(session),
      onSessionEnded: (session) => this.handleSessionEnded(session),
      onStateChanged: (newState) => this.updateExtensionBadge(newState),
    });

    this.sessionManager.handleUserTrackingToggle(this.settings.trackingEnabled);

    // 5. Initialize Tab State Manager
    this.tabStateManager = new TabStateManager({
      onActiveTabChanged: (tabId, match, url) => this.handleActiveTabChanged(tabId, match, url),
      onFocusChanged: (isFocused) => this.sessionManager.handleVisibilityChange(isFocused),
      onTabClosed: (tabId) => this.handleTabClosed(tabId),
    });
    this.tabStateManager.initialize();

    // 6. Register Message Listener
    this.setupMessageListener();

    // 7. Register Alarms for Recovery & Watchdog
    this.setupAlarms();

    // 8. Attempt Session Suspension Recovery
    await this.recoverSuspendedSession(storageData);

    this.isInitialized = true;
  }

  private setupMessageListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      this.handleIncomingMessage(message, sender)
        .then((response) => sendResponse(response))
        .catch((err) => {
          console.error('[ScrollSense SW] Error handling message:', err);
          sendResponse({ error: err.message });
        });
      return true; // Keep channel open for async response
    });
  }

  private async handleIncomingMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    if (sender.tab?.id) {
      this.activeFeedTabId = sender.tab.id;
    }

    switch (message.type) {
      case 'CONTENT_FEED_STATUS_CHANGED': {
        const { platform, feedType, isActive, health } = message.payload;
        this.latestHealth = health;
        this.activePlatform = isActive ? platform : null;

        if (isActive) {
          const tabId = sender.tab?.id ?? this.tabStateManager.getActiveTabId() ?? undefined;
          this.sessionManager.handleFeedDetected(platform, feedType, tabId);
          this.startActiveSessionTimer();
        } else {
          this.sessionManager.handleFeedExit();
          this.stopActiveSessionTimer();
        }
        this.checkActiveSessionPeriodic();
        return { success: true };
      }

      case 'CONTENT_CANDIDATE_CHANGED': {
        this.sessionManager.recordHeartbeat();
        await this.persistActiveSessionSnapshot();
        this.startActiveSessionTimer();
        this.checkActiveSessionPeriodic();
        return { success: true };
      }

      case 'CONTENT_QUALIFIED_VIEW': {
        const { platform, feedType, candidateId, dwellDurationSeconds, timestamp, confidence } = message.payload;
        const currentSession = this.sessionManager.getCurrentSession();
        if (currentSession) {
          const qualifiedEvent = {
            eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            sessionId: currentSession.sessionId,
            candidateId,
            platform,
            feedType,
            occurredAt: timestamp,
            dwellDurationSeconds,
            detectorVersion: currentSession.detectorVersion,
            confidence,
          };

          this.sessionManager.recordQualifiedView(qualifiedEvent);
          this.eventProcessor.processQualifiedView(qualifiedEvent);
          await StorageManager.appendUnsyncedEvent(qualifiedEvent);
          await this.persistActiveSessionSnapshot();
          this.checkActiveSessionPeriodic();
        }
        return { success: true };
      }

      case 'CONTENT_NAVIGATION_EVENT': {
        const currentSession = this.sessionManager.getCurrentSession();
        if (currentSession) {
          this.sessionManager.recordNavigationEvent({
            eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            sessionId: currentSession.sessionId,
            platform: message.payload.platform,
            occurredAt: message.payload.timestamp,
            fromCandidateId: message.payload.fromCandidateId,
            toCandidateId: message.payload.toCandidateId,
          });
          await this.persistActiveSessionSnapshot();
          this.checkActiveSessionPeriodic();
        }
        return { success: true };
      }

      case 'CONTENT_HEARTBEAT': {
        this.sessionManager.recordHeartbeat();
        await this.persistActiveSessionSnapshot();
        this.startActiveSessionTimer();
        this.checkActiveSessionPeriodic();
        return { success: true };
      }

      case 'POPUP_GET_STATUS': {
        this.checkActiveSessionPeriodic();
        return this.generatePopupStatusResponse();
      }

      case 'POPUP_TOGGLE_TRACKING': {
        const enabled = message.payload?.enabled ?? !this.settings.trackingEnabled;
        this.settings = await StorageManager.updateSettings({ trackingEnabled: enabled });
        this.sessionManager.handleUserTrackingToggle(enabled);
        return { success: true, trackingEnabled: enabled };
      }

      case 'POPUP_RESET_DATA': {
        this.sessionManager.endSession('USER_RESET');
        this.eventProcessor.clearAllData();
        await StorageManager.clearAllTrackingData();
        return { success: true };
      }

      case 'POPUP_UPDATE_SETTINGS': {
        this.settings = await StorageManager.updateSettings(message.payload);
        this.sessionManager.handleUserTrackingToggle(this.settings.trackingEnabled);
        return { success: true, settings: this.settings };
      }

      case 'POPUP_START_PAIRING': {
        try {
          const res = await this.syncManager.requestPairingCode(message.payload?.backendUrl);
          return { success: true, ...res };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      }

      case 'POPUP_CHECK_PAIRING': {
        const res = await this.syncManager.checkPairingApproval();
        return { success: true, ...res };
      }

      case 'POPUP_DISCONNECT_DEVICE': {
        await this.syncManager.disconnect();
        return { success: true };
      }

      case 'POPUP_TOGGLE_SYNC': {
        const enabled = message.payload?.enabled ?? !this.settings.cloudSyncEnabled;
        this.settings = await StorageManager.updateSettings({ cloudSyncEnabled: enabled });
        if (enabled) {
          this.syncManager.triggerSync().catch(() => {});
        }
        return { success: true, cloudSyncEnabled: enabled };
      }

      case 'POPUP_TRIGGER_SYNC': {
        const res = await this.syncManager.triggerSync();
        return res;
      }

      case 'POPUP_SET_INTENTION': {
        const intention = this.sessionManager.setIntention(message.payload);
        const session = this.sessionManager.getCurrentSession();
        if (session) {
          await StorageManager.saveCurrentSession(session);
          await this.persistActiveSessionSnapshot();
          if (this.settings.cloudSyncEnabled) {
            this.syncManager.triggerSync(session).catch(() => {});
          }
          this.startActiveSessionTimer();
          this.checkActiveSessionPeriodic();
        }
        return { success: true, intention };
      }

      case 'POPUP_SET_CONTEXT': {
        this.sessionManager.setUserContext(message.payload.context);
        const session = this.sessionManager.getCurrentSession();
        if (session) {
          await StorageManager.saveCurrentSession(session);
          await this.persistActiveSessionSnapshot();
          if (this.settings.cloudSyncEnabled) {
            this.syncManager.triggerSync(session).catch(() => {});
          }
        }
        return { success: true };
      }

      case 'POPUP_EXTEND_INTENTION': {
        const extensionSecs = message.payload?.extensionSeconds || 300;
        const updated = this.sessionManager.extendIntention(extensionSecs);
        const session = this.sessionManager.getCurrentSession();
        if (session) {
          await StorageManager.saveCurrentSession(session);
          await this.persistActiveSessionSnapshot();
          if (this.settings.cloudSyncEnabled) {
            this.syncManager.triggerSync(session).catch(() => {});
          }
          this.startActiveSessionTimer();
          this.checkActiveSessionPeriodic();
        }
        return { success: true, intention: updated };
      }

      case 'CONTENT_INTENTION_ACTION': {
        const { sessionId, action } = message.payload;
        const currentSession = this.sessionManager.getCurrentSession();
        if (!currentSession || currentSession.sessionId !== sessionId) {
          return { success: false, error: 'Session not active' };
        }

        if (action === 'TAKE_A_BREAK') {
          this.sessionManager.endSession('USER_BREAK');
          await StorageManager.saveCurrentSession(null);
          await this.persistActiveSessionSnapshot();
          return { success: true, action: 'TAKE_A_BREAK' };
        }

        if (action === 'CONTINUE_5_MIN') {
          const isShort = (currentSession.intention?.plannedDurationSeconds || 0) < 60 || !!this.settings.devTestModeEnabled;
          const extensionSeconds = isShort ? 10 : 300;
          const updatedIntention = this.sessionManager.extendIntention(extensionSeconds);
          const session = this.sessionManager.getCurrentSession();
          if (session) {
            await StorageManager.saveCurrentSession(session);
            await this.persistActiveSessionSnapshot();
            if (this.settings.cloudSyncEnabled) {
              this.syncManager.triggerSync(session).catch(() => {});
            }
          }
          return { success: true, action: 'CONTINUE_5_MIN', intention: updatedIntention };
        }

        if (action === 'DISMISS') {
          return { success: true, action: 'DISMISS' };
        }

        return { success: false, error: 'Unknown action' };
      }

      default:
        return { error: 'Unknown message type' };
    }
  }

  private handleActiveTabChanged(tabId: number, match: ReturnType<typeof detectFeedFromUrl>, url: string): void {
    if (match && match.isFeed) {
      this.activePlatform = match.platform;
      this.sessionManager.handleFeedDetected(match.platform, match.feedType, tabId);
      this.sessionManager.handleVisibilityChange(this.tabStateManager.isFocused());
    } else {
      this.activePlatform = null;
      this.sessionManager.handleFeedExit();
    }
  }

  private handleTabClosed(tabId: number): void {
    const currentSession = this.sessionManager.getCurrentSession();
    if (currentSession) {
      this.sessionManager.endSession('TAB_CLOSED');
    }
  }

  private startActiveSessionTimer(): void {
    if (this.activeSessionTickerId) return;
    this.activeSessionTickerId = setInterval(() => {
      this.checkActiveSessionPeriodic();
    }, 1000);
  }

  private stopActiveSessionTimer(): void {
    if (this.activeSessionTickerId) {
      clearInterval(this.activeSessionTickerId);
      this.activeSessionTickerId = null;
    }
  }

  private checkActiveSessionPeriodic(): void {
    const session = this.sessionManager.getCurrentSession();
    if (!session || session.state !== 'TRACKING') {
      return;
    }
    this.checkIntentionAlert(session);
    this.checkDoomscrollAlerts(session);
  }

  private async handleSessionStarted(session: TrackingSession): Promise<void> {
    await StorageManager.saveCurrentSession(session);
    await this.persistActiveSessionSnapshot();
    this.startActiveSessionTimer();
  }

  private async handleSessionUpdated(session: TrackingSession): Promise<void> {
    await StorageManager.saveCurrentSession(session);
    await this.persistActiveSessionSnapshot();
    this.checkDoomscrollAlerts(session);
    this.checkIntentionAlert(session);
  }

  private async handleSessionEnded(session: TrackingSession): Promise<void> {
    this.stopActiveSessionTimer();
    this.eventProcessor.processCompletedSession(session, this.settings);
    await StorageManager.saveCompletedSession(
      session,
      this.eventProcessor.getDailyStatsMap()
    );
    await StorageManager.clearRecoverySnapshot();
    this.updateExtensionBadge('SESSION_ENDED');
    this.syncManager.triggerSync(session).catch(() => {});
  }

  private async persistActiveSessionSnapshot(): Promise<void> {
    const session = this.sessionManager.getCurrentSession();
    if (!session) {
      await StorageManager.clearRecoverySnapshot();
      return;
    }

    await StorageManager.saveRecoverySnapshot({
      sessionId: session.sessionId,
      platform: session.platform,
      startedAt: session.startedAt,
      lastHeartbeat: session.lastHeartbeat,
      activeDurationSeconds: session.activeDurationSeconds,
      tabId: this.tabStateManager.getActiveTabId() ?? undefined,
      intention: session.intention,
      userContext: session.userContext,
    });
  }

  private async recoverSuspendedSession(data: Awaited<ReturnType<typeof StorageManager.getAll>>): Promise<void> {
    const recovery = data.activeSessionRecovery || (data.currentSession ? {
      sessionId: data.currentSession.sessionId,
      platform: data.currentSession.platform,
      startedAt: data.currentSession.startedAt,
      lastHeartbeat: data.currentSession.lastHeartbeat,
      activeDurationSeconds: data.currentSession.activeDurationSeconds,
      intention: data.currentSession.intention,
      userContext: data.currentSession.userContext,
    } : null);

    if (!recovery) return;

    // Check if recovery is still fresh
    const now = Date.now();
    const elapsedSinceHeartbeat = now - recovery.lastHeartbeat;

    if (elapsedSinceHeartbeat > LIMITS.HEARTBEAT_TIMEOUT_MS) {
      // Session expired while SW was sleeping; gracefully seal it
      const expiredSession: TrackingSession = {
        sessionId: recovery.sessionId,
        platform: recovery.platform,
        feedType: recovery.platform === 'instagram' ? 'instagram_reels' : 'youtube_shorts',
        startedAt: recovery.startedAt,
        endedAt: recovery.lastHeartbeat,
        activeDurationSeconds: recovery.activeDurationSeconds,
        estimatedVideoViews: data.currentSession?.estimatedVideoViews || 0,
        navigationEvents: data.currentSession?.navigationEvents || 0,
        detectorVersion: '1.0.0',
        dataQuality: 'MEDIUM',
        state: 'SESSION_ENDED',
        lastHeartbeat: recovery.lastHeartbeat,
        intention: recovery.intention || data.currentSession?.intention,
        userContext: recovery.userContext || data.currentSession?.userContext,
      };

      this.eventProcessor.processCompletedSession(expiredSession, this.settings);
      await StorageManager.saveCompletedSession(expiredSession, this.eventProcessor.getDailyStatsMap());
      await StorageManager.clearRecoverySnapshot();
      console.log('[ScrollSense SW] Reconciled expired session from suspension:', recovery.sessionId);
    } else {
      // Can recover active session
      const mockSession: TrackingSession = {
        sessionId: recovery.sessionId,
        platform: recovery.platform,
        feedType: recovery.platform === 'instagram' ? 'instagram_reels' : 'youtube_shorts',
        startedAt: recovery.startedAt,
        activeDurationSeconds: recovery.activeDurationSeconds,
        estimatedVideoViews: data.currentSession?.estimatedVideoViews || 0,
        navigationEvents: data.currentSession?.navigationEvents || 0,
        detectorVersion: '1.0.0',
        dataQuality: 'HIGH',
        state: 'PAUSED',
        lastHeartbeat: recovery.lastHeartbeat,
        intention: recovery.intention || data.currentSession?.intention,
        userContext: recovery.userContext || data.currentSession?.userContext,
      };

      const restored = this.sessionManager.restoreSession(mockSession, this.tabStateManager.isFocused());
      console.log('[ScrollSense SW] Session restored:', restored);
    }
  }

  private setupAlarms(): void {
    if (typeof chrome === 'undefined' || !chrome.alarms) return;

    chrome.alarms.create(LIMITS.ALARM_RECOVERY_NAME, {
      periodInMinutes: LIMITS.ALARM_RECOVERY_INTERVAL_MINUTES,
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === LIMITS.ALARM_RECOVERY_NAME) {
        this.handleWatchdogAlarm();
      }
    });
  }

  private handleWatchdogAlarm(): void {
    const session = this.sessionManager.getCurrentSession();
    if (!session) return;

    const now = Date.now();
    if (now - session.lastHeartbeat > LIMITS.HEARTBEAT_TIMEOUT_MS) {
      console.log('[ScrollSense SW] Watchdog detected inactive session; ending gracefully.');
      this.sessionManager.endSession('WATCHDOG_TIMEOUT');
    }
  }

  private checkDoomscrollAlerts(session: TrackingSession): void {
    if (!this.settings.breakRemindersEnabled) return;

    const today = this.eventProcessor.getOrCreateDailySummary(getTodayDateString());
    const doomResult = DoomscrollEngine.calculateScore(
      {
        continuousDurationSeconds: session.activeDurationSeconds,
        dailyTotalDurationSeconds: today.totalDurationSeconds + session.activeDurationSeconds,
        dailyGoalSeconds: this.settings.dailyShortVideoGoalMinutes * 60,
        sessionsInLastHour: this.eventProcessor.countSessionsInWindow(Date.now(), 60 * 60 * 1000),
        navigationEventsInSession: session.navigationEvents,
        currentHour: new Date().getHours(),
        longSessionCountToday: today.longSessionCount,
      },
      this.settings
    );

    if (doomResult.interventionRecommended) {
      this.showBreakInterventionNotification(doomResult.classification, doomResult.recommendedAction);
    }
  }

  private showBreakInterventionNotification(
    classification: string,
    action?: 'TAKE_A_BREAK' | 'GOAL_ALERT' | 'LATE_NIGHT_ALERT'
  ): void {
    if (typeof chrome === 'undefined' || !chrome.notifications) return;

    let message = 'You have been scrolling continuously. Consider taking a 5-minute break to recharge!';
    if (action === 'GOAL_ALERT') {
      message = "You've reached your daily short-video goal. Time to wrap up and reclaim your day!";
    } else if (action === 'LATE_NIGHT_ALERT') {
      message = "It's late night during your quiet hours. Disconnect and get some restful sleep!";
    }

    chrome.notifications.create(
      'scrollsense-break-alert',
      {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `ScrollSense - ${classification}`,
        message,
        priority: 1,
      },
      () => {}
    );
  }

  private checkIntentionAlert(session: TrackingSession): void {
    if (!session.intention) return;
    if (session.activeDurationSeconds >= session.intention.plannedDurationSeconds && !session.intention.reminderSent) {
      session.intention.reminderSent = true;
      session.intention.isExceeded = true;
      this.sessionManager.markIntentionReminderSent();
      StorageManager.saveCurrentSession(session).catch(() => {});
      this.persistActiveSessionSnapshot().catch(() => {});

      const plannedSecs = session.intention.plannedDurationSeconds;
      const isSeconds = plannedSecs < 60;
      const durationStr = isSeconds ? `${plannedSecs}-second` : `${Math.max(1, Math.round(plannedSecs / 60))}-minute`;
      const intentionType = session.intention.type;

      // 1. Feature 1: Desktop Notification Delivery (Independent setting)
      if (this.settings.intentionLimitNotificationsEnabled !== false) {
        this.showIntentionExceededNotification(session.sessionId, intentionType, durationStr, plannedSecs);
      }

      // 2. Feature 2: In-Page Floating Alert Delivery (Independent setting)
      if (this.settings.inPageAlertsEnabled !== false) {
        this.dispatchInPageIntentionAlert(session, isSeconds);
      }
    }
  }

  private showIntentionExceededNotification(
    sessionId: string,
    intentionType: string,
    durationStr: string,
    plannedSecs: number
  ): void {
    if (typeof chrome === 'undefined' || !chrome.notifications) return;

    const notifId = `scrollsense-intent-${sessionId}-${plannedSecs}`;
    try {
      chrome.notifications.create(
        notifId,
        {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'ScrollSense — Intention Limit Reached',
          message: `You've reached your planned ${durationStr} ${intentionType} session. Ready to take a break?`,
          priority: 2,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn('[ScrollSense SW] Notification error:', chrome.runtime.lastError.message);
          }
        }
      );
    } catch (err: any) {
      console.warn('[ScrollSense SW] Failed to dispatch desktop notification:', err.message);
    }
  }

  private dispatchInPageIntentionAlert(session: TrackingSession, isTestMode: boolean): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const attemptedTabIds = new Set<number>();

    const sendToTab = (tabId: number) => {
      if (!tabId || attemptedTabIds.has(tabId)) return;
      attemptedTabIds.add(tabId);

      try {
        chrome.tabs.sendMessage(
          tabId,
          {
            type: 'BG_SHOW_INTENTION_LIMIT_ALERT',
            payload: {
              sessionId: session.sessionId,
              intentionType: session.intention!.type,
              plannedDurationSeconds: session.intention!.plannedDurationSeconds,
              activeDurationSeconds: session.activeDurationSeconds,
              isTestMode,
            },
          },
          (res) => {
            if (chrome.runtime.lastError) {
              // Expected if this particular tab is navigating or content script is initializing
            } else {
              console.log('[ScrollSense SW] In-page alert delivered to tab', tabId, res);
            }
          }
        );
      } catch (err: any) {
        console.warn('[ScrollSense SW] Failed to dispatch in-page alert to tab:', tabId, err.message);
      }
    };

    // 1. Send directly to the known active feed tab
    if (this.activeFeedTabId) {
      sendToTab(this.activeFeedTabId);
    }

    // 2. Send to tab tracked in SessionManager
    const smTabId = this.sessionManager.getActiveTabId();
    if (smTabId) {
      sendToTab(smTabId);
    }

    // 3. Send to active tab in TabStateManager
    const activeTabId = this.tabStateManager.getActiveTabId();
    if (activeTabId) {
      sendToTab(activeTabId);
    }

    // 4. Query all open tabs matching Instagram Reels or YouTube Shorts
    try {
      chrome.tabs.query({ url: ['*://*.instagram.com/*', '*://*.youtube.com/*'] }, (tabs) => {
        if (tabs) {
          for (const tab of tabs) {
            if (tab.id) {
              sendToTab(tab.id);
            }
          }
        }
      });
    } catch {
      // url pattern query might not be supported in some environments
    }

    // 5. Query currently active tabs across open windows
    try {
      chrome.tabs.query({ active: true }, (tabs) => {
        if (tabs) {
          for (const tab of tabs) {
            if (tab.id) {
              sendToTab(tab.id);
            }
          }
        }
      });
    } catch {
      // Ignored
    }
  }

  private updateExtensionBadge(state: string): void {
    if (typeof chrome === 'undefined' || !chrome.action) return;

    if (state === 'TRACKING') {
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
    } else if (state === 'PAUSED') {
      chrome.action.setBadgeText({ text: 'PAUSE' });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  private async generatePopupStatusResponse(): Promise<PopupStatusResponse> {
    const currentSession = this.sessionManager.getCurrentSession();
    const todaySummary = this.eventProcessor.getOrCreateDailySummary(getTodayDateString());
    const [pairing, unsyncedCount] = await Promise.all([
      StorageManager.getPairingState(),
      this.syncManager.getUnsyncedCount(),
    ]);

    const activeSecs = currentSession ? currentSession.activeDurationSeconds : 0;
    const totalTodaySecs = todaySummary.totalDurationSeconds + activeSecs;

    const doomResult = DoomscrollEngine.calculateScore(
      {
        continuousDurationSeconds: activeSecs,
        dailyTotalDurationSeconds: totalTodaySecs,
        dailyGoalSeconds: this.settings.dailyShortVideoGoalMinutes * 60,
        sessionsInLastHour: this.eventProcessor.countSessionsInWindow(Date.now(), 60 * 60 * 1000),
        navigationEventsInSession: currentSession ? currentSession.navigationEvents : 0,
        currentHour: new Date().getHours(),
        longSessionCountToday: todaySummary.longSessionCount,
      },
      this.settings
    );

    return {
      currentSession,
      todaySummary: {
        ...todaySummary,
        totalDurationSeconds: totalTodaySecs,
        estimatedInstagramViews: todaySummary.estimatedInstagramViews + (currentSession?.platform === 'instagram' ? currentSession.estimatedVideoViews : 0),
        estimatedYouTubeViews: todaySummary.estimatedYouTubeViews + (currentSession?.platform === 'youtube' ? currentSession.estimatedVideoViews : 0),
      },
      doomscrollResult: doomResult,
      settings: this.settings,
      pairing,
      unsyncedCount,
      health: this.latestHealth,
      activePlatform: this.activePlatform,
    };
  }
}

// Instantiate and start background controller
const controller = new BackgroundController();
controller.initialize().catch((err) => {
  console.error('[ScrollSense SW] Failed to initialize background controller:', err);
});
