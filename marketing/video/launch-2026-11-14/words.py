import sys, subprocess, numpy as np
from faster_whisper import WhisperModel
m=WhisperModel("base.en",device="cpu",compute_type="int8")
for f in sys.argv[1:]:
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True).stdout
    a=np.frombuffer(raw,np.float32)
    segs,_=m.transcribe(a,word_timestamps=True)
    print("==",f)
    print(" ".join(f"{w.word.strip()}@{w.start:.2f}-{w.end:.2f}" for s in segs for w in s.words))
