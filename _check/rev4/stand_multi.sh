#!/bin/bash
# стенд «ветка 0 против полной» на нескольких билдах (BSEED) по очереди: один браузер за раз, через замок.
# env: CL (классы), BS (билды через пробел, по умолчанию «31 777 4242 99 2026»), TAG (подпись файлов), PAGE (index.html)
cd /d/games/tc-wt-balrar
R=_check/rev4
export T=16 SI='[101,102,103,104,105,106]' SK="[$(seq -s, 201 218)]"
for B in ${BS:-31 777 4242 99 2026}; do BSEED=$B OUT=$R/st_${TAG:-x}_$B.json timeout 600 node _check/rev4/fxr.js _check/rev2/stand_task.js ${PAGE:-index.html} > $R/st_${TAG:-x}_$B.log 2>&1; done
echo ВСЁ > $R/st_${TAG:-x}.flag
