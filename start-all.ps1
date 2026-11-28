# Windows Service Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                        ScrollSense" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start AI Microservice (Port 8000)
Write-Host "[1/3] Starting FastAPI AI Microservice on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'ai-service'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Start Main Backend (Port 5000)
Write-Host "[2/3] Starting Node.js Express Backend on http://localhost:5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm run dev"

# 3. Start Frontend (Port 5173)
Write-Host "[3/3] Starting Vite React Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev"

Write-Host ""
Write-Host "All 3 services have been launched in dedicated terminal windows!" -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser to begin signing." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan