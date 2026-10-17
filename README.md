# ScrollSense

**Understand your scrolling. Reclaim your time.**

ScrollSense is an AI-powered digital wellbeing and behavioral analytics platform that tracks and analyzes Instagram Reels and YouTube Shorts consumption on desktop Google Chrome, estimates short-video views, measures active browsing duration, detects compulsive scrolling patterns via a deterministic engine, and synthesizes nonjudgmental habit intelligence via a Python FastAPI AI microservice and React dashboard.

---

## 1. Monorepo Architecture

```
ScrollSense/
├── package.json              # Monorepo workspaces & orchestrator scripts
├── docker-compose.yml        # Multi-container orchestration (Mongo, Backend, Frontend, AI)
├── extension/                # Chrome Extension Manifest V3 (Phases 1–4)
│   ├── manifest.json         # Minimal-permission Manifest V3 specification
│   ├── src/
│   │   ├── background/       # Service worker, sync-manager, offline queue, tab-state
│   │   ├── content/          # Instagram Reels & YouTube Shorts DOM detectors
│   │   ├── tracking/         # Session state machine, dwell video estimator, doomscroll engine
│   │   ├── popup/            # Popup UI with live stopwatch, custom server pairing, habit meter
│   │   └── shared/           # Cross-extension interfaces & IPC messages
│   ├── scripts/package.mjs   # Chrome Web Store automated .zip packaging script
│   ├── dist/                 # Built unpacked extension ready for Chrome
│   ├── dist-zip/             # Packaged .zip ready for Chrome Web Store Developer Console
│   └── tests/                # 11 test suites (44 tests)
├── backend/                  # TypeScript Node.js + Express + MongoDB REST API (Phases 2–4)
│   ├── Dockerfile            # Production multi-stage Docker build
│   ├── src/
│   │   ├── config/           # Database connection, graceful shutdown, Zod env validation
│   │   ├── models/           # Mongoose models: User, Device, Session, DailyStats, AIReport, Goal
│   │   ├── middleware/       # JWT user auth, X-Device-Token auth, rate limiters, error handler
│   │   ├── routes/           # Versioned API routes under /api/v1 (auth, devices, sync, privacy, insights)
│   │   ├── services/         # DoomscrollDetectionEngine, aggregation, retention pruning
│   │   └── server.ts         # Express entry point with SIGTERM/SIGINT graceful shutdown
│   ├── dist/                 # Compiled JavaScript output
│   └── tests/                # 7 integration test suites (31 tests)
├── frontend/                 # React + Vite + TypeScript Dashboard (Phases 2–4)
│   ├── Dockerfile            # Production multi-stage Docker build with Nginx Alpine
│   ├── nginx.conf            # SPA routing fallback, security headers, gzip compression
│   ├── src/
│   │   ├── api/              # Typed REST client with automatic Bearer token injection & retention methods
│   │   ├── components/       # MetricCard, DoomscrollMeter, BreakdownModal, GoalProgressBar, Sidebar, Navbar
│   │   ├── context/          # AuthContext with persistent session state
│   │   ├── pages/            # Landing, Login, Register, Overview, Sessions, Analytics, AIInsights, Privacy
│   │   └── App.tsx           # React Router v6 setup with public /privacy and protected shell layout
│   ├── dist/                 # Production-optimized Vite bundle with manual vendor chunk-splitting
│   └── tests/                # 2 component test suites (13 tests)
├── ai-service/               # Python FastAPI Behavioral Analytics & LLM Microservice (Phases 3–4)
│   ├── Dockerfile            # Production non-root Python 3.12 slim container
│   ├── app/
│   │   ├── main.py           # FastAPI entry point with CORS and structured logging
│   │   ├── config.py         # Pydantic Settings with INTERNAL_API_KEY authentication
│   │   ├── schemas/          # Strict Pydantic input & output validation schemas
│   │   ├── routers/          # /health probe and protected /api/v1/insights routers
│   │   └── services/         # Deterministic analytics, pattern detector, prompt builder, LLM providers
│   └── tests/                # 4 test suites (10 pytest unit & integration tests)
└── docs/                     # Production documentation
    ├── PRIVACY_POLICY.md     # Official zero-knowledge privacy policy
    ├── CHROME_STORE_LISTING.md # Store metadata, single-purpose declaration, reviewer notes
    └── DEPLOYMENT_GUIDE.md   # Production deployment, Docker, Atlas, backup/restore
```

---

## 2. Phase 4 Production Hardening & Deliverables

### A. Security Hardening
- **Device Pairing Throttling:** Dedicated `pairingRateLimiter` enforces a ceiling of 20 attempts per 15 minutes per IP on `/devices/pair/request` and `/devices/pair/approve`, preventing code brute-forcing.
- **Internal AI Service Authentication:** The Python FastAPI microservice enforces a shared `X-Internal-Key` secret header, preventing unauthorized network invocation.
- **Graceful Process Shutdown:** `backend/src/server.ts` intercepts `SIGTERM` and `SIGINT` signals, drains in-flight HTTP connections, cleanly disconnects Mongoose, and terminates without data loss.
- **Database Readiness Probes:** Backend `/health` queries live Mongoose connection state (`readyState`), returning `200 OK` (`HEALTHY`) or `503 Service Unavailable` (`DEGRADED`) for container orchestrators.
- **Cross-Origin Security:** Helmet configured with `crossOriginResourcePolicy: { policy: 'cross-origin' }` and CORS origin checks dynamically permit `chrome-extension://` schemes.

