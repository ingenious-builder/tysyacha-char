// синтаксис: каждый <script> без src — через new Function
const fs=require('fs');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(h))){n++;try{new Function(m[1]);}catch(e){bad++;console.log('скрипт',n,e.message);}}console.log('скриптов',n,'ошибок',bad);process.exitCode=bad?1:0;
