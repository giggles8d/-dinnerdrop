#!/usr/bin/env python3
"""POV trend short: stills with slow zoom + on-screen text, app footage, end card. Times are from the VO (sped up)."""
import subprocess, sys, os
H = os.path.dirname(os.path.abspath(__file__))
APP = '/home/claude/-dinnerdrop/apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4'
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
SP = 1.1
def T(x): return x / SP
def esc(t): return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%').replace(',', '\\,')
def tx(t, size, y, a, b, color='white', box='0x000000@0.6'):
    return (f"drawtext=fontfile={FONT}:text='{esc(t)}':fontsize={size}:fontcolor={color}:box=1:boxcolor={box}:boxborderw=20"
            f":x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})'")
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def dur(f): return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)

vo = os.path.join(H, 'vo_fast.wav')
run(['ffmpeg','-y','-v','error','-i',os.path.join(H,'vo.wav'),'-af',f'atempo={SP},apad=pad_dur=1.2','-ar','44100','-ac','2',vo])
D = dur(vo)
# scene boundaries (original VO seconds)
B = [0, 6.2, 10.2, 13.6, 17.0, 18.4, 22.6, 26.0]
B = [T(x) for x in B] + [D]
parts = []
def still(img, a, b, texts, name):
    d = b - a; n = int(d * 30) + 1
    fx = ','.join(texts)
    out = os.path.join(H, name)
    run(['ffmpeg','-y','-v','error','-i',os.path.join(H,img),'-filter_complex',
         f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='1+0.0009*on':d={n}:s=1080x1920:fps=30,"
         f"{fx},trim=0:{d:.3f},format=yuv420p,setsar=1[v]",'-map','[v]','-c:v','libx264','-crf','20','-preset','medium','-r','30',out])
    parts.append(out)
def rel(x, a): return x - a
# S1 kitchen
a, b = B[0], B[1]
still('s1.png', a, b, [tx("POV: it's 5:00 PM", 84, 300, 0, b - a, box='0xd62828'),
                       tx('and someone asks', 64, 1300, rel(T(3.1), a), b - a),
                       tx('"what\'s for dinner?"', 76, 1400, rel(T(4.8), a), b - a, color=GOLD)], 'p1.mp4')
a, b = B[1], B[2]
still('s2.png', a, b, [tx('*opens fridge*', 72, 1250, 0, b - a), tx('*closes fridge*', 72, 1380, rel(T(8.4), a), b - a)], 'p2.mp4')
a, b = B[2], B[3]
still('s3.png', a, b, [tx('*scrolls recipes', 72, 1250, 0, b - a), tx('for 40 minutes*', 72, 1370, 0, b - a)], 'p3.mp4')
a, b = B[3], B[4]
still('s4.png', a, b, [tx('*orders pizza*', 76, 1250, 0, b - a), tx('...again', 72, 1380, rel(T(15.7), a), b - a, color=GOLD)], 'p4.mp4')
# S5 "OR..."
d = B[5] - B[4]; out = os.path.join(H, 'p5.mp4')
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:r=30:d={d:.3f}',
     '-vf',f"drawtext=fontfile={FONT}:text='OR...':fontsize=180:fontcolor={GOLD}:x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p,setsar=1",
     '-c:v','libx264','-crf','20',out]); parts.append(out)
def appseg(s, e, a, b, label, name):
    d = b - a; sp = d / (e - s); W = 800; Hh = int(1256 * W / 600)
    out = os.path.join(H, name)
    run(['ffmpeg','-y','-v','error','-i',APP,'-filter_complex',
         f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS,crop=600:1256:0:48,scale={W}:{Hh},pad={W+12}:{Hh+12}:6:6:color=0xdddddd,fps=30[ph];"
         f"color=c={CREAM}:s=1080x1920:r=30:d={d:.3f}[cr];[cr][ph]overlay=(W-w)/2:230:eof_action=pass,"
         f"drawtext=fontfile={FONT}:text='{esc(label)}':fontsize=56:fontcolor={GREEN}:x=(w-text_w)/2:y=100,trim=0:{d:.3f},format=yuv420p,setsar=1[v]",
         '-map','[v]','-c:v','libx264','-crf','20','-preset','medium','-r','30',out]); parts.append(out)
appseg(88, 97, B[5], B[6], '5 dinners. Your budget.', 'p6.mp4')
appseg(136, 152, B[6], B[7], 'Whole list to Instacart. 1 tap.', 'p7.mp4')
# S8 end card
d = B[8] - B[7]; out = os.path.join(H, 'p8.mp4')
fx = (f"drawtext=fontfile={FONT}:text='5\\:02 PM':fontsize=150:fontcolor=white:x=(w-text_w)/2:y=430,"
      f"drawtext=fontfile={FONT}:text='Dinner\\: handled.':fontsize=90:fontcolor={GOLD}:x=(w-text_w)/2:y=640,"
      f"drawtext=fontfile={FONT}:text='Plan your week free':fontsize=66:fontcolor=white:x=(w-text_w)/2:y=900,"
      f"drawbox=x=110:y=1020:w=860:h=150:color={GOLD}:t=fill,"
      f"drawtext=fontfile={FONT}:text='dinnerdrop.app':fontsize=76:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=1050")
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:r=30:d={d:.3f}','-vf',fx+',format=yuv420p,setsar=1','-c:v','libx264','-crf','20',out]); parts.append(out)
lst = os.path.join(H, 'l.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
vid = os.path.join(H, 'v.mp4')
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',lst,'-c','copy',vid])
final = '/mnt/user-data/outputs/2026-10-29_Trend_POV5PM.mp4'
run(['ffmpeg','-y','-v','error','-i',vid,'-i',vo,'-map','0:v','-map','1:a','-c:v','libx264','-crf','21','-preset','medium','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',final])
print(final, round(dur(final), 1))
