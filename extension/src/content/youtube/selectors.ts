/**
 * YouTube Desktop DOM Selectors
 * Isolated module for YouTube Shorts DOM querying.
 */

export const YOUTUBE_SELECTORS = {
  // Shorts Container & Renderers
  SHORTS_CONTAINER: 'ytd-shorts, #shorts-container',
  ACTIVE_REEL_RENDERER: 'ytd-reel-video-renderer[is-active]',
  REEL_RENDERER: 'ytd-reel-video-renderer',

  // Media
  VIDEO_ELEMENT: 'video.video-stream, video',

  // Navigation & Interactive controls
  OVERLAY: '#overlay, #actions',
  LIKE_BUTTON: '#like-button, ytd-like-button-renderer',
  COMMENTS_BUTTON: '#comments-button',

  // Route check regex
  SHORTS_ROUTE_REGEX: /\/shorts(\/([a-zA-Z0-9_-]+))?/i,
};
