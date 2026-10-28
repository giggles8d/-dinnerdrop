import numpy as np
from spans import energy
def runs(mask):
    out, i = [], 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j < len(mask) and mask[j]: j += 1
            out.append((i, j)); i = j
        else: i += 1
    return out
def spans(f, lines):
    db = energy(f); sm = np.convolve(db, np.ones(3)/3, mode='same')
    thr = np.percentile(sm, 25)
    low = sm < thr + 3
    idx = np.where(~low)[0]; a = idx[0]*0.05; b = (idx[-1]+1)*0.05
    words = [len(l.replace('\n',' ').split()) for l in lines]
    gaps = [((s+e)/2*0.05, (e-s)*0.05) for s, e in runs(low) if e - s >= 4 and a+0.5 < s*0.05 < b-0.5]
    out, t = [], a
    for k, w in enumerate(words):
        est = max(1.0, w*0.36 + 0.4)
        if k == len(words)-1:
            end = min(b, t + est*1.5)
            out.append([t, end]); break
        target = t + est
        if gaps:
            g = min(gaps, key=lambda g: abs(g[0]-target) - 0.3*g[1])
            if abs(g[0]-target) < 2.0:
                out.append([t, g[0]-0.1]); t = g[0]+0.1; gaps = [x for x in gaps if x[0] > g[0]]; continue
        out.append([t, target]); t = target + 0.1
    return out
