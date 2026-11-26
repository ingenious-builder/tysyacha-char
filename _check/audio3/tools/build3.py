# Сборка живых звуков «Тысячи чар», раунд 3 (26.11, ветка feat/audio3).
# 1) фоны регионов: amb_cave.mp3 (Loopable Dungeon Ambience), amb_forest.mp3 (CC0 Background Ambience), amb_wind.mp3 (Birds and Wind, кусок только с ветром):
#    петля с кроссфейдом хвоста с головой, моно 22,05 кГц, mp3 64 кбит/с, громкость по среднеквадратичному (−21 дБ, как синтезные подложки), пик ≤ −2 дБ.
#    В файле: [хвост петли 0,6 с][петля P][голова петли 0,6 с] — сигнал периодичен на всём файле, поэтому любой сдвиг декодера mp3 (до ±0,5 с) шва не создаёт;
#    audio.js играет loopStart = t0, loopEnd = t0 + P.
# 2) sfx3.mp3: огонь, яд, ветер (новые ключи) и добавочные варианты льда и земли — рецепты и метрика громкости — из audio2 (tools/build.py).
# Запуск: D:/vidcheck/.venv/Scripts/python.exe -I build3.py
import os, sys, json, subprocess, numpy as np
sys.path.insert(0, 'D:/games/tc-wt-audio2/_check/audio2/tools')
import build as B

WT = 'D:/games/tc-wt-audio3/'; OUT = WT + 'assets/audio/'; CHK = WT + '_check/audio3/'; TMP = 'D:/games/_snd_dl_tools/tmp3/'
os.makedirs(TMP, exist_ok=True)
B.OUT = OUT; B.TMP = TMP; B.REF = 'D:/games/_snd_dl_tools/ref3/'; B.VARS = json.load(open(B.REF + '_vars.json'))
SRA = 22050; LEAD = .6

