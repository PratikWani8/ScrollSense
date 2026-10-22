import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RouteObserver } from '../../src/content/shared/route-observer';
import { detectFeedFromUrl } from '../../src/background/tab-state-manager';
import { INSTAGRAM_SELECTORS } from '../../src/content/instagram/selectors';
import { YOUTUBE_SELECTORS } from '../../src/content/youtube/selectors';

describe('RouteObserver & Feed Route Detection', () => {
  it('correctly classifies Instagram Reels routes vs unrelated Instagram routes', () => {
    // Supported Reels routes
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/reels/')).toBe(true);
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/reels/videos/')).toBe(true);
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/reel/C3abc123/')).toBe(true);

    // Unrelated Instagram pages (should NOT match)
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/')).toBe(false);
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/explore/')).toBe(false);
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/direct/inbox/')).toBe(false);
    expect(INSTAGRAM_SELECTORS.REELS_ROUTE_REGEX.test('https://www.instagram.com/johndoe/')).toBe(false);
  });

  it('correctly classifies YouTube Shorts routes vs regular YouTube videos', () => {
    // Supported Shorts routes
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/shorts')).toBe(true);
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/shorts/')).toBe(true);
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/shorts/abcXYZ123')).toBe(true);

    // Unrelated YouTube pages (should NOT match)
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/')).toBe(false);
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/watch?v=abcXYZ123')).toBe(false);
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/feed/subscriptions')).toBe(false);
    expect(YOUTUBE_SELECTORS.SHORTS_ROUTE_REGEX.test('https://www.youtube.com/results?search_query=test')).toBe(false);
  });

  it('detectFeedFromUrl helper correctly extracts platform and feed type', () => {
    const igMatch = detectFeedFromUrl('https://www.instagram.com/reels/');
    expect(igMatch).toEqual({
      platform: 'instagram',
      feedType: 'instagram_reels',
      isFeed: true,
    });

    const ytMatch = detectFeedFromUrl('https://www.youtube.com/shorts/test123');
    expect(ytMatch).toEqual({
      platform: 'youtube',
      feedType: 'youtube_shorts',
      isFeed: true,
    });

    const ytNonFeed = detectFeedFromUrl('https://www.youtube.com/watch?v=123');
    expect(ytNonFeed).toEqual({
      platform: 'youtube',
      feedType: 'youtube_shorts',
      isFeed: false,
    });

    const unknownMatch = detectFeedFromUrl('https://www.google.com/');
    expect(unknownMatch).toBeNull();
  });

  it('RouteObserver intercepts history.pushState and fires callbacks', () => {
    const routeChanges: string[] = [];
    const observer = new RouteObserver({
      onRouteChange: (newUrl) => routeChanges.push(newUrl),
    });
    observer.initialize();

    // Trigger pushState
    history.pushState({}, '', '/reels/');

    expect(routeChanges.length).toBe(1);
    expect(routeChanges[0]).toContain('/reels/');

    observer.disconnect();
  });
});
