#!/bin/bash
cd /d/games/tc-wt-balrar
R=_check/rev2
mkdir $R/run5.lock 2>/dev/null || exit 0
timeout 600 node $R/b_ui.js . $R/ui.json > $R/ui.log 2>&1
echo ВСЁ > $R/run5.flag
