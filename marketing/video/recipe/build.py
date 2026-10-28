#!/usr/bin/env python3
"""Recipe Short: photo top, text below, app cutaway, end card. VO timings from silencedetect."""
import subprocess, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4'
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
FONTM = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
SP = 1.12  # voice speed-up
def T(x): return x / SP

def esc(t): return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%').replace(',', '\\,')
def txt(t, size, color, y, a, b, font=FONT, box=None, x='(w-text_w)/2'):
    bx = f":box=1:boxcolor={box}:boxborderw=18" if box else ''
    return (f"drawtext=fontfile={font}:text='{esc(t)}':fontsize={size}:fontcolor={color}:borderw={0 if box else 5}:bordercolor=black@0.85"
            f"{bx}:x={x}:y={y}:enable='between(t,{a:.2f},{b:.2f})'")

def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-3000:]); sys.exit(1)

def dur(f): return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)

vo = os.path.join(HERE, 'vo_fast.wav')
run(['ffmpeg','-y','-v','error','-i',os.path.join(HERE,'vo.wav'),'-af',f'atempo={SP},atrim=0:{T(31.0):.2f}','-ar','44100','-ac','2',vo])
D = dur(vo)            # main part (ends after "already done?")
APP_A = T(26.6)        # app cutaway from "Want four more dinners..."
# --- main section: photo + text
f = []
f.append(txt('25-MINUTE DINNER', 92, 'white', 1180, 0, T(3.3), box='0xd62828'))
f.append(txt('$12 for the whole family', 64, GOLD, 1330, T(1.7), T(3.3)))
f.append(txt('Spaghetti Carbonara', 84, 'white', 1200, T(3.6), T(5.4)))
ings = ['1 lb spaghetti', '8 oz bacon', '3 eggs', '1 cup parmesan', '2 garlic cloves', '1 cup frozen peas']
starts = [5.5, 6.6, 7.6, 8.6, 9.9, 11.2]
f.append(txt('You need:', 60, GOLD, 1130, T(5.4), T(13.4)))
for k, (ing, s) in enumerate(zip(ings, starts)):
    f.append(txt(f'+ {ing}', 56, 'white', 1220 + k * 78, T(s), T(13.4), font=FONTM))
steps = [('1', 'Crisp the bacon', 13.5, 15.6), ('2', 'Whisk eggs + parmesan\n+ lots of pepper', 15.6, 19.6),
         ('3', 'Toss hot pasta in, OFF the heat,\nsplash of pasta water = creamy', 19.6, APP_A * SP)]
for n, t, a, b in steps:
    f.append(txt(f'STEP {n}', 58, '0x1a1a1a', 1160, T(a), T(b), box=GOLD))
    for j, ln in enumerate(t.split('\n')):
        f.append(txt(ln, 62 if len(ln) < 26 else 52, 'white', 1290 + j * 84, T(a), T(b)))
f.append(txt('DinnerDrop', 44, 'white', 120, 0, APP_A, box='0x1a5c38'))
fg = ("[0:v]scale=-2:1920,boxblur=30:3,crop=1080:1920,eq=brightness=-0.28[bg];"
      f"[3:v]scale=1080:-1,zoompan=z='min(zoom+0.0007,1.12)':d={int(D*30)+30}:s=1080x810:fps=30[ph];"
      f"[bg][ph]overlay=0:260:shortest=0,trim=0:{APP_A:.3f},{','.join(f)},format=yuv420p[main]")
# --- app cutaway: week view on cream (88-97s of the review recording)
cut = D - APP_A
s, e = 88, 97; sp = cut / (e - s); W = 760; H = int(1256 * W / 600)
app = (f"[1:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS,crop=600:1256:0:48,scale={W}:{H},pad={W+12}:{H+12}:6:6:color=0xdddddd,fps=30[ph2];"
       f"color=c={CREAM}:s=1080x1920:r=30:d={cut:.3f}[cr];[cr][ph2]overlay=(W-w)/2:200:eof_action=pass,"
       f"drawtext=fontfile={FONT}:text='4 more dinners + the list. Done.':fontsize=50:fontcolor={GREEN}:x=(w-text_w)/2:y=90,"
       f"trim=0:{cut:.3f},format=yuv420p[app]")
body = os.path.join(HERE, 'body.mp4')
run(['ffmpeg','-y','-v','error','-loop','1','-i',os.path.join(HERE,'photo.jpg'),'-i',APP,'-i',vo,'-i',os.path.join(HERE,'photo.jpg'),'-filter_complex',
     fg + ';' + app + ';[main][app]concat=n=2:v=1:a=0[v]','-map','[v]','-map','2:a','-t',f'{D:.3f}',
     '-c:v','libx264','-crf','20','-preset','medium','-c:a','aac','-b:a','160k',body])
# --- end card with the last VO line
endvo = os.path.join(HERE, 'endvo.wav')
run(['ffmpeg','-y','-v','error','-i',os.path.join(HERE,'vo.wav'),'-af',f'atrim={31.9}:{34.28},atempo={SP},apad=pad_dur=1.6','-ar','44100','-ac','2',endvo])
ED = dur(endvo)
fx = (f"drawtext=fontfile={FONT}:text='DinnerDrop':fontsize=120:fontcolor={GOLD}:x=(w-text_w)/2:y=520,"
      f"drawtext=fontfile={FONT}:text='5 dinners. Your budget.':fontsize=70:fontcolor=white:x=(w-text_w)/2:y=720,"
      f"drawtext=fontfile={FONT}:text='Grocery list done for you.':fontsize=70:fontcolor=white:x=(w-text_w)/2:y=810,"
      f"drawtext=fontfile={FONT}:text='Plan your week free':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=1000,"
      f"drawbox=x=110:y=1120:w=860:h=150:color={GOLD}:t=fill,"
      f"drawtext=fontfile={FONT}:text='dinnerdrop.app':fontsize=76:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=1150,"
      f"drawtext=fontfile={FONTM}:text='Follow for a new dinner every day':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=1360")
end = os.path.join(HERE, 'end.mp4')
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:r=30:d={ED:.3f},{fx},format=yuv420p,setsar=1','-i',endvo,
     '-t',f'{ED:.3f}','-c:v','libx264','-crf','20','-c:a','aac','-b:a','160k',end])
lst = os.path.join(HERE, 'l.txt'); open(lst,'w').write(f"file '{body}'\nfile '{end}'\n")
out = '/mnt/user-data/outputs/2026-10-29_RecipeShort_Carbonara.mp4'
run(['ffmpeg','-y','-v','error','-i',body,'-i',end,'-filter_complex','[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]','-map','[v]','-map','[a]','-c:v','libx264','-crf','21','-preset','medium','-c:a','aac','-b:a','160k','-movflags','+faststart',out])
print(out, round(dur(out), 1))
