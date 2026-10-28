#!/usr/bin/env python3
"""Fruit videos v2 (after ChatGPT/Gemini review): full-screen readable app cutaways during the line that
describes the app, subtitles in the safe middle zone, dead air trimmed, 4:47 time stamp, free-first end cards.
Usage: python3 assemble2.py v1|v2|v3|all"""
import os, re, subprocess, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spans2

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4'
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
OUT = os.path.join(HERE, 'out2'); os.makedirs(OUT, exist_ok=True)
WEEK, CARDS, LIST, CART = (88, 97), (54, 62), (110, 122), (136, 152)
SUB_Y, APP_SUB_Y = 1120, 1490

# clip, subtitle lines (spoken order), app segment, app label, which line the app cutaway covers (0-based), badge
VIDEOS = {
 'e5': ('FruitMoms_Ep5_GroceryStore', [
   ('c81.mp4', ["Forty minutes in this store\nand I still don't know\nwhat's for dinner!", "Why are you\neven in here?"], None, None, None, 'FRUIT MOMS  EP 5'),
   ('c82.mp4', ["DinnerDrop plans five dinners\nfor your budget and\nbuilds the whole list.", "From my\ncouch?"], WEEK, '5 dinners + the list. Done.', 0, None),
   ('c84.mp4', ["And the whole list goes straight\nto your Instacart cart.", "Then I'm leaving this\ncart right here!"], CART, 'Whole list in Instacart, 1 tap', 0, None),
 ], ['Skip the 40-minute grocery run']),
}

def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(' '.join(a)[:600]); print(r.stderr[-2500:]); sys.exit(1)
    return r

def dur(f):
    return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)

def esc(t): return t.replace('\\','\\\\').replace(':','\\:').replace("'", "’").replace('%','\\%').replace(',', '\\,')

