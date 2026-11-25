# Петля «Heartfelt Battle»: шов конец→начало, темп (автокорреляция огибающей), сходство половин
import sys, subprocess, numpy as np
FF='D:/games/tysyacha-char/promo/remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
def load(p,sr=44100,ch=1):
    r=subprocess.run([FF,'-v','error','-i',p,'-ac',str(ch),'-ar',str(sr),'-c:a','pcm_s16le','-f','wav','-'],capture_output=True); b=r.stdout; i=b.find(b'data')
    x=np.frombuffer(b[i+8:len(b)-((len(b)-i-8)%(2*ch))],dtype='<i2').astype(np.float32)/32768; return x.reshape(-1,ch)
D='D:/games/_snd_dl/oga_heartfelt-battle/'
L=load(D+'heartfelt-battle_loop.ogg',ch=2); I=load(D+'heartfelt-battle_intro.ogg',ch=2)
print('loop samples',len(L), 'intro',len(I))
m=L.mean(1); sr=44100
d=np.abs(np.diff(m)); print('typ step',np.percentile(d,50),'p99',np.percentile(d,99),'max',d.max())
print('seam step end->start L,R', L[0]-L[-1], ' typ near seam', np.abs(np.diff(m[-200:])).mean(), np.abs(np.diff(m[:200])).mean())
print('intro end -> loop start', L[0]-I[-1])
# огибающая 10 мс, автокорреляция → темп
w=441; e=np.sqrt((m[:len(m)//w*w].reshape(-1,w)**2).mean(1)); de=np.maximum(0,np.diff(e)); de-=de.mean()
ac=np.correlate(de,de,'full')[len(de)-1:]; lags=np.arange(len(ac))*0.01
for lo,hi in [(0.3,1.2),(1.2,5)]:
    sel=(lags>=lo)&(lags<=hi); k=np.argmax(ac[sel]); print('ac peak',lo,hi,'lag',round(lags[sel][k],3),'bpm',round(60/lags[sel][k],2))
# RMS по 2,4 с (такт при 100 уд/мин)
bar=2.4; nb=int(len(m)/sr/bar); r=[20*np.log10(np.sqrt((m[int(i*bar*sr):int((i+1)*bar*sr)]**2).mean())+1e-9) for i in range(nb)]
print('bars',nb,'rms per bar',' '.join(f'{v:.0f}' for v in r))
print('total rms dB',20*np.log10(np.sqrt((m**2).mean())), 'peak',20*np.log10(np.abs(m).max()))
B=load('D:/games/tc-wt-audio2/assets/audio/boss.mp3')[:,0]; print('boss rms dB',20*np.log10(np.sqrt((B**2).mean())),'peak',20*np.log10(np.abs(B).max()))
