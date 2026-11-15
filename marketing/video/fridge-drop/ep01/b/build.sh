#!/bin/bash
# Frank & Drop Ep 1 "Mustard": k1..k6 Kling clips, a_*.wav voices, ov/*.png, app screens from launch/seg
set -e; cd "$(dirname "$0")"
S=/tmp/claude-0/-home-claude/ae2ea2e6-8345-5019-a9f8-07318032668c/scratchpad/launch
N="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p"
E="-c:v libx264 -crf 17 -preset veryfast -an"
seg(){ src=$1; ss=$2; d=$3; out=$4; shift 4; in=(-ss $ss -t $d -i $src); fc="[0:v]$N[v0]"; last=v0; k=1
  while [ $# -gt 0 ]; do in+=(-loop 1 -t $d -i $1); fc+=";[$k]format=rgba,fade=in:st=$2:d=0.15:alpha=1[o$k];[$last][o$k]overlay=enable='between(t,$2,$3)'[v$k]"; last=v$k; k=$((k+1)); shift 3; done
  ffmpeg -v error -y "${in[@]}" -filter_complex "$fc" -map "[$last]" -t $d $E $out; }
# durations
D1=3.0; D2=3.75; D3=2.6; D5=3.3; D6=3.7; D7=3.5
seg k1.mp4 0.0 $D1 S1.mp4 ov/hook.png 0 $D1 ov/s1.png 0.25 $D1
seg k2.mp4 0.3 $D2 S2.mp4 ov/s2.png 0.05 $D2
seg k3.mp4 0.2 $D3 S3.mp4 ov/s3.png 0.1 $D3
ffmpeg -v error -y -t 2.0 -i $S/seg/pweek.mp4 -t 1.5 -i $S/seg/plist.mp4 -t 1.9 -i $S/seg/pcart.mp4 -filter_complex "[0]$N[a];[1]$N[b];[2]$N[c];[a][b][c]concat=n=3:v=1" $E S4.mp4
seg k4.mp4 0.2 $D5 S5.mp4 ov/s4.png 0.05 2.4 ov/s5.png 2.4 $D5
seg k5.mp4 0.2 $D6 S6.mp4 ov/after.png 0 1.6 ov/s6.png 0.4 $D6
seg k6.mp4 0.3 $D7 S7.mp4 ov/end.png 0.1 $D7
printf "file S1.mp4\nfile S2.mp4\nfile S3.mp4\nfile S4.mp4\nfile S5.mp4\nfile S6.mp4\nfile S7.mp4\n" > l.txt
ffmpeg -v error -y -f concat -safe 0 -i l.txt -c:v libx264 -crf 18 -preset veryfast -r 30 video.mp4
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4)
# starts (ms): S1 0, S2 3000, S3 6750, S4 9350, S5 14750, S6 18050, S7 21750
ffmpeg -v error -y -i video.mp4 -i a_fr1.wav -i a_fr2.wav -i a_dr1.wav -i a_dr2.wav -i a_fr3.wav -i a_dr3.wav -i a_fr4.wav -i a_dr4.wav -i $S/kl/music.mp3 -filter_complex \
"[1]adelay=100|100[a1];[2]adelay=3100|3100[a2];[3]adelay=6850|6850[a3];[4]adelay=9500|9500[a4];[5]adelay=14800|14800[a5];[6]adelay=17150|17150[a6];[7]adelay=18300|18300[a7];[8]adelay=21950|21950[a8];[a1][a2][a3][a4][a5][a6][a7][a8]amix=inputs=8:normalize=0,volume=1.3[vo];[9]atrim=0:$T,volume=0.13,afade=t=out:st=$(echo "$T-0.6"|bc):d=0.6[m];[vo][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5,aresample=48000[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t $T out.mp4
echo built $T
