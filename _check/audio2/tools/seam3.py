# Шов петли «Heartfelt Battle» в готовом battle.mp3 (как играет loop: конец → начало): всплеск 2-й разности (метрика seam2.py рецензента)
# против 400 обычных мест трека; длина петли против сетки тактов (96 × 1,6 с). Запуск: python -I -X utf8 seam3.py
import json, subprocess, numpy as np
FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
W = 'D:/games/tc-wt-audio2/'
def dec(p, sr):
    b = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True).stdout
    i = b.find(b'data'); d = b[i + 8:]; d = d[:len(d) - len(d) % 2]; return np.frombuffer(d, dtype='<i2').astype(np.float64) / 32768
M = json.load(open(W + '_check/audio2/manifest.json', encoding='utf-8'))['music']; sr = M['sr']
x = dec(W + 'assets/audio/battle.mp3', sr); n = int(.2 * sr); i = int(np.argmax(np.abs(x[:n]))); dt = i / sr - .05
a = int(round((M['t0'] + dt) * sr)); P = int(round(M['P'] * sr)); y = x[a:a + P]
def ratio(z, c):
    dd = np.abs(np.diff(z, 2)); return dd[c - 40:c + 40].max() / np.sqrt(np.mean(np.concatenate([dd[c - 600:c - 40], dd[c + 40:c + 600]]) ** 2))
seam = ratio(np.concatenate([y[-sr:], y[:sr]]), sr)
rng = np.random.default_rng(1); pos = rng.integers(sr, P - sr, 400); norm = np.array([ratio(y, int(c)) for c in pos])
print(f'петля {M["P"]} с = {M["P"] / 1.6:.3f} тактов по 1,6 с; сдвиг метки {dt * 1000:+.2f} мс')
print(f'шов: всплеск x{seam:.1f}; обычные места: медиана x{np.median(norm):.1f}, p90 x{np.percentile(norm, 90):.1f}, p99 x{np.percentile(norm, 99):.1f}; шов громче {100 * (norm < seam).mean():.0f} % обычных мест')
# начало такта — сильная доля (атака инструментов): сравнить шов с началами других тактов петли
bars = np.array([ratio(y, int(round(k * 1.6 * sr))) for k in range(1, 96)])
print(f'начала тактов внутри петли: медиана x{np.median(bars):.1f}, p75 x{np.percentile(bars, 75):.1f}, макс x{bars.max():.1f}; шов громче {100 * (bars < seam).mean():.0f} % начал тактов')
# исходник: шов «петля → петля» и «вступление → петля» той же метрикой
D = 'D:/games/_snd_dl/oga_heartfelt-battle/'; L = dec(D + 'heartfelt-battle_loop.ogg', sr); I = dec(D + 'heartfelt-battle_intro.ogg', sr)
print(f'исходник: петля→петля x{ratio(np.concatenate([L[-sr:], L[:sr]]), sr):.1f}, вступление→петля x{ratio(np.concatenate([I[-sr:], L[:sr]]), sr):.1f}')