### B. Chrome Extension Hardening & Store Readiness
- **Minimal Permissions:** Manifest V3 permissions restricted strictly to `storage`, `tabs`, `alarms`, `notifications`, and host permissions limited to `instagram.com` and `youtube.com`.
- **Observable Detector Health:** Extension popup displays clear detector states: `CANDIDATE_ACTIVE`, `FEED_DETECTED`, `PAUSED` (background/minimized), `UNSUPPORTED_PAGE`, and user-paused state.
- **Custom Backend URL Support:** Users can configure custom cloud backend URLs in the extension popup when connecting to remote self-hosted or production instances.
- **Automated Store Packaging:** Run `npm run package:extension` to validate dist assets and generate a clean release `.zip` in `extension/dist-zip/`.

### C. Data Integrity & Privacy Controls
- **Configurable Retention Policies:** Users can select 14, 30, 60, or 90 days retention with automatic server-side pruning via `GET/PUT /api/v1/privacy/retention` and `POST /api/v1/privacy/cleanup`.
- **Public Privacy Policy Page:** Unauthenticated `/privacy` route on the web app and [`docs/PRIVACY_POLICY.md`](file:///c:/Users/Pratik/Desktop/Workspace/Web%20Projects/ScrollSense/docs/PRIVACY_POLICY.md) explain zero-knowledge tracking guarantees for Chrome Web Store compliance.
- **GDPR Article 17 & 20 Compliance:** Full JSON data export (`/privacy/export`) and irreversible data clearing (`/privacy/data`) and account deletion (`/privacy/account`).

### D. Performance & Reliability
- **Bundle Chunk Splitting:** Vite configured with `manualChunks` in [`frontend/vite.config.ts`](file:///c:/Users/Pratik/Desktop/Workspace/Web%20Projects/ScrollSense/frontend/vite.config.ts) separates `vendor`, `charts`, `motion`, and `icons`, eliminating monolithic bundle warnings.
- **Multi-Stage Containerization:** Production-grade Dockerfiles and `docker-compose.yml` orchestrate MongoDB, Backend, Frontend, and AI Service with healthchecks.

---

## 2. Phase 3 Implemented Features

### Part A: Deterministic Doomscroll Detection Engine
- **Reusable Engine:** [`DoomscrollDetectionEngine`](file:///c:/Users/Pratik/Desktop/Workspace/Web%20Projects/ScrollSense/backend/src/services/doomscrollEngine.ts) evaluates discrete, documented signals without medical diagnoses.
- **Signals & Weights (Max 100 Points):**
  1. **Continuous Session Duration (Weight: 25):** Evaluates ongoing session duration against break threshold (default 25 min).
  2. **Daily Goal Ratio (Weight: 25):** Compares total accumulated time today against user's daily target.
  3. **High Visit Frequency (Weight: 15):** Tracks rapid return cycles within a 60-minute window (e.g. $\ge 4$ visits = +15 pts).
  4. **Navigation Swipe Velocity (Weight: 10):** Flags rapid skipping loops ($\ge 7$ scrolls/min).
  5. **Quiet Sleep Hours (Weight: 10):** Detects usage during user-configured sleep hours (e.g. 22:00 to 07:00).
  6. **Prolonged Session Frequency (Weight: 10):** Detects repeated $\ge 25$m sessions logged in the same calendar day.
  7. **Historical Baseline Surge (Weight: 5):** Flags days exceeding 50% of the 7-day average baseline.
- **Understandable Classifications:**
  - `0 - 35`: Within your goal
  - `36 - 60`: Consider a break
  - `61 - 79`: High-usage pattern
  - `80 - 100`: Goal exceeded
- **Explainable Breakdown Endpoint:** `GET /api/v1/doomscroll/breakdown` returns current score, rule identifiers (e.g. `RULE_CONTINUOUS_EXCESS`), factor score deltas, active thresholds, and data quality indicators.
- **Active Reminders & Cooldowns:** 30-minute cooldown prevents alert fatigue. Reminders can be dismissed or snoozed via `POST /api/v1/doomscroll/events/:id/status`.

### Part B & C: Python FastAPI AI Microservice (`ai-service/`)
- **FastAPI Endpoints:**
  - `GET /health`: Health status, active provider, and fallback readiness.
  - `POST /api/v1/insights/generate`: Ingests verified aggregate statistics and outputs structured Pydantic-validated habit reports.
  - `POST /api/v1/insights/preview`: Generates quick dashboard card previews.
- **Separation of Concerns:**
  - `deterministic_analytics.py`: Authoritative totals, averages, and percentage deltas are calculated in pure Python. The LLM **never** invents or calculates numbers.
  - `pattern_detector.py`: Detects behavioral patterns: "High Goal Adherence", "Usage Reduction", "Prolonged Session Bursts", "Platform Concentration".
  - `prompt_builder.py`: Nonjudgmental prompt engineering enforcing zero medical diagnosis and strict grounding.
- **Structured Output Schema:**
  - `summary`: High-level 1-2 sentence executive overview.
  - `observations`: Verified telemetry facts citing exact numbers.
  - `positiveChanges`: Observed positive habit signals.
  - `areasToImprove`: Constructive areas for boundary setting.
  - `recommendations`: Actionable, user-controlled habit tips.
  - `suggestedGoal`: Empirical daily target proposal with reasoning.
  - `confidenceNotes`: Data sample context and heuristic dwell boundaries.
  - `dataSufficiency`: `SUFFICIENT`, `MODERATE`, or `INSUFFICIENT`.

### Part D: Resilient Fallback & Providers
- **Configurable LLM Provider:** Switch between `gemini`, `openai`, or `fallback` via `LLM_PROVIDER`.
- **Zero-Downtime Rule-Based Fallback:** `RuleBasedFallbackProvider` synthesizes high-quality, structured reports using deterministic analytics whenever an API key is absent or a third-party service times out.
- **Backend Bridge:** Express backend calls the FastAPI service with a 10s timeout, gracefully using local fallback if the microservice is offline so user requests never fail.

### Part F: React Dashboard Integration
- **AI Habit Insights Page (`/insights`):** Full-page view with executive summary, 4-quadrant cards, empirical goal adoption button, factual observations, and past weekly reports history.
- **Explainable Score Breakdown Modal:** Accessible via "Explain Factors" on the `DoomscrollMeter` to inspect exact contributing points, weights, and active thresholds.
- **Active Habit Reminder Banner:** Displayed on the overview dashboard during elevated scores or quiet hours, with "Inspect Why" and "Dismiss" controls.

---

## 3. Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/scrollsense
JWT_SECRET=scrollsense_super_secret_jwt_key_2026_production
CORS_ORIGIN=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

### AI Microservice (`ai-service/.env`)
```env
PORT=8000
HOST=0.0.0.0
LLM_PROVIDER=fallback      # "fallback", "gemini", or "openai"
# GEMINI_API_KEY=your_gemini_key_here
# OPENAI_API_KEY=your_openai_key_here
LLM_MODEL_NAME=gemini-1.5-flash
TIMEOUT_SECONDS=10.0
MAX_RETRIES=2
CACHE_TTL_SECONDS=3600
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 4. Testing & Verification

The monorepo contains **98 automated tests across 24 test suites**, all passing:

```bash
# Run all tests across Extension, Backend, Frontend, and AI Service (98 tests)
npm test

# Run individual test suites
npm run test:extension:run   # 44 tests (detectors, estimation, state machine, sync manager)
npm run test:backend         # 31 tests (auth, pairing, sync, doomscroll engine, retention, insights)
npm run test:frontend        # 13 tests (MetricCard, DoomscrollMeter, BreakdownModal, PublicPrivacyPage, etc.)
npm run test:ai              # 10 tests (health, analytics, pattern detector, internal auth, generator)

# Build all packages
npm run build

# Package Chrome Extension into store-ready distribution .zip
npm run package:extension
# Generates extension/dist-zip/scrollsense-extension-v1.0.0.zip
```

---

## 5. How to Run Locally

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- MongoDB running locally on `localhost:27017`

### 1. Start the Backend API
```bash
npm run dev:backend
# Starts at http://localhost:5000/api/v1
```

### 2. Start the AI Microservice
```bash
npm run dev:ai
# Starts at http://localhost:8000
```

### 3. Start the Frontend Dashboard
```bash
npm run dev:frontend
# Starts at http://localhost:5173
```

### 4. Load the Chrome Extension
1. Open Google Chrome at `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `ScrollSense/extension/dist`.
4. Connect to the web dashboard via the popup pairing code.

---

## 6. Verified Behaviors & Known Boundaries

### Verified Behaviors
- ✅ Deterministic doomscroll scoring guarantees identical scores for identical inputs.
- ✅ Correlated signals (session length + daily totals) do not overflow the 0–100 scale.
- ✅ AI microservice uses strict deterministic numbers; the LLM never computes totals.
- ✅ System gracefully falls back to deterministic rule synthesis if external LLM APIs fail or keys are omitted.
- ✅ Interactive modal clearly explains score factor deltas, rules, and active thresholds.
- ✅ GDPR Article 20 data export includes AI reports and doomscroll events.

### Observational Scope & Boundaries
- **Non-Diagnostic:** Habit risk scores and AI suggestions are digital wellbeing tools, not clinical diagnoses of addiction or psychiatric disorders.
- **Desktop Chrome Only:** Tracking is restricted to desktop Chrome instances with the extension installed.
- **Heuristic Views:** Video view metrics are heuristic estimates based on $\ge 2.0$s dwell time and viewport center position.
