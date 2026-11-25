#!/bin/bash
# независимые замеры проверяющего (rev2): по одному браузеру за раз, через замок
cd /d/games/tc-wt-balrar
R=_check/rev2
timeout 600 node $R/b_auto.js . $R/auto.json > $R/auto.log 2>&1
for p in all160 gen160 all50 gen50; do timeout 600 node $R/b_real.js . $R/p_$p.json $R/r_$p.json > $R/r_$p.log 2>&1; done
node $R/pairsA.js . $R/p_auto160.json 160 auto $R/auto.json > $R/p_auto.log 2>&1
node $R/pairsA.js . $R/p_auto50.json 50 auto $R/auto.json >> $R/p_auto.log 2>&1
for p in auto160 auto50; do timeout 600 node $R/b_real.js . $R/p_$p.json $R/r_$p.json > $R/r_$p.log 2>&1; done
export T=16 SI='[101,102,103,104,105,106]' SK="[$(seq -s, 201 218)]"
BSEED=777 OUT=$R/stand777.json timeout 600 node _check/fix/fx.js $R/stand_task.js index.html > $R/stand777.log 2>&1
BSEED=31 OUT=$R/stand31.json timeout 600 node _check/fix/fx.js $R/stand_task.js index.html > $R/stand31.log 2>&1
unset T SI SK
SEEDS='[21,22,23,24,25,26]' TAL=auto OUT=$R/real.json timeout 600 node _check/fix/fx.js $R/real_task.js index.html > $R/real.log 2>&1
echo ВСЁ > $R/run1.flag
