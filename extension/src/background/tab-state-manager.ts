/**
 * TabStateManager
 *
 * Coordinates Chrome Tabs and Windows API events to reliably track
 * active tab changes, window focus gain/loss, and tab closures.
 */

import { Platform, FeedType } from '../shared/types';
import { ROUTES } from '../shared/constants';

export interface TabFeedMatch {
  platform: Platform;
  feedType: FeedType;
  isFeed: boolean;
}

export function detectFeedFromUrl(url?: string): TabFeedMatch | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    if (host.includes('instagram.com')) {
      const isReels = ROUTES.INSTAGRAM_REELS_PATTERN.test(path);
      return {
        platform: 'instagram',
        feedType: 'instagram_reels',
        isFeed: isReels,
      };
    }

    if (host.includes('youtube.com')) {
      const isShorts = ROUTES.YOUTUBE_SHORTS_PATTERN.test(path);
      return {
        platform: 'youtube',
        feedType: 'youtube_shorts',
        isFeed: isShorts,
      };
    }
  } catch {
    // Malformed URL
  }

  return null;
}

export interface TabStateCallbacks {
  onActiveTabChanged?: (tabId: number, match: TabFeedMatch | null, url: string) => void;
  onFocusChanged?: (isWindowFocused: boolean) => void;
  onTabClosed?: (tabId: number) => void;
}

export class TabStateManager {
  private activeTabId: number | null = null;
  private activeWindowId: number | null = null;
  private isWindowFocused: boolean = true;
  private currentTabUrl: string | null = null;
  private callbacks: TabStateCallbacks;

  constructor(callbacks: TabStateCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public initialize(): void {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.windows) {
      return;
    }

    // 1. Tab activated (switched tabs)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId, activeInfo.windowId);
    });

    // 2. Tab updated (URL or loading status changed)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tabId === this.activeTabId && (changeInfo.url || changeInfo.status === 'complete')) {
        this.handleTabUpdated(tabId, tab.url || changeInfo.url || '');
      }
    });

    // 3. Tab closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // 4. Window focus changed
    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.handleWindowFocusChanged(windowId);
    });

    // Seed initial active tab
    this.queryCurrentActiveTab();
  }

  public queryCurrentActiveTab(): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].id) {
        this.handleTabActivated(tabs[0].id, tabs[0].windowId);
      }
    });
  }

  private handleTabActivated(tabId: number, windowId?: number): void {
    this.activeTabId = tabId;
    if (windowId !== undefined) {
      this.activeWindowId = windowId;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.get(tabId, (tab) => {
        if (!chrome.runtime.lastError && tab && tab.url) {
          this.currentTabUrl = tab.url;
          const match = detectFeedFromUrl(tab.url);
          if (this.callbacks.onActiveTabChanged) {
            this.callbacks.onActiveTabChanged(tabId, match, tab.url);
          }
        }
      });
    }
  }

  private handleTabUpdated(tabId: number, url: string): void {
    this.currentTabUrl = url;
    const match = detectFeedFromUrl(url);
    if (this.callbacks.onActiveTabChanged) {
      this.callbacks.onActiveTabChanged(tabId, match, url);
    }
  }

  private handleTabRemoved(tabId: number): void {
    if (this.callbacks.onTabClosed) {
      this.callbacks.onTabClosed(tabId);
    }
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
      this.currentTabUrl = null;
    }
  }

  private handleWindowFocusChanged(windowId: number): void {
    if (typeof chrome !== 'undefined' && chrome.windows) {
      const isFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
      this.isWindowFocused = isFocused;
      if (this.callbacks.onFocusChanged) {
        this.callbacks.onFocusChanged(isFocused);
      }
    }
  }

  public getActiveTabId(): number | null {
    return this.activeTabId;
  }

  public isFocused(): boolean {
    return this.isWindowFocused;
  }

  public getCurrentUrl(): string | null {
    return this.currentTabUrl;
  }
}
