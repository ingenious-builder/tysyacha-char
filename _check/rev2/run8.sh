#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
export T=16 SI='[101,102,103,104,105,106]' SK="[$(seq -s, 201 218)]" CL=necro,assassin,dk,arcan
for B in 99 2026 777; do BSEED=$B OUT=$R/sbase$B.json timeout 600 node $R/fx2.js $R/stand_task.js index_base.html > $R/sbase$B.log 2>&1; done
echo ВСЁ > $R/run8.flag
