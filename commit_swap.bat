@echo off
cd /d C:\Users\setzl\dinnerdrop-ops
git add -A
git commit -m "fix: swap-meal auth guard + userId wired from recipe page"
git push origin main
echo DONE
