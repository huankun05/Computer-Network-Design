@echo off
title Network Course Project

echo.
echo  ============================================
echo   Computer Network Knowledge System
echo   One-Click Start
echo  ============================================
echo.

set "PROJECT_DIR=%~dp0"

echo  [1/2] Starting backend on port 3001 ...
start "Backend - Node.js" powershell -Command "Set-Location '%PROJECT_DIR%src\backend'; node server.js"
timeout /t 2 /nobreak >nul
echo  [Backend] OK
echo.

echo  [2/2] Starting frontend on port 5173 ...
start "Frontend - Vite" powershell -Command "Set-Location '%PROJECT_DIR%src\frontend'; npx vite"
timeout /t 3 /nobreak >nul
echo  [Frontend] OK
echo.

echo  ============================================
echo   All services started!
echo  ============================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001/api/health
echo  ============================================
echo.

start http://localhost:5173

echo  Press any key to close this window...
pause >nul
