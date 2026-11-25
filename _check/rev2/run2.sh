#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
JOBS=$R/imp_all160.json OUT=$R/imp_r160.json timeout 600 node _check/fix/fx.js $R/imp_task.js index.html > $R/imp160.log 2>&1
JOBS=$R/imp_auto50.json OUT=$R/imp_r50.json timeout 600 node _check/fix/fx.js $R/imp_task.js index.html > $R/imp50.log 2>&1
OUT=$R/perf.json timeout 600 node _check/fix/fx.js $R/perf_task.js index.html > $R/perf.log 2>&1
IDS='[["inq",1805],["arcan",1837],["hemo",1277],["windr",443],["shaman",1119],["arcan",1689],["inq",1251]]' OUT=$R/tal1.json timeout 600 node _check/fix/fx.js $R/tal1_task.js index.html > $R/tal1.log 2>&1
echo ВСЁ > $R/run2.flag
