#!/usr/bin/env python3
"""Saturday ASMR ingredient->plate trend short (no talking). Three veo3_1 8 s clips with native cooking sound
(a1..a3.mp4 in trend/<dir>/), small captions, silent-ish app cutaway, end card.
Usage: python3 build_asmr.py <dir> <out.mp4>  (captions edited below per recipe)"""
import subprocess, sys, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), sys.argv[1] if len(sys.argv) > 1 else 'sat')
OUTNAME = sys.argv[2] if len(sys.argv) > 2 else '2026-10-31_Trend_ASMR_ShrimpPasta.mp4'
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4')
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
TITLE, SUB = 'Garlic Butter Shrimp Pasta', '20 min  ·  about $17 for 4'
CAPS = ['butter + garlic + chili flakes', 'shrimp, 1-2 min a side', 'pasta + lemon + parmesan']
def esc(t): return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%').replace(',', '\\,')
def tx(t, size, y, a, b, color='white', box='0x000000@0.55'):
    return (f"drawtext=fontfile={FONT}:text='{esc(t)}':fontsize={size}:fontcolor={color}:box=1:boxcolor={box}:boxborderw=18"
            f":x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})'")
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def dur(f): return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
P = lambda n: os.path.join(H, n)
ENC = ['-c:v','libx264','-crf','20','-preset','medium','-r','30','-c:a','aac','-b:a','160k','-ar','44100','-ac','2']
parts = []
for i in range(3):
    src = P(f'a{i+1}.mp4'); d = dur(src)
    fx = [tx('ASMR', 52, 150, 0, d, box='0xd62828')]
    if i == 0:
        fx += [tx(TITLE, 64, 300, 0.3, 3.8), tx(SUB, 46, 410, 0.8, 3.8, color='0x1a1a1a', box=GOLD)]
    fx.append(tx(CAPS[i], 50, 1580, 1.0 if i == 0 else 0.4, d - 0.3))
    run(['ffmpeg','-y','-v','error','-i',src,'-filter_complex',
         f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,{','.join(fx)},format=yuv420p[v];"
         f"[0:a]afade=t=in:d=0.15[a]",'-map','[v]','-map','[a]','-t',f'{d:.3f}',*ENC,P(f'p{i}.mp4')])
    parts.append(P(f'p{i}.mp4'))
# app cutaway (4 s) with the last clip's room tone, low
dd = 4.0; s, e = 110, 122; sp = dd / (e - s); W = 800; Hh = int(1256 * W / 600)
run(['ffmpeg','-y','-v','error','-i',APP,'-i',P('a3.mp4'),'-filter_complex',
     f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS,crop=600:1256:0:48,scale={W}:{Hh},pad={W+12}:{Hh+12}:6:6:color=0xdddddd,fps=30[ph];"
     f"color=c={CREAM}:s=1080x1920:r=30:d={dd:.3f}[cr];[cr][ph]overlay=(W-w)/2:230:eof_action=pass,"
     f"drawtext=fontfile={FONT}:text='Want it on your table this week?':fontsize=52:fontcolor={GREEN}:x=(w-text_w)/2:y=70,"
     f"drawtext=fontfile={FONT}:text='DinnerDrop plans it + builds the list':fontsize=44:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=150,"
     f"trim=0:{dd:.3f},format=yuv420p,setsar=1[v];[1:a]atrim=4:8,asetpts=PTS-STARTPTS,volume=0.35,afade=t=out:st=3.2:d=0.8[a]",
     '-map','[v]','-map','[a]','-t',f'{dd:.3f}',*ENC,P('p3.mp4')]); parts.append(P('p3.mp4'))
fx = (f"drawtext=fontfile={FONT}:text='Ingredient to plate':fontsize=88:fontcolor=white:x=(w-text_w)/2:y=480,"
      f"drawtext=fontfile={FONT}:text='in 20 minutes.':fontsize=88:fontcolor={GOLD}:x=(w-text_w)/2:y=600,"
      f"drawtext=fontfile={FONT}:text='Plan your week free':fontsize=66:fontcolor=white:x=(w-text_w)/2:y=900,"
      f"drawbox=x=110:y=1020:w=860:h=150:color={GOLD}:t=fill,"
      f"drawtext=fontfile={FONT}:text='dinnerdrop.app':fontsize=76:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=1050")
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:r=30:d=3.2','-f','lavfi','-i','anullsrc=r=44100:cl=stereo',
     '-vf',fx+',format=yuv420p,setsar=1','-t','3.2',*ENC,P('p4.mp4')]); parts.append(P('p4.mp4'))
open(P('l.txt'), 'w').write(''.join(f"file '{p}'\n" for p in parts))
final = P(OUTNAME)
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',P('l.txt'),'-c:v','libx264','-crf','21','-preset','medium',
     '-c:a','aac','-b:a','160k','-movflags','+faststart',final])
print(final, round(dur(final), 1))
