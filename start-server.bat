@echo off
cd /d "%~dp0"

echo Checking for Node.js installation...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed! Please install Node.js from https://nodejs.org/
    echo Press any key to open the Node.js download page...
    pause >nul
    start https://nodejs.org/
    pause
    exit
)

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    echo Please check if you have an active internet connection.
    pause
    exit
)

echo Starting server...
node server.js
if %errorlevel% neq 0 (
    echo Server failed to start!
    pause
    exit
)

pause 