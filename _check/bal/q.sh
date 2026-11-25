#!/bin/bash
# быстрый стенд по нескольким классам: bash _check/bal/q.sh pyro,cryo [страница] [PER]
cd /d/games/tc-wt-balcls
CL=$1 PER=$3 T=16 SK="[$(seq -s, 3 26)]" SI='[1,2,3,4,5,6]' OUT=_check/bal/q_last.json node _check/fix/fx.js _check/bal/bal_task.js ${2:-index.html} 2>&1 | grep -v "^ошибок страницы 0\|^[0-9]*$" | sed 's/^[0-9]*с //'
node -e "const j=require('./_check/bal/q_last.json');for(const c in j)console.log(c,'none: imm',j[c].none.imm,'kill',j[c].none.kill,'kpm',j[c].none.kpm)"
