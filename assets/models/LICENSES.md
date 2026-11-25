# Лицензии моделей героев

## KayKit — Character Pack: Adventurers 1.0
- Автор: Kay Lousberg (KayKit), https://www.kaylousberg.com
- Страница пакета: https://kaylousberg.itch.io/kaykit-adventurers
- Исходники: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 (официальный репозиторий автора)
- Лицензия: Creative Commons Zero v1.0 Universal (CC0), https://creativecommons.org/publicdomain/zero/1.0/
  («This content is free to use in personal, educational and commercial projects»). Указание автора не обязательно,
  автор просит о нём по желанию — подпись есть в игре: Настройки → «Благодарности».
- Проверено 25.11.2026: LICENSE.txt репозитория и страница itch.io («Creative Commons Zero v1.0 Universal»).

### Что взято и как изменено
- `kk_heroes.glb` — собран скриптом `qa_models/build_heroes.js` из Knight, Barbarian, Mage, Rogue, Rogue_Hooded (.glb):
  один общий скелет (кости IK и управления убраны), тело+руки+ноги каждого персонажа слиты в один меш, головы и предметы
  (шлемы, шляпы, плащи, оружие, щиты, книги) — отдельными мешами; 26 анимаций из 76 (постоянные каналы убраны),
  нормали int8, UV uint16, веса uint8, повороты анимаций int16 (KHR_mesh_quantization). Текстур в файле нет.
- `kk_knight.png`, `kk_barbarian.png`, `kk_mage.png`, `kk_rogue.png` — атласы персонажей, уменьшены с 1024 до 256 px;
  в игре перекрашиваются на холсте под цвета каждого героя (`hero-models.js`).
- Рога, клюв, шляпы с полями, ветви-рога, перья, очки, повязка, лук, молот, коса, фонарь — свои, простая геометрия в коде.

## three.js GLTFLoader (r128)
- `vendor/GLTFLoader.js` — из пакета three@0.128.0 (examples/js/loaders), MIT, © three.js authors, https://github.com/mrdoob/three.js

# Лицензии моделей декора локаций

Все три пакета — официальные репозитории автора на GitHub, лицензия Creative Commons Zero v1.0 Universal (CC0),
https://creativecommons.org/publicdomain/zero/1.0/ («This content is free to use in personal, educational and commercial
projects»). Указание автора не обязательно, автор просит о нём по желанию — подпись есть в игре: Настройки → «Благодарности».
Проверено 25.11.2026 по LICENSE.txt каждого репозитория.

## KayKit — Halloween Bits 1.0
- Автор: Kay Lousberg (KayKit), https://www.kaylousberg.com
- Исходники: https://github.com/KayKit-Game-Assets/KayKit-Halloween-Bits-1.0 (LICENSE.txt: CC0, создано 06.10.2023)
- Взято: tree_dead_large/medium/small, tree_pine_orange_large/_medium, tree_pine_yellow_medium, gravestone, grave_A, grave_B,
  gravemarker_A, pillar, shrine, arch, post_lantern, skull, bone_A, bone_C, ribcage.

## KayKit — Medieval Hexagon Pack 1.0
- Автор: Kay Lousberg (KayKit), https://www.kaylousberg.com
- Исходники: https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 (LICENSE.txt: CC0, создано 26.04.2024)
- Взято: tree_single_A, tree_single_B, tree_single_B_cut, trees_A_small, mountain_A/B/C, mountain_A_grass_trees, hills_A_trees,
  rock_single_C/D/E, building_home_A_red, building_home_B_red, building_tower_B_red, building_destroyed.

## KayKit — Dungeon Remastered 1.0
- Автор: Kay Lousberg (KayKit), https://www.kaylousberg.com
- Исходники: https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 (LICENSE.txt: CC0, создано 13.03.2023)
- Взято: pillar, pillar_decorated.

### Что сделано с моделями
- `env_a.glb` (центр мира и ущелья), `env_b.glb` (лёд, вулкан, небесные руины, Бездна), `env_c.glb` (Мёртвый город) — собраны
  скриптом `D:/games/tc-env-tools/build_env.js`: цвет текстур запечён в цвет вершин (в файлах нет текстур), перекраска под
  регион (зелёная и заснеженная хвоя вместо осенней, болотный мох, мрачные крыши), размеры приведены к прежнему процедурному
  декору, части слиты в один меш на вариант.
- Свои добавки в коде сборки (не из пакетов): сучья сухих деревьев, ледяные/обсидиановые осколки-шпили, каменный низ
  парящих островов, составные «кости с черепом» и «пирамида из камней».
