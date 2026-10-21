/**
 * VideoEstimator
 *
 * Implements privacy-preserving, dwell-time based short-video view estimation.
 *
 * A qualified video-view estimate is generated only when:
 * 1. The browser is on a supported short-video feed (Instagram Reels or YouTube Shorts).
 * 2. A candidate video element is observable in the active viewport.
 * 3. The tab/document is active and visible.
 * 4. The candidate remains visible and active for at least the configurable threshold (default 2.0s).
 * 5. The candidate has not already been qualified in the current tracking session.
 */

import { Platform, FeedType, QualifiedViewEvent, NavigationEvent, VideoCandidate } from '../shared/types';
import { DETECTOR_VERSION } from '../shared/constants';
import { generateUUID, SessionDeduplicator } from './deduplication';

export interface VideoEstimatorOptions {
  qualificationThresholdSeconds?: number;
  deduplicator?: SessionDeduplicator;
  onQualifiedView?: (event: QualifiedViewEvent) => void;
  onNavigationEvent?: (event: NavigationEvent) => void;
  onCandidateActive?: (candidate: VideoCandidate) => void;
}

export class VideoEstimator {
  private qualificationThresholdMs: number;
  private deduplicator: SessionDeduplicator;
  private onQualifiedView?: (event: QualifiedViewEvent) => void;
  private onNavigationEvent?: (event: NavigationEvent) => void;
  private onCandidateActive?: (candidate: VideoCandidate) => void;

  private currentSessionId: string | null = null;
  private currentPlatform: Platform | null = null;
  private currentFeedType: FeedType | null = null;

  private currentCandidate: VideoCandidate | null = null;
  private dwellTimerId: ReturnType<typeof setTimeout> | null = null;
  private dwellStartTime: number | null = null;
  private accumulatedDwellMs: number = 0;

  private isTabVisible: boolean = true;
  private isFeedActive: boolean = false;
  private isEnabled: boolean = true;

  constructor(options: VideoEstimatorOptions = {}) {
    this.qualificationThresholdMs = (options.qualificationThresholdSeconds ?? 2.0) * 1000;
    this.deduplicator = options.deduplicator ?? new SessionDeduplicator();
    this.onQualifiedView = options.onQualifiedView;
    this.onNavigationEvent = options.onNavigationEvent;
    this.onCandidateActive = options.onCandidateActive;
  }

  /**
   * Set or update current session.
   */
  public setSession(sessionId: string | null, platform: Platform | null, feedType: FeedType | null): void {
    if (this.currentSessionId !== sessionId) {
      this.cancelDwellTimer();
      this.currentCandidate = null;
      this.accumulatedDwellMs = 0;
    }
    this.currentSessionId = sessionId;
    this.currentPlatform = platform;
    this.currentFeedType = feedType;
  }

  /**
   * Update qualification threshold in seconds.
   */
  public setQualificationThresholdSeconds(seconds: number): void {
    this.qualificationThresholdMs = Math.max(500, seconds * 1000);
  }

  /**
   * Enable or disable estimation.
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cancelDwellTimer();
    }
  }

  /**
   * Update feed active state (whether user is on supported reels/shorts route).
   */
  public setFeedActive(isActive: boolean): void {
    this.isFeedActive = isActive;
    if (!isActive) {
      this.cancelDwellTimer();
      this.currentCandidate = null;
    }
  }

  /**
   * Update tab visibility state.
   * If tab becomes hidden, active dwell timer pauses.
   * If tab becomes visible again, dwell timer resumes.
   */
  public setTabVisibility(isVisible: boolean): void {
    if (this.isTabVisible === isVisible) return;
    this.isTabVisible = isVisible;

    if (!isVisible) {
      this.pauseDwell();
    } else {
      this.resumeDwell();
    }
  }

