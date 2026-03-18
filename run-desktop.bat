@echo off
setlocal

echo ============================================
echo  PUBG Madison AI Suite - Desktop App
echo ============================================
echo.

:: --- Locate Node.js ---
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ok

if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    goto :node_ok
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    goto :node_ok
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    goto :node_ok
)
if exist "%APPDATA%\nvm\current\node.exe" (
    set "PATH=%APPDATA%\nvm\current;%PATH%"
    goto :node_ok
)
if exist "%APPDATA%\nvm" (
    for /d %%V in ("%APPDATA%\nvm\v*") do (
        if exist "%%~V\node.exe" (
            set "PATH=%%~V;%PATH%"
            goto :node_ok
        )
    )
)
if exist "%LOCALAPPDATA%\volta\bin\node.exe" (
    set "PATH=%LOCALAPPDATA%\volta\bin;%PATH%"
    goto :node_ok
)
if exist "%USERPROFILE%\.volta\bin\node.exe" (
    set "PATH=%USERPROFILE%\.volta\bin;%PATH%"
    goto :node_ok
)

echo.
echo [ERROR] Node.js not found.
echo   Install Node.js 18+ from https://nodejs.org
echo.
pause
exit /b 1

:node_ok
for /f "tokens=*" %%v in ('node -v') do echo       Node.js %%v

:: --- Dependencies ---
echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo       Installing packages - first run, may take a minute...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: --- Kill anything on port 3000 ---
echo [2/3] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: --- Launch Electron ---
echo [3/3] Launching desktop app...
echo.
echo       The app will open in a native window (NOT a browser).
echo       Close this console window to stop the app.
echo.
call npx electron . --dev
