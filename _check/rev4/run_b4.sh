#!/bin/bash
# финал (b4): стенд 20 классов на 5 билдах, реальный бой «Авто» всех 20, экраны и живые проверки проверяющих, реальный урон пар (power_check --pairs)
cd /d/games/tc-wt-balrar
R=_check/rev4;Q=_check/rev2;V=_check/rev3;F=$R/fin
TAG=b4 NOPAIRS=1 bash $R/run_all.sh
for sz in "360 740" "440 956"; do set -- $sz; timeout 900 node $V/fx.js $V/v3_ui_task.js index.html $1 $2 > $F/v3ui_$1.log 2>&1; done
timeout 600 node $V/fx.js $V/v3_sheet_task.js index.html 360 740 > $F/v3sheet_360.log 2>&1
timeout 600 node $V/fx.js $V/v3_live_task.js index.html 440 956 > $F/v3live.log 2>&1
timeout 600 node $V/fx.js $V/v3_zero_task.js index.html 440 956 > $F/v3zero.log 2>&1
timeout 600 node $V/fx.js $V/v3_pwdbg_task.js index.html 440 956 > $F/v3pwdbg.log 2>&1
OUT=$F/live_order.json timeout 600 node _check/fix/fx.js $R/live_order_task.js index.html > $F/live_order.log 2>&1
timeout 600 node $Q/b_ui.js . $F/ui.json > $F/ui.log 2>&1
node $Q/imp_jobs.js . $F/imp_all160.json 160 all > /dev/null
JOBS=$F/imp_all160.json OUT=$F/imp_r160.json timeout 600 node _check/fix/fx.js $Q/imp_task.js index.html > $F/imp160.log 2>&1
OUT=$F/perf.json timeout 600 node _check/fix/fx.js $Q/perf_task.js index.html > $F/perf.log 2>&1
timeout 1500 node _check/power_check.js --pairs > $F/pc_pairs.log 2>&1
echo ВСЁ > $R/b4fin.flag
