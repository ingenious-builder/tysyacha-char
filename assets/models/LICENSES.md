# Лицензии моделей (герои, враги, призывы)

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

## KayKit — Character Pack: Skeletons 1.0 (враги и призывы-скелеты)
- Автор: Kay Lousberg (KayKit), https://www.kaylousberg.com
- Страница пакета: https://kaylousberg.itch.io/kaykit-skeletons
- Исходники: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0 (официальный репозиторий автора)
- Лицензия: Creative Commons Zero v1.0 Universal (CC0), https://creativecommons.org/publicdomain/zero/1.0/
  («This content is free to use in personal, educational and commercial projects»; подпись автора по желанию — есть в «Благодарностях»).
- Проверено 25.11.2026: LICENSE.txt репозитория (Creation date 02/02/2024, License: Creative Commons Zero, CC0).
- Взято: Skeleton_Minion, Skeleton_Warrior, Skeleton_Rogue, Skeleton_Mage (.glb, бесплатная часть набора), оружие Skeleton_Blade,
  Skeleton_Axe, Skeleton_Shield_Large_A, Skeleton_Crossbow, Skeleton_Staff (.gltf).

## Quaternius — Ultimate Monsters, Animated Animals, Animated Enemies, Bat, Dragon (враги, боссы, призывы)
- Автор: Quaternius, https://quaternius.com
- Страницы наборов: https://quaternius.com/packs/ultimatemonsters.html , https://quaternius.com/packs/ultimateanimatedanimals.html ;
  файлы .glb взяты с Poly Pizza (страница автора https://poly.pizza/u/Quaternius), у каждой модели там указано «Public Domain (CC0)»
  со ссылкой на https://creativecommons.org/publicdomain/zero/1.0/ (в данных страницы: "Licence":"CC0 1.0").
- Лицензия: CC0 1.0 (общественное достояние), коммерческое использование без ограничений, указание автора не обязательно — подпись есть в «Благодарностях».
- Проверено 25.11.2026 по страницам моделей Poly Pizza и страницам наборов на quaternius.com (CC0).
- Взято (страница модели на Poly Pizza):
  - Ultimate Monsters: Green Blob https://poly.pizza/m/y4kJh8EeYS , Orc https://poly.pizza/m/5vO2YJsPEf , Monkroose https://poly.pizza/m/j4rVPvxyLg ,
    Tribal https://poly.pizza/m/t91lDHaqRW , Demon https://poly.pizza/m/LnfIziKv4o , Demon (летающий) https://poly.pizza/m/Mo2ky6vkf8 ,
    Yeti https://poly.pizza/m/ceRHrn8HHE , Ghost https://poly.pizza/m/Iip30bDHmu , Ghost Skull https://poly.pizza/m/TX8r9WBXpe ,
    Wizard https://poly.pizza/m/o87Upt5uHX , Mushnub https://poly.pizza/m/LWKmS30Xxl , Mushnub Evolved https://poly.pizza/m/0SZyA6MV51 ,
    Hywirl https://poly.pizza/m/zjr7CmWGER , Dino https://poly.pizza/m/wuerCFCWNR
  - Animated Animals: Wolf https://poly.pizza/m/P1gU3Qkr9r
  - Animated Enemies: Spider https://poly.pizza/m/yRYJiAJyiM , Snake https://poly.pizza/m/x9x0viZs8V
  - Отдельные модели: Bat https://poly.pizza/m/hNO9XvjlKa , Dragon https://poly.pizza/m/VBvzjFIYws

### Что сделано с моделями врагов (kk_foes.glb, kk_foes.glb.gz)
- Собраны скриптом build_foes.js (инструменты сборки лежат вне репозитория) в один файл: у каждой модели все части слиты в один
  скиннированный меш, цвета материалов и текстуры KayKit перенесены в цвет вершин (с номером «роли» — по нему игра перекрашивает
  врагов под регион), пальцы рук слиты с кистью, кости без веса убраны, взяты только нужные клипы (стойка, бег, удары, урон, смерть,
  чары, выстрел, прыжок, подъём из земли), постоянные каналы убраны; позиции int16, нормали int8, кости и веса uint8, повороты int16
  (KHR_mesh_quantization). kk_foes.glb.gz — та же сборка, сжатая gzip.
- Свои детали из простой геометрии (корона королевы слизней, Ткачихи и Костяного владыки, бомба подрывника, рога громилы,
  каменные наросты и светящееся ядро голема, коса жнеца, грива вожака и льва, лук лучника) вшиты в модели при сборке.
- Медведь и лев-призыв — модель волка с изменёнными пропорциями костей и своей раскраской (в игре).

## three.js GLTFLoader (r128)
- `vendor/GLTFLoader.js` — из пакета three@0.128.0 (examples/js/loaders), MIT, © three.js authors, https://github.com/mrdoob/three.js
