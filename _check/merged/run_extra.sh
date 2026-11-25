#!/bin/bash
# доп. зёрна реального боя «Авто» для спорных классов: слито против balcls (те же зёрна 7..18)
cd /d/games/tc-wt-balrar
M=_check/merged
export CL=windr,dk,druid,hunter,hemo,cryo SEEDS='[7,8,9,10,11,12,13,14,15,16,17,18]' TAL=auto
OUT=$M/real_x_merged.json node _check/fix/fx.js _check/bal/bal_real.js index.html > $M/real_x_merged.log 2>&1
OUT=D:/games/tc-wt-balrar/$M/real_x_balcls.json node D:/games/tc-wt-balcls/_check/fix/fx.js D:/games/tc-wt-balrar/_check/bal/bal_real.js index.html > $M/real_x_balcls.log 2>&1
echo ВСЁ > $M/extra.flag
