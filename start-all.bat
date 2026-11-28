#!/bin/bash
echo "=========================================================="
echo "                      ScrollSense"
echo "=========================================================="

echo "[1/3] Starting FastAPI AI Microservice (Port 8000)..."
(cd ai-service && uvicorn app.main:app --host 0.0.0.0 --port 8000) &

echo "[2/3] Starting Express Backend (Port 5000)..."
(cd backend && npm start) &

echo "[3/3] Starting React Frontend (Port 5173)..."
(cd frontend && npm run dev) &

echo "All services running in background. Press Ctrl+C to stop."
wait