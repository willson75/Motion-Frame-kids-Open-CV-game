@echo off
TITLE MOTIONPLAY — Webcam-Controlled Interactive Gaming Platform
COLOR 0A

echo =========================================================================
echo              MOTIONPLAY — Move. Play. Learn.
echo      Webcam-Controlled Interactive Gaming Platform for Kids
echo =========================================================================
echo.

:: 1. Ensure Python dependencies are installed
echo [1/3] Checking Python dependencies...
python -c "import cv2, mediapipe, fastapi, uvicorn, numpy, pydantic, websockets" 2>NUL
IF %ERRORLEVEL% NEQ 0 (
    echo Installing backend dependencies...
    pip install -r requirements.txt
) ELSE (
    echo Python dependencies satisfied!
)
echo.

:: 2. Ensure NPM dependencies are installed in frontend
echo [2/3] Checking Frontend dependencies...
IF NOT EXIST "frontend\node_modules" (
    echo Installing frontend packages...
    cd frontend && npm install && cd ..
) ELSE (
    echo Frontend dependencies satisfied!
)
echo.

:: 3. Launch Backend and Frontend in separate windows
echo [3/3] Launching MotionPlay Backend and Frontend...

start "MotionPlay Backend (FastAPI)" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 >NUL

start "MotionPlay Frontend (Vite)" cmd /k "cd frontend && npm run dev"

timeout /t 2 >NUL

echo.
echo =========================================================================
echo  MOTIONPLAY IS READY FOR DEMONSTRATION!
echo.
echo  Backend API:  http://localhost:8000
echo  Frontend UI:   http://localhost:5173
echo =========================================================================
echo.

:: Open default web browser
start http://localhost:5173

pause
