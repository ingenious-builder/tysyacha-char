#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
export T=16 SI='[101,102,103,104,105,106]' SK="[$(seq -s, 201 218)]"
for B in 4242 99 2026; do BSEED=$B OUT=$R/stand$B.json timeout 600 node _check/fix/fx.js $R/stand_task.js index.html > $R/stand$B.log 2>&1; done
echo ВСЁ > $R/run3.flag
