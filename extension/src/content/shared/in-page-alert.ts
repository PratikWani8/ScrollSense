/**
 * InPageAlert
 *
 * Renders an unobtrusive, isolated floating modal over supported video feeds
 * (Instagram Reels & YouTube Shorts) when a user's session intention limit is reached.
 *
 * Implements:
 * - Shadow DOM encapsulation to shield styles from host page CSS
 * - Safe DOM manipulation (no unsafe innerHTML injection)
 * - Glassmorphism translucent design matching the ScrollSense brand
 * - Accessible keyboard navigation (Escape to dismiss, focus states)
 * - Actions: Take a Break, Continue for 5 min, Dismiss
 */

import { ScrollingIntentionType } from '../../shared/types';

export interface InPageAlertOptions {
  sessionId: string;
  intentionType: ScrollingIntentionType;
  plannedDurationSeconds: number;
  activeDurationSeconds: number;
  isTestMode?: boolean;
  onAction: (action: 'TAKE_A_BREAK' | 'CONTINUE_5_MIN' | 'DISMISS') => void;
}

const HOST_ELEMENT_ID = 'scrollsense-inpage-alert-host';

export class InPageAlert {
  private static activeInstance: InPageAlert | null = null;
  private hostElement: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  public static show(options: InPageAlertOptions): InPageAlert {
    // Dismiss existing alert if present
    if (this.activeInstance) {
      this.activeInstance.dismiss(false);
    }

    const alert = new InPageAlert(options);
    alert.render();
    this.activeInstance = alert;
    return alert;
  }

  public static dismissCurrent(): void {
    if (this.activeInstance) {
      this.activeInstance.dismiss(false);
      this.activeInstance = null;
    }
  }

  constructor(private options: InPageAlertOptions) {}

