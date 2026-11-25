#!/bin/bash
cd /d/games/tc-wt-int1331/_check/int
timeout 900 node coop_fight.js timur bers 9 0 0 3 2>&1 | grep -vE "^\[замок\]" | cut -c1-500
timeout 900 node coop_fight.js pyro paladin 18 0 8 2 2>&1 | grep -vE "^\[замок\]" | cut -c1-500
timeout 900 node coop_fight.js windr necro 26 1 2 2 2>&1 | grep -vE "^\[замок\]" | cut -c1-500
echo ГОТОВО_D
