#!/bin/bash
# все браузерные замеры слитого кода по очереди (один браузер за раз, через замок)
cd /d/games/tc-wt-balrar
M=_check/merged
SK="[$(seq -s, 3 26)]"
T=16 SK="$SK" SI='[1,2,3,4,5,6,7,8,9,10,11,12]' OUT=$M/stand.json node _check/fix/fx.js _check/bal/bal_task.js index.html > $M/stand.log 2>&1
TAL=auto OUT=$M/real.json node _check/fix/fx.js _check/bal/bal_real.js index.html > $M/real.log 2>&1
node _check/rar/b_auto.js . $M/auto.json > $M/auto.log 2>&1
node _check/rar/b_ui.js . $M/ui.json > $M/ui.log 2>&1
LV=60 SEC=15 OUT=$M/live60.json node _check/fix/fx.js _check/fix/t_live.js index.html > $M/live60.log 2>&1
echo ВСЁ > $M/done.flag
