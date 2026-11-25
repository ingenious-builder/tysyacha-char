#!/bin/bash
# стенд: повтор слитого (разброс прогон-к-прогону) и balcls с теми же зёрнами — что даёт именно слияние
cd /d/games/tc-wt-balrar
M=_check/merged
export T=16 SK="[$(seq -s, 3 26)]" SI='[1,2,3,4,5,6,7,8,9,10,11,12]' CL=dk,hunter,alch,windr,cryo,pyro,bers
OUT=$M/stand_rep.json node _check/fix/fx.js _check/bal/bal_task.js index.html > $M/stand_rep.log 2>&1
OUT=D:/games/tc-wt-balrar/$M/stand_balcls.json node D:/games/tc-wt-balcls/_check/fix/fx.js D:/games/tc-wt-balrar/_check/bal/bal_task.js index.html > $M/stand_balcls.log 2>&1
echo ВСЁ > $M/det.flag
