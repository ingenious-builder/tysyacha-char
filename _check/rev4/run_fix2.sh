#!/bin/bash
# после правок 25.11 (подсказка, «Невозможная», Некромант, Берсерк): порядок в живой игре, «Невозможная», экран 360, живой бой,
# стенд Некроманта и Берсерка на 5 билдах, реальный бой затронутых классов — по очереди, один браузер
cd /d/games/tc-wt-balrar
R=_check/rev4;Q=_check/rev2;V=_check/rev3;F=$R/fin
OUT=$F/live_order.json timeout 600 node _check/fix/fx.js $R/live_order_task.js index.html > $F/live_order.log 2>&1
node $Q/imp_jobs.js . $F/imp_all160.json 160 all > /dev/null
JOBS=$F/imp_all160.json OUT=$F/imp_r160.json timeout 600 node _check/fix/fx.js $Q/imp_task.js index.html > $F/imp160.log 2>&1
for sz in "360 740" "440 956"; do set -- $sz; timeout 900 node $V/fx.js $V/v3_ui_task.js index.html $1 $2 > $F/v3ui_$1.log 2>&1; done
timeout 600 node $V/fx.js $V/v3_live_task.js index.html 440 956 > $F/v3live.log 2>&1
timeout 600 node $Q/b_ui.js . $F/ui.json > $F/ui.log 2>&1
CL=necro,bers,assassin,inq,alch TAG=c1 bash $R/stand_multi.sh
CL=necro,bers,druid,hunter,dk SEEDS='[21,22,23,24,25,26]' TAL=auto OUT=$R/real_c1.json timeout 900 node _check/fix/fx.js $Q/real_task.js index.html > $R/real_c1.log 2>&1
echo ВСЁ > $R/fix2.flag
