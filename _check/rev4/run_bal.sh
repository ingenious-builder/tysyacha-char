#!/bin/bash
# после пар: стенд веток 20 классов на 5 билдах, потом реальный бой «Авто» (6 зёрен) — по очереди, один браузер
cd /d/games/tc-wt-balrar
R=_check/rev4;T=${TAG:-b1}
until [ -f $R/$T.flag ]; do sleep 5; done
TAG=$T bash $R/stand_multi.sh
SEEDS='[21,22,23,24,25,26]' TAL=auto OUT=$R/real_$T.json timeout 900 node _check/fix/fx.js _check/rev2/real_task.js index.html > $R/real_$T.log 2>&1
echo ВСЁ > $R/bal_$T.flag
