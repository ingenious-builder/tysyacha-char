import sys, numpy as np, subprocess
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
def load(p, sr=24000):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data'); return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(float) / 32768
out = sys.argv[1]; fs = sys.argv[2:]
n = len(fs); c = 4; r = (n + c - 1) // c
fig, ax = plt.subplots(r, c, figsize=(4 * c, 2.4 * r)); ax = np.atleast_1d(ax).ravel()
for a, f in zip(ax, fs):
    x = load(f); a.specgram(x, NFFT=512, Fs=24000, noverlap=384, cmap='magma', vmin=-110, vmax=-20); a.set_title(f.replace(chr(92), '/').split('/')[-1] + ' %.2fs' % (len(x) / 24000), fontsize=8)
for a in ax[n:]: a.axis('off')
plt.tight_layout(); plt.savefig(out, dpi=60)
