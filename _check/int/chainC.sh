#!/bin/bash
cd /d/games/tc-wt-int1331/_check/int
timeout 600 node diag_die.js cls=pyro zones=1 min=25 out=res/diag_pyro.json 2>&1 | grep -E "итог|Error|стоп|ЗАСТРЯЛ" | cut -c1-600
for s in 23 31; do SEED=$s HPK=30 timeout 900 node rev_timur.js A 20,60 2>&1 | grep -E "ИТОГ|ошибки" | sed "s/^/seed$s /" | cut -c1-300; done
echo ГОТОВО_C
