"""Transcribe one or more wav files with faster-whisper (small model) to double-check a voiceover clip.
Usage: python hear.py a.wav [b.wav ...]"""
import subprocess, sys, wave, os, tempfile
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8')
for f in sys.argv[1:]:
    tmp = os.path.join(tempfile.gettempdir(), 'hear16k.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f, '-ar', '16000', '-ac', '1', tmp])
    with wave.open(tmp, 'rb') as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    segs, _ = m.transcribe(a)
    print(os.path.basename(os.path.dirname(os.path.abspath(f))), os.path.basename(f), round(len(a) / 16000, 2), 's |', ' '.join(s.text.strip() for s in segs))
