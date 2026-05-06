@echo off
cd /d C:\Users\setzl\dd-ops-session
git add -A
git commit -F commit_msg.txt
git push origin main
echo EXIT_CODE=%ERRORLEVEL%
