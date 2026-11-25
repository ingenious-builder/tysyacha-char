# Сборка живых записей для «Тысячи чар» (26.11).
# Рецепт: ключ звука из audio.js → варианты; вариант — слои из скачанных наборов (D:/games/_snd_dl, только чтение, ничего не запускается).
# Каждый вариант: обрезка тишины, мягкие края, громкость = громкость нынешнего синтеза этого ключа (метрика как у phone_fix.js:
# макс. RMS окна 400 мс после ВЧ 60 Гц + полки +4 дБ выше 1,5 кГц), на «динамике телефона» (ВЧ 200 Гц 4-го порядка) не тише синтеза больше чем на 2 дБ
# (иначе — слой гармоник «тело»), пик ≤ −2 дБ до сжатия. Затем — спрайты mp3 24 кГц моно с меткой выравнивания и музыка боя.
# Запуск: D:/vidcheck/.venv/Scripts/python.exe -I build.py
import os, json, subprocess, numpy as np
from fractions import Fraction
from scipy import signal as ss

FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
DL = 'D:/games/_snd_dl/'
REF = 'D:/games/_snd_dl_tools/ref/'
WT = 'D:/games/tc-wt-audio2/'
OUT = WT + 'assets/audio/'
CHK = WT + '_check/audio2/'
TMP = 'D:/games/_snd_dl_tools/tmp/'
os.makedirs(TMP, exist_ok=True); os.makedirs(CHK + 'wav', exist_ok=True)
SR = 48000      # рабочая частота
SRO = 24000     # частота спрайтов (= SR1 синтеза в audio.js)
MP3_K = .45     # mp3 24 кГц 80 кбит/с теряет ~0,45 дБ громкости K (срез верха) — добавлено в множитель gm
KI = 'kenney_impact-sounds/x/Audio/'; KR = 'kenney_rpg-audio/x/Audio/'; KU = 'kenney_interface-sounds/x/Audio/'
MS = 'oga_magic-spell-sfx/'; SN = 'oga_monster-snarls/'; TR = 'oga_big-scary-troll-sounds/'; BE = 'oga_monster-or-beast-sounds/x/Monsters or Beasts/'
HB = 'oga_heartfelt-battle/'

_cache = {}
def load(p, sr=SR, ch=1):
    k = (p, sr, ch)
    if k in _cache: return _cache[k].copy()
    r = subprocess.run([FF, '-v', 'error', '-i', DL + p, '-ac', str(ch), '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data')
    if i < 0: raise RuntimeError('не прочитан ' + p + ' ' + r.stderr.decode('utf-8', 'replace')[:200])
    x = np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % (2 * ch))], dtype='<i2').astype(np.float64) / 32768
    if ch > 1: x = x.reshape(-1, ch)
    _cache[k] = x; return x.copy()

def rs(x, r):
    """играть со скоростью r: выше и короче при r>1"""
    if abs(r - 1) < 1e-6: return x
    f = Fraction(1 / r).limit_denominator(400)
    return ss.resample_poly(x, f.numerator, f.denominator)

def sos(kind, f, order=2, sr=SR): return ss.butter(order, f, btype=kind, fs=sr, output='sos')
def filt(x, kind, f, order=2, sr=SR): return ss.sosfilt(sos(kind, f, order, sr), x)

def peq(x, f, db, q=1.0, sr=SR):
    A = 10 ** (db / 40); w = 2 * np.pi * f / sr; al = np.sin(w) / (2 * q); c = np.cos(w)
    b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    return ss.lfilter(b, a, x)

def reverb(x, t60=1.2, wet=.3, damp=4000, pre=.015, seed=7, sr=SR):
    rng = np.random.default_rng(seed); n = int(t60 * sr)
    ir = rng.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n)
    ir = filt(ir, 'low', damp, 2, sr); ir /= np.sqrt((ir ** 2).sum()) + 1e-12
    w = ss.fftconvolve(x, ir)[:len(x) + n]; w = np.concatenate([np.zeros(int(pre * sr)), w])
    y = np.concatenate([x, np.zeros(len(w) - len(x))])
    return y * (1 - wet * .5) + w * wet

