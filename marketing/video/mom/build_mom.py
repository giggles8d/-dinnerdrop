#!/usr/bin/env python3
"""Mom presenter video (AI presenter "DinnerDrop-Mom" + real app screens).
Usage: python3 build_mom.py <dir>   (dir holds c1.mp4 hook, c2.mp4.. home scenes, last = CTA, and cfg.json)
cfg: {"out": "...mp4", "hook_text": [...], "labels": {"c2.mp4": "..."}, "app": [[start, end, "label"], ...],
      "app_after": 1, "end": ["line1", "line2", "url"]}
Layout: c1 (hook text on top) -> real app screens (6-8 s, labelled) -> remaining clips -> 2.4 s end card.
Clip tails are trimmed after the last speech (silencedetect). App section carries room tone from c1."""
import os, re, subprocess, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '../../../apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4')
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
FONTM = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
CREAM, GREEN, GOLD = '0xfef9ee', '0x1a5c38', '0xe8a838'
D = os.path.abspath(sys.argv[1]); C = json.load(open(os.path.join(D, 'cfg.json')))

def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(' '.join(a)[:500]); print(r.stderr[-2500:]); sys.exit(1)
    return r
def dur(f): return float(subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
def esc(t): return t.replace('\\','\\\\').replace(':','\\:').replace("'", "’").replace('%','\\%').replace(',', '\\,')
def tx(t, size, y, a=None, b=None, color='white', box='0x1a1a1a@0.72', font=FONT):
    en = f":enable='between(t,{a:.2f},{b:.2f})'" if a is not None else ''
    return (f"drawtext=fontfile={font}:text='{esc(t)}':fontsize={size}:fontcolor={color}:box=1:boxcolor={box}:boxborderw=18"
            f":x=(w-text_w)/2:y={y}{en}")
def speech_end(f):
    r = subprocess.run(['ffmpeg','-i',f,'-af','silencedetect=noise=-35dB:d=0.4','-f','null','-'],capture_output=True,text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    T = dur(f)
    if len(st) > len(en) and st[-1] > 3.0: return min(T, st[-1] + 0.45)   # trailing silence
    return T

clips = sorted(x for x in os.listdir(D) if re.fullmatch(r'c\d+\.mp4', x))
parts = []; base = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1"
AI = tx('AI-generated presenter · real app screens', 30, 1800, box='0x000000@0.45', font=FONTM)
for k, c in enumerate(clips):
    src = os.path.join(D, c); T = speech_end(src); fx = [base, AI]
    if k == 0:
        for j, h in enumerate(C['hook_text']):
            fx.append(tx(h, 62 if j == 0 else 54, 220 + j * 110, 0, T, box='0xd62828' if j == 0 else '0x1a1a1a@0.72'))
    lab = C.get('labels', {}).get(c)
    if lab: fx.append(tx(lab, 54, 1380, 0.4, T))
    if k == len(clips) - 1:
        fx.append(tx(C['end'][1], 46, 1500, 1.0, T, color='0x1a1a1a', box=GOLD))
        fx.append(tx(C['end'][2], 58, 1610, 1.0, T, box=GREEN))
    p = os.path.join(D, f'p{k}.mp4')
    run(['ffmpeg','-y','-v','error','-i',src,'-vf',','.join(fx)+',format=yuv420p','-t',f'{T:.3f}','-c:v','libx264','-crf','20','-preset','medium',
         '-c:a','aac','-b:a','160k','-ar','44100','-ac','2',p])
    parts.append(p)
    if k + 1 == C.get('app_after', 1):
        # real app screens, each segment squeezed to its share of ~7 s
        segs = C['app']; per = C.get('app_seconds', 7.2) / len(segs); W = 760; H = int(1256 * W / 600)
        for j, (s, e, label) in enumerate(segs):
            sp = per / (e - s); ap = os.path.join(D, f'a{j}.mp4')
            # Audio under the app screens is SILENCE. (Until Nov 1 2026 this re-used the hook clip's
            # audio at 15% — which is her speaking, so the hook line replayed under every screen.)
            run(['ffmpeg','-y','-v','error','-i',APP,'-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-filter_complex',
                 f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,setpts={sp:.4f}*PTS,crop=600:1256:0:48,scale={W}:{H},pad={W+12}:{H+12}:6:6:color=0xdddddd,fps=30[ph];"
                 f"color=c={CREAM}:s=1080x1920:r=30:d={per:.3f}[cr];[cr][ph]overlay=(W-w)/2:250:eof_action=pass,"
                 f"drawtext=fontfile={FONT}:text='{esc(label)}':fontsize=56:fontcolor={GREEN}:x=(w-text_w)/2:y=120,trim=0:{per:.3f},format=yuv420p,setsar=1[v];"
                 f"[1:a]atrim=0:{per:.3f},asetpts=PTS-STARTPTS[a]",
                 '-map','[v]','-map','[a]','-t',f'{per:.3f}','-c:v','libx264','-crf','20','-preset','medium','-c:a','aac','-b:a','160k','-ar','44100','-ac','2',ap])
            parts.append(ap)
# end card
fx = (f"drawtext=fontfile={FONT}:text='{esc(C['end'][0])}':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=560,"
      f"drawtext=fontfile={FONT}:text='DinnerDrop':fontsize=120:fontcolor={GOLD}:x=(w-text_w)/2:y=720,"
      f"drawtext=fontfile={FONT}:text='{esc(C['end'][1])}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=930,"
      f"drawbox=x=90:y=1060:w=900:h=150:color={GOLD}:t=fill,"
      f"drawtext=fontfile={FONT}:text='{esc(C['end'][2])}':fontsize=66:fontcolor=0x1a1a1a:x=(w-text_w)/2:y=1100,"
      f"drawtext=fontfile={FONTM}:text='AI-generated presenter · real app screens':fontsize=34:fontcolor=white:x=(w-text_w)/2:y=1300")
ep = os.path.join(D, 'end.mp4')
run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={GREEN}:s=1080x1920:d=2.4:r=30,{fx},format=yuv420p,setsar=1',
     '-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','2.4','-c:v','libx264','-crf','20','-c:a','aac','-b:a','160k',ep])
