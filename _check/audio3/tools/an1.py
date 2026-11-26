import sys, glob, os, subprocess, numpy as np
FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
def load(p, sr=24000):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data'); return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(float) / 32768
R = 'D:/games/_snd_dl/oga_rpg-sound-pack/x/RPG Sound Pack/'
fs = [f.replace(chr(92), '/') for f in glob.glob(R + '**/*.wav', recursive=True)]
fs = [f for f in fs if not any(s in f for s in ('gutteral', 'giant', 'ogre', 'shade'))]
for f in sorted(fs):
    x = load(f)
    if len(x) < 10: continue
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)))); fr = np.fft.rfftfreq(len(x), 1 / 24000); cen = (X * fr).sum() / (X.sum() + 1e-9)
    print(f[len(R):], '%.2fs pk%.1f cen%d' % (len(x) / 24000, 20 * np.log10(abs(x).max() + 1e-9), cen))
