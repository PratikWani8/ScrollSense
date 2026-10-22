import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/tracking/session-manager';
import { TrackingSession, SessionState } from '../../src/shared/types';

describe('Intention Limit Alerts and Extensions', () => {
  let sessionManager: SessionManager;
  let startedSessions: TrackingSession[] = [];
  let endedSessions: TrackingSession[] = [];
  let stateChanges: { from: SessionState; to: SessionState }[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    startedSessions = [];
    endedSessions = [];
    stateChanges = [];

    sessionManager = new SessionManager({
      onSessionStarted: (session) => startedSessions.push(session),
      onSessionEnded: (session) => endedSessions.push(session),
      onStateChanged: (to, from) => stateChanges.push({ from, to }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('supports 10-second fast test mode intentions', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');

    // Set 10-second test intention
    const intention = sessionManager.setIntention({
      type: 'Taking a Short Break',
      plannedDurationSeconds: 10,
    });

    expect(intention).toBeDefined();
    expect(intention?.plannedDurationSeconds).toBe(10);
    expect(intention?.reminderSent).toBe(false);
    expect(intention?.isExceeded).toBe(false);

    // After 9 seconds, still within intention
    vi.advanceTimersByTime(9000);
    expect(sessionManager.getCurrentSession()?.intention?.isExceeded).toBe(false);

    // At 10 seconds, intention is reached
    vi.advanceTimersByTime(1000);
    const sessionAt10 = sessionManager.getCurrentSession();
    expect(sessionAt10?.intention?.isExceeded).toBe(true);
    expect(sessionAt10?.activeDurationSeconds).toBe(10);
  });

  it('correctly extends intention and resets reminderSent flag for new alert', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('youtube', 'youtube_shorts');

    sessionManager.setIntention({
      type: 'Entertainment',
      plannedDurationSeconds: 300,
    });

    // Advance to 300 seconds (5 min)
    vi.advanceTimersByTime(300000);
    let session = sessionManager.getCurrentSession();
    expect(session?.intention?.isExceeded).toBe(true);

    // Simulate alert has fired: reminderSent is marked true by service worker
    session!.intention!.reminderSent = true;

    // User chooses "Continue for 5 min" (+300s)
    const extended = sessionManager.extendIntention(300);
    expect(extended?.plannedDurationSeconds).toBe(600);
    expect(extended?.reminderSent).toBe(false); // Flag reset so next alert can fire!
    expect(extended?.isExceeded).toBe(false); // Back on track

    // Advance 299 seconds (total 599s)
    vi.advanceTimersByTime(299000);
    session = sessionManager.getCurrentSession();
    expect(session?.intention?.isExceeded).toBe(false);

    // Advance 1 more second (total 600s reached)
    vi.advanceTimersByTime(1000);
    session = sessionManager.getCurrentSession();
    expect(session?.intention?.isExceeded).toBe(true);
    expect(session?.intention?.reminderSent).toBe(false); // Ready for service worker to trigger 2nd alert
  });

  it('supports 10-second extensions in dev test mode', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');

    sessionManager.setIntention({
      type: 'Learning',
      plannedDurationSeconds: 10,
    });

    vi.advanceTimersByTime(10000);
    const session = sessionManager.getCurrentSession();
    session!.intention!.reminderSent = true;

    // Extend by 10 seconds
    const extended = sessionManager.extendIntention(10);
    expect(extended?.plannedDurationSeconds).toBe(20);
    expect(extended?.reminderSent).toBe(false);
    expect(extended?.isExceeded).toBe(false);

    vi.advanceTimersByTime(10000);
    expect(sessionManager.getCurrentSession()?.intention?.isExceeded).toBe(true);
  });

  it('does not count paused or inactive tab time toward intention threshold', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('youtube', 'youtube_shorts');

    sessionManager.setIntention({
      type: 'Learning',
      plannedDurationSeconds: 60,
    });

    // 30 seconds active
    vi.advanceTimersByTime(30000);
    expect(sessionManager.getActiveDurationSeconds()).toBe(30);

    // Tab blurred/minimized for 5 minutes
    sessionManager.handleVisibilityChange(false);
    vi.advanceTimersByTime(300000);

    // Active time must not change
    expect(sessionManager.getActiveDurationSeconds()).toBe(30);
    expect(sessionManager.getCurrentSession()?.intention?.isExceeded).toBe(false);

    // User returns and scrolls for 30 more seconds
    sessionManager.handleVisibilityChange(true);
    vi.advanceTimersByTime(30000);

    expect(sessionManager.getActiveDurationSeconds()).toBe(60);
    expect(sessionManager.getCurrentSession()?.intention?.isExceeded).toBe(true);
  });

  it('ends session with USER_BREAK when user clicks Take a Break', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');

    sessionManager.setIntention({
      type: 'Entertainment',
      plannedDurationSeconds: 300,
    });

    vi.advanceTimersByTime(305000);

    // User chooses "Take a Break"
    const ended = sessionManager.pauseTrackingForBreak();

    expect(ended).toBeDefined();
    expect(ended?.activeDurationSeconds).toBe(305);
    expect(sessionManager.getState()).toBe('IDLE');
    expect(sessionManager.getCurrentSession()).toBeNull();
    expect(endedSessions.length).toBe(1);
    expect(endedSessions[0].intention?.completedWithinPlan).toBe(false);
  });

  it('restores session across suspension with intention intact and preserves reminderSent state', () => {
    const mockSuspendedSession: TrackingSession = {
      sessionId: 'restored-session-123',
      platform: 'instagram',
      feedType: 'instagram_reels',
      startedAt: Date.now() - 310000,
      activeDurationSeconds: 310,
      estimatedVideoViews: 12,
      navigationEvents: 8,
      detectorVersion: '1.0.0',
      dataQuality: 'HIGH',
      state: 'PAUSED',
      lastHeartbeat: Date.now() - 1000,
      intention: {
        type: 'Learning',
        plannedDurationSeconds: 300,
        committedAt: Date.now() - 310000,
        reminderSent: true,
        isExceeded: true,
      },
      userContext: 'Procrastination',
    };

    const restored = sessionManager.restoreSession(mockSuspendedSession, true);
    expect(restored).toBe(true);

    const session = sessionManager.getCurrentSession();
    expect(session?.sessionId).toBe('restored-session-123');
    expect(session?.intention?.plannedDurationSeconds).toBe(300);
    expect(session?.intention?.reminderSent).toBe(true);
    expect(session?.intention?.isExceeded).toBe(true);
    expect(session?.userContext).toBe('Procrastination');
  });
});
