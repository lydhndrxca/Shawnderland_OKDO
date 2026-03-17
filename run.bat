@echo off
setlocal

echo ============================================
echo  Shawnderland OKDO - Hub Launcher
echo ============================================
echo.

:: --- Locate Node.js ---
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ok

:: Check default installer location
if exist "%ProgramFiles%\nodejs\node.exe" (
    echo       Found Node.js in Program Files
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    goto :node_ok
)

:: Check x86 Program Files
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    echo       Found Node.js in Program Files x86
    set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    goto :node_ok
)

:: Check user-local Programs
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    echo       Found Node.js in Local Programs
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    goto :node_ok
)

:: Check nvm-windows current
if exist "%APPDATA%\nvm\current\node.exe" (
    echo       Found Node.js via nvm
    set "PATH=%APPDATA%\nvm\current;%PATH%"
    goto :node_ok
)

:: Check nvm-windows versioned folders
if exist "%APPDATA%\nvm" (
    for /d %%V in ("%APPDATA%\nvm\v*") do (
        if exist "%%~V\node.exe" (
            echo       Found Node.js at %%~V
            set "PATH=%%~V;%PATH%"
            goto :node_ok
        )
    )
)

:: Check Volta
if exist "%LOCALAPPDATA%\volta\bin\node.exe" (
    echo       Found Node.js via Volta
    set "PATH=%LOCALAPPDATA%\volta\bin;%PATH%"
    goto :node_ok
)
if exist "%USERPROFILE%\.volta\bin\node.exe" (
    echo       Found Node.js via Volta
    set "PATH=%USERPROFILE%\.volta\bin;%PATH%"
    goto :node_ok
)

:: Check fnm
if exist "%APPDATA%\fnm\node-versions" (
    for /d %%V in ("%APPDATA%\fnm\node-versions\v*") do (
        if exist "%%~V\installation\node.exe" (
            echo       Found Node.js via fnm at %%~V
            set "PATH=%%~V\installation;%PATH%"
            goto :node_ok
        )
    )
)

:: Check portable
if exist "%LOCALAPPDATA%\node-portable\node-v22.16.0-win-x64\node.exe" (
    echo       Using portable Node.js
    set "PATH=%LOCALAPPDATA%\node-portable\node-v22.16.0-win-x64;%PATH%"
    goto :node_ok
)

echo.
echo [ERROR] Node.js not found.
echo.
echo   Checked: PATH, Program Files, nvm, fnm, Volta, portable.
echo   Install Node.js 18+ from https://nodejs.org
echo   Use the LTS installer and check "Add to PATH" during setup.
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
