# Подбор фазы начала клипа в грануле mp3 (576 отсчётов при 24 кГц): для каждой фазы — сборка build.py <фаза>, затем худшее «предэхо»
# (уровень 0,2–0,8 мс до начала клипа к пику — окно проверки нарезки br2.js) по всем клипам sfx1/sfx2. Запуск: python -I -X utf8 phase.py
import sys, json, subprocess, numpy as np
sys.path.insert(0, 'D:/games/tc-wt-audio2/_check/audio2/tools')
import build as B
src = open('D:/games/tc-wt-audio2/_check/audio2/tools/verify.py', encoding='utf-8').read().split('M = json.load')[0]; exec(src)
PY = 'D:/vidcheck/.venv/Scripts/python.exe'; SR = 24000
def worst():
    M = json.load(open(B.CHK + 'manifest.json', encoding='utf-8')); out = []
    for si in (0, 1):
        x = dec(B.WT + 'assets/audio/sfx%d.mp3' % (si + 1), SR); dt = align(x, SR, M['mark'])[0]
        for k, (s, vs) in M['keys'].items():
            if s != si: continue
            for vi, (o, d, gm) in enumerate(vs):
                i0 = int(round((o + dt - .004) * SR)); n = int(round((d + .008) * SR)); y = B.fade(x[i0:i0 + n] * gm, .003, .003, SR)
                pk = np.abs(y).max(); pre = np.sqrt((y[int(round(.0032 * SR)):int(round(.0038 * SR))] ** 2).mean()); out.append((round(20 * np.log10(pre / pk + 1e-9), 1), k + '#' + str(vi)))
    out.sort(reverse=True); return out[:3]
for ph in sys.argv[1:] or ['none'] + [str(p) for p in range(0, 576, 48)]:
    subprocess.run([PY, '-I', '-X', 'utf8', B.CHK + 'tools/build.py', ph], capture_output=True, check=True); print(ph, worst(), flush=True)
