@echo off
setlocal EnableExtensions
set "XXT_APP_DIR=%~dp0"
if not exist "%XXT_APP_DIR%package.json" (
  echo Keep this launcher in the complete project folder beside package.json.
  pause
  exit /b 1
)
cd /d "%XXT_APP_DIR%"
if errorlevel 1 exit /b 1
if defined XXT_CODEX_BIN if exist "%XXT_CODEX_BIN%" goto codex_ready
set "XXT_CODEX_BIN=%APPDATA%\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe"
if not exist "%XXT_CODEX_BIN%" set "XXT_CODEX_BIN=%APPDATA%\npm\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe"
if not exist "%XXT_CODEX_BIN%" (
  echo Codex native executable was not found. Install the official Codex CLI or set XXT_CODEX_BIN.
  pause
  exit /b 1
)
:codex_ready
if /i "%~1"=="--check" (
  echo package.json: OK
  echo Codex executable: OK
  exit /b 0
)
echo Choose a model and reasoning level. Keep this service window open.
call npm.cmd --prefix "%XXT_APP_DIR%" run start:codex
echo Local connection has stopped.
pause
