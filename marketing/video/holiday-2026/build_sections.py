#!/usr/bin/env python3
"""Recipe Short built from per-section VO clips. Holiday push, Nov 27 2026 (Sarah's Task C).

Same look as marketing/video/recipe/build_sections.py on the content-pipeline branch; this copy runs on Sarah's
Windows PC (font and app-footage paths come from DD_ASSETS, and ffmpeg runs from that folder so no drive-letter
colon lands inside a filter).

Usage: DD_ASSETS=<folder with fonts/ and app/review.mp4> python build_sections.py <dir>
  <dir> holds photo.jpg, v1..v8.wav and cfg.json.
Sections: v1 hook, v2 title, v3 ingredients, v4-v6 steps, v7 app pitch (app cutaway), v8 end card line."""
import subprocess, sys, os, json

ASSETS = os.path.abspath(os.environ.get('DD_ASSETS', '.')).replace(os.sep, '/')
os.chdir(ASSETS)
APP = 'app/review.mp4'
FONT = 'fonts/Poppins-Bold.ttf'
FONTM = 'fonts/Poppins-Medium.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
D = os.path.relpath(os.path.abspath(sys.argv[1]), ASSETS).replace(os.sep, '/')
C = json.load(open(D + '/cfg.json', encoding='utf-8'))
SP = C.get('speed', 1.08)


def esc(t): return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%').replace(',', '\\,')
def txt(t, size, color, y, a, b, font=FONT, box=None):
    bx = f":box=1:boxcolor={box}:boxborderw=18" if box else ''
    return (f"drawtext=fontfile={font}:text='{esc(t)}':fontsize={size}:fontcolor={color}:borderw={0 if box else 5}:bordercolor=black@0.85"
            f"{bx}:x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})'")
def run(a):
    r = subprocess.run(a, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)
def dur(f): return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)

# trim leading/trailing silence, speed up, add a short gap after each section
secs = []
for i in range(1, 9):
    o = f'{D}/t{i}.wav'
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
    run(['ffmpeg','-y','-v','error','-i',f'{D}/v{i}.wav','-af',f'{trim},atempo={SP},apad=pad_dur={0.25 if i<7 else 0.35}','-ar','44100','-ac','2',o])
    secs.append(o)
main = f'{D}/main.wav'; lst = f'{D}/a.txt'
open(lst, 'w').write(''.join(f"file 't{k}.wav'\n" for k in range(1, 8)))
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',lst,'-c','pcm_s16le',main])
ds = [dur(s) for s in secs]; st = [sum(ds[:k]) for k in range(8)]
T = sum(ds[:7]); APP_A = st[6]
f = [txt(C['hook'], 92 if len(C['hook']) < 17 else 76, 'white', 1180, 0, st[1], box='0xd62828'), txt(C['hook2'], 64, GOLD, 1330, ds[0]*0.45, st[1]),
     txt(C['title'], 84 if len(C['title']) < 22 else 64, 'white', 1200, st[1], st[2])]
f.append(txt('You need:', 60, GOLD, 1130, st[2], st[3]))
ings = C['ingredients']; n = len(ings)
for k, ing in enumerate(ings):
    f.append(txt(f'+ {ing}', 54 if len(ing) < 30 else 46, 'white', 1215 + k * 74, st[2] + ds[2] * 0.12 + k * (ds[2] * 0.8 / n), st[3], font=FONTM))
for j, step in enumerate(C['steps']):
    a, b = st[3 + j], st[4 + j]
    f.append(txt(f'STEP {j+1}', 58, '0x1a1a1a', 1160, a, b, box=GOLD))
    for i, ln in enumerate(step.split('\n')):
        f.append(txt(ln, 62 if len(ln) < 26 else 52, 'white', 1290 + i * 84, a, b))
