@echo off
:: Bolt Local - Windows EXE Builder
:: Double-click OR right-click -> Run as administrator
:: Auto-elevates if not already running as admin

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ============================================
echo   Bolt Local - Windows EXE Builder
echo ============================================
echo.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_build-elevated.ps1"
