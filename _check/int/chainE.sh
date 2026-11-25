#!/bin/bash
cd /d/games/tc-wt-int1331/_check/int
timeout 660 node wave_run.js cls=pyro zones=2 min=40 out=res/run_new_pyro_z2_b.json 2>&1 | grep -E "итог|Error|стоп|ЗАСТРЯЛ" | cut -c1-600
timeout 660 node wave_run.js cls=pyro zones=2 min=40 seed=777 out=res/run_new_pyro_z2_s777.json 2>&1 | grep -E "итог|Error|стоп|ЗАСТРЯЛ" | cut -c1-600
timeout 660 node wave_run.js cls=hunter zones=2 min=40 out=res/run_new_hunter_z2.json 2>&1 | grep -E "итог|Error|стоп|ЗАСТРЯЛ" | cut -c1-600
echo ГОТОВО_E
