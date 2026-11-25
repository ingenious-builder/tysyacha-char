#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
SEEDS='[21,22,23,24,25,26]' TAL=none OUT=$R/real_none.json timeout 600 node _check/fix/fx.js $R/real_task.js index.html > $R/real_none.log 2>&1
echo ВСЁ > $R/run4.flag
