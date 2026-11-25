#!/bin/bash
# все браузерные замеры замороженной копии страницы _check/rev4/$TAG/index.html — по очереди, один браузер (через замок):
# пары редкостей (реальный урон), стенд веток 20 классов на 5 билдах, реальный бой «Авто» (6 зёрен)
cd /d/games/tc-wt-balrar
R=_check/rev4;T=${TAG:?}
export PAGE_FILE=$R/$T/index.html
[ -z "$NOPAIRS" ] && ROOTG=$R/$T TAG=$T CAPS=${CAPS:-} bash $R/run_pairs.sh
[ -z "$NOSTAND" ] && TAG=$T bash $R/stand_multi.sh
[ -z "$NOREAL" ] && SEEDS='[21,22,23,24,25,26]' TAL=auto OUT=$R/real_$T.json timeout 900 node $R/fxr.js _check/rev2/real_task.js index.html > $R/real_$T.log 2>&1
echo ВСЁ > $R/all_$T.flag
