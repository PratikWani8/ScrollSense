# ScrollSense Privacy Policy

**Effective Date:** October 2026  
**Version:** 1.0.0  
**Extension Name:** ScrollSense - Digital Wellbeing for Reels & Shorts  

---

## 1. Single-Purpose Statement

ScrollSense is built exclusively for **digital wellbeing and personal behavioral habit analytics**. The extension measures dwell duration and navigation frequency on supported short-video platforms (Instagram Reels and YouTube Shorts) to help users understand their scrolling habits, detect prolonged sessions, and adopt intentional digital routines.

---

## 2. What Data Is Collected & Observed

The Chrome extension monitors activity **strictly when you are on supported feed URLs**:
- `*://*.instagram.com/reels/*`
- `*://*.instagram.com/reel/*`
- `*://*.youtube.com/shorts/*`

### Telemetry Measured:
1. **Active Feed Dwell Duration:** Wall-clock duration during which a supported feed is open, visible in the active tab, and in focus.
2. **Estimated Video Views:** Counter of video candidate DOM elements centered within the viewport for $\ge 2.0$ seconds. (Clearly disclosed as empirical approximations, not authoritative metrics).
3. **Feed Navigation Velocity:** Frequency of transitions between videos within a session window.
4. **Platform Identifier:** Whether the session occurred on Instagram Reels or YouTube Shorts.

---

## 3. What Data Is NEVER Collected, Inspected, or Transmitted

ScrollSense operates under a strict **Zero-Knowledge Privacy Architecture**:
- ❌ **No Video Identifiers or URLs:** Video URLs, video titles, hashtags, captions, and audio tracks are never read, stored, or sent anywhere.
- ❌ **No Creator Information:** Channel names, creator handles, and user profiles are never parsed or tracked.
- ❌ **No Social Data:** Likes, comments, direct messages, followers, or personal account feeds are completely inaccessible.
- ❌ **No General Browsing History:** Any page outside the explicit Reels and Shorts route patterns is completely ignored.
- ❌ **No Keystrokes or Input:** Form inputs, search queries, and passwords are never observed.
- ❌ **No Advertising Trackers:** ScrollSense contains no third-party tracking scripts, analytics SDKs, or advertising pixels.

---

## 4. Local-First Storage & Cloud Synchronization

- **Local-First Default:** All metrics, session counters, and risk scores are calculated entirely inside your browser using `chrome.storage.local`.
- **Optional Cloud Synchronization:** Cloud synchronization is completely opt-in. The extension will never transmit data to any server unless you explicitly approve a 6-character device pairing code on your authenticated ScrollSense web dashboard.
- **Revocable Device Credentials:** You can disconnect or revoke any paired device at any time directly from the popup or dashboard.

---

## 5. Chrome Web Store Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `storage` | Required to store user goals, local session summaries, and an offline event queue in `chrome.storage.local`. |
| `tabs` | Required to detect tab switching, tab closing, and window focus changes so session dwell timers pause accurately when the user leaves the video feed. |
| `alarms` | Required for service-worker background lifecycle recovery and scheduled synchronization flushes in Manifest V3. |
| `notifications` | Required exclusively to display gentle break reminders when a continuous feed session exceeds the user's configured goal threshold. |
| `*://*.instagram.com/*`<br>`*://*.youtube.com/*` | Host permissions are restricted strictly to Instagram and YouTube to observe the active video element in the viewport. |

---

## 6. User Rights & Data Governance (GDPR / CCPA)

- **Configurable Retention:** Users can configure retention periods between 7 and 365 days (30 days default). Data older than the selected threshold is automatically pruned.
- **Data Portability (GDPR Article 20):** Download a complete JSON export of all your session records, goals, and daily statistics at any time.
- **Right to Erasure (GDPR Article 17):** Wipe all tracking history with one click, or delete your entire account and all associated cloud records permanently.
- **Local Data Reset:** Reset all extension statistics locally at any time from the popup without affecting cloud accounts.

---

## 7. Contact & Open Source Transparency

ScrollSense is an open-source, privacy-first wellbeing platform. For privacy inquiries or code inspection:
- **Repository:** https://github.com/scrollsense/scrollsense
- **Support:** privacy@scrollsense.io
