# Chrome Web Store Listing & Submission Guide: ScrollSense

This document contains all materials, disclosures, and reviewer notes required for submitting ScrollSense to the **Google Chrome Web Store Developer Dashboard**.

---

## 1. Store Metadata

### Title
```text
ScrollSense - Digital Wellbeing for Reels & Shorts
```

### Short Description (Max 132 chars)
```text
Understand your scrolling. Reclaim your time. Local-first wellbeing analytics for Instagram Reels & YouTube Shorts.
```

### Category
```text
Productivity / Workflow & Planning
```

### Version
```text
1.0.0
```

### Privacy Policy URL
```text
https://scrollsense.io/privacy
```

---

## 2. Detailed Store Description

```markdown
**ScrollSense: Understand your scrolling. Reclaim your time.**

Endless short-video scrolling drains hours from your day before you even realize it. ScrollSense is an intelligent, privacy-first digital wellbeing companion designed specifically to measure, analyze, and moderate your Instagram Reels and YouTube Shorts habits.

🌟 KEY FEATURES:
• Real-Time Dwell-Time Tracking: Accurately clocks active viewing time only when a short-video feed is visible and focused.
• Estimated Video Views: Approximates qualified views (videos watched for ≥ 2.0s) so you know your actual throughput.
• Explainable Doomscroll Detection: A transparent 0–100 behavioral risk score calculated from session length, goal ratio, repeat visits, and quiet-hours scrolling.
• Nonjudgmental Habit Reminders: Configurable notifications gently nudge you to take a break when sessions run long.
• Optional Cloud Synchronization: Seamlessly pair with your personal web dashboard via secure 6-character codes to visualize weekly analytics across devices.
• 100% Local-First by Default: Local tracking continues completely offline. No account required to track locally.

🔒 ZERO-KNOWLEDGE PRIVACY GUARANTEES:
We believe digital wellbeing tools should never become surveillance tools.
• We NEVER record video URLs, titles, captions, or comments.
• We NEVER access your Instagram or YouTube accounts, messages, or followers.
• We NEVER track browsing outside of Instagram Reels and YouTube Shorts.
• All data is owned by you: export or delete your history anytime with GDPR-compliant tools.

DISCLAIMER:
Video view counts and doomscroll scores are empirical estimates calculated for habit awareness, not authoritative third-party platform statistics or clinical psychiatric diagnoses.
```

---

## 3. Chrome Web Store Single-Purpose Compliance Justification

> **Single-Purpose Declaration:**  
> ScrollSense has a single, well-defined purpose: **monitoring and managing personal digital wellbeing during short-video feed consumption**. All features, observers, and storage mechanisms exist solely to quantify active session duration, estimate consumption volume, and deliver habit awareness alerts.

---

## 4. Permissions Justification (For Reviewers)

| Permission | Official Reviewer Justification |
| :--- | :--- |
| `storage` | Essential for local storage of user goals, dwell statistics, and an offline event queue in `chrome.storage.local`. Enables complete privacy without requiring an account. |
| `tabs` | Needed to observe `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` so duration timers immediately pause when the user switches tabs, minimizing battery impact and eliminating duration false positives. |
| `alarms` | Required in Manifest V3 to periodically check watchdog recovery and trigger scheduled synchronization retries across service worker lifecycles. |
| `notifications` | Required to deliver user-configured break reminders when a continuous feed browsing session exceeds the user's defined goal threshold. |
| Host: `*://*.instagram.com/*` | Required to inject the content script observer specifically into Instagram Reels routes (`/reels/`, `/reel/`). |
| Host: `*://*.youtube.com/*` | Required to inject the content script observer specifically into YouTube Shorts routes (`/shorts/`). |

---

## 5. Data Usage & Disclosure Checkbox Selections

In the Chrome Developer Dashboard **Privacy Practices** tab:

1. **Single Purpose:** Check *Yes* — The extension has a single purpose.
2. **Permission Justification:** Paste the table above.
3. **Data Usage:**
   - **User Activity:** Checked (Only duration and view counts on Reels and Shorts).
   - **Personal Information:** Unchecked (No names, emails, or personal credentials are read by the extension).
   - **Web History:** Unchecked (The extension does NOT record browsing history).
4. **Data Certification:**
   - [x] Does not sell user data to third parties.
   - [x] Does not use or transfer user data for purposes unrelated to the extension's core functionality.
   - [x] Does not use or transfer user data to determine creditworthiness or for lending purposes.

---

## 6. Reviewer Instructions & Demo Account

```text
To test the extension:
1. Load the extension unpacked or from the provided package zip.
2. Click the ScrollSense extension icon in the toolbar. Note the clean "Idle" zero-state.
3. Navigate to https://www.youtube.com/shorts or https://www.instagram.com/reels/
4. Open the extension popup: observe that the platform is detected ("YouTube Shorts" or "Instagram Reels"), the active session stopwatch increments, and the detector status shows "CANDIDATE_ACTIVE".
5. Switch to a non-video tab: observe that the session timer pauses immediately.
6. Optional Dashboard Pairing: Enter pairing code on the web dashboard at http://localhost:3000/devices (or production URL) to test cloud synchronization.
```

---

## 7. Packaging & Upload Asset

To generate the verified distribution `.zip` for upload:
```bash
npm run package:extension
```
Output location:
`extension/dist-zip/scrollsense-extension-v1.0.0.zip`
