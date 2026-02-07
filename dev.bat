@echo off
chcp 65001 >nul
title MSS Portal - Dev Server Manager

:menu
cls
echo ========================================
echo     MSS Portal - Dev Server Manager
echo ========================================
echo.
echo   [1] Start Frontend
echo   [2] Stop Frontend
echo   [3] Start Backend
echo   [4] Stop Backend
echo   [5] Start Both
echo   [6] Stop Both
echo   [7] Exit
echo.
echo ========================================
echo.

set /p choice="Select option: "

if "%choice%"=="1" goto start_frontend
if "%choice%"=="2" goto stop_frontend
if "%choice%"=="3" goto start_backend
if "%choice%"=="4" goto stop_backend
if "%choice%"=="5" goto start_both
if "%choice%"=="6" goto stop_both
if "%choice%"=="7" goto exit

echo Invalid option!
timeout /t 2 >nul
goto menu

:start_frontend
echo.
echo Starting Frontend...
cd /d "%~dp0frontend"
start "Portal Frontend" cmd /k "npm run dev"
echo Frontend started at http://localhost:5173
timeout /t 2 >nul
goto menu

:stop_frontend
echo.
echo Stopping Frontend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Frontend stopped.
timeout /t 2 >nul
goto menu

:start_backend
echo.
echo Starting Backend...
cd /d "%~dp0backend"
start "Portal Backend" cmd /k "npm run start:dev"
echo Backend started at http://localhost:3000/api
echo Swagger: http://localhost:3000/api/docs
timeout /t 2 >nul
goto menu

:stop_backend
echo.
echo Stopping Backend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Backend stopped.
timeout /t 2 >nul
goto menu

:start_both
echo.
echo Starting Backend...
cd /d "%~dp0backend"
start "Portal Backend" cmd /k "npm run start:dev"
echo Backend started.
timeout /t 3 >nul
echo Starting Frontend...
cd /d "%~dp0frontend"
start "Portal Frontend" cmd /k "npm run dev"
echo Frontend started.
echo.
echo Both services started!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000/api
timeout /t 3 >nul
goto menu

:stop_both
echo.
echo Stopping all services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo All services stopped.
timeout /t 2 >nul
goto menu

:exit
echo.
echo Goodbye!
exit /b 0
