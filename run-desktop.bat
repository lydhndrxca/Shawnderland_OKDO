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
echo [1/4] Checking dependencies...
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
echo [2/4] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: --- Try Electron first ---
echo [3/4] Checking Electron...
set "ELECTRON_EXE=node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" goto :browser_mode

:: Quick test — can the OS actually run electron.exe?
"%ELECTRON_EXE%" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo       Electron blocked by system policy. Falling back to browser mode.
    goto :browser_mode
)

:: --- Electron mode ---
echo [4/4] Launching desktop app...
echo.
echo       The app will open in a native window (NOT a browser).
echo       Close this console window to stop the app.
echo.
call npx electron . --dev
goto :eof

:: --- Browser fallback mode ---
:browser_mode
echo [4/4] Launching in browser mode...
echo.
echo       Starting dev server on http://localhost:3000
echo       Your browser will open automatically.
echo       Close this console window to stop the app.
echo.

:: Start the dev server in the background
start /b "" npx next dev -p 3000

:: Wait for server to be ready
echo       Waiting for server...
set /a attempts=0

:wait_loop
set /a attempts+=1
if %attempts% gtr 60 (
    echo       [ERROR] Server did not start in 30 seconds.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 goto :wait_loop

echo       Server ready!
echo.

:: Open browser
start "" "http://localhost:3000"

echo ============================================
echo  App running at http://localhost:3000
echo  Press Ctrl+C or close this window to stop.
echo ============================================
echo.

:: Keep the console alive so the dev server stays running
:keep_alive
timeout /t 3600 /nobreak >nul
goto :keep_alive
