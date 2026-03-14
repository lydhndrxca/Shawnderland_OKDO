@echo off
setlocal

echo ============================================
echo  Shawnderland OKDO — Hub Launcher
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\node-portable\node-v22.16.0-win-x64\node.exe" (
        echo       Using portable Node.js...
        set "PATH=%LOCALAPPDATA%\node-portable\node-v22.16.0-win-x64;%PATH%"
    ) else (
        echo [ERROR] Node.js not found in PATH.
        echo         Install Node.js 18+ from https://nodejs.org
        pause
        exit /b 1
    )
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo       Installing packages...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [2/3] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [3/3] Starting dev server...
start "" cmd /c "npm run dev"

echo.
echo Waiting for server on http://localhost:3000 ...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 goto wait_loop

echo Server is up. Opening browser...
start http://localhost:3000

echo.
echo Hub is running at http://localhost:3000
echo Press Ctrl+C in the dev server window to stop.
pause
