@echo off
title TripDesk agent portal - keep this window open
cd /d %~dp0
if not exist node_modules (
  echo Installing packages, this takes a minute the first time...
  call npm install
)
echo Starting TripDesk... open http://localhost:5175 in your browser.
call npm run dev -- --host --port 5175
pause
