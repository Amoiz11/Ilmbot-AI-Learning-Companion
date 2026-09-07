@echo off
echo ========================================================
echo Starting IlmBot Backend and Frontend...
echo ========================================================

:: Start Backend in a separate window
start "IlmBot Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Start Frontend in a separate window
start "IlmBot Frontend (Vite)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo.
pause
