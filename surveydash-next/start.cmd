@echo off
setlocal
cd /d "%~dp0"
set "STUDIO_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%STUDIO_NODE%" set "STUDIO_NODE=node"
if not exist "node_modules\next\dist\bin\next" (
  echo Dependencies belum terpasang. Jalankan pnpm install dan pnpm setup sesuai README.
  pause
  exit /b 1
)
echo SurveyDash Studio: http://127.0.0.1:3100
echo Tutup terminal atau tekan Ctrl+C untuk menghentikan aplikasi.
"%STUDIO_NODE%" "node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3100
endlocal
