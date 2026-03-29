@echo off
title NexaERP - Android path setup
echo.
echo This fixes the "SDK location not found" error. Safe to run again anytime.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$sdk = Join-Path $env:LOCALAPPDATA 'Android\\Sdk'; if (-not (Test-Path $sdk)) { Write-Host 'ERROR: SDK not found at' $sdk; Write-Host 'Install Android Studio first.'; exit 1 }; $p = Join-Path '%~dp0' 'android\\local.properties'; $line = 'sdk.dir=' + ($sdk -replace '\\','/') + \"`n\"; [System.IO.File]::WriteAllText($p, $line); [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User'); Write-Host 'Wrote' $p; Write-Host 'ANDROID_HOME =' $sdk"

if errorlevel 1 (
    echo.
    pause
    exit /b 1
)

echo.
echo SUCCESS. Next:
echo   1. Close ALL terminals (PowerShell, Cursor, VS Code).
echo   2. Open a NEW terminal.
echo   3. Run:
echo        cd /d "%~dp0"
echo        npx expo run:android
echo.
pause
