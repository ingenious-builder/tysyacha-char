p='D:/games/tc-wt-audio3/audio.js'
s=open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:50],s.count(a))
    s=s.replace(a,b)
rep("    ambTick(amb);","    ambTick(AMB.forced||amb);")
rep("dbg:{L,play:","dbg:{ambSet:k=>{AMB.forced=k||'';},ambRec:()=>({kind:AMB.kind,tag:AMB.tag,rec:Object.keys(AMB.rec),st:Object.assign({},AMB.recSt),loop:AMB.lay&&AMB.lay.s[0].loop,ls:AMB.lay&&AMB.lay.s[0].loopStart,le:AMB.lay&&AMB.lay.s[0].loopEnd,ns:AMB.lay&&AMB.lay.s.length}),L,play:")
open(p,'w',encoding='utf-8').write(s)
