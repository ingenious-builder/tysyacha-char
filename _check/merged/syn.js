// синтаксис: new Function по каждому <script> без src
const fs=require('fs');const h=fs.readFileSync(process.argv[2]||'index.html','utf8');const re=/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(h))){if(m[1]&&/\ssrc=/.test(m[1]))continue;if(m[1]&&/type=["'](?!text\/javascript|module)/.test(m[1]))continue;n++;try{new Function(m[2]);}catch(e){bad++;console.log('ОШИБКА в скрипте',n,e.message);}}
console.log('скриптов',n,'ошибок',bad);
