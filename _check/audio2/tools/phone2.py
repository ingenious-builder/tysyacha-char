# Критерии phone_fix.js (25.11) с живыми записями: громкость play() из audio.js, «телефон» = ВЧ 200/300 Гц 4-го порядка + полка +4 дБ; разброс вариантов
import sys, json, numpy as np
sys.path.insert(0, 'D:/games/tc-wt-audio2/_check/audio2/tools')
import build as B
src = open('D:/games/tc-wt-audio2/_check/audio2/tools/verify.py', encoding='utf-8').read().split('M = json.load')[0]; exec(src)
M = json.load(open(B.CHK + 'manifest.json', encoding='utf-8')); SR = 24000
sp = [dec(B.WT + 'assets/audio/sfx%d.mp3' % i, SR) for i in (1, 2)]; sh = [align(x, SR, M['mark'])[0] for x in sp]
def rec(k):
    s, vs = M['keys'][k]; x = sp[s]; out = []
    for o, d, gm in vs:
        i0 = int(round((o + sh[s] - .004) * SR)); n = int(round((d + .008) * SR)); out.append(B.fade(x[i0:i0 + n] * gm, .003, .003, SR))
    return out
def snd(k): return rec(k) if k in M['keys'] else B.synth(k)
def m3(x): return dict(K=B.mom(B.kw(x, SR), SR), p2=B.mom(B.ph(x, SR, 200), SR), p3=B.mom(B.ph(x, SR, 300), SR))
G = {'hit_f': .42, 'hurt': .5, 'd_flesh': .42, 'sw_blade': .33, 'r_leg': .42, 'r_imp': .6}
def lv(k):
    r = [m3(x) for x in snd(k)]; g = 20 * np.log10(G.get(k, 1)); return {f: float(np.mean([v[f] for v in r])) + g for f in ('K', 'p2', 'p3')}
def mix(P):
    L = max(len(x) + int(t * SR) for x, g, t in P); y = np.zeros(L)
    for x, g, t in P: o = int(t * SR); y[o:o + len(x)] += x * g
    return y
cb, hf = B.synth('c_bolt')[0], B.synth('h_fire')[0]; CR = {}
for rar in (3, 4):
    rg = 1 + (.45 if rar >= 4 else .3); P = [(cb, .42 * rg, 0), (hf, .22 * rg, .015)]
    P.append((snd('r_imp')[0], .6, 0) if rar == 4 else (snd('r_leg')[0], .42, 0)); CR[rar] = m3(mix(P))
L = {k: lv(k) for k in G}; C = []
ok = lambda n, c, v: C.append(('ок   ' if c else 'НЕТ  ') + n + '  ' + v)
for f, tag in (('p2', '200'), ('p3', '300'), ('K', 'K')):
    ok('«Невозможная» каст ≥ легендарного +2 дБ (' + tag + ')', CR[4][f] - CR[3][f] >= 2, '%.1f дБ' % (CR[4][f] - CR[3][f]))
for f, tag in (('p2', '200'), ('p3', '300')):
    ok('удар hit_f не тише взмаха sw_blade (iPh' + tag + ')', L['hit_f'][f] >= L['sw_blade'][f], '%.1f дБ' % (L['hit_f'][f] - L['sw_blade'][f]))
    ok('смерть d_flesh не тише взмаха sw_blade (iPh' + tag + ')', L['d_flesh'][f] >= L['sw_blade'][f], '%.1f дБ' % (L['d_flesh'][f] - L['sw_blade'][f]))
ok('рана героя на iPhone (iPh200 ≥ −30)', L['hurt']['p2'] >= -30, '%.1f' % L['hurt']['p2'])
# разброс вариантов одного звука (K и телефон), пик файла
spread = []
for k in M['keys']:
    r = [m3(x) for x in rec(k)]
    if len(r) > 1:
        dK = max(v['K'] for v in r) - min(v['K'] for v in r); dP = max(v['p2'] for v in r) - min(v['p2'] for v in r); spread.append((k, dK, dP))
w = max(spread, key=lambda t: max(t[1], t[2]))
ok('варианты одного звука: разброс ≤ ±3 дБ (K и телефон)', all(max(a, b) <= 6 and max(a, b) / 2 <= 3 for _, a, b in spread), 'худший %s: K %.1f, телефон %.1f дБ (полный размах)' % w)
ok('пик файлов ≤ −1 дБ', all(20 * np.log10(np.abs(x[int(.15 * SR):]).max()) <= -1 for x in sp), ', '.join('%.2f' % (20 * np.log10(np.abs(x[int(.15 * SR):]).max())) for x in sp))
print('\n'.join(C)); open(B.CHK + 'phone2.txt', 'w', encoding='utf-8').write('\n'.join(C) + '\n\nразброс вариантов (K, телефон 200), полный размах дБ:\n' + '\n'.join('%-12s %.1f %.1f' % t for t in spread))
