# Проверка собранного числом: декодирует mp3, ищет границы петли и мерит шов, шум в паузах спрайта, пики, размеры
import sys as _s; _s.stdout.reconfigure(encoding="utf-8")
import os, sys, json, subprocess, numpy as np
sys.path.insert(0, 'D:/games/tc-wt-audio2/_check/audio2/tools')
FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
WT = 'D:/games/tc-wt-audio3/'; M = json.load(open(WT + '_check/audio3/manifest3.json', encoding='utf-8'))
def dec(p, sr):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data'); return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(float) / 32768
db = lambda v: 20 * np.log10(np.sqrt((np.asarray(v) ** 2).mean()) + 1e-12)
out = []
for k, a in M['amb'].items():
    sr = a['sr']; y = dec(WT + 'assets/audio/' + a['f'], sr); P = int(round(a['P'] * sr)); L = int(a['t0'] * sr)
    # сдвиг декодера: ищем начало петли — корреляция головы тела (из середины файла) с самим собой через период P: y[s+i] ≈ y[s+P+i]
    best = None
    for s in range(0, int(.3 * sr), 8):
        i0 = 2000 + s; W = int(.4 * sr)
        seg = y[i0:i0 + W]; ref = y[i0 + P:i0 + P + W]
        if len(ref) < W: continue
        c = float(np.dot(seg, ref) / (np.sqrt(np.dot(seg, seg) * np.dot(ref, ref)) + 1e-12))
        if best is None or c > best[0]: best = (c, s)
    # шов в буфере: loopEnd = t0 + P, loopStart = t0 (в отсчётах буфера); любой сдвиг s допустим — проверим шов при сдвиге 0 и при ±0,1 с
    res = {}
    for sh in (-int(.1 * sr), 0, int(.1 * sr)):
        e = L + sh + P; st = L + sh
        seam = np.concatenate([y[e - 2000:e], y[st:st + 2000]])
        d = np.abs(np.diff(seam)); inner = np.abs(np.diff(y[L + 5000:L + P - 5000]))
        res[sh] = dict(jump=round(float(d[1999]), 5), p999=round(float(np.percentile(inner, 99.9)), 5), mx=round(float(inner.max()), 5),
                       rmsL=round(db(y[e - int(.05 * sr):e]), 1), rmsR=round(db(y[st:st + int(.05 * sr)]), 1))
    out.append((k, a['f'], 'dur %.2fs' % (len(y) / sr), 'corr %.4f' % best[0], 'rms %.1f pk %.1f' % (db(y[L:L + P]), 20 * np.log10(np.abs(y).max())), res))
for o in out: print(o)
# sfx3: паузы между клипами
y = dec(WT + 'assets/audio/sfx3.mp3', 24000); sr = 24000
keys = json.load(open(WT + '_check/audio3/manifest3.json', encoding='utf-8'))['keys']
gaps = []; mask = np.zeros(len(y), bool)
for k, (s, v) in keys.items():
    for t, d, g in v:
        mask[int((t - .01) * sr):int((t + d + .02) * sr)] = True
mask[:int(.2 * sr)] = True
q = y[~mask]; print('sfx3 пауза: rms %.1f дБ, пик %.1f дБ, доля %.2f' % (db(q), 20 * np.log10(np.abs(q).max() + 1e-12), len(q) / len(y)))
for k, (s, v) in keys.items():
    for t, d, g in v:
        seg = y[int((t - .002) * sr):int((t + d) * sr)]; pre = y[int((t - .06) * sr):int((t - .01) * sr)]
        # атака: время до -20 дБ от пика
        pk = np.abs(seg).max(); i = int(np.argmax(np.abs(seg) > pk * .1))
        print(k, 'dur %.3f' % d, 'gm %.2f' % g, 'пик %.1f дБ (gm %.1f)' % (20 * np.log10(pk), 20 * np.log10(pk * g)), 'атака до 10%%: %.1f мс' % (i / sr * 1000 - 2), 'до клипа rms %.1f' % db(pre))
for f in sorted(os.listdir(WT + 'assets/audio')): print(f, os.path.getsize(WT + 'assets/audio/' + f))
