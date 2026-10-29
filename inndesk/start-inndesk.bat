@echo off
title InnDesk partner panel - keep this window open
cd /d %~dp0
if not exist node_modules (
  echo Installing packages, this takes a minute the first time...
  call npm install
)
echo Starting InnDesk... open http://localhost:5174 in your browser.
echo StayEasy must also be running (http://localhost:5173) for listings to publish.
call npm run dev -- --host --port 5174
pause