def body(x, a, sr=SR):
    """слой гармоник 2–6 низа (слышно на динамике телефона): насыщение нижней полосы, только выше 220 Гц"""
    lo = filt(x, 'low', 260, 2, sr); m = np.abs(lo).max() + 1e-9
    h = np.tanh(5 * lo / m) * m; h = filt(h, 'high', 220, 4, sr)
    return x + a * h

def fade(x, fi=.0015, fo=.03, sr=SR):
    x = x.copy(); n = len(x)
    i = min(n, max(1, int(fi * sr))); x[:i] *= .5 - .5 * np.cos(np.linspace(0, np.pi, i))
    o = min(n, max(1, int(fo * sr))); x[n - o:] *= .5 + .5 * np.cos(np.linspace(0, np.pi, o))
    return x

def lead_trim(x, thr=-45, back=.003, sr=SR):
    p = np.abs(x).max() + 1e-12; idx = np.nonzero(np.abs(x) > p * 10 ** (thr / 20))[0]
    s = max(0, (idx[0] if len(idx) else 0) - int(back * sr)); return x[s:]

def tail_trim(x, thr=-58, sr=SR):
    w = int(.005 * sr); n = len(x) // w
    if n < 2: return x
    e = np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)); p = e.max() + 1e-12
    idx = np.nonzero(e > p * 10 ** (thr / 20))[0]; end = (idx[-1] + 2) * w if len(idx) else len(x)
    return x[:min(len(x), end)]

def apply_fx(x, fxs):
    for fx in fxs:
        k = fx[0]
        if k == 'hp': x = filt(x, 'high', fx[1], fx[2] if len(fx) > 2 else 2)
        elif k == 'lp': x = filt(x, 'low', fx[1], fx[2] if len(fx) > 2 else 2)
        elif k == 'pk': x = peq(x, fx[1], fx[2], fx[3] if len(fx) > 3 else 1.0)
        elif k == 'rev': x = reverb(x, *fx[1:])
        elif k == 'sat': d = fx[1]; m = np.abs(x).max() + 1e-9; x = np.tanh(d * x / m) * m / np.tanh(d)
        elif k == 'body': x = body(x, fx[1])
        else: raise ValueError(k)
    return x

def glide(x, r0, r1):
    """скорость меняется линейно r0 → r1 (взлёт высоты при r1 > r0); вход заранее срезан выше SR/2/max(r) — без наложения частот"""
    rm = max(r0, r1)
    if rm > 1: x = filt(x, 'low', SR / 2 / rm * .9, 8)
    N = int((len(x) - 2) * 2 / (r0 + r1)); r = np.linspace(r0, r1, N); p = np.concatenate([[0], np.cumsum(r[:-1])])
    return np.interp(p, np.arange(len(x)), x)

def layer(L):
    """L: f файл, a/b — кусок (с), r — скорость, gl — (r0, r1) скорость меняется по ходу (взлёт), len — длина после скорости (с, с плавным концом fo), t — сдвиг (с), g — дБ, fx — обработка"""
    x = load(L['f'])
    a = L.get('a', 0); b = L.get('b')
    x = x[int(a * SR):(int(b * SR) if b else None)]
    if L.get('trim', True): x = lead_trim(x)
    if 'r' in L: x = rs(x, L['r'])
    if 'gl' in L: x = glide(x, *L['gl'])
    if 'len' in L: x = fade(x[:int(L['len'] * SR)], L.get('fi', .001), L.get('fo', .08))
    x = apply_fx(x, L.get('fx', []))
    return x * 10 ** (L.get('g', 0) / 20), L.get('t', 0)

def mix(layers, fxs=()):
    parts = [layer(L) for L in layers]
    n = max(len(x) + int(t * SR) for x, t in parts); y = np.zeros(n)
    for x, t in parts: o = int(t * SR); y[o:o + len(x)] += x
    return apply_fx(y, fxs)

# ---------- метрика громкости — порт phone_fix.js (bq2, ph, kw, mom) ----------
def bq2(x, sr, kind, f, q, gain=0):
    w = 2 * np.pi * f / sr; c = np.cos(w); s = np.sin(w); al = s / (2 * q)
    if kind == 'hp': b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al
    else:
        A = 10 ** (gain / 40); sq = 2 * np.sqrt(A) * al
        b0 = A * ((A + 1) + (A - 1) * c + sq); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sq)
        a0 = (A + 1) - (A - 1) * c + sq; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sq
    return ss.lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x)
