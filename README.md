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


## 2. Environment Configuration

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

## 3. Testing & Verification

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

## 4. How to Run Locally

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

## 5. Verified Behaviors & Known Boundaries

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
