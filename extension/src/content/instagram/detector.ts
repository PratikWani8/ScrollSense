/**
 * Instagram Reels Detector Content Script
 *
 * Runs on instagram.com to detect active reels consumption,
 * estimate video views, measure active dwell time, and report health.
 */

import { DetectorHealth, DetectorStatus } from '../../shared/types';
import { DETECTOR_VERSION, LIMITS } from '../../shared/constants';
import { hashCandidateIdentifier } from '../../tracking/deduplication';
import { VideoEstimator } from '../../tracking/video-estimator';
import { RouteObserver } from '../shared/route-observer';
import { VisibilityObserver } from '../shared/visibility';
import { VideoObserver } from '../shared/video-observer';
import { InPageAlert } from '../shared/in-page-alert';
import { INSTAGRAM_SELECTORS } from './selectors';

export class InstagramDetector {
  private routeObserver!: RouteObserver;
  private visibilityObserver!: VisibilityObserver;
  private videoObserver!: VideoObserver;
  private videoEstimator!: VideoEstimator;
  private mutationObserver: MutationObserver | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private scanIntervalId: ReturnType<typeof setInterval> | null = null;

  private isReelsRoute: boolean = false;
  private currentActiveCandidateId: string | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private lastError: string | undefined;

  public initialize(): void {
    // 1. Initialize Video Estimator
    this.videoEstimator = new VideoEstimator({
      qualificationThresholdSeconds: 2.0,
      onQualifiedView: (event) => {
        this.sendMessage({
          type: 'CONTENT_QUALIFIED_VIEW',
          payload: {
            platform: 'instagram',
            feedType: 'instagram_reels',
            candidateId: event.candidateId,
            dwellDurationSeconds: event.dwellDurationSeconds,
            timestamp: event.occurredAt,
            confidence: event.confidence,
          },
        });
      },
      onNavigationEvent: (event) => {
        this.sendMessage({
          type: 'CONTENT_NAVIGATION_EVENT',
          payload: {
            platform: 'instagram',
            timestamp: event.occurredAt,
            fromCandidateId: event.fromCandidateId,
            toCandidateId: event.toCandidateId,
          },
        });
      },
      onCandidateActive: (candidate) => {
        this.sendMessage({
          type: 'CONTENT_CANDIDATE_CHANGED',
          payload: {
            platform: 'instagram',
            feedType: 'instagram_reels',
            candidateId: candidate.candidateId,
            confidence: candidate.confidence,
            timestamp: Date.now(),
          },
        });
      },
    });

    // 2. Initialize Visibility Observer
    this.visibilityObserver = new VisibilityObserver({
      onVisibilityChanged: (isVisible) => {
        this.videoEstimator.setTabVisibility(isVisible);
        this.reportHealth();
      },
    });
    this.visibilityObserver.initialize();

    // 3. Initialize Video Observer
    this.videoObserver = new VideoObserver({
      onCandidateBecameVisible: (el) => this.handleCandidateBecameVisible(el),
      onCandidateBecameHidden: (el) => this.handleCandidateBecameHidden(el),
    });
    this.videoObserver.initialize();

    // 4. Initialize Route Observer
    this.routeObserver = new RouteObserver({
      onRouteChange: (newUrl) => this.handleRouteChange(newUrl),
    });
    this.routeObserver.initialize();

    // 5. Check Initial Route
    this.handleRouteChange(window.location.href);

    // 6. Setup DOM Mutation Observer
    this.setupMutationObserver();

    // 7. Periodic Candidate Scanner & Heartbeat
    this.setupPeriodicTasks();

    // 8. Setup Message Listener for SW alerts
    this.setupMessageListener();
  }

  private handleRouteChange(url: string): void {
    const isReels = INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test(url);
    const routeChanged = isReels !== this.isReelsRoute;
    this.isReelsRoute = isReels;

    if (isReels) {
      this.videoEstimator.setSession(`ig_session_${Date.now()}`, 'instagram', 'instagram_reels');
      this.videoEstimator.setFeedActive(true);
      this.scanForActiveCandidate();
    } else {
      this.videoEstimator.setFeedActive(false);
      this.currentActiveCandidateId = null;
      this.activeVideoElement = null;
      InPageAlert.dismissCurrent();
    }

    if (routeChanged) {
      this.notifyFeedStatusChanged();
    }
    this.reportHealth();
  }

  private setupMessageListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;

    chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
      if (message && message.type === 'BG_SHOW_INTENTION_LIMIT_ALERT') {
        const payload = message.payload;
        InPageAlert.show({
          sessionId: payload.sessionId,
          intentionType: payload.intentionType,
          plannedDurationSeconds: payload.plannedDurationSeconds,
          activeDurationSeconds: payload.activeDurationSeconds,
          isTestMode: payload.isTestMode,
          onAction: (action) => {
            this.sendMessage({
              type: 'CONTENT_INTENTION_ACTION',
              payload: {
                sessionId: payload.sessionId,
                action,
              },
            });
          },
        });
        sendResponse({ success: true, shown: true });
        return true;
      }
    });
  }

  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    this.mutationObserver = new MutationObserver(() => {
      if (this.isReelsRoute) {
        this.scanForActiveCandidate();
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      this.mutationObserver.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }
  }

  private setupPeriodicTasks(): void {
    // Regular scan every 1000ms in case DOM changed without mutation
    this.scanIntervalId = setInterval(() => {
      if (this.isReelsRoute && this.visibilityObserver.isTabVisible()) {
        this.scanForActiveCandidate();
      }
    }, 1000);

    // Heartbeat every 3000ms
    this.heartbeatIntervalId = setInterval(() => {
      if (this.isReelsRoute && this.visibilityObserver.isTabVisible()) {
        this.sendMessage({
          type: 'CONTENT_HEARTBEAT',
          payload: {
            platform: 'instagram',
            feedType: 'instagram_reels',
            timestamp: Date.now(),
            dwellSeconds: 3,
          },
        });
      }
    }, LIMITS.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Scans DOM for visible reel video centered in the viewport.
   */
  public scanForActiveCandidate(): void {
    if (!this.isReelsRoute || typeof document === 'undefined') return;

    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(INSTAGRAM_SELECTORS.VIDEO_ELEMENT));

    let bestCandidate: HTMLVideoElement | null = null;
    let minDistanceToCenter = Infinity;
    const windowCenterY = (window.innerHeight || document.documentElement.clientHeight) / 2;

    for (const vid of videos) {
      // Must be visible in viewport
      const rect = vid.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const vidCenterY = rect.top + rect.height / 2;
      const dist = Math.abs(vidCenterY - windowCenterY);

      // Check if candidate is near center of viewport
      if (dist < minDistanceToCenter && dist < (window.innerHeight * 0.45)) {
        minDistanceToCenter = dist;
        bestCandidate = vid;
      }
    }

    if (bestCandidate) {
      this.activeVideoElement = bestCandidate;
      const candidateId = this.extractCandidateId(bestCandidate);

      if (candidateId !== this.currentActiveCandidateId) {
        this.currentActiveCandidateId = candidateId;
        this.videoEstimator.onCandidateDetected(candidateId, 1.0);
        this.reportHealth();
      }
    } else {
      if (this.currentActiveCandidateId !== null) {
        this.currentActiveCandidateId = null;
        this.activeVideoElement = null;
        this.videoEstimator.onCandidateLost();
        this.reportHealth();
      }
    }
  }

  /**
   * Extracts privacy-preserving candidate hash from video DOM element.
   */
  private extractCandidateId(video: HTMLVideoElement): string {
    // Try to find parent reel anchor tag
    const reelAnchor = video.closest(INSTAGRAM_SELECTORS.REEL_CARD)?.querySelector<HTMLAnchorElement>(INSTAGRAM_SELECTORS.REEL_LINK);
    if (reelAnchor && reelAnchor.href) {
      const match = reelAnchor.href.match(/\/reel\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return hashCandidateIdentifier(match[1]);
      }
    }

    // Try video currentSrc or src
    const src = video.currentSrc || video.src;
    if (src) {
      try {
        const parsed = new URL(src);
        return hashCandidateIdentifier(parsed.pathname);
      } catch {
        return hashCandidateIdentifier(src);
      }
    }

    // Fallback: stable relative DOM index
    const parent = video.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(video) : 0;
    return hashCandidateIdentifier(`ig_dom_${index}_${Math.round(video.getBoundingClientRect().top)}`);
  }

  private handleCandidateBecameVisible(element: HTMLElement): void {
    if (element instanceof HTMLVideoElement && this.isReelsRoute) {
      this.scanForActiveCandidate();
    }
  }

  private handleCandidateBecameHidden(element: HTMLElement): void {
    if (element === this.activeVideoElement) {
      this.scanForActiveCandidate();
    }
  }

  private notifyFeedStatusChanged(): void {
    this.sendMessage({
      type: 'CONTENT_FEED_STATUS_CHANGED',
      payload: {
        platform: 'instagram',
        feedType: 'instagram_reels',
        isActive: this.isReelsRoute,
        currentRoute: window.location.pathname,
        health: this.getHealth(),
      },
    });
  }

  public getHealth(): DetectorHealth {
    const isVisible = this.visibilityObserver ? this.visibilityObserver.isTabVisible() : true;
    let status: DetectorStatus = 'IDLE';

    if (!this.isReelsRoute) {
      status = 'UNSUPPORTED_PAGE';
    } else if (!isVisible) {
      status = 'PAUSED';
    } else if (this.currentActiveCandidateId) {
      status = 'CANDIDATE_ACTIVE';
    } else {
      status = 'FEED_DETECTED';
    }

    return {
      feedDetected: this.isReelsRoute,
      candidateDetected: this.currentActiveCandidateId !== null,
      trackingActive: this.isReelsRoute && isVisible && this.currentActiveCandidateId !== null,
      status,
      currentRoute: typeof location !== 'undefined' ? location.pathname : undefined,
      platform: 'instagram',
      candidateId: this.currentActiveCandidateId ?? undefined,
      confidence: this.currentActiveCandidateId ? 1.0 : 0.0,
      detectorVersion: DETECTOR_VERSION,
      updatedAt: Date.now(),
    };
  }

  private reportHealth(): void {
    // Health is bundled in status messages and on request
  }

  private sendMessage(msg: any): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(msg, () => {
          // Swallow lastError if background listener is sleeping
          if (chrome.runtime.lastError) {
            // expected when SW is suspended
          }
        });
      } catch (e) {
        // Ignored
      }
    }
  }
}

// Auto-instantiate in browser content script context
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const detector = new InstagramDetector();
  detector.initialize();
}
