import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeDetector } from '../../src/content/youtube/detector';

describe('YouTubeDetector', () => {
  let detector: YouTubeDetector;

  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://www.youtube.com/shorts/testShort123',
        pathname: '/shorts/testShort123',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('reports healthy FEED_DETECTED status on shorts route', () => {
    detector = new YouTubeDetector();
    detector.initialize();

    const health = detector.getHealth();
    expect(health.feedDetected).toBe(true);
    expect(health.platform).toBe('youtube');
    expect(health.status).toBe('FEED_DETECTED');
  });

  it('scans and finds active centered video candidate element', () => {
    // Create mock YouTube shorts structure
    const shortsContainer = document.createElement('ytd-shorts');
    const renderer = document.createElement('ytd-reel-video-renderer');
    renderer.setAttribute('is-active', '');
    const video = document.createElement('video');
    video.className = 'video-stream';
    video.src = 'blob:https://www.youtube.com/video-blob-123';

    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
      top: 150,
      bottom: 650,
      left: 100,
      right: 500,
      width: 400,
      height: 500,
      x: 100,
      y: 150,
      toJSON: () => {},
    });

    renderer.appendChild(video);
    shortsContainer.appendChild(renderer);
    document.body.appendChild(shortsContainer);

    detector = new YouTubeDetector();
    detector.initialize();
    detector.scanForActiveCandidate();

    const health = detector.getHealth();
    expect(health.candidateDetected).toBe(true);
    expect(health.status).toBe('CANDIDATE_ACTIVE');
    expect(health.candidateId).toBeDefined();
    expect(health.candidateId?.startsWith('cand_')).toBe(true);
  });

  it('marks detector status as UNSUPPORTED_PAGE when on regular YouTube watch page', () => {
    window.location.href = 'https://www.youtube.com/watch?v=regularVideo';
    window.location.pathname = '/watch';

    detector = new YouTubeDetector();
    detector.initialize();

    const health = detector.getHealth();
    expect(health.feedDetected).toBe(false);
    expect(health.status).toBe('UNSUPPORTED_PAGE');
  });
});
