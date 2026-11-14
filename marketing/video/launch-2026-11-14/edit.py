#!/usr/bin/env python3
"""python3 edit.py spec.json -> renders talking-mom ad.
spec: {"out": "...", "pieces":[
  {"src":"c1.mp4","a":0,"b":3.9,"ov":[["../ov/hookm.png",0.05]],"cover":[[1.0,3.0,"../seg/x.mp4",0]]},
  {"end":"../kl/k_wok.mp4","from":0.3,"dur":2.2}
 ], "music_vol":0.12}
cover = [t0,t1 (relative to piece start), seg file, seg offset]: seg video replaces her face, her audio continues."""
import json, subprocess, sys, os
S=json.load(open(sys.argv[1])); W='w_'+os.path.splitext(os.path.basename(sys.argv[1]))[0]; os.makedirs(W,exist_ok=True)
N="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p"
def run(a):
    r=subprocess.run(a,capture_output=True,text=True)
    if r.returncode: print(' '.join(a)[:400]); print(r.stderr[-1500:]); sys.exit(1)
enc=['-c:v','libx264','-crf','17','-preset','veryfast']
vparts=[]; afilt=[]; ain=[]; t=0.0
for i,p in enumerate(S['pieces']):
    if 'end' in p:
        d=p['dur']; f=f'{W}/p{i}.mp4'
        run(['ffmpeg','-v','error','-y','-ss',str(p.get('from',0)),'-t',str(d),'-i',p['end'],'-loop','1','-t',str(d),'-i','../ov/end.png','-filter_complex',f"[0]{N}[v];[1]format=rgba,fade=in:st=0:d=0.3:alpha=1[o];[v][o]overlay=shortest=1,format=yuv420p",'-an',*enc,f])
        vparts.append(f); t+=d; continue
    a,b=p['a'],p['b']; d=b-a
    # base with overlays
    inputs=['-ss',str(a),'-t',str(d),'-i',p['src']]; fc=f"[0:v]{N}[v0]"; last='v0'; k=1
    for png,tin,*rest in p.get('ov',[]):
        tout=rest[0] if rest else d
        inputs+=['-loop','1','-t',str(d),'-i',png]
        fc+=f";[{k}]format=rgba,fade=in:st={tin}:d=0.25:alpha=1[o{k}];[{last}][o{k}]overlay=enable='between(t,{tin},{tout})'[v{k}]"; last=f'v{k}'; k+=1
    for t0,t1,seg,off in p.get('cover',[]):
        inputs+=['-ss',str(off),'-i',seg]
        fc+=f";[{k}:v]{N},setpts=PTS-STARTPTS+{t0}/TB[s{k}];[{last}][s{k}]overlay=enable='between(t,{t0},{t1})':eof_action=pass[v{k}]"; last=f'v{k}'; k+=1
    f=f'{W}/p{i}.mp4'
    run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',fc,'-map',f'[{last}]','-t',str(d),'-an',*enc,f])
    vparts.append(f)
    ain+=['-ss',str(a),'-t',str(d),'-i',p['src']]; afilt.append((len(afilt),int(t*1000),d)); t+=d
open(f'{W}/l.txt','w').write(''.join(f"file '{os.path.basename(x)}'\n" for x in vparts))
run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{W}/l.txt',*enc,'-r','30',f'{W}/video.mp4'])
fc=''; labs=''
for j,(idx,ms,d) in enumerate(afilt):
    fc+=f"[{j+1}:a]aresample=48000,afade=t=in:d=0.03,afade=t=out:st={d-0.05:.2f}:d=0.05,adelay={ms}|{ms}[a{j}];"; labs+=f'[a{j}]'
mv=S.get('music_vol',0.12); T=t; mi=len(afilt)+1
fc+=f"{labs}amix=inputs={len(afilt)}:normalize=0,volume=1.0[vo];[{mi}:a]aloop=loop=1:size=1058000,atrim=0:{T},volume='if(gt(t,{T-S.get('end_len',2.2):.2f}),0.6,{mv})':eval=frame,afade=t=out:st={T-0.8:.2f}:d=0.8[m];[vo][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5,aresample=48000[a]"
run(['ffmpeg','-v','error','-y','-i',f'{W}/video.mp4',*ain,'-i','../kl/music.mp3','-filter_complex',fc,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t',f'{T:.2f}',S['out']])
print('ok',S['out'],round(T,2))
