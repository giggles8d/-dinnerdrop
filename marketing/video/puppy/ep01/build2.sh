#!/bin/bash
# cute-style puppy Ep 1: h1..h6 Kling clips, v1..v8 voices, caps in ../launch/ov
set -e
cd "$(dirname "$0")"
O=../launch/ov
N="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p"
E="-c:v libx264 -crf 17 -preset veryfast -an"
# seg src start dur out [png tin tout]...
seg(){ src=$1; ss=$2; d=$3; out=$4; shift 4; in=(-ss $ss -t $d -i $src); fc="[0:v]$N[v0]"; last=v0; k=1
  while [ $# -gt 0 ]; do in+=(-loop 1 -t $d -i $1); fc+=";[$k]format=rgba,fade=in:st=$2:d=0.15:alpha=1[o$k];[$last][o$k]overlay=enable='between(t,$2,$3)'[v$k]"; last=v$k; k=$((k+1)); shift 3; done
  ffmpeg -v error -y "${in[@]}" -filter_complex "$fc" -map "[$last]" -t $d $E $out; }
seg h1.mp4 0.2 2.6 S1.mp4 $O/c1.png 0.2 2.6
seg h2.mp4 0.3 2.0 S2.mp4 $O/c2.png 0.1 2.0
ffmpeg -v error -y -t 2.0 -i ../launch/seg/pweek.mp4 -t 1.6 -i ../launch/seg/plist.mp4 -t 2.0 -i ../launch/seg/pcart.mp4 -filter_complex "[0][1][2]concat=n=3:v=1,format=yuv420p" $E S3.mp4
seg h3.mp4 0.3 2.0 S4.mp4 $O/c4.png 0.1 2.0
seg h4.mp4 0.3 1.8 S5.mp4 $O/c5.png 0.1 1.8
seg h5.mp4 0.3 1.8 S6.mp4 $O/c6.png 0.1 1.8
seg h6.mp4 0.0 4.8 S7.mp4 $O/c7a.png 2.4 3.9 $O/c7b.png 3.9 4.8
seg h7.mp4 0.05 4.95 S8.mp4 $O/c7c.png 0.8 1.8 $O/ctap.png 1.9 4.95
printf "file S1.mp4\nfile S2.mp4\nfile S3.mp4\nfile S4.mp4\nfile S5.mp4\nfile S6.mp4\nfile S7.mp4\nfile S8.mp4\n" > l2.txt
ffmpeg -v error -y -f concat -safe 0 -i l2.txt -c:v libx264 -crf 18 -preset veryfast -r 30 video2.mp4
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video2.mp4)
# voice placements (ms): v1 0.3, v2 2.8, v3 4.8 (atempo 1.1), v4 10.4, v5 trim1.1 @12.4, v6 0-1.15 @14.2, v7 trim1.3 @15.9, v8 @20.3
ffmpeg -v error -y -i video2.mp4 -i v1.wav -i v2.wav -i v3.wav -i v4.wav -i v5.wav -i v6.wav -i v7.wav -i v8.wav -i ../launch/kl/music.mp3 -filter_complex \
"[1]aresample=48000,adelay=300|300[a1];[2]aresample=48000,adelay=2800|2800[a2];[3]aresample=48000,atempo=1.1,adelay=4800|4800[a3];[4]aresample=48000,adelay=10400|10400[a4];[5]aresample=48000,atrim=1.1,asetpts=PTS-STARTPTS,adelay=12400|12400[a5];[6]aresample=48000,atrim=0:1.15,asetpts=PTS-STARTPTS,afade=t=out:st=1.05:d=0.1,adelay=14200|14200[a6];[7]aresample=48000,atrim=1.3,asetpts=PTS-STARTPTS,adelay=18100|18100[a7];[8]aresample=48000,adelay=22400|22400[a8];[a1][a2][a3][a4][a5][a6][a7][a8]amix=inputs=8:normalize=0,volume=1.4[vo];[9]atrim=0:$T,volume=0.16,afade=t=out:st=$(echo "$T-0.8"|bc):d=0.8[m];[vo][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5,aresample=48000[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t $T out_pup1b.mp4
echo built $T
