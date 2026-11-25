#!/bin/bash
# живой бой по краям: 5 классов, два края (затишье → волны 1–10 → край 2)
cd /d/games/tc-wt-int1331/_check/int
for c in pyro paladin necro windr timur; do timeout 660 node wave_run.js cls=$c zones=2 min=40 2>&1 | grep -E "итог|Error|стоп|ЗАСТРЯЛ|Нет|ошиб" | cut -c1-1500; done
echo ГОТОВО_A
