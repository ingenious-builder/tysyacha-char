#!/bin/bash
cd /d/games/tc-wt-int1331/_check/int
for s in 11 23 7; do SEED=$s HPK=30 timeout 900 node rev_timur.js A 20,60 2>&1 | grep -E "ИТОГ|ошибки|^A (timur|pyro|cryo|storm|geo|arcan) ур" | sed "s/^/F seed$s /" | cut -c1-200; done
echo ГОТОВО_F
