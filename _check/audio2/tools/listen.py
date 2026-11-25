# Спорные ключи на прослушку (Пётр/Артём, с телефона): <ключ>.mp3 = все варианты записи подряд, пауза 1 с, затем прежний синтез (для сравнения).
# Громкость — как в игре (множитель gm записи, синтез как есть), пик ≤ −1 дБ. Запуск: python -I -X utf8 listen.py → _check/audio2/listen/
import os, sys, subprocess, numpy as np
sys.path.insert(0, 'D:/games/tc-wt-audio2/_check/audio2/tools')
import build as B
src = open('D:/games/tc-wt-audio2/_check/audio2/tools/verify.py', encoding='utf-8').read().split('M = json.load')[0]; exec(src)
import json
M = json.load(open(B.CHK + 'manifest.json', encoding='utf-8')); SR = 24000
sp = [dec(B.WT + 'assets/audio/sfx%d.mp3' % i, SR) for i in (1, 2)]; sh = [align(x, SR, M['mark'])[0] for x in sp]
def rec(k):
    s, vs = M['keys'][k]; x = sp[s]; out = []
    for o, d, gm in vs:
        i0 = int(round((o + sh[s] - .004) * SR)); n = int(round((d + .008) * SR)); out.append(B.fade(x[i0:i0 + n] * gm, .003, .003, SR))
    return out
KEYS = {'hurt': 'рана героя (было из одного семейства с hit_f — теперь глухой удар)', 'hit_f': 'свой удар в ближнем бою', 'sw_blade': 'взмах клинком (knifeSlice)',
        'sw_light': 'лёгкий взмах', 'sw_heavy': 'тяжёлый взмах', 'd_slime': 'смерть слизня (Yucky Beast)', 'd_bat': 'смерть летучей мыши (Pixie)',
        'h_shadow': 'попадание тьмой', 'h_arcane': 'попадание тайной стихией', 'r_leg': 'легендарная чара', 'c_barrier': 'щит-барьер'}
OUT = B.CHK + 'listen/'; os.makedirs(OUT, exist_ok=True); gap = np.zeros(int(.45 * SR)); big = np.zeros(int(1.0 * SR)); lines = []
for k, what in KEYS.items():
    r = rec(k); s = B.synth(k); y = np.concatenate(sum([[v, gap] for v in r], []) + [big] + sum([[v, gap] for v in s], []))
    pk = np.abs(y).max(); y = y * min(1.0, .89 / pk)
    wav = B.TMP + 'listen_' + k + '.wav'; B.write_wav(wav, y, SR)
    subprocess.run([B.FF, '-v', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', OUT + k + '.mp3'], check=True)
    lines.append(f'{k}.mp3 — {what}: {len(r)} вар. записи, пауза 1 с, {len(s)} вар. прежнего синтеза')
open(OUT + 'СПИСОК.txt', 'w', encoding='utf-8').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
print(sum(os.path.getsize(OUT + f) for f in os.listdir(OUT)), 'байт')
