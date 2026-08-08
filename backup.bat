@echo off
setlocal
echo ===================================================
echo   URL Printer - Automaticka zaloha a verzovani
echo ===================================================
echo.

set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"

cd /d "%~dp0"

echo [1/3] Pridavani zmen...
git add .

for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set mydate=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a:%%b
set commit_msg=Automaticka zaloha: %date% %time%

echo [2/3] Ukladani verze (commit)...
git commit -m "%commit_msg%"

echo [3/3] Odesilani na GitHub (push)...
git push origin main

echo.
echo ===================================================
echo   Hotovo! Projekt je uspesne zazalohovan na GitHub.
echo ===================================================
timeout /t 5
