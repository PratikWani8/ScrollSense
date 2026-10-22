import { PopupStatusResponse } from '../shared/messages';
import { UserSettings } from '../shared/types';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

class PopupController {
  private localElapsedTimerSeconds: number = 0;
  private isTrackingActive: boolean = false;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentSettings: UserSettings | null = null;
  private currentSessionId: string | null = null;

  public initialize(): void {
    this.bindEvents();
    this.fetchStatus();

    // Poll status every 2 seconds
    this.pollIntervalId = setInterval(() => {
      this.fetchStatus();
    }, 2000);

    // Live tick every second for smooth stopwatch timer
    this.timerIntervalId = setInterval(() => {
      if (this.isTrackingActive) {
        this.localElapsedTimerSeconds += 1;
        this.updateTimerDisplay(this.localElapsedTimerSeconds);
      }
    }, 1000);
  }

  private bindEvents(): void {
    const toggleBtn = document.getElementById('toggle-tracking-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.handleToggleTracking());
    }

    const resetBtn = document.getElementById('reset-data-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleResetData());
    }

    const toggleServerBtn = document.getElementById('toggle-server-config-btn');
    const serverContainer = document.getElementById('server-config-container');
    if (toggleServerBtn && serverContainer) {
      toggleServerBtn.addEventListener('click', () => {
        serverContainer.classList.toggle('hidden');
      });
    }

    const connectBtn = document.getElementById('connect-dashboard-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleStartPairing());
    }

    const disconnectBtn = document.getElementById('disconnect-btn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.handleDisconnect());
    }

    const syncNowBtn = document.getElementById('sync-now-btn');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', () => this.handleSyncNow());
    }

    const setIntentBtn = document.getElementById('set-intent-btn');
    if (setIntentBtn) {
      setIntentBtn.addEventListener('click', () => this.handleSetIntention());
    }