def ph(x, sr, f=200): return bq2(bq2(bq2(x, sr, 'hp', f, .707), sr, 'hp', f, .707), sr, 'hs', 1500, .707, 4)
def kw(x, sr): return bq2(bq2(x, sr, 'hp', 60, .5), sr, 'hs', 1500, .707, 4)
def mom(x, sr):
    W = int(round(.4 * sr)); pre = np.concatenate([[0], np.cumsum(x * x)]); mx = 0; st = int(round(sr * .05)); n = len(x)
    for i in range(0, max(1, n), st):
        j = min(n, i + W); mx = max(mx, (pre[j] - pre[i]) / W)
    return 10 * np.log10(mx + 1e-12)
def KP(x, sr=SRO): return mom(kw(x, sr), sr), mom(ph(x, sr, 200), sr)
def pkdb(x): return 20 * np.log10(np.abs(x).max() + 1e-12)

VARS = json.load(open(REF + '_vars.json'))
def synth(k):
    return [np.fromfile(REF + k + '#' + str(v) + '.f32', dtype=np.float32).astype(np.float64) for v in range(VARS['v'][k])]
def synth_target(k):
    xs = synth(k); m = [KP(x) for x in xs]
    return float(np.mean([a for a, b in m])), float(np.mean([b for a, b in m])), float(np.mean([len(x) / SRO for x in xs]))

def limit(x, ceil_db=-2.0, sr=SRO, look=.002, rel=.06):
    """ограничитель с заглядыванием: пик ≤ ceil_db без щелчков"""
    from scipy.ndimage import minimum_filter1d
    c = 10 ** (ceil_db / 20); need = np.minimum(1, c / (np.abs(x) + 1e-12))
    L = max(1, int(look * sr)); g = minimum_filter1d(need, 2 * L + 1)
    a = np.exp(-1 / (rel * sr)); out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        v = g[i]; cur = v if v < cur else v + (cur - v) * a; out[i] = cur
    out = np.convolve(out, np.ones(L) / L, 'same')
    y = x * out
    pk = np.abs(y).max()
    if pk > c: y *= c / pk
    return y

def finish(x, key, tgt, opt):
    y = ss.resample_poly(x, 1, 2)                      # 48 → 24 кГц
    y = filt(y, 'high', 25, 2, SRO)
    y = lead_trim(y, -50, .001, SRO); y = tail_trim(y, -58, SRO)
    if 'maxlen' in opt and len(y) > opt['maxlen'] * SRO: y = fade(y[:int(opt['maxlen'] * SRO)], .001, opt.get('fo', .12), SRO)
    y = fade(y, .0015, min(.03, len(y) / SRO * .2), SRO)
    # громкость = синтез (K); пик файла ≤ −2 дБ: короткий удар с острым пиком — сначала ограничитель (снять ≤ 3 дБ пика), остаток — множитель gm,
    # который audio.js применяет к отсчётам при нарезке (float, без обрезки); gm ≤ +6 дБ. «Тело» (гармоники низа) — только если на телефоне
    # запись теряет больше синтеза на 2 дБ и больше.
    Kt, Pt, _ = tgt; Kt += opt.get('dK', 0); a = opt.get('a0', 0.0); base = y.copy(); ls = Kt - Pt
    for it in range(10):
        z = body(base, a, SRO) if a > 0 else base.copy()
        K, P = KP(z); z *= 10 ** ((Kt - K) / 20); over = pkdb(z) + 2.0
        if over > 0:
            z = limit(z, pkdb(z) - min(opt.get('lim', 3.0), over)); K, P = KP(z); z *= 10 ** ((Kt - K) / 20); over = pkdb(z) + 2.0
        gm = 1.0
        if over > 0: z *= 10 ** (-over / 20); gm = 10 ** (min(opt.get('gmax', 6.0), over) / 20)
        K, P = KP(z)
        if (K - P) <= ls + 2 or a >= 1.6 or opt.get('nobody'): break
        a += .2
    Ke, Pe = K + 20 * np.log10(gm), P + 20 * np.log10(gm)
    if 'Pmax' in opt and Pe > Pt + opt['Pmax']:
        d = Pt + opt['Pmax'] - Pe; gm *= 10 ** (d / 20); Ke += d; Pe += d
    gm *= 10 ** (MP3_K / 20)
    return z.astype(np.float32), round(float(gm), 4), dict(K=round(Ke, 2), P=round(Pe, 2), Kt=round(Kt, 2), Pt=round(Pt, 2), gm=round(20 * np.log10(gm), 1), body=round(a, 1), pk=round(pkdb(z), 2), dur=round(len(z) / SRO, 3))

