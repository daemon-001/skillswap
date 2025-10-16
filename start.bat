@echo off
echo Starting SkillSwap React Application...
echo.

echo Starting Backend (Flask API)...
start "SkillSwap Backend" cmd /k "cd backend && python app.py"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend (React)...
start "SkillSwap Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Admin Login:
echo Email: admin@skillswap.com
echo Password: admin123
echo.
pause