    const triggerChips = document.querySelectorAll('.trigger-chip');
    triggerChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const context = chip.getAttribute('data-context');
        if (context) {
          this.handleSetContext(context);
        }
      });
    });

    const toggleNotif = document.getElementById('toggle-notif-input') as HTMLInputElement | null;
    if (toggleNotif) {
      toggleNotif.addEventListener('change', () => {
        this.updateUserSettings({ intentionLimitNotificationsEnabled: toggleNotif.checked });
      });
    }

    const toggleInpage = document.getElementById('toggle-inpage-input') as HTMLInputElement | null;
    if (toggleInpage) {
      toggleInpage.addEventListener('change', () => {
        this.updateUserSettings({ inPageAlertsEnabled: toggleInpage.checked });
      });
    }

    const toggleDevTest = document.getElementById('toggle-devtest-input') as HTMLInputElement | null;
    if (toggleDevTest) {
      toggleDevTest.addEventListener('change', () => {
        this.updateUserSettings({ devTestModeEnabled: toggleDevTest.checked }, () => {
          this.fetchStatus();
        });
      });
    }

    const extendBtn = document.getElementById('intent-extend-btn');
    if (extendBtn) {
      extendBtn.addEventListener('click', () => this.handleExtendIntention());
    }

    const breakBtn = document.getElementById('intent-break-btn');
    if (breakBtn) {
      breakBtn.addEventListener('click', () => this.handleTakeBreak());
    }
  }

  private fetchStatus(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    chrome.runtime.sendMessage({ type: 'POPUP_GET_STATUS' }, (response: PopupStatusResponse) => {
      if (chrome.runtime.lastError || !response) {
        return;
      }
      this.renderStatus(response);
    });
  }

  private renderStatus(data: PopupStatusResponse): void {
    const { currentSession, todaySummary, doomscrollResult, settings, health, activePlatform } = data;

    // 1. Status Badge & Tracking State
    const badgeEl = document.getElementById('status-badge');
    const badgeTextEl = document.getElementById('status-text');
    const sessionTimerEl = document.getElementById('session-timer');
    const sessionSubEl = document.getElementById('session-sub');
    const platformPillEl = document.getElementById('platform-pill');
    const toggleBtn = document.getElementById('toggle-tracking-btn');

    if (!settings.trackingEnabled) {
      this.isTrackingActive = false;
      if (badgeEl) badgeEl.className = 'badge badge-paused';
      if (badgeTextEl) badgeTextEl.textContent = 'Paused';
      if (toggleBtn) toggleBtn.textContent = 'Resume Tracking';
      if (sessionSubEl) sessionSubEl.textContent = 'Tracking paused by user';
    } else if (currentSession && currentSession.state === 'TRACKING') {
      this.isTrackingActive = true;
      this.localElapsedTimerSeconds = currentSession.activeDurationSeconds;
      if (badgeEl) badgeEl.className = 'badge badge-active';
      if (badgeTextEl) badgeTextEl.textContent = 'Tracking';
      if (toggleBtn) toggleBtn.textContent = 'Pause Tracking';
      if (sessionSubEl) sessionSubEl.textContent = 'Feed active & viewport visible';
    } else if (currentSession && currentSession.state === 'PAUSED') {
      this.isTrackingActive = false;
      this.localElapsedTimerSeconds = currentSession.activeDurationSeconds;
      if (badgeEl) badgeEl.className = 'badge badge-paused';
      if (badgeTextEl) badgeTextEl.textContent = 'Inactive Tab';
      if (toggleBtn) toggleBtn.textContent = 'Pause Tracking';
      if (sessionSubEl) sessionSubEl.textContent = 'Paused (Tab hidden / out of focus)';
    } else {
      this.isTrackingActive = false;
      this.localElapsedTimerSeconds = 0;
      if (badgeEl) badgeEl.className = 'badge badge-idle';
      if (badgeTextEl) badgeTextEl.textContent = 'Idle';
      if (toggleBtn) toggleBtn.textContent = 'Pause Tracking';
      if (sessionSubEl) sessionSubEl.textContent = 'No active short-video feed';
    }

    this.updateTimerDisplay(this.localElapsedTimerSeconds);

    // Platform Pill
    if (platformPillEl) {
      if (activePlatform === 'instagram') {
        platformPillEl.textContent = 'Instagram Reels';
        platformPillEl.className = 'platform-pill instagram';
      } else if (activePlatform === 'youtube') {
        platformPillEl.textContent = 'YouTube Shorts';
        platformPillEl.className = 'platform-pill youtube';
      } else {
        platformPillEl.className = 'platform-pill hidden';
      }
    }

    // 2. Today's Summary
    const totalTimeEl = document.getElementById('today-total-time');
    const reelsViewsEl = document.getElementById('today-reels-views');
    const shortsViewsEl = document.getElementById('today-shorts-views');
    const sessionsEl = document.getElementById('today-sessions');

    if (totalTimeEl) totalTimeEl.textContent = formatDuration(todaySummary.totalDurationSeconds);
    if (reelsViewsEl) reelsViewsEl.textContent = String(todaySummary.estimatedInstagramViews);
    if (shortsViewsEl) shortsViewsEl.textContent = String(todaySummary.estimatedYouTubeViews);
    if (sessionsEl) sessionsEl.textContent = String(todaySummary.sessionCount);

    // 3. Doomscroll Behavioral Meter
    const scoreValEl = document.getElementById('score-value');
    const scoreBarEl = document.getElementById('score-bar-fill');
    const scoreClassEl = document.getElementById('score-classification');
    const factorsEl = document.getElementById('contributing-factors');

    if (scoreValEl) scoreValEl.textContent = String(doomscrollResult.score);
    if (scoreBarEl) scoreBarEl.style.width = `${doomscrollResult.score}%`;

    if (scoreClassEl) {
      scoreClassEl.textContent = doomscrollResult.classification;
      if (doomscrollResult.score >= 80) {
        scoreClassEl.className = 'score-badge danger';
      } else if (doomscrollResult.score >= 50) {
        scoreClassEl.className = 'score-badge warning';
      } else {
        scoreClassEl.className = 'score-badge';
      }
    }

    if (factorsEl) {
      if (doomscrollResult.contributingFactors.length === 0) {
        factorsEl.innerHTML = '<span>🌱 Healthy scrolling habits detected.</span>';
      } else {
        factorsEl.innerHTML = doomscrollResult.contributingFactors
          .slice(0, 2)
          .map((f) => `<span>• ${f.description} (+${f.scoreDelta})</span>`)
          .join('');
      }
    }

    // 4. Detector Health & Observability
    const healthStatusEl = document.getElementById('health-status');
    const healthDescEl = document.getElementById('health-details');

    if (healthStatusEl && healthDescEl) {
      if (!settings.trackingEnabled) {
        healthStatusEl.textContent = 'Paused';
        healthDescEl.textContent = 'Tracking paused by user. Click Resume Tracking below.';
      } else if (health) {
        healthStatusEl.textContent = health.status;
        if (health.status === 'CANDIDATE_ACTIVE') {
          healthDescEl.textContent = 'Candidate video verified & dwell timer active.';
        } else if (health.status === 'FEED_DETECTED') {
          healthDescEl.textContent = 'Feed route detected, locating candidate video in viewport.';
        } else if (health.status === 'PAUSED') {
          healthDescEl.textContent = 'Monitoring paused — feed tab is minimized or in background.';
        } else if (health.status === 'UNSUPPORTED_PAGE') {
          healthDescEl.textContent = 'Active tab is not a supported Reels or Shorts feed.';
        } else {
          healthDescEl.textContent = 'Monitoring Instagram Reels & YouTube Shorts.';
        }
      } else {
        healthStatusEl.textContent = 'Ready';
        healthDescEl.textContent = 'Monitoring Instagram Reels & YouTube Shorts.';
      }
    }

    // 5. Cloud Synchronization & Pairing
    const syncBadgeEl = document.getElementById('sync-badge');
    const syncUnpairedEl = document.getElementById('sync-content-unpaired');
    const syncPairingEl = document.getElementById('sync-content-pairing');
    const syncPairedEl = document.getElementById('sync-content-paired');
    const displayPairingCodeEl = document.getElementById('display-pairing-code');
    const syncDeviceNameEl = document.getElementById('sync-device-name');
    const syncQueueCountEl = document.getElementById('sync-queue-count');

    if (data.pairing) {
      const { isPaired, pendingPairingCode, syncStatus, deviceName } = data.pairing;

      if (isPaired) {
        if (syncBadgeEl) {
          syncBadgeEl.className = `sync-badge ${syncStatus === 'SYNCING' ? 'syncing' : syncStatus === 'ERROR' ? 'error' : 'connected'}`;
          syncBadgeEl.textContent = syncStatus === 'SYNCING' ? 'Syncing...' : syncStatus === 'ERROR' ? 'Sync Error' : 'Connected';
        }
        if (syncUnpairedEl) syncUnpairedEl.className = 'sync-details hidden';
        if (syncPairingEl) syncPairingEl.className = 'sync-details hidden';
        if (syncPairedEl) syncPairedEl.className = 'sync-details';
        if (syncDeviceNameEl) syncDeviceNameEl.textContent = deviceName || 'Connected Device';
        if (syncQueueCountEl) syncQueueCountEl.textContent = `${data.unsyncedCount || 0} queued`;
      } else if (pendingPairingCode) {
        if (syncBadgeEl) {
          syncBadgeEl.className = 'sync-badge syncing';
          syncBadgeEl.textContent = 'Pairing...';
        }
        if (syncUnpairedEl) syncUnpairedEl.className = 'sync-details hidden';
        if (syncPairingEl) syncPairingEl.className = 'sync-details';
        if (syncPairedEl) syncPairedEl.className = 'sync-details hidden';
        if (displayPairingCodeEl) displayPairingCodeEl.textContent = pendingPairingCode;

        // Auto-check pairing approval
        chrome.runtime.sendMessage({ type: 'POPUP_CHECK_PAIRING' }, (res) => {
          if (res && res.isPaired) {
            this.fetchStatus();
          }
        });
      } else {
        if (syncBadgeEl) {
          syncBadgeEl.className = 'sync-badge unpaired';
          syncBadgeEl.textContent = 'Local Only';
        }
        if (syncUnpairedEl) syncUnpairedEl.className = 'sync-details';
        if (syncPairingEl) syncPairingEl.className = 'sync-details hidden';
        if (syncPairedEl) syncPairedEl.className = 'sync-details hidden';
      }
    }

    // 6. Intention Card
    const intentActiveView = document.getElementById('intent-active-view');
    const intentSetupView = document.getElementById('intent-setup-view');
    const intentBadge = document.getElementById('intent-badge');
    const intentTypeLabel = document.getElementById('intent-type-label');
    const intentTimeProgress = document.getElementById('intent-time-progress');
    const intentBarFill = document.getElementById('intent-bar-fill');
    const intentStatusText = document.getElementById('intent-status-text');

    this.currentSettings = settings;
    this.currentSessionId = currentSession?.sessionId || null;

    if (currentSession && currentSession.intention) {
      const intent = currentSession.intention;
      const isSeconds = intent.plannedDurationSeconds < 60;
      const durationLabel = isSeconds ? `${intent.plannedDurationSeconds}s` : `${Math.round(intent.plannedDurationSeconds / 60)}m`;
      const elapsedSecs = currentSession.activeDurationSeconds;
      const pct = Math.min(100, Math.round((elapsedSecs / intent.plannedDurationSeconds) * 100));

      if (intentActiveView) intentActiveView.classList.remove('hidden');
      if (intentSetupView) intentSetupView.classList.add('hidden');
      if (intentBadge) {
        intentBadge.classList.remove('hidden');
        intentBadge.textContent = `${durationLabel} plan`;
        intentBadge.className = `intent-badge ${intent.isExceeded ? 'exceeded' : ''}`;
      }
      if (intentTypeLabel) intentTypeLabel.textContent = `🎯 ${intent.type}`;
      if (intentTimeProgress) intentTimeProgress.textContent = `${formatDuration(elapsedSecs)} / ${durationLabel}`;
      if (intentBarFill) {
        intentBarFill.style.width = `${pct}%`;
        intentBarFill.style.backgroundColor = intent.isExceeded ? '#ef4444' : '#6366f1';
      }
      if (intentStatusText) {
        if (intent.isExceeded) {
          intentStatusText.textContent = `⚠️ Planned duration exceeded (+${formatDuration(elapsedSecs - intent.plannedDurationSeconds)})`;
          intentStatusText.className = 'intent-status-text exceeded';
        } else {
          const remainingSecs = Math.max(0, intent.plannedDurationSeconds - elapsedSecs);
          intentStatusText.textContent = `Remaining: ${formatDuration(remainingSecs)}`;
          intentStatusText.className = 'intent-status-text';
        }
      }
    } else {
      if (intentActiveView) intentActiveView.classList.add('hidden');
      if (intentSetupView) intentSetupView.classList.remove('hidden');
      if (intentBadge) intentBadge.classList.add('hidden');
    }

    // 7. Trigger Context Highlighting
    const activeContext = currentSession?.userContext;
    const triggerChips = document.querySelectorAll('.trigger-chip');
    triggerChips.forEach((chip) => {
      if (activeContext && chip.getAttribute('data-context') === activeContext) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // 8. Alert & Feedback Settings
    const toggleNotif = document.getElementById('toggle-notif-input') as HTMLInputElement | null;
    const toggleInpage = document.getElementById('toggle-inpage-input') as HTMLInputElement | null;
    const toggleDevTest = document.getElementById('toggle-devtest-input') as HTMLInputElement | null;
    const devOpt10s = document.getElementById('intent-10s-opt');
    const extendBtn = document.getElementById('intent-extend-btn');

    if (toggleNotif) {
      toggleNotif.checked = settings.intentionLimitNotificationsEnabled !== false;
    }
    if (toggleInpage) {
      toggleInpage.checked = settings.inPageAlertsEnabled !== false;
    }
    if (toggleDevTest) {
      toggleDevTest.checked = !!settings.devTestModeEnabled;
    }
    if (devOpt10s) {
      if (settings.devTestModeEnabled) {
        devOpt10s.classList.remove('hidden');
      } else {
        devOpt10s.classList.add('hidden');
      }
    }
    if (extendBtn) {
      extendBtn.textContent = settings.devTestModeEnabled ? '+10s More' : '+5m More';
    }
  }

  private updateUserSettings(partial: Partial<UserSettings>, callback?: () => void): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    chrome.runtime.sendMessage({
      type: 'POPUP_UPDATE_SETTINGS',
      payload: partial,
    }, () => {
      if (callback) callback();
    });
  }

  private handleExtendIntention(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    const extensionSeconds = this.currentSettings?.devTestModeEnabled ? 10 : 300;
    chrome.runtime.sendMessage({
      type: 'POPUP_EXTEND_INTENTION',
      payload: { extensionSeconds },
    }, () => {
      this.fetchStatus();
    });
  }

  private handleTakeBreak(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime || !this.currentSessionId) return;
    chrome.runtime.sendMessage({
      type: 'CONTENT_INTENTION_ACTION',
      payload: { sessionId: this.currentSessionId, action: 'TAKE_A_BREAK' },
    }, () => {
      this.fetchStatus();
    });
  }

  private handleSetIntention(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    const typeSelect = document.getElementById('intent-type-select') as HTMLSelectElement | null;
    const durationSelect = document.getElementById('intent-duration-select') as HTMLSelectElement | null;
    if (!typeSelect || !durationSelect) return;

    const type = typeSelect.value as any;
    const plannedDurationSeconds = parseInt(durationSelect.value, 10);

    chrome.runtime.sendMessage({
      type: 'POPUP_SET_INTENTION',
      payload: { type, plannedDurationSeconds },
    }, () => {
      this.fetchStatus();
    });
  }

  private handleSetContext(context: string): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    chrome.runtime.sendMessage({
      type: 'POPUP_SET_CONTEXT',
      payload: { context: context as any },
    }, () => {
      const feedback = document.getElementById('trigger-feedback');
      if (feedback) {
        feedback.textContent = `Logged: ${context}`;
        feedback.classList.remove('hidden');
        setTimeout(() => {
          feedback.classList.add('hidden');
        }, 2500);
      }
      this.fetchStatus();
    });
  }

  private handleStartPairing(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    const customUrlInput = document.getElementById('custom-backend-url') as HTMLInputElement | null;
    const customBackendUrl = customUrlInput?.value?.trim() || undefined;

    chrome.runtime.sendMessage({
      type: 'POPUP_START_PAIRING',
      payload: customBackendUrl ? { backendUrl: customBackendUrl } : undefined,
    }, (res) => {
      if (res && res.success) {
        this.fetchStatus();
      } else if (res && res.error) {
        alert(`Pairing request failed: ${res.error}`);
      }
    });
  }

  private handleDisconnect(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    if (confirm('Disconnect this extension from your web dashboard? Local tracking will continue.')) {
      chrome.runtime.sendMessage({ type: 'POPUP_DISCONNECT_DEVICE' }, () => {
        this.fetchStatus();
      });
    }
  }

  private handleSyncNow(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    chrome.runtime.sendMessage({ type: 'POPUP_TRIGGER_SYNC' }, () => {
      this.fetchStatus();
    });
  }

  private updateTimerDisplay(seconds: number): void {
    const timerEl = document.getElementById('session-timer');
    if (timerEl) {
      timerEl.textContent = formatTimer(seconds);
    }
  }

  private handleToggleTracking(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    chrome.runtime.sendMessage({ type: 'POPUP_TOGGLE_TRACKING' }, () => {
      this.fetchStatus();
    });
  }

  private handleResetData(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    if (confirm('Reset today’s local ScrollSense statistics?')) {
      chrome.runtime.sendMessage({ type: 'POPUP_RESET_DATA' }, () => {
        this.fetchStatus();
      });
    }
  }
}

// Instantiate on popup open
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  popup.initialize();
});
