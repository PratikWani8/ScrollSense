/**
 * Instagram Desktop DOM Selectors
 * Isolated module for Instagram Reels DOM querying.
 */

export const INSTAGRAM_SELECTORS = {
  // Video Containers
  FEED_CONTAINER: 'main[role="main"], div[role="main"]',
  REEL_CARD: 'article, div[data-pressable-container="true"], div[style*="scroll-snap-align"]',
  REEL_LINK: 'a[href*="/reel/"], a[href*="/reels/"]',

  // Media
  VIDEO_ELEMENT: 'video',

  // Controls & Action buttons (to distinguish reels viewer from photo grids)
  AUDIO_BUTTON: 'button[aria-label*="Audio"], button[aria-label*="audio"]',
  LIKE_BUTTON: 'button[aria-label*="Like"], svg[aria-label*="Like"]',

  // Route check regex
  REELS_ROUTE_REGEX: /\/(reels|reel)\/([a-zA-Z0-9_-]+)?/i,
};
