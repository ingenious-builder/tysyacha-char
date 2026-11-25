# Склейка листов: qa_models/<tag>_select.png, <tag>_front.png, <tag>_34.png, <tag>_back.png (5x4, подписи)
import sys, json
from PIL import Image, ImageDraw
tag=sys.argv[1]; D='D:/games/tc-wt-models/qa_models/'+tag+'/'
ids=['pyro','cryo','storm','plague','necro','paladin','geo','windr','hemo','arcan','bers','dk','druid','hunter','assassin','shaman','monk','lock','inq','alch']
names=dict(pyro='Пиромант',cryo='Криомант',storm='Громовержец',plague='Чумной лекарь',necro='Некромант',paladin='Паладин',geo='Геомант',windr='Странник ветров',hemo='Гемомант',arcan='Арканист',bers='Берсерк',dk='Рыцарь смерти',druid='Друид',hunter='Ледяной охотник',assassin='Ассасин',shaman='Шаман бури',monk='Монах ветра',lock='Чернокнижник',inq='Инквизитор',alch='Алхимик')
meta=json.load(open(D+'meta.json'))
try:
    from PIL import ImageFont; F=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
except Exception: F=None
def sheet(kind,cropf,cw,ch):
    S=Image.new('RGB',(cw*5,ch*4+0),(20,20,24)); d=ImageDraw.Draw(S)
    for i,h in enumerate(ids):
        try: im=Image.open(D+kind+'_'+h+'.png').convert('RGB')
        except Exception: continue
        c=im.crop(cropf(h,im)).resize((cw,ch)); x,y=(i%5)*cw,(i//5)*ch; S.paste(c,(x,y))
        d.text((x+6,y+4),names[h],fill=(255,255,255),font=F)
    S.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.FLOYDSTEINBERG).save('D:/games/tc-wt-models/qa_models/'+tag+'_'+kind+'.png',optimize=True)
def selc(h,im):
    x,y=meta.get(h,{}).get('sel',[220,480]); return (x-130,y-185,x+130,y+135)
sheet('sel',selc,260,320)
for k in ['game_front','game_34','game_back']:
    sheet(k,lambda h,im:(40,210,400,750),288,432)
print('ok')
