# Проверка готовых mp3 (как их увидит audio.js): метка, нарезка по manifest.json, пик файла, громкость с множителем против синтеза,
# края (щелчки), сходство с исходником до сжатия; петля музыки боя — шов. Запуск: python -I verify.py
import json, subprocess, numpy as np, sys
sys.path.insert(0, 'D:/games/tc-wt-audio2/_check/audio2/tools')
import build as B
FF = B.FF; WT = B.WT; CHK = B.CHK; TMP = B.TMP

def dec(p, sr):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True); b = r.stdout; i = b.find(b'data')
    return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(np.float64) / 32768

def align(x, sr, mark):
    n = int(.2 * sr); i = int(np.argmax(np.abs(x[:n]))); return i / sr - mark, abs(x[i])

def clicks(x, sr):
    """скачки второй разности > 12σ локального окружения (как clk.js)"""
    d2 = np.zeros_like(x); d2[1:-1] = x[2:] - 2 * x[1:-1] + x[:-2]; L = int(.01 * sr); n = 0; i = L
    while i < len(x) - L:
        a = abs(d2[i])
        if a >= .05:
            w = np.concatenate([d2[i - L:i - 2], d2[i + 3:i + L]]); r = np.sqrt((w ** 2).mean()) + 1e-12
            if a / r > 12: n += 1; i += L; continue
        i += 1
    return n

M = json.load(open(CHK + 'manifest.json', encoding='utf-8')); mark = M['mark']; rep = json.load(open(CHK + 'build_rep.json', encoding='utf-8'))
out = []; bad = []
for si, f in enumerate(['sfx1', 'sfx2']):
    x = dec(WT + 'assets/audio/' + f + '.mp3', 24000); ref = dec(TMP + f + '.wav', 24000)
    dt, mv = align(x, 24000, mark); pk_file = 20 * np.log10(np.abs(x[int(.15 * 24000):]).max())
    out.append(f'{f}.mp3: метка {mv:.2f} сдвиг {dt * 1000:+.2f} мс, пик файла {pk_file:.2f} дБ, длина {len(x) / 24000:.2f} с')
    if pk_file > -1: bad.append(f + ' пик > −1 дБ')
    for k, (s, vs) in M['keys'].items():
        if s != si: continue
        tg = rep[k + '#synth']
        for vi, (o, d, gm) in enumerate(vs):
            i0 = int(round((o + dt - .004) * 24000)); n = int(round((d + .008) * 24000)); y = B.fade(x[i0:i0 + n] * gm, .003, .003, 24000)   # края 3 мс — как в audio.js
            r0 = int(round((o - .004) * 24000)); yr = B.fade(ref[r0:r0 + n] * gm, .003, .003, 24000)
            c = float(np.corrcoef(y, yr)[0, 1]); K, P = B.KP(y)
            e0 = abs(y[0]); e1 = abs(y[-1]); ck = clicks(y, 24000)
            line = f'{k:11s}#{vi} {d:5.2f}с  K {K:6.1f} (синтез {tg["K"]:6.1f}, {K - tg["K"]:+.1f})  тел {P:6.1f} ({tg["P"]:6.1f}, {P - tg["P"]:+.1f})  сходство {c:.3f}  края {20*np.log10(e0+1e-9):5.0f}/{20*np.log10(e1+1e-9):5.0f} дБ  щелчки {ck}'
            out.append(line)
            if c < .97 or abs(K - tg['K']) > 3 or e0 > .001 or e1 > .001: bad.append(line)
# музыка
mu = M['music']; sr = mu['sr']; x = dec(WT + 'assets/audio/battle.mp3', sr); dt, mv = align(x, sr, mark)
a = int(round((mu['t0'] + dt) * sr)); P = int(round(mu['P'] * sr))
seam = np.concatenate([x[a + P - sr // 2:a + P], x[a:a + sr // 2]])        # как играет петля: конец → начало
inner = x[a + 40 * sr:a + 41 * sr]
d_seam = np.abs(np.diff(seam)); d_in = np.abs(np.diff(inner))
win = lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-12)
out.append(f'battle.mp3: метка {mv:.2f} сдвиг {dt * 1000:+.2f} мс, пик {20*np.log10(np.abs(x[int(.15*sr):]).max()):.2f} дБ, RMS {win(x[a:a+P]):.2f} дБ (босс −18,40), шов: макс. шаг {d_seam[sr//2-50:sr//2+50].max():.4f} против обычного p99 {np.percentile(d_in, 99):.4f}, щелчки у шва {clicks(seam, sr)}, громкость 0,5 с до/после {win(seam[:sr//2]):.1f}/{win(seam[sr//2:]):.1f} дБ')
print('\n'.join(out)); print('\nЗАМЕЧАНИЯ:', len(bad)); print('\n'.join(bad))
open(CHK + 'verify.txt', 'w', encoding='utf-8').write('\n'.join(out) + '\n\nЗАМЕЧАНИЯ: ' + str(len(bad)) + '\n' + '\n'.join(bad))
# таблица REC в audio.js совпадает с manifest.json (иначе нарезка мимо клипов)
import re
_s = open(WT + 'audio.js', encoding='utf-8').read(); _m = re.search(r"^const REC=\{f:.*$", _s, re.M)
_t = subprocess.run(['node', WT + '_check/audio2/tools/gen_table.js'], capture_output=True, text=True, encoding='utf-8').stdout.strip()
_ok = bool(_m) and _m.group(0) == _t
print('таблица REC в audio.js = manifest.json:', 'да' if _ok else 'НЕТ — запусти gen_table.js и обнови строку')
open(CHK + 'verify.txt', 'a', encoding='utf-8').write('\nтаблица REC в audio.js = manifest.json: ' + ('да' if _ok else 'НЕТ') + '\n')
