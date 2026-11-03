@echo off
setlocal EnableExtensions
if not exist "%~dp0package.json" (
  echo Keep this launcher beside package.json in the complete project folder.
  pause
  exit /b 1
)
cd /d "%~dp0"
if errorlevel 1 exit /b 1
if /i "%~1"=="--login" goto login
echo Use the same official site and account as WorkBuddy.
echo First login: npm.cmd run login:codebuddy
echo Setup guide: docs/WORKBUDDY.md
call npm.cmd run start:codebuddy
echo Local connection has stopped.
pause
exit /b
:login
call npm.cmd run login:codebuddy
exit /b %errorlevel%
