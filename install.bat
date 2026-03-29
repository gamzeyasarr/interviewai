@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Once https://nodejs.org adresinden LTS kurun ^(20 veya uzeri^).
  exit /b 1
)

echo Node:
node -v
echo npm:
npm -v
echo.
echo Bagimliliklar kuruluyor...
call npm install
if errorlevel 1 (
  echo.
  echo [HATA] npm install basarisiz. README.md icindeki "npm install hata verirse" bolumune bakin.
  exit /b 1
)

echo.
echo Tamam. Sonraki adim: copy .env.example .env.local ^&^& notepad .env.local
echo Sonra: npm run dev
exit /b 0
