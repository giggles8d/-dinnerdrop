import subprocess, numpy as np, sys
def energy(f):
    raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32)/32768
    hop = 800  # 50 ms
    e = np.array([np.sqrt(np.mean(x[i:i+hop]**2)) for i in range(0, len(x)-hop, hop)])
    db = 20*np.log10(e+1e-6)
    return db
def spans(f, n):
    db = energy(f); T = len(db)*0.05
    sm = np.convolve(db, np.ones(3)/3, mode='same')
    thr = np.percentile(sm, 35)
    on = sm > thr
    idx = np.where(on)[0]
    a, b = idx[0]*0.05, (idx[-1]+1)*0.05
    if n == 1: return [[a, b]]
    # deepest 0.3 s window between a+0.8 and b-0.8 -> split point
    w = 6; best, bi = 1e9, None
    for i in range(int((a+0.8)/0.05), int((b-0.8)/0.05)-w):
        m = sm[i:i+w].mean()
        if m < best: best, bi = m, i
    s = (bi + w/2)*0.05
    return [[a, s-0.1], [s+0.1, b]]
if __name__ == '__main__':
    for c in sys.argv[1:]:
        n = 1 if c in ('c31','c32') else 2
        print(c, [[round(p,2) for p in s] for s in spans(f'clips/{c}.mp4', n)])
