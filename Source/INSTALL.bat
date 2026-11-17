@echo off
rem Iron Crown: Medieval Kingdoms - start the installer
rem Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
cd /d "%~dp0"
if exist "Installer\GameSetup.exe" (
  start "" "Installer\GameSetup.exe"
) else (
  echo Installer\GameSetup.exe was not found next to this file.
  echo Extract the whole ZIP first, then run INSTALL.bat again.
  pause
)
