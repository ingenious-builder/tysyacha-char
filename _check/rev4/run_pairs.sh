#!/bin/bash
# реальный урон критических пар редкостей на нескольких зёрнах потока: «Авто» (общие, без особенности) 20/50/100/160, «Авто» + особенность 160, все общие 160.
# env: TAG, SEEDS (JSON), CAPS (потолки «что если»). Один браузер за раз, через замок.
cd /d/games/tc-wt-balrar
R=_check/rev4;Q=_check/rev2;T=${TAG:-p}
export SEEDS=${SEEDS:-'[11,12,13,14]'}
timeout 600 node $Q/b_auto.js ${ROOTG:-.} $R/${T}_auto.json > $R/${T}_auto.log 2>&1
for L in 20 50 100 160; do node $Q/pairsA.js ${ROOTG:-.} $R/${T}_pag$L.json $L autogen $R/${T}_auto.json > /dev/null; done
node $Q/pairsA.js ${ROOTG:-.} $R/${T}_pauto160.json 160 auto $R/${T}_auto.json > /dev/null
node $Q/pairsA.js ${ROOTG:-.} $R/${T}_pgen160.json 160 gen > /dev/null
for p in ag20 ag50 ag100 ag160 auto160 gen160; do timeout 600 node $R/b_real_ms.js ${ROOTG:-.} $R/${T}_p$p.json $R/${T}_r$p.json > $R/${T}_r$p.log 2>&1; done
for p in ag20 ag50 ag100 ag160 auto160 gen160; do node $R/real_an_ms.js $R/${T}_p$p.json $R/${T}_r$p.json $p ${CAPS:-}; done > $R/${T}_an.txt 2>&1
echo ВСЁ > $R/${T}.flag