f.append(txt('DinnerDrop', 44, 'white', 120, 0, APP_A, box=GREEN))
fg = ("[0:v]scale=-2:1920,boxblur=30:3,crop=1080:1920,eq=brightness=-0.28[bg];"
      f"[3:v]scale=1080:810:force_original_aspect_ratio=increase,crop=1080:810,zoompan=z='min(zoom+0.0007,1.12)':d={int(T*30)+30}:s=1080x810:fps=30[ph];"
      f"[bg][ph]overlay=0:260:shortest=0,trim=0:{APP_A:.3f},{','.join(f)},format=yuv420p[main]")
cut = T - APP_A; s, e = 88, 97; sp = cut / (e - s); W = 760; H = int(1256 * W / 600)
# Holiday push: the app cutaway says plainly that we don't deliver food (Sarah's rule for this push).
app = (f"[1:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS,crop=600:1256:0:48,scale={W}:{H},pad={W+12}:{H+12}:6:6:color=0xdddddd,fps=30[ph2];"
       f"color=c={CREAM}:s=1080x1920:r=30:d={cut:.3f}[cr];[cr][ph2]overlay=(W-w)/2:230:eof_action=pass,"
       f"drawtext=fontfile={FONT}:text='{esc(C.get('app_line1', 'We plan dinner + send your list.'))}':fontsize=50:fontcolor={GREEN}:x=(w-text_w)/2:y=70,"
       f"drawtext=fontfile={FONTM}:text='{esc(C.get('app_line2', 'We don’t deliver food.'))}':fontsize=42:fontcolor={GREEN}:x=(w-text_w)/2:y=142,"
       f"trim=0:{cut:.3f},format=yuv420p[app]")
body = f'{D}/body.mp4'
run(['ffmpeg','-y','-v','error','-loop','1','-i',f'{D}/photo.jpg','-i',APP,'-i',main,'-i',f'{D}/photo.jpg','-filter_complex',
     fg + ';' + app + ';[main][app]concat=n=2:v=1:a=0[v]','-map','[v]','-map','2:a','-t',f'{T:.3f}',
     '-c:v','libx264','-crf','20','-preset','medium','-c:a','aac','-b:a','160k','-ar','44100',body])
endvo = f'{D}/endvo.wav'
run(['ffmpeg','-y','-v','error','-i',secs[7],'-af','apad=pad_dur=1.4','-ar','44100','-ac','2',endvo]); ED = dur(endvo)
fx = (f"drawtext=fontfile={FONT}:text='DinnerDrop':fontsize=120:fontcolor={GOLD}:x=(w-text_w)/2:y=520,"
      f"drawtext=fontfile={FONT}:text='5 dinners. Your budget.':fontsize=70:fontcolor=white:x=(w-text_w)/2:y=720,"
      f"drawtext=fontfile={FONT}:text='Grocery list done for you.':fontsize=70:fontcolor=white:x=(w-text_w)/2:y=810,"
      f"drawtext=fontfile={FONT}:text='14 days of Family free. No card.':fontsize=58:fontcolor=white:x=(w-text_w)/2:y=1000,"
      f"drawbox=x=110:y=1120:w=860:h=150:color={GOLD}:t=fill,"
      f"drawtext=fontfile={FONT}:text='dinnerdrop.app':fontsize=76:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=1150,"
      f"drawtext=fontfile={FONTM}:text='Follow for a new dinner every day':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=1360")
end = f'{D}/end.mp4'
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:r=30:d={ED:.3f},{fx},format=yuv420p,setsar=1','-i',endvo,
     '-t',f'{ED:.3f}','-c:v','libx264','-crf','20','-c:a','aac','-b:a','160k','-ar','44100',end])
out = f"{D}/{C['out']}"
run(['ffmpeg','-y','-v','error','-i',body,'-i',end,'-filter_complex','[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]','-map','[v]','-map','[a]',
     '-c:v','libx264','-crf','21','-preset','medium','-c:a','aac','-b:a','160k','-movflags','+faststart',out])
print(out, round(dur(out), 1))
