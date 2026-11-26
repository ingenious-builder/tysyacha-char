import numpy as np, subprocess
FF = 'D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
def load(p, sr=24000):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True)
    b = r.stdout; i = b.find(b'data'); return np.frombuffer(b[i + 8:len(b) - ((len(b) - i - 8) % 2)], dtype='<i2').astype(float) / 32768
R = 'D:/games/_snd_dl/oga_rpg-sound-pack/x/RPG Sound Pack/'; S = 'D:/games/_snd_dl/'
for n, p in (('earth4', S + 'oga_earth-element-magic-spell/Earth_Element_Magic_Spell_4.ogg'), ('random1', R + 'misc/random1.wav'), ('random2', R + 'misc/random2.wav'), ('random3', R + 'misc/random3.wav'), ('random4', R + 'misc/random4.wav'),
             ('magic1', R + 'battle/magic1.wav'), ('spell', R + 'battle/spell.wav'), ('bubble', R + 'inventory/bubble.wav'), ('bubble3', R + 'inventory/bubble3.wav'), ('slime1', R + 'NPC/slime/slime1.wav')):
    x = load(p); w = 480
    e = [20 * np.log10(np.sqrt((x[i:i + w] ** 2).mean()) + 1e-9) for i in range(0, len(x) - w, w)]
    print(n, '%.2fs' % (len(x) / 24000), ' '.join('%.0f' % v for v in e[:60]))