def speech_spans(f, n):
    r = subprocess.run(['ffmpeg','-i',f,'-af','silencedetect=noise=-32dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    D = dur(f)
    sil = list(zip(starts, ends + [D] * (len(starts) - len(ends))))
    spans, t = [], 0.0
    for s, e in sil:
        if s - t > 0.15: spans.append([t, s])
        t = e
    if D - t > 0.15: spans.append([t, D])
    if not spans: spans = [[0.3, D - 0.3]]
    while len(spans) > n:
        gaps = [spans[i+1][0] - spans[i][1] for i in range(len(spans)-1)]
        i = gaps.index(min(gaps)); spans[i] = [spans[i][0], spans[i+1][1]]; del spans[i+1]
    while len(spans) < n:
        i = max(range(len(spans)), key=lambda k: spans[k][1]-spans[k][0]); a, b = spans[i]; m = (a+b)/2
        spans[i:i+1] = [[a, m], [m, b]]
    return spans

def subs(lines, spans, y, only=None, notin=None):
    fx = ''
    for k, (text, (a, b)) in enumerate(zip(lines, spans)):
        if only is not None and k != only: continue
        if notin is not None and k == notin: continue
        for j, ln in enumerate(text.split('\n')):
            fx += (f",drawtext=fontfile={FONT}:text='{esc(ln)}':fontsize=56:fontcolor=white:borderw=6:bordercolor=black"
                   f":x=(w-text_w)/2:y={y + j*74}:enable='between(t,{a:.2f},{b+0.25:.2f})'")
    return fx

def build(v):
    name, clips, end = VIDEOS[v]
    od = os.path.join(OUT, v); os.makedirs(od, exist_ok=True)
    parts = []
    for k, (f, lines, seg, label, cover, badge) in enumerate(clips):
        src = os.path.join(HERE, 'clips', f)
        spans = spans2.spans(src, lines)
        D = dur(src)
        p = os.path.join(od, f'p{k}.mp4')
        base = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1"
        chip = (f",drawtext=fontfile={FONT}:text='FOLLOW FOR EP 6':fontsize=60:fontcolor=white:box=1:boxcolor=0xd62828:boxborderw=18:x=(w-text_w)/2:y=200"
                f",drawtext=fontfile={FONT}:text='3 MONTHS FREE · CODE FRUIT':fontsize=50:fontcolor=0x1a1a1a:box=1:boxcolor={GOLD}:boxborderw=18:x=(w-text_w)/2:y=1560"
                f",drawtext=fontfile={FONT}:text='dinnerdrop.app/go/fruit':fontsize=64:fontcolor=white:box=1:boxcolor={GREEN}:boxborderw=24:x=(w-text_w)/2:y=1690") if k == len(clips) - 1 else ''
        bfx = (f",drawtext=fontfile={FONT}:text='{esc(badge)}':fontsize=46:fontcolor=white:box=1:boxcolor=0xd62828:boxborderw=16"
               f":x=60:y=150") if badge else ''
        bfx += chip
        if k == 0:
            bfx += (f",drawtext=fontfile={FONT}:text='Lost in the grocery store?':fontsize=66:fontcolor=white:box=1:boxcolor=0x1a1a1a@0.75:boxborderw=24:x=(w-text_w)/2:y=330:enable='lt(t,3.2)'"
                    f",drawtext=fontfile={FONT}:text='meal planning for busy moms':fontsize=44:fontcolor=0x1a1a1a:box=1:boxcolor={GOLD}:boxborderw=14:x=(w-text_w)/2:y=470:enable='lt(t,3.2)'")
        if seg:
            a, b = spans[cover]; a0, b0 = min(a + 1.4, b - 1.5), min(D, b + 0.3)   # show the speaker first, then the app
            s, e = seg; sp = (b0 - a0 + 0.5) / (e - s); W = 620; H = int(1256 * W / 600)
            fc = (f"{base}{bfx}{subs(lines, spans, SUB_Y, notin=cover)}[bg];"
                  f"[1:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS+{a0:.3f}/TB,crop=600:1256:0:48,scale={W}:{H},"
                  f"pad={W+12}:{H+12}:6:6:color=0xdddddd,fps=30[ph];"
                  f"color=c={CREAM}:s=1080x1920:r=30:d={D:.3f}[cr];"
                  f"[cr][ph]overlay=x=(W-w)/2:y=150:eof_action=pass,"
                  f"drawtext=fontfile={FONT}:text='{esc(label)}':fontsize=44:fontcolor={GREEN}:x=(w-text_w)/2:y=70"
                  f"{subs(lines, spans, APP_SUB_Y, only=cover)}[app];"
                  f"[bg][app]overlay=enable='between(t,{a0:.2f},{b0:.2f})',format=yuv420p[v]")
            inputs = ['-i', src, '-i', APP]
        else:
            fc = f"{base}{bfx}{subs(lines, spans, SUB_Y)},format=yuv420p[v]"
            inputs = ['-i', src]
        run(['ffmpeg','-y','-v','error',*inputs,'-filter_complex',fc,'-map','[v]','-map','0:a','-t',f'{D:.3f}',
             '-c:v','libx264','-crf','20','-preset','medium','-c:a','aac','-b:a','160k','-ar','44100','-ac','2',p])
        parts.append(p)
    # End card (3.6 s): tagline(s), then the offer and a big website button.
    tags = [c for c in end if '.app' not in c and not c.lower().startswith('plan free')]
    fx = f"drawtext=fontfile={FONT}:text='Follow for Ep 6':fontsize=84:fontcolor=white:box=1:boxcolor=0xd62828:boxborderw=22:x=(w-text_w)/2:y=280"
    fx += f",drawtext=fontfile={FONT}:text='DinnerDrop':fontsize=116:fontcolor={GOLD}:x=(w-text_w)/2:y=500"
    y = 690
    for c in tags:
        fx += f",drawtext=fontfile={FONT}:text='{esc(c)}':fontsize={72 if len(c) < 24 else 56}:fontcolor=white:x=(w-text_w)/2:y={y}"; y += 100
    y += 40
    fx += f",drawtext=fontfile={FONT}:text='Plan your week free':fontsize=70:fontcolor=white:x=(w-text_w)/2:y={y}"
    fx += f",drawtext=fontfile={FONT}:text='Code FRUIT = 3 months of Family free':fontsize=50:fontcolor={GOLD}:x=(w-text_w)/2:y={y+95}"
    fx += f",drawbox=x=90:y={y+200}:w=900:h=150:color={GOLD}:t=fill"
    fx += f",drawtext=fontfile={FONT}:text='dinnerdrop.app/go/fruit':fontsize=64:fontcolor=0x1a1a1a:x=(w-text_w)/2:y={y+242}"
    ep = os.path.join(od, 'end.mp4')
    run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:d=4.0:r=30,{fx},format=yuv420p,setsar=1',
         '-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','4.0','-c:v','libx264','-crf','20','-c:a','aac','-b:a','160k',ep])
    lst = os.path.join(od, 'l.txt'); open(lst,'w').write(''.join(f"file '{p}'\n" for p in parts))
    final = os.path.join(OUT, f'2026-10-29_{name}.mp4')
    run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',lst,'-c:v','libx264','-crf','20','-preset','medium',
         '-c:a','aac','-b:a','160k','-movflags','+faststart',final])
    print(json.dumps({'video': v, 'seconds': round(dur(final), 1), 'file': final}))

for v in (VIDEOS if sys.argv[1] == 'all' else [sys.argv[1]]):
    build(v)
