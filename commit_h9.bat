@echo off
cd /d "C:\Users\setzl\AppData\Roaming\Claude\dinnerdrop-work"
"C:\Program Files\Git\bin\git.exe" add docs/community-targets.md
"C:\Program Files\Git\bin\git.exe" commit -m "Day 1 H9: Community research — Reddit/Facebook targets, posting strategy, karma warmup guide"
"C:\Program Files\Git\bin\git.exe" push origin main
echo DONE
