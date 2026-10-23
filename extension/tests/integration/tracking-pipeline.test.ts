import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/tracking/session-manager';
import { VideoEstimator } from '../../src/tracking/video-estimator';
import { EventProcessor, getTodayDateString } from '../../src/tracking/event-processor';
import { SessionDeduplicator } from '../../src/tracking/deduplication';
import { DEFAULT_USER_SETTINGS } from '../../src/shared/constants';

describe('End-to-End Tracking Pipeline Integration', () => {
  let sessionManager: SessionManager;
  let videoEstimator: VideoEstimator;
  let eventProcessor: EventProcessor;
  let deduplicator: SessionDeduplicator;

  beforeEach(() => {
    vi.useFakeTimers();
    deduplicator = new SessionDeduplicator();
    eventProcessor = new EventProcessor();

    sessionManager = new SessionManager({
      onSessionEnded: (session) => {
        eventProcessor.processCompletedSession(session, DEFAULT_USER_SETTINGS);
      },
    });

    videoEstimator = new VideoEstimator({
      qualificationThresholdSeconds: 2.0,
      deduplicator,
      onQualifiedView: (event) => {
        sessionManager.recordQualifiedView(event);
        eventProcessor.processQualifiedView(event);
      },
      onNavigationEvent: (event) => {
        sessionManager.recordNavigationEvent(event);
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs complete lifecycle: feed entry, candidate view qualification, navigation, session exit, and daily aggregation', () => {
    // 1. User opens Instagram Reels
    sessionManager.handleVisibilityChange(true);
    sessionManager.handleFeedDetected('instagram', 'instagram_reels');
    videoEstimator.setSession(
      sessionManager.getCurrentSession()?.sessionId || 'sess-1',
      'instagram',
      'instagram_reels'
    );
    videoEstimator.setFeedActive(true);
    videoEstimator.setTabVisibility(true);

    expect(sessionManager.getState()).toBe('TRACKING');

    // 2. Candidate 1 detected in viewport
    videoEstimator.onCandidateDetected('cand_video_1', 1.0);

    // Dwell 2.5 seconds (qualifies cand_video_1)
    vi.advanceTimersByTime(2500);

    let session = sessionManager.getCurrentSession();
    expect(session?.estimatedVideoViews).toBe(1);

    // 3. User navigates to Candidate 2
    videoEstimator.onCandidateDetected('cand_video_2', 1.0);
    session = sessionManager.getCurrentSession();
    expect(session?.navigationEvents).toBe(1);

    // Dwell 2.5 seconds (qualifies cand_video_2)
    vi.advanceTimersByTime(2500);
    session = sessionManager.getCurrentSession();
    expect(session?.estimatedVideoViews).toBe(2);

    // 4. User navigates away / exits Reels
    vi.advanceTimersByTime(5000); // 5 more seconds active
    videoEstimator.setFeedActive(false);
    sessionManager.handleFeedExit();

    expect(sessionManager.getState()).toBe('IDLE');

    // 5. Inspect aggregated daily stats
    const todaySummary = eventProcessor.getOrCreateDailySummary(getTodayDateString());
    expect(todaySummary.sessionCount).toBe(1);
    expect(todaySummary.estimatedInstagramViews).toBe(2);
    expect(todaySummary.estimatedYouTubeViews).toBe(0);
    expect(todaySummary.instagramDurationSeconds).toBe(10); // 2.5s + 2.5s + 5s = 10s
    expect(todaySummary.totalDurationSeconds).toBe(10);
    expect(todaySummary.doomscrollScore).toBeDefined();

    // 6. Inspect unsynced queue
    const unsynced = eventProcessor.getUnsyncedEvents();
    expect(unsynced.length).toBe(2);
    expect(unsynced[0].candidateId).toBe('cand_video_1');
    expect(unsynced[1].candidateId).toBe('cand_video_2');
  });
});
