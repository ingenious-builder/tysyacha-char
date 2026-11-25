# Одна запись — один боевой ключ: в одном касте звучат c_<форма> + h_<стихия> (+ r_<редкость>) — у слоёв не должно быть общего файла-исходника
# (рецензия 26.11: magical_3 был и h_arcane, и r_leg — у легендарной тайной чары флэнжер). Плюс сводка: какие исходники у нескольких ключей.
import json
R = json.load(open('D:/games/tc-wt-audio2/_check/audio2/build_rep.json', encoding='utf-8'))
S = {k[:-4]: set(v) for k, v in R.items() if k.endswith('#src')}
C = [k for k in S if k.startswith('c_')] + ['c_(синтез)']; H = [k for k in S if k.startswith('h_')]; RR = [k for k in S if k in ('r_epic', 'r_leg')] + ['r_(синтез)']
bad = []
for c in C:
    for h in H:
        for r in RR:
            L = [x for x in (c, h, r) if x in S]
            for i in range(len(L)):
                for j in range(i + 1, len(L)):
                    common = S[L[i]] & S[L[j]]
                    if common: bad.append((c, h, r, L[i], L[j], sorted(common)))
print('кастов проверено:', len(C) * len(H) * len(RR), '; общих исходников у слоёв одного каста:', len(bad))
for b in bad: print('  ', b)
use = {}
for k, fs in S.items():
    for f in fs: use.setdefault(f, []).append(k)
print('исходник у нескольких ключей:')
for f, ks in sorted(use.items()):
    if len(ks) > 1: print('  ', f.split('/')[-1], '→', ', '.join(sorted(ks)))
