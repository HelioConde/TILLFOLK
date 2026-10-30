@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0upload_sprites.ps1" %*
echo.
pause
