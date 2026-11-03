@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if errorlevel 1 exit /b 1
if not exist package.json exit /b 1
echo 1. Codex account connection
echo 2. WorkBuddy / CodeBuddy account connection
echo 3. API setup guide - no local service needed
choice /c 123 /n /m "Choose 1, 2 or 3: "
if errorlevel 3 goto api
if errorlevel 2 goto workbuddy
call "%~dp0start-codex.cmd"
exit /b
:workbuddy
call "%~dp0start-workbuddy.cmd"
exit /b
:api
echo Install dist/xuexitong-api.user.js in Tampermonkey.
echo Read docs/API.md and configure your own provider, model and API key.
pause
