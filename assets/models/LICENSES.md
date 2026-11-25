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
