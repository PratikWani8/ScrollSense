import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InstagramDetector } from '../../src/content/instagram/detector';

describe('InstagramDetector', () => {
  let detector: InstagramDetector;

  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://www.instagram.com/reels/',
        pathname: '/reels/',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('reports healthy FEED_DETECTED status on reels route', () => {
    detector = new InstagramDetector();
    detector.initialize();

    const health = detector.getHealth();
    expect(health.feedDetected).toBe(true);
    expect(health.platform).toBe('instagram');
    expect(health.status).toBe('FEED_DETECTED');
  });

  it('scans and finds active centered video candidate element', () => {
    // Create mock Instagram reel video
    const container = document.createElement('article');
    const reelLink = document.createElement('a');
    reelLink.href = 'https://www.instagram.com/reel/TEST_REEL_123/';
    const video = document.createElement('video');
    video.src = 'https://instagram.fsnc1-1.fna.fbcdn.net/v/t50.2886-16/reel.mp4';

    // Mock bounding client rect so it sits in center of viewport
    vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 600,
      left: 100,
      right: 500,
      width: 400,
      height: 400,
      x: 100,
      y: 200,
      toJSON: () => {},
    });

    container.appendChild(reelLink);
    container.appendChild(video);
    document.body.appendChild(container);

    detector = new InstagramDetector();
    detector.initialize();
    detector.scanForActiveCandidate();

    const health = detector.getHealth();
    expect(health.candidateDetected).toBe(true);
    expect(health.status).toBe('CANDIDATE_ACTIVE');
    expect(health.candidateId).toBeDefined();
    // Candidate ID must be privacy hash
    expect(health.candidateId?.startsWith('cand_')).toBe(true);
  });

  it('marks detector status as UNSUPPORTED_PAGE when leaving reels', () => {
    window.location.href = 'https://www.instagram.com/explore/';
    window.location.pathname = '/explore/';

    detector = new InstagramDetector();
    detector.initialize();

    const health = detector.getHealth();
    expect(health.feedDetected).toBe(false);
    expect(health.status).toBe('UNSUPPORTED_PAGE');
  });
});