  private render(): void {
    if (typeof document === 'undefined') return;

    // Clean up any pre-existing host elements
    const oldHosts = document.querySelectorAll(`#${HOST_ELEMENT_ID}`);
    oldHosts.forEach((el) => el.remove());

    // Create host element with fixed full viewport dimensions and pointer-events: none
    this.hostElement = document.createElement('div');
    this.hostElement.id = HOST_ELEMENT_ID;
    this.hostElement.style.cssText =
      'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; pointer-events: none !important; z-index: 2147483647 !important; display: block !important;';

    // Attach open shadow root for isolated styling
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    // Inject scoped styles
    const styleEl = document.createElement('style');
    styleEl.textContent = this.getStyles();
    this.shadowRoot.appendChild(styleEl);

    // Build alert card
    const card = this.buildAlertCard();
    this.shadowRoot.appendChild(card);

    // Append to fullscreenElement, documentElement or body
    const targetParent = document.fullscreenElement || document.documentElement || document.body;
    targetParent.appendChild(this.hostElement);

    // Setup Escape key listener
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.dismiss(true, 'DISMISS');
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  private buildAlertCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'scrollsense-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'scrollsense-title');
    card.setAttribute('aria-describedby', 'scrollsense-desc');

    // Header row
    const header = document.createElement('div');
    header.className = 'scrollsense-header';

    const brand = document.createElement('div');
    brand.className = 'scrollsense-brand';

    const iconBox = document.createElement('div');
    iconBox.className = 'scrollsense-icon-box';
    iconBox.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    `;

    const brandTitle = document.createElement('span');
    brandTitle.className = 'scrollsense-brand-name';
    brandTitle.textContent = 'ScrollSense';

    const badge = document.createElement('span');
    badge.className = 'scrollsense-badge';
    badge.textContent = 'Intent Limit';

    brand.appendChild(iconBox);
    brand.appendChild(brandTitle);
    brand.appendChild(badge);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'scrollsense-close-btn';
    closeBtn.setAttribute('aria-label', 'Close alert');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.dismiss(true, 'DISMISS'));

    header.appendChild(brand);
    header.appendChild(closeBtn);
    card.appendChild(header);

    // Title & Description
    const title = document.createElement('h2');
    title.id = 'scrollsense-title';
    title.className = 'scrollsense-title';
    title.textContent = 'Your planned scrolling time is up';
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.id = 'scrollsense-desc';
    desc.className = 'scrollsense-desc';

    const durationText = this.options.plannedDurationSeconds < 60
      ? `${this.options.plannedDurationSeconds}-second`
      : `${Math.round(this.options.plannedDurationSeconds / 60)}-minute`;

    desc.textContent = `You've reached your planned ${durationText} ${this.options.intentionType} limit.`;
    card.appendChild(desc);

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'scrollsense-actions';

    // Button: Take a Break
    const breakBtn = document.createElement('button');
    breakBtn.className = 'scrollsense-btn scrollsense-btn-break';
    breakBtn.textContent = 'Take a Break';
    breakBtn.addEventListener('click', () => {
      this.dismiss(true, 'TAKE_A_BREAK');
    });

    // Button: Continue for 5 min (or 10s if test mode)
    const continueBtn = document.createElement('button');
    continueBtn.className = 'scrollsense-btn scrollsense-btn-continue';
    continueBtn.textContent = this.options.isTestMode ? 'Continue for 10s' : 'Continue for 5 min';
    continueBtn.addEventListener('click', () => {
      this.dismiss(true, 'CONTINUE_5_MIN');
    });

    // Button: Dismiss
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'scrollsense-btn scrollsense-btn-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => {
      this.dismiss(true, 'DISMISS');
    });

    actions.appendChild(breakBtn);
    actions.appendChild(continueBtn);
    actions.appendChild(dismissBtn);
    card.appendChild(actions);

    return card;
  }

  public dismiss(notifyCallback: boolean = true, action?: 'TAKE_A_BREAK' | 'CONTINUE_5_MIN' | 'DISMISS'): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.hostElement && this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
    }
    this.hostElement = null;
    this.shadowRoot = null;

    if (InPageAlert.activeInstance === this) {
      InPageAlert.activeInstance = null;
    }

    if (typeof document !== 'undefined') {
      const stray = document.querySelectorAll(`#${HOST_ELEMENT_ID}`);
      stray.forEach((el) => el.remove());
    }

    if (notifyCallback && action) {
      try {
        this.options.onAction(action);
      } catch (e) {
        console.warn('[ScrollSense Alert] Error in alert action handler:', e);
      }
    }
  }

  private getStyles(): string {
    return `
      :host {
        all: initial !important;
        display: block !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
      }
      * {
        box-sizing: border-box !important;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .scrollsense-card {
        position: fixed !important;
        top: 24px !important;
        right: 24px !important;
        width: 330px !important;
        max-width: calc(100vw - 32px) !important;
        background: rgba(15, 20, 36, 0.94) !important;
        backdrop-filter: blur(18px) !important;
        -webkit-backdrop-filter: blur(18px) !important;
        border: 1px solid rgba(255, 255, 255, 0.16) !important;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.3) !important;
        border-radius: 16px !important;
        padding: 16px 18px !important;
        color: #f8fafc !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
        animation: scrollsense-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @supports not (backdrop-filter: blur(10px)) {
        .scrollsense-card {
          background: #11162a !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .scrollsense-card {
          animation: none !important;
          transform: none !important;
          opacity: 1 !important;
        }
      }

      @keyframes scrollsense-slide-in {
        from {
          opacity: 0;
          transform: translateY(-12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .scrollsense-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .scrollsense-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .scrollsense-icon-box {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: linear-gradient(135deg, #6366f1, #06b6d4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      }

      .scrollsense-brand-name {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.2px;
      }

      .scrollsense-badge {
        font-size: 9.5px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 10px;
        background: rgba(244, 63, 94, 0.2);
        color: #fb7185;
        border: 1px solid rgba(244, 63, 94, 0.35);
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }

      .scrollsense-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 6px;
        transition: color 0.15s, background 0.15s;
      }
      .scrollsense-close-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
      }

      .scrollsense-title {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.3;
        margin-bottom: 4px;
      }

      .scrollsense-desc {
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.4;
        margin-bottom: 14px;
      }

      .scrollsense-actions {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .scrollsense-btn {
        flex: 1;
        padding: 7px 10px;
        border-radius: 9px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        text-align: center;
        transition: all 0.15s ease;
        outline: none;
        white-space: nowrap;
      }
      .scrollsense-btn:focus-visible {
        box-shadow: 0 0 0 2px #818cf8;
      }

      .scrollsense-btn-break {
        background: linear-gradient(135deg, #e11d48, #f43f5e);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
      }
      .scrollsense-btn-break:hover {
        background: linear-gradient(135deg, #be123c, #e11d48);
        box-shadow: 0 2px 10px rgba(225, 29, 72, 0.4);
      }

      .scrollsense-btn-continue {
        background: rgba(99, 102, 241, 0.18);
        color: #c7d2fe;
        border-color: rgba(99, 102, 241, 0.35);
      }
      .scrollsense-btn-continue:hover {
        background: rgba(99, 102, 241, 0.3);
        color: #ffffff;
      }

      .scrollsense-btn-dismiss {
        flex: 0 0 auto;
        background: rgba(255, 255, 255, 0.05);
        color: #94a3b8;
        border-color: rgba(255, 255, 255, 0.08);
      }
      .scrollsense-btn-dismiss:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #f1f5f9;
      }
    `;
  }
}
