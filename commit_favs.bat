@echo off
cd /d C:\Users\setzl\dinnerdrop-ops
git add -A
git commit -m "fix: favorites audit - loading state, taste signal on remove"
git push origin main
echo DONE
