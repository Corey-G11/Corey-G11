@echo off
title Polyglot Server
cd /d "%~dp0"

echo ================================================
echo   Starting Polyglot
echo ================================================
echo.
echo This window IS the Polyglot server.
echo   - Keep it open while you use the app.
echo   - Close this window (or press Ctrl+C) to stop it.
echo.
echo Your browser will open automatically in a few seconds.
echo If it doesn't, go to: http://localhost:3000
echo.
echo (If you see "address already in use", Polyglot is
echo  already running -- just open http://localhost:3000)
echo.

start /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

npm start
