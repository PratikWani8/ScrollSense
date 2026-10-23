# ScrollSense Production Deployment Guide

This guide details instructions for deploying ScrollSense in production across Docker, managed container platforms, and MongoDB Atlas.

---

## 1. System Architecture & Topology

```
                  ┌───────────────────────────────┐
                  │    Google Chrome Extension    │
                  │    (Manifest V3 / Offline)    │
                  └───────────────┬───────────────┘
                                  │ HTTPS (Paired Sync)
                                  ▼
┌───────────────────────────────┬───────────────────────────────┐
│        Frontend (SPA)         │         Backend (API)         │
│         Nginx / Port 80       │       Node.js / Port 5000     │
│   (try_files client routing)  │     (Express + Rate Limit)    │
└───────────────────────────────┴───────────────┬───────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
                       ▼                                                 ▼
        ┌───────────────────────────────┐                 ┌───────────────────────────────┐
        │      MongoDB Database         │                 │    FastAPI AI Microservice    │
        │   Port 27017 / Mongo 7.0      │                 │         Port 8000             │
        │   (Replica Set or Atlas)      │                 │   (Protected by X-Internal-Key│
        └───────────────────────────────┘                 └───────────────────────────────┘
```

---

## 2. Quick Start: Local Multi-Container Deployment

Run the complete stack with Docker Compose:

```bash
# 1. Clone and enter directory
cd ScrollSense

# 2. Copy and customize root environment file
cp .env.example .env

# 3. Start all services in detached mode
docker compose up -d --build

# 4. Check container health status
docker compose ps
```

Services will be accessible at:
- **Web Dashboard:** `http://localhost:3000`
- **Backend API:** `http://localhost:5000/api/v1`
- **AI Microservice:** `http://localhost:8000`
- **MongoDB:** `localhost:27017`

---

## 3. Production Environment Variables Inventory

| Variable | Service | Description | Recommended Production Setting |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Backend | Environment flag | `production` |
| `PORT` | Backend | API Port | `5000` |
| `MONGODB_URI` | Backend | Database connection | Atlas connection string with replica set |
| `JWT_SECRET` | Backend | Auth signing key | Random 64-character alphanumeric string |
| `JWT_EXPIRES_IN` | Backend | Auth token TTL | `7d` |
| `CORS_ORIGIN` | Backend | Allowed web origins | Comma-separated list: `https://app.scrollsense.io` |
| `DEVICE_TOKEN_SALT`| Backend | Salt for device hashes | Unique 64-character random salt |
| `AI_SERVICE_URL` | Backend | Internal AI endpoint | `http://ai-service:8000` or private VPC URL |
| `AI_SERVICE_KEY` | Backend | Shared secret header | Random 32-character key |
| `INTERNAL_API_KEY`| AI Service | Shared secret validator| Must match `AI_SERVICE_KEY` |
| `LLM_PROVIDER` | AI Service | Model provider | `fallback` (offline) or `gemini` / `openai` |
| `GEMINI_API_KEY` | AI Service | Google AI Studio Key | Optional if provider is `fallback` |
| `VITE_API_URL` | Frontend | API root for client | `/api/v1` or `https://api.scrollsense.io/api/v1`|

---

## 4. Production Cloud Deployment Options

### Option A: Railway / Render / Fly.io (PaaS)
1. **Database:** Deploy a free/standard cluster on [MongoDB Atlas](https://www.mongodb.com/atlas). Copy the `mongodb+srv://...` URI.
2. **AI Service:** Deploy `ai-service/Dockerfile` as a private service. Set `INTERNAL_API_KEY` and `LLM_PROVIDER=fallback`.
3. **Backend:** Deploy `backend/Dockerfile`. Add environment variables for `MONGODB_URI`, `JWT_SECRET`, `DEVICE_TOKEN_SALT`, `AI_SERVICE_URL`, and `AI_SERVICE_KEY`.
4. **Frontend:** Deploy `frontend/Dockerfile` with `VITE_API_URL` pointing to your backend production URL.

### Option B: AWS ECS / DigitalOcean Kubernetes
Use the pre-built multi-stage Dockerfiles provided:
- Build images:
  ```bash
  docker build -f backend/Dockerfile -t scrollsense/backend:1.0.0 .
  docker build -f frontend/Dockerfile -t scrollsense/frontend:1.0.0 .
  docker build -f ai-service/Dockerfile -t scrollsense/ai-service:1.0.0 .
  ```
- Deploy using Kubernetes manifests or ECS task definitions with health checks configured.

---

## 5. Health & Readiness Monitoring

- **Backend Health:** `GET /health`
  - Returns `200 OK` with database status `CONNECTED` when healthy.
  - Returns `503 Service Unavailable` with `DEGRADED` if MongoDB is down.
- **AI Microservice Health:** `GET /health`
  - Returns `200 OK` with status `HEALTHY` and model version.

---

## 6. Database Backup & Disaster Recovery

### Creating a Backup
```bash
# Dump complete database to an archive
mongodump --uri="mongodb://localhost:27017/scrollsense" --archive=backup-$(date +%F).gz --gzip
```

### Restoring from Backup
```bash
# Restore from gzipped archive
mongorestore --uri="mongodb://localhost:27017/scrollsense" --archive=backup-2026-10-11.gz --gzip --drop
```

---

## 7. Rollback & Troubleshooting Procedures

If a deployment experiences issues:
1. **Zero-Downtime Rollback:**
   ```bash
   # Revert to previous Docker image tag
   docker compose pull
   docker compose up -d --no-build
   ```
2. **AI Microservice Outage:**
   The backend includes an automatic **local fallback generator**. If the Python AI service times out or becomes unreachable, the backend transparently serves deterministic rule-based insights without returning 500 errors to users.
3. **Database Connectivity Recovery:**
   If MongoDB experiences a failover, Mongoose automatically reconnects with exponential backoff.
