# ScrollSense Chrome Extension (Manifest V3)

> **Understand your scrolling. Reclaim your time.**  
> Local-first, privacy-preserving behavioral tracking engine for Instagram Reels and YouTube Shorts on Google Chrome desktop.

---

## 1. Overview & Architecture

ScrollSense Chrome Extension operates completely client-side without requiring an active backend or remote database.

```
extension/
├── manifest.json              # Chrome Extension Manifest V3 declaration
├── src/
│   ├── background/            # MV3 Background Service Worker
│   │   ├── service-worker.ts  # Coordinator & message hub
│   │   ├── tab-state-manager.ts # Tabs & Window focus tracking
│   │   ├── storage-manager.ts # Versioned chrome.storage.local persistence
│   │   └── sync-manager.ts    # Offline queue & status
│   ├── content/               # Content scripts
│   │   ├── shared/            # Common visibility, route & video observers
│   │   │   ├── visibility.ts  # Page Visibility API & focus observer
│   │   │   ├── route-observer.ts # SPA navigation & history interception
│   │   │   └── video-observer.ts # IntersectionObserver & viewport geometry
│   │   ├── instagram/         # Instagram Reels detector
│   │   │   ├── detector.ts
│   │   │   └── selectors.ts   # Isolated DOM selectors
│   │   └── youtube/           # YouTube Shorts detector
│   │       ├── detector.ts
│   │       └── selectors.ts   # Isolated DOM selectors
│   ├── tracking/              # Core tracking algorithms & state machines
│   │   ├── session-manager.ts # State machine & timestamp sliced duration
│   │   ├── video-estimator.ts # Dwell-time qualification & candidate monitoring
│   │   ├── deduplication.ts   # Privacy-preserving hashing & deduplication
│   │   ├── doomscroll-engine.ts # Deterministic 0-100 behavioral scoring
│   │   └── event-processor.ts # Daily aggregation & bounded event queues
│   └── popup/                 # Extension popup interface
│       ├── popup.html
│       ├── popup.css
│       └── popup.ts
└── tests/                     # Automated Vitest unit & integration test suite
```

---

## 2. Core Tracking Principles & Safeguards

1. **Privacy-Preserving Video Identifiers:**
   - Raw video URLs, titles, usernames, and search queries are **never** stored or transmitted.
   - Candidates are hashed using salted, deterministic 64-bit cryptographic hashing (`hashCandidateIdentifier`).
2. **Qualified View Estimation:**
   - A video is marked as an *estimated qualified view* only when:
     - The browser is on a supported short-video route (`/reels/` or `/shorts/`).
     - A candidate video is located and visible in the active viewport center.
     - Document visibility is `visible` and active.
     - Dwell time reaches the qualification threshold (default **2.0 seconds**).
     - The video candidate has not already been qualified within the active tracking session.
3. **Discrete Sliced Dwell Duration:**
   - Time accumulation does **not** rely on naive `setInterval` ticks (which drift and miscount in sleeping tabs).
   - Time is accumulated via discrete timestamp slices (`currentSliceStart` to transition time).
   - Backgrounded tabs, window blurs, or minimized windows instantly transition state to `PAUSED` and stop time accumulation.
4. **Service Worker Suspension Recovery:**
   - Active session metadata and heartbeat timestamps are saved in `chrome.storage.local`.
   - When the service worker awakens, it checks if the session is still active (< 12s heartbeat timeout). If active, it restores tracking seamlessly; if expired, it reconciles the session gracefully up to the last heartbeat.

---

## 3. How to Load the Extension in Google Chrome

1. **Build the extension:**
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. **Open Google Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked**.
   - Select the `extension/dist` folder:  
     `c:\Users\Pratik\Desktop\Workspace\Web Projects\ScrollSense\extension\dist`
3. **Verify:**
   - "ScrollSense - Digital Wellbeing for Reels & Shorts" will appear in your extensions list.
   - Click the extension icon in the toolbar to inspect the tracking popup.

---

## 4. Manual Live Validation Checklist

Because Instagram and YouTube continuously update their front-end web DOM, perform this manual validation test on live Chrome:

| Test Case | Steps to Test | Expected Behavior |
| :--- | :--- | :--- |
| **1. Instagram Reels Entry** | Open `https://www.instagram.com/reels/` | Extension popup badge turns green (`Tracking`). "Instagram Reels" pill appears. |
| **2. Instagram Dwell View** | Watch a Reel for > 2 seconds without scrolling | "Reels Views (Est.)" increments by 1. |
| **3. Instagram Quick Skip** | Swipe/scroll rapidly (< 1.5s per reel) | Navigation events count increases; no views qualified. |
| **4. Tab Switching** | Switch to an empty tab | Status changes to `Paused (Tab hidden)`. Timer stops accumulating. |
| **5. YouTube Shorts Entry** | Open `https://www.youtube.com/shorts` | Extension popup recognizes "YouTube Shorts", timer starts. |
| **6. YouTube Dwell View** | Watch a Short for > 2 seconds | "Shorts Views (Est.)" increments by 1. |
| **7. Rewatch Deduplication** | Scroll up to previous Reel/Short | View count does NOT increment again for the same candidate. |
| **8. Pause / Resume Toggle** | Click "Pause Tracking" in popup | Tracking halts, badge changes to amber (`PAUSED`). |
| **9. Reset Local Data** | Click "Reset Data" in popup | Stats reset to zero, active session ends. |
| **10. Browser Restart** | Close Chrome while on Reels, reopen | Recovery watchdog gracefully finalizes session without data corruption. |

---

## 5. Automated Tests

Run the Vitest test suite:
```bash
npm run test:run
```
Output:
```
 ✓ tests/unit/deduplication.test.ts (5 tests)
 ✓ tests/unit/storage-manager.test.ts (4 tests)
 ✓ tests/unit/session-manager.test.ts (6 tests)
 ✓ tests/unit/doomscroll-engine.test.ts (8 tests)
 ✓ tests/unit/video-estimator.test.ts (5 tests)
 ✓ tests/integration/sw-suspension-recovery.test.ts (2 tests)
 ✓ tests/integration/tracking-pipeline.test.ts (1 test)
 ✓ tests/unit/route-observer.test.ts (4 tests)
 ✓ tests/unit/youtube-detector.test.ts (3 tests)
 ✓ tests/unit/instagram-detector.test.ts (3 tests)

 Test Files  10 passed (10)
      Tests  41 passed (41)
```

---

## 6. Known Limitations & Phase 2 Next Steps

- **Desktop Chrome Scope:** Currently targets desktop Google Chrome (`instagram.com` and `youtube.com`). Does not track native mobile apps.
- **Estimated Views:** Browser signals (viewport intersection + dwell duration >= 2s) provide *estimates* of qualified views, not authoritative third-party telemetry.
- **Phase 2 Scope:** Upcoming Phase 2 will introduce the MERN stack (Express, MongoDB, React, Vite) for multi-device dashboard analytics and secure extension-to-cloud device pairing.
