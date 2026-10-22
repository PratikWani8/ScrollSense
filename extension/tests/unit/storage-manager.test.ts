import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../../src/background/storage-manager';
import { STORAGE_SCHEMA_VERSION, DEFAULT_USER_SETTINGS } from '../../src/shared/constants';
import { TrackingSession } from '../../src/shared/types';

describe('StorageManager & Migrations', () => {
  beforeEach(async () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.clear();
    }
  });

  it('initializes with default schema and settings when storage is empty', async () => {
    const data = await StorageManager.initialize();

    expect(data.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
    expect(data.settings.trackingEnabled).toBe(true);
    expect(data.settings.qualificationThresholdSeconds).toBe(2.0);
    expect(data.settings.longSessionReminderMinutes).toBe(25);
    expect(data.settings.dailyShortVideoGoalMinutes).toBe(30);
    expect(data.recentSessions).toEqual([]);
    expect(data.unsyncedEvents).toEqual([]);
  });

  it('updates partial settings correctly and persists them', async () => {
    await StorageManager.initialize();

    const updated = await StorageManager.updateSettings({
      dailyShortVideoGoalMinutes: 45,
      qualificationThresholdSeconds: 3.0,
    });

    expect(updated.dailyShortVideoGoalMinutes).toBe(45);
    expect(updated.qualificationThresholdSeconds).toBe(3.0);
    expect(updated.trackingEnabled).toBe(true); // preserved

    const reloaded = await StorageManager.getSettings();
    expect(reloaded.dailyShortVideoGoalMinutes).toBe(45);
    expect(reloaded.qualificationThresholdSeconds).toBe(3.0);
  });

  it('saves and clears active session recovery snapshots for suspension handling', async () => {
    await StorageManager.initialize();

    const snapshot = {
      sessionId: 'sess-recovery-1',
      platform: 'instagram' as const,
      startedAt: Date.now() - 10000,
      lastHeartbeat: Date.now(),
      activeDurationSeconds: 10,
    };

    await StorageManager.saveRecoverySnapshot(snapshot);
    let data = await StorageManager.getAll();
    expect(data.activeSessionRecovery?.sessionId).toBe('sess-recovery-1');

    await StorageManager.clearRecoverySnapshot();
    data = await StorageManager.getAll();
    expect(data.activeSessionRecovery).toBeUndefined();
  });

  it('clears all tracking records on privacy reset while keeping user preferences', async () => {
    await StorageManager.initialize();
    await StorageManager.updateSettings({ dailyShortVideoGoalMinutes: 50 });

    const mockSession: TrackingSession = {
      sessionId: 'test-s1',
      platform: 'youtube',
      feedType: 'youtube_shorts',
      startedAt: Date.now(),
      activeDurationSeconds: 60,
      estimatedVideoViews: 3,
      navigationEvents: 2,
      detectorVersion: '1.0.0',
      dataQuality: 'HIGH',
      state: 'SESSION_ENDED',
      lastHeartbeat: Date.now(),
    };

    await StorageManager.saveCompletedSession(mockSession, {
      '2026-10-10': {
        date: '2026-10-10',
        instagramDurationSeconds: 0,
        youtubeDurationSeconds: 60,
        totalDurationSeconds: 60,
        estimatedInstagramViews: 0,
        estimatedYouTubeViews: 3,
        sessionCount: 1,
        longSessionCount: 0,
        doomscrollScore: 10,
      },
    });

    // Verify session stored
    let data = await StorageManager.getAll();
    expect(data.recentSessions.length).toBe(1);

    // Perform privacy clear
    await StorageManager.clearAllTrackingData();

    data = await StorageManager.getAll();
    expect(data.recentSessions).toEqual([]);
    expect(data.dailyStats).toEqual({});
    expect(data.unsyncedEvents).toEqual([]);
    // Settings preserved
    expect(data.settings.dailyShortVideoGoalMinutes).toBe(50);
  });
});
