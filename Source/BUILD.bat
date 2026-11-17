@echo off
rem Iron Crown: Medieval Kingdoms - rebuild everything from the source code
rem Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
setlocal
cd /d "%~dp0Source"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required: https://nodejs.org
  pause & exit /b 1
)
echo === npm install
call npm install || goto :fail
echo === build game bundle
call npm run build || goto :fail
echo === package Game.exe
call npm run package || goto :fail
where makensis >nul 2>nul
if errorlevel 1 (
  if not defined MAKENSIS (
    echo.
    echo NSIS (makensis) was not found, so the installer was skipped.
    echo Install NSIS 3 from https://nsis.sourceforge.io , or set MAKENSIS to the path of makensis.exe, then run BUILD.bat again.
    goto :done
  )
)
echo === build GameSetup.exe
call npm run installer || goto :fail
:done
echo.
echo Portable game : %~dp0Source\build\win\Game-win32-x64\Game.exe
echo Installer     : %~dp0Source\build\GameSetup.exe
pause
exit /b 0
:fail
echo.
echo Build failed - see the messages above.
pause
exit /b 1
