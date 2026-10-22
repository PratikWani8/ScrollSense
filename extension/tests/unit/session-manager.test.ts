import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/tracking/session-manager';
import { TrackingSession, SessionState } from '../../src/shared/types';

describe('SessionManager State Machine', () => {
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

  it('initializes in IDLE state', () => {
    expect(sessionManager.getState()).toBe('IDLE');
    expect(sessionManager.getCurrentSession()).toBeNull();
  });

  it('transitions IDLE -> FEED_DETECTED -> TRACKING when tab is visible and focused', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');

    expect(sessionManager.getState()).toBe('TRACKING');
    expect(startedSessions.length).toBe(1);
    expect(startedSessions[0].platform).toBe('instagram');
    expect(startedSessions[0].feedType).toBe('instagram_reels');
  });

  it('pauses tracking when tab becomes hidden or blurred and does not accumulate active time', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');
    expect(sessionManager.getState()).toBe('TRACKING');

    // Active for 10 seconds
    vi.advanceTimersByTime(10000);
    expect(sessionManager.getActiveDurationSeconds()).toBe(10);

    // Tab blurred/hidden
    sessionManager.handleVisibilityChange(false);
    expect(sessionManager.getState()).toBe('PAUSED');

    // 30 seconds elapse while hidden
    vi.advanceTimersByTime(30000);
    // Active duration must remain 10 seconds!
    expect(sessionManager.getActiveDurationSeconds()).toBe(10);

    // Tab focused again
    sessionManager.handleVisibilityChange(true);
    expect(sessionManager.getState()).toBe('TRACKING');

    // Another 15 seconds active
    vi.advanceTimersByTime(15000);
    expect(sessionManager.getActiveDurationSeconds()).toBe(25);
  });

  it('ends session and seals duration when user navigates away from feed', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('youtube', 'youtube_shorts');

    vi.advanceTimersByTime(45000); // 45 seconds active
    expect(sessionManager.getActiveDurationSeconds()).toBe(45);

    sessionManager.handleFeedExit();

    expect(sessionManager.getState()).toBe('IDLE');
    expect(endedSessions.length).toBe(1);
    expect(endedSessions[0].activeDurationSeconds).toBe(45);
    expect(endedSessions[0].platform).toBe('youtube');
    expect(endedSessions[0].endedAt).toBeDefined();
  });

  it('handles platform switch gracefully by ending prior platform session', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');
    vi.advanceTimersByTime(20000);

    // Switches to YouTube Shorts
    sessionManager.handleFeedDetected('youtube', 'youtube_shorts');

    expect(endedSessions.length).toBe(1);
    expect(endedSessions[0].platform).toBe('instagram');
    expect(endedSessions[0].activeDurationSeconds).toBe(20);

    expect(startedSessions.length).toBe(2);
    expect(startedSessions[1].platform).toBe('youtube');
    expect(sessionManager.getCurrentSession()?.platform).toBe('youtube');
  });

  it('pauses tracking when tracking is disabled by user', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');
    expect(sessionManager.getState()).toBe('TRACKING');

    // User disables tracking
    sessionManager.handleUserTrackingToggle(false);
    expect(sessionManager.getState()).toBe('PAUSED');

    // User re-enables tracking
    sessionManager.handleUserTrackingToggle(true);
    expect(sessionManager.getState()).toBe('TRACKING');
  });

  it('sets scrolling intention, tracks adherence and detects when plan is exceeded', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');

    // User commits intention to 300s (5m) Learning
    const intention = sessionManager.setIntention({
      type: 'Learning',
      plannedDurationSeconds: 300,
    });

    expect(intention).toBeDefined();
    expect(intention?.type).toBe('Learning');
    expect(intention?.plannedDurationSeconds).toBe(300);
    expect(intention?.isExceeded).toBe(false);

    // After 100 seconds
    vi.advanceTimersByTime(100000);
    let session = sessionManager.getCurrentSession();
    expect(session?.intention?.isExceeded).toBe(false);

    // After total 320 seconds (exceeded planned 300s)
    vi.advanceTimersByTime(220000);
    session = sessionManager.getCurrentSession();
    expect(session?.intention?.isExceeded).toBe(true);

    // End session
    const ended = sessionManager.endSession('USER_EXIT');
    expect(ended?.intention?.isExceeded).toBe(true);
    expect(ended?.intention?.completedWithinPlan).toBe(false);
  });

  it('marks completedWithinPlan as true if session ends before exceeding intention', () => {
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('youtube', 'youtube_shorts');

    sessionManager.setIntention({
      type: 'Taking a Short Break',
      plannedDurationSeconds: 600,
    });

    // User also tags trigger context
    sessionManager.setUserContext('Boredom');
    expect(sessionManager.getCurrentSession()?.userContext).toBe('Boredom');

    // Scrolls for 4 minutes (240s) and leaves
    vi.advanceTimersByTime(240000);
    const ended = sessionManager.endSession('USER_EXIT');

    expect(ended?.intention?.isExceeded).toBe(false);
    expect(ended?.intention?.completedWithinPlan).toBe(true);
    expect(ended?.userContext).toBe('Boredom');
  });
});