parts.append(ep)
lst = os.path.join(D, 'l.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
out = os.path.join(D, C['out'])
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',lst,'-c:v','libx264','-crf','21','-preset','medium','-c:a','aac','-b:a','160k','-movflags','+faststart',out])
run(['ffmpeg','-y','-v','error','-i',out,'-vf','fps=1/2,scale=180:-1,tile=9x2','-frames:v','1',os.path.join(D,'sheet.jpg')])
print(out, round(dur(out), 1))

# QA gate: transcribe the finished video and refuse any repeated sentence (the Nov 1 2026 "hiccup").
try:
    import numpy as np, wave, re
    from faster_whisper import WhisperModel
    wav = os.path.join(D, 'qa.wav')
    run(['ffmpeg','-y','-v','error','-i',out,'-vn','-ac','1','-ar','16000',wav])
    w = wave.open(wav); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    segs = list(WhisperModel('base', device='cpu', compute_type='int8').transcribe(a)[0])
    text = ' '.join(x.text.strip() for x in segs)
    sents = [re.sub(r'[^a-z ]', '', t.lower()).strip() for t in re.split(r'[.!?,]', text) if len(t.split()) >= 4]
    dupes = sorted({t for t in sents if sents.count(t) > 1})
    open(os.path.join(D, 'transcript.txt'), 'w').write('\n'.join(f"{x.start:5.1f}-{x.end:5.1f} {x.text}" for x in segs))
    if dupes:
        raise SystemExit('QA FAILED — repeated line(s) in the audio: ' + ' | '.join(dupes) + '. Regenerate the clip or mute the span; do not post.')
    print('QA ok — transcript:', text)
except ImportError:
    print('QA skipped: faster-whisper not installed (pip install faster-whisper --break-system-packages) — READ transcript before posting')
