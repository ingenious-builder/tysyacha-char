// синтаксис: new Function по каждому <script> без src
const fs=require('fs');const f=process.argv[2]||'D:/games/tc-wt-waves/index.html';const s=fs.readFileSync(f,'utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(s))){n++;try{new Function(m[1]);}catch(e){bad++;console.log('скрипт',n,e.message);}}
console.log('скриптов',n,'ошибок',bad);process.exit(bad?1:0);