# ---------- рецепты ----------
def seg(f, a, b, **k): d = dict(f=f, a=a, b=b); d.update(k); return d
def one(f, **k): d = dict(f=f); d.update(k); return d
TRS = [(0.0, 1.18), (1.86, 2.96), (3.6, 4.78), (5.34, 6.46), (7.06, 8.73), (9.35, 10.34)]                 # troll-roars_0
SNA = [(0.05, 1.22), (1.59, 2.92), (3.27, 4.2), (5.17, 6.06), (6.7, 7.84), (8.77, 9.81), (10.52, 11.8), (12.62, 13.9), (14.18, 15.62), (16.45, 17.68)]  # monster-snarl-attack
SN5 = [(0.32, 1.67), (2.01, 3.49), (4.01, 5.68), (6.29, 8.09), (8.91, 10.28), (10.94, 12.35), (13.05, 14.42), (15.01, 16.6), (17.02, 18.52)]  # monster-snarl-5

def bones(seq):
    return [one(KI + 'impactWood_light_00%d.ogg' % n, t=t, g=g, r=r, len=.22, fi=.0012, fo=.1) for n, t, g, r in seq]   # вход 1,2 мс — стук без щелчка

R = {
 # удары и попадания (Kenney Impact Sounds)
 'hit_f': {'s': 1, 'v': [[one(KI + 'impactPunch_medium_00%d.ogg' % i, fx=[('hp', 110), ('pk', 1100, 6, .8), ('pk', 2500, 3, 1.0)])] for i in (0, 1, 2, 3)], 'o': {'a0': .9}},   # «шлепок» 1–3 кГц и гармоники низа: слышно на динамике телефона
 'hurt': {'s': 1, 'v': [[one(KI + 'impactSoft_medium_00%d.ogg' % i), one(KI + 'impactPunch_heavy_00%d.ogg' % j, r=.84, g=-3, t=.004)] for i, j in ((0, 0), (2, 2), (4, 4))],
          'fx': [('lp', 2000, 2)], 'o': {'a0': .9}},   # 26.11 рецензия: рана героя и свой удар были из одного семейства — рана теперь глухая, темнее (без 1–3 кГц «шлепка»)
 'hit_p': {'s': 1, 'v': [[one(KI + 'impactGeneric_light_00%d.ogg' % i)] for i in (0, 2, 4)]},
 'crit': {'s': 1, 'v': [[one(KI + 'impactMetal_light_00%d.ogg' % i, len=.32, fo=.12)] for i in (0, 1, 4)]},
 'shield_hit': {'s': 1, 'v': [[one(KI + 'impactMetal_medium_00%d.ogg' % i)] for i in (0, 1, 3)]},
 'th': {'s': 1, 'v': [[one(KI + 'impactPlate_heavy_00%d.ogg' % i), one(KI + 'impactSoft_heavy_00%d.ogg' % j, g=-4)] for i, j in ((0, 0), (1, 2), (3, 4))]},
 'd_big': {'s': 1, 'v': [[one(KI + 'impactSoft_heavy_001.ogg'), one(KI + 'impactPlank_medium_001.ogg', g=-3, t=.01)],
                         [one(KI + 'impactSoft_heavy_003.ogg'), one(KI + 'impactPlank_medium_003.ogg', g=-3, t=.01)]]},
 'd_stone': {'s': 1, 'v': [[one(KI + 'impactMining_00%d.ogg' % i, len=.6, fo=.2), one(KI + 'footstep_snow_00%d.ogg' % j, t=.03, g=-3, r=.75),
                            one(KI + 'impactMining_00%d.ogg' % k, t=.11, g=-9, r=1.3, len=.35, fo=.15)] for i, j, k in ((0, 1, 2), (3, 2, 4), (1, 4, 0))]},
 'd_bone': {'s': 1, 'v': [bones([(0, 0, 0, 1), (2, .05, -3, 1.2), (4, .11, -6, 1.05), (1, .19, -10, 1.35)]),
                          bones([(3, 0, 0, 1.1), (0, .045, -2, .95), (2, .1, -6, 1.3), (4, .16, -9, 1.15), (1, .23, -13, 1.4)]),
                          bones([(1, 0, 0, .95), (4, .06, -4, 1.25), (3, .13, -7, 1.1), (0, .2, -11, 1.3)])]},
 # смерти врагов: тело + голос
 'd_flesh': {'s': 1, 'v': [[one(KI + 'impactPunch_medium_00%d.ogg' % p, g=-2), seg(SN + 'monster-snarl-5.ogg', a, a + .6, t=.02, g=-5, r=r, len=.38, fi=.015, fo=.22, trim=False)]
                           for p, a, r in ((0, 6.50, 1.1), (1, 8.93, 1.15), (3, 13.15, 1.05), (4, 17.42, 1.12))]},   # голос — от пика рыка (−0,1 с)
 'd_slime': {'s': 1, 'v': [[one(BE + 'Yucky Beast.wav')], [one(BE + 'Yucky Beast 2.wav')]]},
 'd_beast': {'s': 1, 'v': [[one(BE + 'Beast Growl.wav', a=.15, len=.6, fi=.01, fo=.2, trim=False)], [seg(SN + 'monster-snarl-5.ogg', 2.18, 3.49, len=.6, fi=.015, fo=.25, trim=False)], [one(BE + 'Dieing Beast.wav', r=1.15, len=.95, fo=.3)]], 'o': {'nobody': 1}},
 'd_bat': {'s': 1, 'v': [[one(BE + 'Dieing pixie.wav', r=1.35, len=.55, fo=.2)], [one(BE + 'Pixie.wav', r=1.3, len=.45, fo=.15)]]},
 'd_ghost': {'s': 2, 'v': [[one(BE + 'Spirit Shout.wav', fx=[('rev', 1.6, .35, 3500)])]]},
 # замахи врагов и босс (Darsycho, pauliuw)
 'tw': {'s': 1, 'v': [[seg(SN + 'monster-snarl-attack.ogg', *SNA[i], len=.85, fo=.25)] for i in (0, 2, 4, 6)]},
 'twb': {'s': 2, 'v': [[seg(TR + 'troll-roars_0.ogg', *TRS[i], r=.85, len=1.4, fo=.35, fx=[('pk', 900, 3, .8)])] for i in (0, 2, 3)], 'o': {'nobody': 1}},
 'b_roar': {'s': 2, 'v': [[seg(TR + 'troll-roars_0.ogg', *TRS[4], r=.72), one(BE + 'Beast Growl 5.wav', r=.9, g=-5, t=.03)]], 'fx': [('pk', 900, 3, .8)], 'o': {'nobody': 1}},
 'b_phase': {'s': 2, 'v': [[one(KI + 'impactPlate_heavy_001.ogg'), one(KI + 'impactSoft_heavy_002.ogg', g=-3), seg(TR + 'troll-roars_0.ogg', *TRS[1], r=.78, t=.06, fx=[('pk', 900, 3, .8)])]]},
 'b_death': {'s': 2, 'v': [[one(BE + 'Dieing Beast.wav', r=.68, fx=[('rev', 1.8, .28, 3000)])]]},
 'shield_break': {'s': 1, 'v': [
   [one(KI + 'impactGlass_heavy_000.ogg'), one(KI + 'impactGlass_medium_001.ogg', t=.02, g=-6), one(KI + 'impactGlass_light_000.ogg', t=.012, g=-2),
    one(KI + 'impactGlass_light_002.ogg', t=.04, g=-4, r=1.25), one(KI + 'impactGlass_light_004.ogg', t=.075, g=-6, r=1.5), one(KI + 'impactGlass_light_001.ogg', t=.12, g=-9, r=1.15), one(KI + 'impactGlass_light_003.ogg', t=.17, g=-12, r=1.7)],
   [one(KI + 'impactGlass_heavy_002.ogg'), one(KI + 'impactGlass_medium_003.ogg', t=.02, g=-6), one(KI + 'impactGlass_light_003.ogg', t=.01, g=-2, r=1.1),
    one(KI + 'impactGlass_light_001.ogg', t=.035, g=-4, r=1.4), one(KI + 'impactGlass_light_000.ogg', t=.08, g=-6, r=1.2), one(KI + 'impactGlass_light_004.ogg', t=.115, g=-9, r=1.6), one(KI + 'impactGlass_light_002.ogg', t=.165, g=-12, r=1.3)]]},
 # стихии, где есть подходящая запись
 'h_ice': {'s': 1, 'v': [[one(KI + 'impactGlass_light_00%d.ogg' % i), one(KI + 'footstep_snow_00%d.ogg' % j, g=-4, r=1.25)] for i, j in ((0, 0), (2, 3), (4, 1))]},
 'h_earth': {'s': 1, 'v': [[one(KI + 'impactMining_00%d.ogg' % i, len=.4, fo=.18)] for i in (0, 2, 4)]},
 'h_light': {'s': 1, 'v': [[one(KI + 'impactBell_heavy_00%d.ogg' % i, r=2.0, len=.6, fo=.3, fx=[('hp', 400)])] for i in (0, 1)]},
 'h_arcane': {'s': 1, 'v': [[one(MS + 'magical_2.ogg', a=.12, trim=False, fi=.006, gl=(1.25, 1.6), len=.48, fo=.22, fx=[('hp', 380), ('pk', 2400, 3, 1.0), ('rev', .45, .18, 5000)])],
                            [one(MS + 'magical_2.ogg', a=.2, trim=False, fi=.006, gl=(1.4, 1.85), len=.44, fo=.2, fx=[('hp', 450), ('pk', 2800, 3, 1.0), ('rev', .45, .18, 5000)])]], 'o': {'maxlen': .58, 'fo': .18}},   # «звонкий колокол со взлётом»: кусок magical_2 выше и с подъёмом высоты; ui_lu (окно чар, игра на паузе) — тот же файл целиком
 'h_shadow': {'s': 1, 'v': [[one(MS + 'magical_6_0.ogg', a=.36, trim=False, fi=.02, r=.5, len=.55, fo=.3, fx=[('lp', 1400), ('rev', .5, .3, 1500)])],
                            [one(MS + 'magical_6_0.ogg', a=.2, trim=False, fi=.02, r=.6, len=.55, fo=.3, fx=[('lp', 1100), ('rev', .5, .3, 1500)])]], 'o': {'maxlen': .75, 'fo': .25}},
 # взмахи (Kenney RPG Audio: knifeSlice)
 'sw_blade': {'s': 1, 'v': [[one(KR + 'knifeSlice.ogg', a=.14, trim=False, fi=.01, len=.3, fo=.1)], [one(KR + 'knifeSlice2.ogg', a=.21, trim=False, fi=.01, len=.25, fo=.1)]], 'o': {'dK': -1}},   # пик взмаха ~0,09 с после удара; на 1 дБ тише синтеза — удар по врагу слышнее взмаха
 'sw_light': {'s': 1, 'v': [[one(KR + 'knifeSlice.ogg', a=.14, trim=False, fi=.008, r=1.35, len=.22, fo=.08)], [one(KR + 'knifeSlice2.ogg', a=.21, trim=False, fi=.008, r=1.35, len=.19, fo=.08)]], 'o': {'dK': -1}},
 'sw_heavy': {'s': 1, 'v': [[one(KR + 'knifeSlice.ogg', a=.14, trim=False, fi=.012, r=.72, len=.42, fo=.14, fx=[('lp', 5000)])], [one(KR + 'knifeSlice2.ogg', a=.21, trim=False, fi=.012, r=.72, len=.38, fo=.14, fx=[('lp', 5000)])]], 'o': {'dK': -1}},
 # редкость и магия (JaggedStone)
 'r_epic': {'s': 2, 'v': [[one(MS + 'magical_7_0.ogg', len=.8, fo=.3)]]},
 'r_leg': {'s': 2, 'v': [[one(MS + 'magical_3.ogg', len=1.3, fo=.45)]], 'o': {'Pmax': 0}},
 'c_summon': {'s': 2, 'v': [[one(MS + 'magical_4.ogg', len=1.7, fo=.5)]]},
 'c_barrier': {'s': 2, 'v': [[one(MS + 'magical_1_0.ogg', len=1.0, fo=.35)]]},
 'heal': {'s': 2, 'v': [[one(MS + 'magical_5.ogg', len=1.0, fo=.35)]]},
 'ui_lu': {'s': 2, 'v': [[one(MS + 'magical_2.ogg', len=1.1, fo=.4)]]},
 # интерфейс и предметы (Kenney RPG Audio, Interface Sounds)
 'ui_click': {'s': 2, 'v': [[one(KI + 'impactWood_light_002.ogg', r=1.5, len=.1, fo=.05)], [one(KI + 'impactWood_light_000.ogg', r=1.6, len=.1, fo=.05)]]},
 'ui_book': {'s': 2, 'v': [[one(KR + 'bookOpen.ogg'), one(KR + 'bookFlip1.ogg', t=.06, g=-2)]], 'o': {'lim': 6, 'gmax': 8}},
 'ui_bookc': {'s': 2, 'v': [[one(KR + 'bookClose.ogg')]], 'o': {'lim': 6, 'gmax': 8}},
 'chest': {'s': 2, 'v': [[one(KR + 'metalLatch.ogg'), one(KR + 'creak1.ogg', t=.12, g=-2), one(KR + 'handleCoins.ogg', t=.62, g=-1)]], 'o': {'lim': 6, 'gmax': 8}},
 'ess': {'s': 2, 'v': [[one(KU + 'glass_001.ogg')], [one(KU + 'glass_001.ogg', r=.94), one(KU + 'glass_005.ogg', t=.05, g=-4)]]},
 'ess_big': {'s': 2, 'v': [[one(KU + 'glass_001.ogg'), one(KU + 'glass_006.ogg', t=.07, r=1.25, g=-2), one(KU + 'glass_004.ogg', t=.12, g=-8)]]},
 'scroll': {'s': 2, 'v': [[one(KR + 'bookFlip2.ogg')]], 'o': {'lim': 6, 'gmax': 8}},
 'w_tick': {'s': 1, 'v': [[one(KI + 'impactWood_light_000.ogg', len=.16, fo=.08)]]},
}

