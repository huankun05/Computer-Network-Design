@echo off
title Stop Services

echo.
echo  Stopping all services ...

tasklist | findstr "node.exe" >nul 2>&1
if %errorlevel%==0 (
    taskkill /F /IM node.exe >nul 2>&1
    echo  All Node.js processes stopped.
) else (
    echo  No Node.js processes found.
)

if exist "%~dp0src\frontend\vite.config.start.js" (
    del "%~dp0src\frontend\vite.config.start.js"
    echo  Temp config cleaned.
)

echo.
echo  Done.
echo.
pause
