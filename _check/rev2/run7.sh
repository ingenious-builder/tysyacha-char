#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
for p in auto20 auto100 ag20 ag50 ag100 ag160; do timeout 600 node $R/b_real.js . $R/p_$p.json $R/r_$p.json > $R/r_$p.log 2>&1; done
echo ВСЁ > $R/run7.flag
