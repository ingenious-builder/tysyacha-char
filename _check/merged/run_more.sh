#!/bin/bash
# второй полный прогон стенда слитого кода (стенд шумный: среднее двух прогонов) + проверка текста уведомления
cd /d/games/tc-wt-balrar
M=_check/merged
T=16 SK="[$(seq -s, 3 26)]" SI='[1,2,3,4,5,6,7,8,9,10,11,12]' OUT=$M/stand2.json node _check/fix/fx.js _check/bal/bal_task.js index.html > $M/stand2.log 2>&1
NOTES="$NOTES" node _check/fix/fx.js $M/t_note.js index.html 390 844 > $M/note390.log 2>&1
NOTES="$NOTES" node _check/fix/fx.js $M/t_note.js index.html 360 780 > $M/note360.log 2>&1
echo ВСЁ > $M/more.flag
