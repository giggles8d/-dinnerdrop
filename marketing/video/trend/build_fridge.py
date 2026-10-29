#!/usr/bin/env python3
"""Friday fridge clean-out trend short (pantry feature). Per-section VO (v1..v5.wav in trend/fri/), stills s1..s4.png."""
import subprocess, sys, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fri')
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4')
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
SP = 1.08
def esc(t): return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%').replace(',', '\\,')
def tx(t, size, y, a, b, color='white', box='0x000000@0.6'):
    return (f"drawtext=fontfile={FONT}:text='{esc(t)}':fontsize={size}:fontcolor={color}:box=1:boxcolor={box}:boxborderw=20"
            f":x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})'")
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def dur(f): return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
P = lambda n: os.path.join(H, n)
trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
secs = []
for i in range(1, 6):
    run(['ffmpeg','-y','-v','error','-i',P(f'v{i}.wav'),'-af',f'{trim},atempo={SP},apad=pad_dur={0.3 if i < 5 else 1.4}','-ar','44100','-ac','2',P(f't{i}.wav')])
    secs.append(P(f't{i}.wav'))
open(P('a.txt'), 'w').write(''.join(f"file '{s}'\n" for s in secs))
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',P('a.txt'),'-c','pcm_s16le',P('vo.wav')])
d = [dur(s) for s in secs]
parts = []
def still(img, dd, texts, name):
    n = int(dd * 30) + 1
    run(['ffmpeg','-y','-v','error','-i',P(img),'-filter_complex',
         f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='1+0.0009*on':d={n}:s=1080x1920:fps=30,"
         f"{','.join(texts)},trim=0:{dd:.3f},format=yuv420p,setsar=1[v]",'-map','[v]','-c:v','libx264','-crf','20','-preset','medium','-r','30',P(name)])
    parts.append(P(name))
def appseg(s, e, dd, label, name):
    sp = dd / (e - s); W = 800; Hh = int(1256 * W / 600)
    run(['ffmpeg','-y','-v','error','-i',APP,'-filter_complex',
         f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS,crop=600:1256:0:48,scale={W}:{Hh},pad={W+12}:{Hh+12}:6:6:color=0xdddddd,fps=30[ph];"
         f"color=c={CREAM}:s=1080x1920:r=30:d={dd:.3f}[cr];[cr][ph]overlay=(W-w)/2:230:eof_action=pass,"
         f"drawtext=fontfile={FONT}:text='{esc(label)}':fontsize=56:fontcolor={GREEN}:x=(w-text_w)/2:y=100,trim=0:{dd:.3f},format=yuv420p,setsar=1[v]",
         '-map','[v]','-c:v','libx264','-crf','20','-preset','medium','-r','30',P(name)]); parts.append(P(name))
still('s1.png', d[0], [tx('FRIDAY FRIDGE', 92, 300, 0, d[0], box='0xd62828'), tx('CLEAN-OUT', 92, 430, 0, d[0], box='0xd62828'),
                       tx("let's see what we've got...", 56, 1450, d[0] * 0.45, d[0], color=GOLD)], 'p1.mp4')
q = d[1]
still('s2.png', q, [tx('half an onion', 64, 1150, 0.0, q * 0.62), tx('3 tortillas', 64, 1260, q * 0.12, q * 0.62),
                    tx('some cheese', 64, 1370, q * 0.24, q * 0.62), tx('1 very sad pepper', 64, 1480, q * 0.36, q * 0.62),
                    tx('Normally?', 80, 1200, q * 0.62, q, color=GOLD), tx('trash + takeout', 80, 1330, q * 0.75, q)], 'p2.mp4')
still('s3.png', d[2], [tx("Snap what's in", 76, 1250, 0, d[2]), tx('your fridge', 76, 1370, 0, d[2])], 'p3.mp4')
h = d[3] * 0.5
still('s4.png', h, [tx('Tonight:', 70, 1230, 0, h, color=GOLD), tx('cheesy pepper quesadillas', 60, 1350, 0, h)], 'p4.mp4')
appseg(110, 122, d[3] - h, '+ the list for the rest of the week', 'p5.mp4')
fx = (f"drawtext=fontfile={FONT}:text='Clean fridge.':fontsize=100:fontcolor=white:x=(w-text_w)/2:y=480,"
      f"drawtext=fontfile={FONT}:text='Full table.':fontsize=100:fontcolor={GOLD}:x=(w-text_w)/2:y=610,"
      f"drawtext=fontfile={FONT}:text='Plan your week free':fontsize=66:fontcolor=white:x=(w-text_w)/2:y=900,"
      f"drawbox=x=110:y=1020:w=860:h=150:color={GOLD}:t=fill,"
      f"drawtext=fontfile={FONT}:text='dinnerdrop.app':fontsize=76:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=1050")
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:r=30:d={d[4]:.3f}','-vf',fx+',format=yuv420p,setsar=1','-c:v','libx264','-crf','20',P('p6.mp4')]); parts.append(P('p6.mp4'))
open(P('l.txt'), 'w').write(''.join(f"file '{p}'\n" for p in parts))
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',P('l.txt'),'-c','copy',P('v.mp4')])
final = P('2026-10-30_Trend_FridgeCleanOut.mp4')
run(['ffmpeg','-y','-v','error','-i',P('v.mp4'),'-i',P('vo.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-crf','21','-preset','medium','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',final])
print(final, round(dur(final), 1), [round(x, 2) for x in d])
