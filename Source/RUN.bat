@echo off
rem Iron Crown: Medieval Kingdoms - run the portable game (no installation needed)
rem Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
cd /d "%~dp0"
if exist "Game\Game.exe" (
  start "" "Game\Game.exe"
) else (
  echo Game\Game.exe was not found next to this file.
  echo Extract the whole ZIP first, then run RUN.bat again.
  pause
)
