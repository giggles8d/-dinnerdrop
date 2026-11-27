"""Build every holiday Short, then check each one: transcript vs script (faster-whisper) and a contact sheet.
Usage: python build_all.py <assets folder with fonts/ and app/review.mp4> [name ...]"""
import json, os, subprocess, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.abspath(sys.argv[1])
names = sys.argv[2:] or ['friedrice', 'tortellini', 'stuffing', 'turkeysoup', 'hamsoup']
env = dict(os.environ, DD_ASSETS=ASSETS)
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower().replace('-', ' '))
model = None
for n in names:
    d = os.path.join(HERE, n)
    cfg = json.load(open(os.path.join(d, 'cfg.json'), encoding='utf-8'))
    r = subprocess.run([sys.executable, os.path.join(HERE, 'build_sections.py'), d], env=env, capture_output=True, text=True)
    print(n, 'BUILD', r.stdout.strip()[-80:] or r.stderr[-800:])
    out = os.path.join(d, cfg['out'])
    if not os.path.exists(out):
        continue
    # contact sheet: one frame every ~4 s
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', out, '-vf', 'fps=1/4,scale=270:480,tile=7x2', '-frames:v', '1', os.path.join(d, 'sheet.jpg')])
    # transcript check
    wav = os.path.join(d, 'check.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', out, '-ar', '16000', '-ac', '1', wav])
    if model is None:
        from faster_whisper import WhisperModel
        model = WhisperModel('base', device='cpu', compute_type='int8')
    import wave, numpy as np   # pass samples, not a path: this PC's PyAV is too new for faster-whisper's file decoder
    with wave.open(wav, 'rb') as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    segs, _ = model.transcribe(audio)
    said = ' '.join(s.text.strip() for s in segs)
    open(os.path.join(d, 'transcript.txt'), 'w', encoding='utf-8').write(said)
    sents = [norm(x) for x in re.split(r'(?<=[.?!])\s+', said) if len(norm(x).split()) > 2]
    dup = [s for s in set(sents) if sents.count(s) > 1]
    want = set(norm(' '.join(cfg['vo'])).split()); got = set(norm(said).split())
    missing = sorted(want - got)
    print(n, 'TRANSCRIPT words', len(said.split()), '| repeated sentences:', dup or 'none', '| script words not heard:', missing[:25])