def load_sr(p, sr):
    r = subprocess.run([B.FF, '-v', 'error', '-i', B.DL + p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data'); return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(np.float64) / 32768

def rms_db(v): return 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-12)

def amb(name, src, a, b, X, title, lic):
    x = load_sr(src, SRA); x = x[int(a * SRA):int(b * SRA) if b else None]
    x = B.filt(x, 'high', 30, 2, SRA)
    N = len(x); Xs = int(X * SRA); y = x[:N - Xs].copy(); k = np.linspace(0, 1, Xs)
    y[:Xs] = x[:Xs] * np.sin(k * np.pi / 2) + x[N - Xs:] * np.cos(k * np.pi / 2)       # хвост уходит в голову: y[-1] → y[0] идёт как в исходнике
    y *= 10 ** ((-21 - rms_db(y)) / 20)
    if B.pkdb(y) > -2: y = B.limit(y, -2.0, SRA); y *= 10 ** ((-21 - rms_db(y)) / 20); y = B.limit(y, -2.0, SRA)
    P = len(y); L = int(LEAD * SRA)
    buf = np.concatenate([y[P - L:], y, y[:L]]).astype(np.float32)
    wav = TMP + name + '.wav'; B.write_wav(wav, buf, SRA)
    r = subprocess.run([B.FF, '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(SRA), '-c:a', 'libmp3lame', '-b:a', '64k', '-metadata', 'title=' + title, '-metadata', 'comment=' + lic, OUT + name + '.mp3'], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    # метрики до mp3: шов y[-1] → y[0]: шаг против 99,9-го процентиля шагов внутри; самые тихие 0,5 с
    st = np.abs(np.diff(y)); seam = abs(y[0] - y[-1]); w = int(.5 * SRA); n = P // w
    e = [rms_db(y[i * w:(i + 1) * w]) for i in range(n)]
    return dict(f=name + '.mp3', P=round(P / SRA, 4), t0=LEAD, sr=SRA, rms=round(rms_db(y), 2), pk=round(B.pkdb(y), 2), seam=round(float(seam), 5), step999=round(float(np.percentile(st, 99.9)), 5),
                quiet=round(min(e), 1), loud=round(max(e), 1), size=os.path.getsize(OUT + name + '.mp3'))

RP = 'oga_rpg-sound-pack/x/RPG Sound Pack/'; BW = 'oga_birds-and-wind/Birds_and_Wind_-_Ambient_0.ogg'; ES = 'oga_earth-element-magic-spell/Earth_Element_Magic_Spell_4.ogg'
one = B.one
R3 = {
 # огонь: порыв пламени (random1 — широкополосный «выдох» с нарастанием) и треск (random2–4); пакет RPG Sound Pack (artisticdude, CC0)
 'h_fire': {'v': [[one(RP + 'misc/random1.wav', a=.12, len=.36, fo=.16, fx=[('hp', 250)]), one(RP + 'misc/random3.wav', g=-2, fx=[('hp', 1200)])],
                  [one(RP + 'misc/random1.wav', a=.28, r=1.1, len=.32, fo=.14, fx=[('hp', 300), ('lp', 8000)]), one(RP + 'misc/random2.wav', t=.02, g=-1, fx=[('hp', 1500)])],
                  [one(RP + 'misc/random4.wav', len=.4, fo=.16, fx=[('hp', 400)]), one(RP + 'misc/random1.wav', a=.16, r=.9, len=.32, fo=.14, g=-4, fx=[('hp', 600)])]]},
 # яд: чавканье слизи + пузыри
 'h_poison': {'v': [[one(RP + 'NPC/slime/slime1.wav'), one(RP + 'inventory/bubble.wav', t=.02, g=-1)],
                    [one(RP + 'NPC/slime/slime5.wav'), one(RP + 'inventory/bubble2.wav', t=.03, g=-1)],
                    [one(RP + 'NPC/slime/slime8.wav', len=.45, fo=.15), one(RP + 'inventory/bubble3.wav', t=.03, len=.5, fo=.18, g=-1)]]},
 # ветер: порыв из живой записи ветра (Birds and Wind, кусок без птиц) + свист воздуха (random1 выше 1,8 кГц)
 'h_wind': {'v': [[one(BW, a=9.0, b=9.6, trim=False, fi=.012, len=.4, fo=.18, fx=[('hp', 200), ('pk', 2500, 5, .8)]), one(RP + 'misc/random1.wav', a=.15, len=.32, fo=.16, g=-5, fx=[('hp', 1800)])],
                  [one(BW, a=13.0, b=13.6, trim=False, fi=.012, len=.4, fo=.18, fx=[('hp', 200), ('pk', 2500, 5, .8)]), one(RP + 'misc/random1.wav', a=.22, r=1.15, len=.3, fo=.15, g=-5, fx=[('hp', 1800)])],
                  [one(BW, a=16.5, b=17.1, trim=False, fi=.012, len=.4, fo=.18, fx=[('hp', 200), ('pk', 2500, 5, .8)]), one(RP + 'misc/random1.wav', a=.3, r=.95, len=.34, fo=.16, g=-6, fx=[('hp', 1800)])]]},
 # добавочные варианты (склеиваются с уже встроенными записями в audio.js: ключ с «+»)
 'h_ice+': {'k': 'h_ice', 'v': [[one(RP + 'battle/magic1.wav', a=.05, len=.5, fo=.25, r=1.25, fx=[('hp', 800)])],
                                [one(RP + 'battle/spell.wav', a=.12, len=.55, fo=.25, r=1.1, fx=[('hp', 700)]), one(RP + 'battle/magic1.wav', t=.05, r=1.6, g=-8, len=.4, fo=.2)]]},
 'h_earth+': {'k': 'h_earth', 'v': [[one(ES, a=.55, b=1.0, len=.42, fo=.14, fx=[('lp', 2500), ('body', .8)])],
                                    [one(ES, a=.9, r=.8, len=.5, fo=.2, fx=[('lp', 2200), ('body', .8)])]]},
}

def sfx():
    items = []; rep = {}
    for k, rc in R3.items():
        tk = rc.get('k', k); tgt = B.synth_target(tk); out = []
        for vi, layers in enumerate(rc['v']):
            y, gm, m = B.finish(B.mix(layers, rc.get('fx', ())), tk, tgt, rc.get('o', {})); out.append((y, gm)); m['v'] = vi; rep.setdefault(k, []).append(m)
            B.write_wav(CHK + 'wav/' + k.replace('+', 'p') + '_' + str(vi) + '.wav', y * gm / max(1.0, float(np.abs(y * gm).max()) / .89), B.SRO)
        items.append((k, out)); rep[k + '#synth'] = dict(K=round(tgt[0], 2), P=round(tgt[1], 2), dur=round(tgt[2], 3))
    man, buf = B.sprite('sfx3', items); return man, rep

if __name__ == '__main__':
    os.makedirs(CHK + 'wav', exist_ok=True)
    A = {}
    A['cave'] = amb('amb_cave', 'oga_dungeon-ambience/dungeon_ambient_1.ogg', 0, None, 3.0, 'Loopable Dungeon Ambience (loop)', 'JaggedStone, CC0, opengameart.org/content/loopable-dungeon-ambience; processed')
    A['forest'] = amb('amb_forest', 'oga_cc0-background-ambience/Forest_Ambience_0.mp3', 0, None, 3.0, 'Forest Ambience (loop)', 'FGResources, CC0, opengameart.org/content/cc0-background-ambience; processed')
    A['wind'] = amb('amb_wind', BW, 5.0, 22.5, 2.0, 'Birds and Wind (wind loop)', 'Spring Spring, CC0, opengameart.org/content/birds-and-wind-ambient-birds-wind-and-synth; processed')
    print(json.dumps(A, ensure_ascii=False, indent=1))
    man, rep = sfx()
    json.dump(dict(amb=A, keys={k: [2, v] for k, v in man.items()}, mark=B.MARK_T), open(CHK + 'manifest3.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(rep, open(CHK + 'build3_rep.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    for k in R3:
        s = rep[k + '#synth']; v = rep[k]
        print(f"{k:9s} synth K{s['K']:6.1f} P{s['P']:6.1f} {s['dur']:.2f}s | " + ' '.join(f"K{m['K']:.1f}/P{m['P']:.1f}/gm{m['gm']}/b{m['body']}/pk{m['pk']}/{m['dur']}s" for m in v))
    print('sfx3.mp3', os.path.getsize(OUT + 'sfx3.mp3'))
