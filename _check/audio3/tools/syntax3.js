// синтаксис: new Function по каждому inline-скрипту index.html и каждому .js корня
const fs = require('fs'), path = require('path'), R = 'D:/games/tc-wt-audio3/'; let bad = 0, n = 0;
const html = fs.readFileSync(R + 'index.html', 'utf8');
for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) { if (/type="(?!text\/javascript|module)/.test(m[0].slice(0, 80))) continue; n++; try { new Function(m[1]); } catch (e) { bad++; console.log('index.html inline', e.message); } }
for (const f of fs.readdirSync(R).filter(f => f.endsWith('.js'))) { n++; try { new Function(fs.readFileSync(R + f, 'utf8')); } catch (e) { bad++; console.log(f, e.message); } }
console.log('проверено', n, 'ошибок', bad);
