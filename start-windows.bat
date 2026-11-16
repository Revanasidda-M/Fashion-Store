@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 18.11 or newer, then try again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)
echo Starting Fashion Store at http://localhost:5000
echo Keep this window open while using the application.
npm run dev
pause
