#!/bin/bash
set -e
cd "$(dirname "$0")"
N="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p"
E="-c:v libx264 -crf 17 -preset veryfast -an"
ov(){ ffmpeg -v error -y -i $1 -loop 1 -t 10 -i $2 -filter_complex "[1]format=rgba,fade=in:st=$3:d=0.25:alpha=1[o];[0][o]overlay=shortest=1,format=yuv420p" $E $4; }
ffmpeg -v error -y -ss 0.3 -t 2.6 -i kA.mp4 -vf "$N" $E a.mp4; ov a.mp4 ../launch/ov/hookp.png 0.05 A.mp4
ffmpeg -v error -y -ss 0.4 -t 3.8 -i kB.mp4 -vf "$N" $E B.mp4
ffmpeg -v error -y -ss 0.3 -t 3.6 -i kC.mp4 -vf "$N" $E C.mp4
ffmpeg -v error -y -ss 0.3 -t 3.5 -i kD.mp4 -vf "$N" $E d.mp4; ov d.mp4 ../launch/ov/ctap.png 0.15 D.mp4
printf "file A.mp4\nfile B.mp4\nfile ../launch/seg/papp.mp4\nfile C.mp4\nfile D.mp4\n" > l.txt
ffmpeg -v error -y -f concat -safe 0 -i l.txt -c:v libx264 -crf 18 -preset veryfast -r 30 video.mp4
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4)
ffmpeg -v error -y -i video.mp4 -i d1.wav -i d2.wav -i d3.wav -i d4.wav -i d5.wav -i ../launch/kl/music.mp3 -filter_complex \
"[1]aresample=48000,adelay=400|400[a1];[2]aresample=48000,adelay=2800|2800[a2];[3]aresample=48000,atempo=1.12,adelay=6500|6500[a3];[4]aresample=48000,adelay=13500|13500[a4];[5]aresample=48000,adelay=17200|17200[a5];[a1][a2][a3][a4][a5]amix=inputs=5:normalize=0,volume=1.4[vo];[6]atrim=0:$T,volume=0.13,afade=t=out:st=$(echo "$T-0.8"|bc):d=0.8[m];[vo][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5,aresample=48000[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t $T out_pup1.mp4
echo built $T
