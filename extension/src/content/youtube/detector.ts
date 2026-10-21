/**
 * YouTube Shorts Detector Content Script
 *
 * Runs on youtube.com to detect active shorts consumption,
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
import { YOUTUBE_SELECTORS } from './selectors';

export class YouTubeDetector {
  private routeObserver!: RouteObserver;
  private visibilityObserver!: VisibilityObserver;
  private videoObserver!: VideoObserver;
  private videoEstimator!: VideoEstimator;
  private mutationObserver: MutationObserver | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private scanIntervalId: ReturnType<typeof setInterval> | null = null;

  private isShortsRoute: boolean = false;
  private currentActiveCandidateId: string | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;

  public initialize(): void {
    // 1. Initialize Video Estimator
    this.videoEstimator = new VideoEstimator({
      qualificationThresholdSeconds: 2.0,
      onQualifiedView: (event) => {
        this.sendMessage({
          type: 'CONTENT_QUALIFIED_VIEW',
          payload: {
            platform: 'youtube',
            feedType: 'youtube_shorts',
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
            platform: 'youtube',
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
            platform: 'youtube',
            feedType: 'youtube_shorts',
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
    const isShorts = YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test(url);
    const routeChanged = isShorts !== this.isShortsRoute;
    this.isShortsRoute = isShorts;

    if (isShorts) {
      this.videoEstimator.setSession(`yt_session_${Date.now()}`, 'youtube', 'youtube_shorts');
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
      if (this.isShortsRoute) {
        this.scanForActiveCandidate();
      }
    });

    const targetNode = document.querySelector(YOUTUBE_SELECTORS.SHORTS_CONTAINER) || document.body || document.documentElement;
    if (targetNode) {
      this.mutationObserver.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['is-active'],
      });
    }
  }

  private setupPeriodicTasks(): void {
    // Scan candidate every 1000ms
    this.scanIntervalId = setInterval(() => {
      if (this.isShortsRoute && this.visibilityObserver.isTabVisible()) {
        this.scanForActiveCandidate();
      }
    }, 1000);

    // Heartbeat every 3000ms
    this.heartbeatIntervalId = setInterval(() => {
      if (this.isShortsRoute && this.visibilityObserver.isTabVisible()) {
        this.sendMessage({
          type: 'CONTENT_HEARTBEAT',
          payload: {
            platform: 'youtube',
            feedType: 'youtube_shorts',
            timestamp: Date.now(),
            dwellSeconds: 3,
          },
        });
      }
    }, LIMITS.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Scans YouTube DOM for active shorts candidate.
   * Prefers ytd-reel-video-renderer[is-active] or centered video renderer in viewport.
   */
  public scanForActiveCandidate(): void {
    if (!this.isShortsRoute || typeof document === 'undefined') return;

    // 1. Try finding ytd-reel-video-renderer with [is-active]
    const activeRenderer = document.querySelector<HTMLElement>(YOUTUBE_SELECTORS.ACTIVE_REEL_RENDERER);
    let targetVideo: HTMLVideoElement | null = null;

    if (activeRenderer) {
      targetVideo = activeRenderer.querySelector<HTMLVideoElement>(YOUTUBE_SELECTORS.VIDEO_ELEMENT);
    }

    // 2. Fallback: find centered video in viewport
    if (!targetVideo) {
      const renderers = Array.from(document.querySelectorAll<HTMLElement>(YOUTUBE_SELECTORS.REEL_RENDERER));
      for (const r of renderers) {
        if (VideoObserver.isElementInViewportCenter(r)) {
          targetVideo = r.querySelector<HTMLVideoElement>(YOUTUBE_SELECTORS.VIDEO_ELEMENT);
          if (targetVideo) break;
        }
      }
    }

    // 3. Fallback: all video tags in DOM centered in viewport
    if (!targetVideo) {
      const allVideos = Array.from(document.querySelectorAll<HTMLVideoElement>(YOUTUBE_SELECTORS.VIDEO_ELEMENT));
      for (const v of allVideos) {
        if (VideoObserver.isElementInViewportCenter(v)) {
          targetVideo = v;
          break;
        }
      }
    }

    if (targetVideo) {
      this.activeVideoElement = targetVideo;
      const candidateId = this.extractCandidateId(targetVideo);

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
   * Extracts privacy-preserving candidate hash from YouTube DOM element.
   */
  private extractCandidateId(video: HTMLVideoElement): string {
    // 1. Try matching short ID from URL
    const urlMatch = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      return hashCandidateIdentifier(urlMatch[1]);
    }

    // 2. Try renderer element ID or data attribute
    const renderer = video.closest<HTMLElement>(YOUTUBE_SELECTORS.REEL_RENDERER);
    if (renderer && renderer.id) {
      return hashCandidateIdentifier(renderer.id);
    }

    // 3. Try video src
    const src = video.currentSrc || video.src;
    if (src) {
      try {
        const parsed = new URL(src);
        return hashCandidateIdentifier(parsed.pathname);
      } catch {
        return hashCandidateIdentifier(src);
      }
    }

    // 4. Stable DOM fallback
    return hashCandidateIdentifier(`yt_dom_${Math.round(video.getBoundingClientRect().top)}`);
  }

  private handleCandidateBecameVisible(element: HTMLElement): void {
    if (this.isShortsRoute) {
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
        platform: 'youtube',
        feedType: 'youtube_shorts',
        isActive: this.isShortsRoute,
        currentRoute: window.location.pathname,
        health: this.getHealth(),
      },
    });
  }

  public getHealth(): DetectorHealth {
    const isVisible = this.visibilityObserver ? this.visibilityObserver.isTabVisible() : true;
    let status: DetectorStatus = 'IDLE';

    if (!this.isShortsRoute) {
      status = 'UNSUPPORTED_PAGE';
    } else if (!isVisible) {
      status = 'PAUSED';
    } else if (this.currentActiveCandidateId) {
      status = 'CANDIDATE_ACTIVE';
    } else {
      status = 'FEED_DETECTED';
    }

    return {
      feedDetected: this.isShortsRoute,
      candidateDetected: this.currentActiveCandidateId !== null,
      trackingActive: this.isShortsRoute && isVisible && this.currentActiveCandidateId !== null,
      status,
      currentRoute: typeof location !== 'undefined' ? location.pathname : undefined,
      platform: 'youtube',
      candidateId: this.currentActiveCandidateId ?? undefined,
      confidence: this.currentActiveCandidateId ? 1.0 : 0.0,
      detectorVersion: DETECTOR_VERSION,
      updatedAt: Date.now(),
    };
  }

  private reportHealth(): void {
    // Health is bundled in status messages
  }

  private sendMessage(msg: any): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(msg, () => {
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
  const detector = new YouTubeDetector();
  detector.initialize();
}
