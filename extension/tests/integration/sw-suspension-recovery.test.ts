import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/tracking/session-manager';
import { EventProcessor } from '../../src/tracking/event-processor';
import { TrackingSession } from '../../src/shared/types';
import { DEFAULT_USER_SETTINGS, LIMITS } from '../../src/shared/constants';

describe('Service Worker Suspension & Recovery', () => {
  let sessionManager: SessionManager;
  let eventProcessor: EventProcessor;
  let endedSessions: TrackingSession[] = [];

  beforeEach(() => {
    endedSessions = [];
    eventProcessor = new EventProcessor();
    sessionManager = new SessionManager({
      onSessionEnded: (s) => {
        endedSessions.push(s);
        eventProcessor.processCompletedSession(s, DEFAULT_USER_SETTINGS);
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores an active session when service worker awakens within heartbeat timeout', () => {
    const now = Date.now();
    const savedActiveSession: TrackingSession = {
      sessionId: 'sess-recover-live',
      platform: 'instagram',
      feedType: 'instagram_reels',
      startedAt: now - 30000, // started 30s ago
      activeDurationSeconds: 25,
      estimatedVideoViews: 3,
      navigationEvents: 2,
      detectorVersion: '1.0.0',
      dataQuality: 'HIGH',
      state: 'TRACKING',
      lastHeartbeat: now - 3000, // 3 seconds ago (fresh!)
    };

    // SW wakes up and calls restoreSession
    const restored = sessionManager.restoreSession(savedActiveSession, true);

    expect(restored).toBe(true);
    expect(sessionManager.getState()).toBe('TRACKING');
    const current = sessionManager.getCurrentSession();
    expect(current?.sessionId).toBe('sess-recover-live');
    expect(current?.platform).toBe('instagram');
    expect(current?.estimatedVideoViews).toBe(3);
  });

  it('gracefully finalizes and ends session if heartbeat expired during SW suspension', () => {
    const now = Date.now();
    const expiredSession: TrackingSession = {
      sessionId: 'sess-recover-expired',
      platform: 'youtube',
      feedType: 'youtube_shorts',
      startedAt: now - 120000, // started 2m ago
      activeDurationSeconds: 40,
      estimatedVideoViews: 2,
      navigationEvents: 1,
      detectorVersion: '1.0.0',
      dataQuality: 'HIGH',
      state: 'TRACKING',
      lastHeartbeat: now - 45000, // 45s ago (> 12s timeout)
    };

    const restored = sessionManager.restoreSession(expiredSession, true);

    expect(restored).toBe(false);
    expect(sessionManager.getState()).toBe('IDLE');
    expect(endedSessions.length).toBe(1);
    expect(endedSessions[0].sessionId).toBe('sess-recover-expired');
    expect(endedSessions[0].endedAt).toBe(expiredSession.lastHeartbeat);
    expect(endedSessions[0].dataQuality).toBe('MEDIUM');
  });
});
