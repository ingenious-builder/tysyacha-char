#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
JOBS=$R/imp_gen160.json OUT=$R/imp_rgen160.json timeout 600 node _check/fix/fx.js $R/imp_task.js index.html > $R/impgen160.log 2>&1
echo ВСЁ > $R/run6.flag
