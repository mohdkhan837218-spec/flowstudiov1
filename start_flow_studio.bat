@echo off
title Google Flow Studio V2
cd /d "%~dp0"
echo ===================================================
echo   Starting Google Flow Studio V2 Desktop Engine...
echo ===================================================
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" main.js
) else (
    call npm start
)
echo App launched! You can close this console.

