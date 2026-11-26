import sys, numpy as np, subprocess
from scipy import signal as ss
FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
def load(p, sr=22050):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data'); return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(float) / 32768
S = 'D:/games/_snd_dl/'
for name, p in (('dungeon', S + 'oga_dungeon-ambience/dungeon_ambient_1.ogg'), ('forest', S + 'oga_cc0-background-ambience/Forest_Ambience_0.mp3'), ('birdwind', S + 'oga_birds-and-wind/Birds_and_Wind_-_Ambient_0.ogg')):
    x = load(p); sr = 22050
    hi = ss.sosfilt(ss.butter(4, 2500, 'high', fs=sr, output='sos'), x)
    lo = ss.sosfilt(ss.butter(4, 400, 'low', fs=sr, output='sos'), x)
    print(name, '%.1fs' % (len(x) / sr), 'rms %.1f dB pk %.1f' % (20 * np.log10(np.sqrt((x ** 2).mean())), 20 * np.log10(abs(x).max())))
    n = len(x) // sr
    row = []
    for i in range(0, n, 4):
        s = slice(i * sr, min(len(x), (i + 4) * sr)); row.append('%d:%.0f/%.0f/%.0f' % (i, 20 * np.log10(np.sqrt((x[s] ** 2).mean()) + 1e-9), 20 * np.log10(np.sqrt((hi[s] ** 2).mean()) + 1e-9), 20 * np.log10(np.sqrt((lo[s] ** 2).mean()) + 1e-9)))
    print(' '.join(row))
