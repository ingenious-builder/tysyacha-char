#!/bin/bash
cd /d/games/tc-wt-int1331
timeout 900 node _check/power_check.js --real --k > _check/int/res/pc_realk.txt 2>&1; grep -E "ИТОГ|Не сошлись|Чар проверено" _check/int/res/pc_realk.txt | cut -c1-600
cd _check/int
for s in 7 11; do SEED=$s HPK=30 timeout 900 node rev_timur.js A 20,60 2>&1 | grep -E "ИТОГ|ошибки" | sed "s/^/seed$s /" | cut -c1-300; done
echo ГОТОВО_B
