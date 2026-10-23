import { vi } from 'vitest';
import { createMockChrome } from './mocks/chrome';

// Provide global Chrome mock
const mockChrome = createMockChrome();
(globalThis as any).chrome = mockChrome;

// Provide global IntersectionObserver mock if needed
if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = class {
    private callback: Function;
    constructor(callback: Function) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Ensure document visibilityState defaults to visible in jsdom
if (typeof document !== 'undefined') {
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: true,
  });
  document.hasFocus = () => true;
}
