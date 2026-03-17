@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Shawnderland OKDO — Hub Launcher
echo ============================================
echo.

:: --- Locate Node.js ---
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ok

:: Check common install locations
set "NODE_SEARCH_DIRS="
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %ProgramFiles%\nodejs"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %ProgramFiles(x86)%\nodejs"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %LOCALAPPDATA%\Programs\nodejs"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %APPDATA%\nvm\current"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %LOCALAPPDATA%\fnm_multishells"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %LOCALAPPDATA%\volta\bin"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %USERPROFILE%\.volta\bin"
set "NODE_SEARCH_DIRS=%NODE_SEARCH_DIRS% %LOCALAPPDATA%\node-portable\node-v22.16.0-win-x64"

for %%D in (%NODE_SEARCH_DIRS%) do (
    if exist "%%~D\node.exe" (
        echo       Found Node.js at %%~D
        set "PATH=%%~D;%PATH%"
        goto :node_ok
    )
)

:: Check nvm-windows versioned dirs
if exist "%APPDATA%\nvm" (
    for /d %%V in ("%APPDATA%\nvm\v*") do (
        if exist "%%~V\node.exe" (
            echo       Found Node.js at %%~V
            set "PATH=%%~V;%PATH%"
            goto :node_ok
        )
    )
)

:: Check fnm versioned dirs
if exist "%APPDATA%\fnm\node-versions" (
    for /d %%V in ("%APPDATA%\fnm\node-versions\v*") do (
        if exist "%%~V\installation\node.exe" (
            echo       Found Node.js at %%~V\installation
            set "PATH=%%~V\installation;%PATH%"
            goto :node_ok
        )
    )
)

echo [ERROR] Node.js not found.
echo.
echo   Checked PATH, Program Files, nvm, fnm, and volta.
echo   Install Node.js 18+ from https://nodejs.org
echo   (Use the LTS installer and check "Add to PATH" during setup)
echo.
pause
exit /b 1

:node_ok
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo       Node.js %NODE_VER%

:: --- Dependencies ---
echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo       Installing packages (first run, may take a minute)...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: --- Port cleanup ---
echo [2/3] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: --- Start ---
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