  /**
   * Triggered when a video candidate is detected in the viewport.
   */
  public onCandidateDetected(candidateId: string, confidence: number = 1.0): void {
    if (!this.isEnabled || !this.isFeedActive || !this.currentSessionId || !this.currentPlatform) {
      return;
    }

    const now = Date.now();

    // Check if user scrolled/swapped to a new candidate
    if (this.currentCandidate && this.currentCandidate.candidateId !== candidateId) {
      const prevCandidateId = this.currentCandidate.candidateId;
      this.cancelDwellTimer();

      // Emit navigation event
      if (this.onNavigationEvent) {
        this.onNavigationEvent({
          eventId: generateUUID(),
          sessionId: this.currentSessionId,
          platform: this.currentPlatform,
          occurredAt: now,
          fromCandidateId: prevCandidateId,
          toCandidateId: candidateId,
        });
      }
    } else if (this.currentCandidate && this.currentCandidate.candidateId === candidateId) {
      // Same candidate still in view; keep monitoring
      return;
    }

    // New candidate observed
    this.currentCandidate = {
      candidateId,
      platform: this.currentPlatform,
      feedType: this.currentFeedType || (this.currentPlatform === 'instagram' ? 'instagram_reels' : 'youtube_shorts'),
      firstSeenAt: now,
      dwellDurationMs: 0,
      isQualified: false,
      confidence,
    };

    this.accumulatedDwellMs = 0;

    if (this.onCandidateActive) {
      this.onCandidateActive(this.currentCandidate);
    }

    // Start dwell qualification timer if tab is visible
    if (this.isTabVisible) {
      this.startDwellTimer();
    }
  }

  /**
   * Triggered when no video candidate is found or candidate scrolled out.
   */
  public onCandidateLost(): void {
    this.cancelDwellTimer();
    this.currentCandidate = null;
    this.accumulatedDwellMs = 0;
  }

  /**
   * Start the timer to qualify candidate after dwell threshold.
   */
  private startDwellTimer(): void {
    this.cancelDwellTimer();

    if (!this.currentCandidate || !this.currentSessionId) return;

    // Check if candidate was already qualified in this session
    if (this.deduplicator.hasCandidateBeenSeen(this.currentSessionId, this.currentCandidate.candidateId)) {
      this.currentCandidate.isQualified = true;
      return;
    }

    const remainingMs = Math.max(0, this.qualificationThresholdMs - this.accumulatedDwellMs);
    this.dwellStartTime = Date.now();

    this.dwellTimerId = setTimeout(() => {
      this.qualifyCurrentCandidate();
    }, remainingMs);
  }

  /**
   * Pause dwell timer when tab is hidden or blurred.
   */
  private pauseDwell(): void {
    if (this.dwellTimerId !== null && this.dwellStartTime !== null) {
      clearTimeout(this.dwellTimerId);
      this.dwellTimerId = null;
      this.accumulatedDwellMs += Date.now() - this.dwellStartTime;
      this.dwellStartTime = null;
    }
  }

  /**
   * Resume dwell timer when tab becomes visible again.
   */
  private resumeDwell(): void {
    if (this.currentCandidate && !this.currentCandidate.isQualified && this.isFeedActive) {
      this.startDwellTimer();
    }
  }

  /**
   * Cancel dwell timer completely.
   */
  private cancelDwellTimer(): void {
    if (this.dwellTimerId !== null) {
      clearTimeout(this.dwellTimerId);
      this.dwellTimerId = null;
    }
    this.dwellStartTime = null;
  }

  /**
   * Qualify the candidate video view.
   */
  private qualifyCurrentCandidate(): void {
    this.dwellTimerId = null;
    this.dwellStartTime = null;

    if (
      !this.currentCandidate ||
      !this.currentSessionId ||
      !this.currentPlatform ||
      !this.isFeedActive ||
      !this.isTabVisible
    ) {
      return;
    }

    // Verify deduplication again
    if (this.deduplicator.hasCandidateBeenSeen(this.currentSessionId, this.currentCandidate.candidateId)) {
      this.currentCandidate.isQualified = true;
      return;
    }

    // Mark as qualified
    this.currentCandidate.isQualified = true;
    this.currentCandidate.qualifiedAt = Date.now();
    this.deduplicator.markCandidateSeen(this.currentSessionId, this.currentCandidate.candidateId);

    const event: QualifiedViewEvent = {
      eventId: generateUUID(),
      sessionId: this.currentSessionId,
      candidateId: this.currentCandidate.candidateId,
      platform: this.currentPlatform,
      feedType: this.currentCandidate.feedType,
      occurredAt: Date.now(),
      dwellDurationSeconds: Math.round(this.qualificationThresholdMs / 1000 * 10) / 10,
      detectorVersion: DETECTOR_VERSION,
      confidence: this.currentCandidate.confidence,
    };

    if (this.onQualifiedView) {
      this.onQualifiedView(event);
    }
  }

  public getCurrentCandidate(): VideoCandidate | null {
    return this.currentCandidate;
  }

  public getAccumulatedDwellMs(): number {
    let current = this.accumulatedDwellMs;
    if (this.dwellStartTime !== null) {
      current += Date.now() - this.dwellStartTime;
    }
    return current;
  }

  public reset(): void {
    this.cancelDwellTimer();
    this.currentCandidate = null;
    this.accumulatedDwellMs = 0;
  }
}
