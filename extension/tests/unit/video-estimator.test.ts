import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoEstimator } from '../../src/tracking/video-estimator';
import { SessionDeduplicator } from '../../src/tracking/deduplication';
import { QualifiedViewEvent, NavigationEvent } from '../../src/shared/types';

describe('VideoEstimator', () => {
  let estimator: VideoEstimator;
  let deduplicator: SessionDeduplicator;
  let qualifiedViews: QualifiedViewEvent[] = [];
  let navEvents: NavigationEvent[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    qualifiedViews = [];
    navEvents = [];
    deduplicator = new SessionDeduplicator();

    estimator = new VideoEstimator({
      qualificationThresholdSeconds: 2.0,
      deduplicator,
      onQualifiedView: (event) => qualifiedViews.push(event),
      onNavigationEvent: (event) => navEvents.push(event),
    });

    estimator.setSession('test-session-123', 'instagram', 'instagram_reels');
    estimator.setFeedActive(true);
    estimator.setTabVisibility(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('qualifies a candidate after meeting the 2.0s dwell threshold', () => {
    estimator.onCandidateDetected('cand_video_1', 1.0);

    // Fast forward 1 second (under 2s threshold)
    vi.advanceTimersByTime(1000);
    expect(qualifiedViews.length).toBe(0);

    // Advance remaining 1000ms to hit 2.0s
    vi.advanceTimersByTime(1000);
    expect(qualifiedViews.length).toBe(1);
    expect(qualifiedViews[0].candidateId).toBe('cand_video_1');
    expect(qualifiedViews[0].platform).toBe('instagram');
    expect(qualifiedViews[0].feedType).toBe('instagram_reels');
    expect(qualifiedViews[0].dwellDurationSeconds).toBe(2);
  });

  it('cancels qualification and emits navigation event if candidate changes before 2.0s', () => {
    estimator.onCandidateDetected('cand_video_1', 1.0);

    // Dwell for 1.2s then user scrolls to next video
    vi.advanceTimersByTime(1200);
    expect(qualifiedViews.length).toBe(0);

    estimator.onCandidateDetected('cand_video_2', 1.0);

    // Navigation event should have been emitted
    expect(navEvents.length).toBe(1);
    expect(navEvents[0].fromCandidateId).toBe('cand_video_1');
    expect(navEvents[0].toCandidateId).toBe('cand_video_2');

    // Fast forward another 1 second (cand_video_1 would have completed at 2s, but was cancelled)
    vi.advanceTimersByTime(1000);
    expect(qualifiedViews.length).toBe(0);

    // Fast forward another 1 second so cand_video_2 reaches 2.0s
    vi.advanceTimersByTime(1000);
    expect(qualifiedViews.length).toBe(1);
    expect(qualifiedViews[0].candidateId).toBe('cand_video_2');
  });

  it('pauses dwell timer when tab becomes hidden and resumes when visible', () => {
    estimator.onCandidateDetected('cand_video_hidden_test', 1.0);

    // Dwell for 1.5s
    vi.advanceTimersByTime(1500);
    expect(qualifiedViews.length).toBe(0);

    // User switches tabs (hidden)
    estimator.setTabVisibility(false);

    // 5 seconds pass while hidden
    vi.advanceTimersByTime(5000);
    expect(qualifiedViews.length).toBe(0); // must NOT qualify while hidden!

    // User switches back to tab
    estimator.setTabVisibility(true);

    // Needs remaining 0.5s to reach 2.0s
    vi.advanceTimersByTime(400);
    expect(qualifiedViews.length).toBe(0);

    vi.advanceTimersByTime(200);
    expect(qualifiedViews.length).toBe(1);
    expect(qualifiedViews[0].candidateId).toBe('cand_video_hidden_test');
  });

  it('does NOT qualify the same candidate twice in the same tracking session', () => {
    // 1st time: candidate qualifies
    estimator.onCandidateDetected('cand_duplicate', 1.0);
    vi.advanceTimersByTime(2000);
    expect(qualifiedViews.length).toBe(1);

    // User scrolls away
    estimator.onCandidateDetected('cand_other', 1.0);
    vi.advanceTimersByTime(2000);
    expect(qualifiedViews.length).toBe(2);

    // User scrolls back to previous candidate
    estimator.onCandidateDetected('cand_duplicate', 1.0);
    vi.advanceTimersByTime(3000);

    // Count should still be 2 (cand_duplicate not counted again)
    expect(qualifiedViews.length).toBe(2);
  });

  it('respects configurable qualification threshold', () => {
    estimator.setQualificationThresholdSeconds(1.0); // 1 second threshold
    estimator.onCandidateDetected('cand_fast_threshold', 1.0);

    vi.advanceTimersByTime(900);
    expect(qualifiedViews.length).toBe(0);

    vi.advanceTimersByTime(200);
    expect(qualifiedViews.length).toBe(1);
  });
});
