@echo off
title StayEasy dev server - keep this window open
cd /d C:\Users\pc\Desktop\stayeasy
echo Starting StayEasy... open http://localhost:5173 in your browser.
echo Keep this window open. Closing it stops the website.
call npm run dev -- --host --port 5173
pause
