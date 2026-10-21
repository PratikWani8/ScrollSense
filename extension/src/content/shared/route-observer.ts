/**
 * RouteObserver
 *
 * Observes Single-Page Application (SPA) client-side navigation.
 * Patches history.pushState and history.replaceState, listens to popstate,
 * hashchange, custom YouTube navigation events, and mutation fallbacks.
 */

export interface RouteObserverCallbacks {
  onRouteChange: (newUrl: string, oldUrl: string) => void;
}

export class RouteObserver {
  private currentUrl: string = typeof location !== 'undefined' ? location.href : '';
  private callbacks: RouteObserverCallbacks;
  private isListening: boolean = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(callbacks: RouteObserverCallbacks) {
    this.callbacks = callbacks;
  }

  public initialize(): void {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;
    this.currentUrl = location.href;

    // 1. Intercept History API
    this.wrapHistoryMethod('pushState');
    this.wrapHistoryMethod('replaceState');

    // 2. Standard popstate & hashchange events
    window.addEventListener('popstate', () => this.checkUrlChange());
    window.addEventListener('hashchange', () => this.checkUrlChange());

    // 3. YouTube specific SPA events
    window.addEventListener('yt-navigate-finish', () => this.checkUrlChange());
    window.addEventListener('yt-page-data-updated', () => this.checkUrlChange());

    // 4. Polling fallback for edge cases (e.g. silent pushState from framework)
    this.pollIntervalId = setInterval(() => {
      this.checkUrlChange();
    }, 500);
  }

  public getCurrentUrl(): string {
    return this.currentUrl;
  }

  public disconnect(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.isListening = false;
  }

  private wrapHistoryMethod(method: 'pushState' | 'replaceState'): void {
    const original = history[method];
    if (typeof original !== 'function') return;

    const self = this;
    history[method] = function (data: any, unused: string, url?: string | URL | null) {
      const result = original.apply(this, arguments as any);
      self.checkUrlChange();
      return result;
    };
  }

  public checkUrlChange(): void {
    if (typeof location === 'undefined') return;

    const newUrl = location.href;
    if (newUrl !== this.currentUrl) {
      const oldUrl = this.currentUrl;
      this.currentUrl = newUrl;
      this.callbacks.onRouteChange(newUrl, oldUrl);
    }
  }
}
