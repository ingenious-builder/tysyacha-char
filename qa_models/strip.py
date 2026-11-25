# Полосы кадров анимаций: qa_models/after_anim.png (строка — герой: бег×4, удар×4, чары, удар по нему, смерть)
import json, sys, glob, os
from PIL import Image, ImageDraw
D='D:/games/tc-wt-models/qa_models/after/'
ids=sys.argv[1].split(',')
cw,ch=176,236
S=Image.new('RGB',(cw*11,ch*len(ids)),(20,20,24)); d=ImageDraw.Draw(S)
for r,i in enumerate(ids):
    shots=json.load(open(D+'_a_'+i+'.json'))
    for c,f in enumerate(shots):
        im=Image.open(f).convert('RGB').crop((40,200,400,680)).resize((cw,ch)); S.paste(im,(c*cw,r*ch))
    d.text((4,r*ch+4),i,fill=(255,255,0))
S.quantize(colors=256,method=Image.Quantize.FASTOCTREE).save('D:/games/tc-wt-models/qa_models/'+(sys.argv[2] if len(sys.argv)>2 else 'after_anim')+'.png',optimize=True)
print('ok')