def build():
    clips = {}; rep = {}
    for k, rc in R.items():
        tgt = synth_target(k); opt = rc.get('o', {}); out = []
        for vi, layers in enumerate(rc['v']):
            y, gm, m = finish(mix(layers, rc.get('fx', ())), k, tgt, opt); out.append((y, gm)); m['v'] = vi; rep.setdefault(k, []).append(m)
            write_wav(CHK + 'wav/' + k + '_' + str(vi) + '.wav', y * gm / max(1.0, float(np.abs(y * gm).max()) / .89), SRO)
        rep[k + '#src'] = sorted({L['f'] for layers in rc['v'] for L in layers})
        clips[k] = (rc['s'], out); rep[k + '#synth'] = dict(K=round(tgt[0], 2), P=round(tgt[1], 2), dur=round(tgt[2], 3))
    return clips, rep

def write_wav(p, y, sr):
    import scipy.io.wavfile as wf
    wf.write(p, sr, np.clip(y * 32767, -32768, 32767).astype('<i2'))

MARK_T = .05; HEAD = .25; GAP = .12
GRAN = 576; PHASE = 24    # гранула mp3 (24 кГц) и фаза начала клипа в ней: подобрана по предэху (tools/phase.py) — без неё перед резким ударом
                          # (th, h_ice) в окно нарезки попадал «размаз» mp3 до −40 дБ к пику; с фазой 24 — худший −54 дБ
