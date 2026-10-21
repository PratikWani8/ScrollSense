/**
 * Visibility Observer
 *
 * Tracks document visibility (Page Visibility API) and window focus/blur
 * to ensure time and view qualifications only occur when the user is actively viewing the tab.
 */

export interface VisibilityCallbacks {
  onVisibilityChanged?: (isVisible: boolean) => void;
}

export class VisibilityObserver {
  private isVisible: boolean = true;
  private callbacks: VisibilityCallbacks;

  constructor(callbacks: VisibilityCallbacks = {}) {
    this.callbacks = callbacks;
    this.updateVisibility();
  }

  public initialize(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      this.updateVisibility();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.updateVisibility();
      });

      window.addEventListener('blur', () => {
        this.updateVisibility();
      });
    }

    this.updateVisibility();
  }

  public isTabVisible(): boolean {
    return this.isVisible;
  }

  private updateVisibility(): void {
    if (typeof document === 'undefined') return;

    const docVisible = typeof document.visibilityState === 'undefined' || document.visibilityState === 'visible';
    const newVisible = docVisible;

    if (newVisible !== this.isVisible) {
      this.isVisible = newVisible;
      if (this.callbacks.onVisibilityChanged) {
        this.callbacks.onVisibilityChanged(newVisible);
      }
    }
  }
}
