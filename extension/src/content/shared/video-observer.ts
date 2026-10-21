/**
 * VideoObserver
 *
 * Observes candidate video elements in the DOM using IntersectionObserver
 * and viewport bounds geometry.
 */

export interface VideoObserverCallbacks {
  onCandidateBecameVisible: (element: HTMLElement) => void;
  onCandidateBecameHidden: (element: HTMLElement) => void;
}

export class VideoObserver {
  private intersectionObserver: IntersectionObserver | null = null;
  private observedElements: Set<HTMLElement> = new Set();
  private callbacks: VideoObserverCallbacks;
  private minIntersectionRatio: number;

  constructor(callbacks: VideoObserverCallbacks, minIntersectionRatio: number = 0.5) {
    this.callbacks = callbacks;
    this.minIntersectionRatio = minIntersectionRatio;
  }

  public initialize(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= this.minIntersectionRatio) {
            this.callbacks.onCandidateBecameVisible(target);
          } else {
            this.callbacks.onCandidateBecameHidden(target);
          }
        }
      },
      {
        root: null, // viewport
        threshold: [0.0, 0.3, 0.5, 0.7, 1.0],
      }
    );
  }

  public observe(element: HTMLElement): void {
    if (!this.intersectionObserver || this.observedElements.has(element)) return;
    this.observedElements.add(element);
    this.intersectionObserver.observe(element);
  }

  public unobserve(element: HTMLElement): void {
    if (!this.intersectionObserver || !this.observedElements.has(element)) return;
    this.observedElements.delete(element);
    this.intersectionObserver.unobserve(element);
  }

  public disconnect(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    this.observedElements.clear();
  }

  /**
   * Helper: checks if element is in the vertical center band of the viewport.
   */
  public static isElementInViewportCenter(element: HTMLElement): boolean {
    if (!element || typeof window === 'undefined') return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    if (rect.width === 0 || rect.height === 0) return false;

    const elementCenterY = rect.top + rect.height / 2;
    const viewportCenterY = windowHeight / 2;
    const verticalTolerance = windowHeight * 0.4; // within 40% of viewport center

    return (
      Math.abs(elementCenterY - viewportCenterY) < verticalTolerance &&
      rect.left < windowWidth &&
      rect.right > 0
    );
  }
}
