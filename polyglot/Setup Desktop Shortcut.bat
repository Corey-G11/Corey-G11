@echo off
title Polyglot - Setup Desktop Shortcut
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
echo.
pause