def sprite(name, items, ph=PHASE):
    """метка (одиночный отсчёт) на 0,05 с, клипы с 0,25 с через 0,12 с тишины (начало клипа — на фазе ph гранулы mp3); отдаёт смещения (с) — их audio.js поправит по метке"""
    parts = []; t = HEAD; man = {}
    for k, vs in items:
        man[k] = []
        for y, gm in vs:
            if ph is not None: n0 = int(round(t * SRO)); t = (n0 + (ph - n0) % GRAN) / SRO
            man[k].append([round(t, 4), round(len(y) / SRO, 4), gm]); parts.append((t, y)); t += len(y) / SRO + GAP
    n = int(t * SRO) + int(.3 * SRO); buf = np.zeros(n, np.float32); buf[int(MARK_T * SRO)] = .7
    for t0, y in parts: o = int(round(t0 * SRO)); buf[o:o + len(y)] += y
    wav = TMP + name + '.wav'; write_wav(wav, buf, SRO)
    mp3 = OUT + name + '.mp3'
    r = subprocess.run([FF, '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(SRO), '-c:a', 'libmp3lame', '-b:a', '80k', '-metadata', 'title=Tysyacha char SFX (' + name + ')',
                        '-metadata', 'comment=Kenney (CC0), JaggedStone (CC0), Darsycho (CC0), pauliuw (CC0) via opengameart.org; processed', mp3], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return man, buf

def music():
    """«Heartfelt Battle» (request, CC0): петля ровно 153,6 с (96 тактов по 1,6 с), моно. В исходнике шов «петля → петля» со скачком 0,1 (щелчок),
    а «вступление → петля» у автора чистый: последние 60 мс петли плавно переходят в последние 60 мс вступления — после них петля начинается
    так же, как после вступления. Длина и сетка тактов не меняются, первая доля петли не тронута (рецензия 26.11)."""
    sr = 32000; m = load(HB + 'heartfelt-battle_loop.ogg', sr, 2).mean(1); I = load(HB + 'heartfelt-battle_intro.ogg', sr, 2).mean(1)
    X = int(.06 * sr); P = len(m); y = m.copy(); a, b = m[P - X:], I[-X:]
    c = float(np.dot(a, b) / (np.sqrt(np.dot(a, a) * np.dot(b, b)) + 1e-12)); k = np.linspace(0, 1, X)
    # равная мощность с поправкой на сходство кусков (c → 1 — равное усиление, c → 0 — синус/косинус)
    fo, fi = np.cos(k * np.pi / 2), np.sin(k * np.pi / 2)
    if c > 0: fo, fi = (1 - c) * fo + c * (1 - k), (1 - c) * fi + c * k
    y[P - X:] = a * fo + b * fi
    rms =lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-12)
    tgt = -18.4; y = y * 10 ** ((tgt - rms(y)) / 20)
    if pkdb(y) > -1.5: y = limit(y, -1.5, sr)
    head = int(HEAD * sr); post = int(1.0 * sr)
    buf = np.concatenate([np.zeros(head), y, y[:post], np.zeros(int(.2 * sr))]).astype(np.float32); buf[int(MARK_T * sr)] = .7
    wav = TMP + 'battle.wav'; write_wav(wav, buf, sr)
    r = subprocess.run([FF, '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(sr), '-c:a', 'libmp3lame', '-b:a', '80k', '-metadata', 'title=Heartfelt Battle (loop)',
                        '-metadata', 'artist=request (request.moe)', '-metadata', 'comment=CC0, opengameart.org/content/heartfelt-battle-loopable-fantasy-stringspianohorn', OUT + 'battle.mp3'], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return dict(t0=HEAD, P=round(P / sr, 5), sr=sr, rms=round(rms(y), 2), pk=round(pkdb(y), 2), xf=X / sr, xcor=round(c, 3))

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1: PHASE = None if sys.argv[1] == 'none' else int(sys.argv[1])
    clips, rep = build()
    S = {1: [], 2: []}
    for k, (s, vs) in clips.items(): S[s].append((k, vs))
    man = {}
    for s in (1, 2):
        m, buf = sprite('sfx%d' % s, S[s], PHASE)
        for k, v in m.items(): man[k] = [s - 1, v]
    mu = music()
    json.dump(dict(keys=man, music=mu, mark=MARK_T), open(CHK + 'manifest.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(rep, open(CHK + 'build_rep.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    for k in R:
        s = rep[k + '#synth']; v = rep[k]
        print(f"{k:11s} synth K{s['K']:6.1f} P{s['P']:6.1f} {s['dur']:.2f}s | " + ' '.join(f"K{m['K']:.1f}/P{m['P']:.1f}/gm{m['gm']}/b{m['body']}/pk{m['pk']}/{m['dur']}s" for m in v))
    print('music', mu)
    for f in ('sfx1.mp3', 'sfx2.mp3', 'battle.mp3'): print(f, os.path.getsize(OUT + f))
