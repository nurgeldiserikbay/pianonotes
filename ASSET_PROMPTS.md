# Ассеты для генерации в GPT — Piano Notes

Всё, что можно сделать кодом, уже сделано: тёмно-фиолетовая тема со свечением,
градиентные панели с бликом, ореолы у иконок, звёздное поле и парящие ноты,
цветные шапки клавиш, объёмные кнопки. Ниже — то, чего кодом не сделать:
рисованная графика.

**Как это работает:** каждый пункт уже подключён в приложении. Кладёте файл по
указанному пути — он подхватывается сам. Файла нет — работает запасной вариант,
ничего не ломается.

Общие требования ко всем PNG: **прозрачный фон**, без подписей и текста внутри
картинки, без рамок и теней «под объектом» (тени рисует приложение), сюжет по
центру с полем 6–8% по краям.

---

## 1. Маскот — 5 поз (самое важное)

**Куда:** `public/img/mascot/cat-idle.png`, `cat-happy.png`, `cat-cheer.png`,
`cat-thinking.png`, `cat-wink.png`
**Размер:** 1024×1024, PNG, прозрачный фон.

> Cute cartoon cat mascot for a children's piano learning game, 3D-rendered
> stylised look with soft plastic-toy shading, big friendly eyes, small purple
> fur with lighter belly, wearing a tiny amber bow tie. Character centred,
> full body, facing the viewer, transparent background, no text, no ground
> shadow, no frame. Colour palette: violet #a874ff, amber #ffc23a, deep indigo
> background tones. Consistent character design across the set.
> Pose: **[подставить из списка]**

Позы:
- `idle` — стоит, слегка склонив голову, одна лапа приподнята в приветствии
- `happy` — улыбается, обе лапы вверх, глаза-полумесяцы
- `cheer` — прыжок от радости, конфетти вокруг лап, рот открыт в «ура»
- `thinking` — лапа у подбородка, вопросительный взгляд, над головой нотка
- `wink` — подмигивает, большой палец вверх

⚠️ Ключевое: **сгенерировать все пять одним диалогом**, ссылаясь на первую
картинку («тот же персонаж, та же камера, другая поза»), иначе кот будет разным
на разных экранах.

---

## 2. Логотип-надпись

**Куда:** `public/img/logo-piano-notes.png`
**Размер:** 1600×500, PNG, прозрачный фон.

> Hand-lettered game logo wordmark "PIANO NOTES" for a children's music game.
> Chunky rounded 3D letters with a bevelled edge, warm amber-to-orange gradient
> fill (#ffd24a to #ff8a29), thick deep-violet outline (#3a1f6b), soft outer
> glow, two or three small sparkles and a tiny music note tucked into the
> lettering. Two lines: "PIANO" above "NOTES". Transparent background, no
> mockup, no background shapes, centred with even margins.

---

## 3. Обложки глав — 6 настроений

**Куда:** `public/img/moods/bright.png`, `playful.png`, `calm.png`,
`tender.png`, `wistful.png`, `solemn.png`
**Размер:** 1280×480 (соотношение 8:3), PNG или JPG, **без прозрачности**.

> Painterly stylised landscape banner for a music game chapter cover, night or
> dusk scene, soft airbrushed digital painting, layered silhouettes, gentle
> light source with a glow, a scatter of stars, no people, no text, no
> characters. Wide 8:3 banner composition with the horizon in the lower third.
> Mood: **[подставить]**

Настроения:
- `bright` — тёплый закат над лугом, солнце низко, золотистое небо
- `playful` — светлый день, зелёные холмы, птицы, лёгкие облака
- `calm` — спокойная вода под луной, отражение лунной дорожки, синие тона
- `tender` — цветущие деревья в розово-сиреневых тонах, лепестки в воздухе
- `wistful` — сумеречный хребет с силуэтами сосен, фиолетово-серые тона
- `solemn` — далёкий шпиль в тумане, приглушённые холодные тона, редкие звёзды

*(Сейчас работают векторные сцены — они рабочие, но плоские. Растровые сделают
карточку главы и «герой» в меню живописными.)*

---

## 4. Иконка приложения

**Куда:** `resources/icon.png` (потом `npx capacitor-assets generate`)
**Размер:** 1024×1024, PNG, **без прозрачности**, без скруглений (систему
скруглит сама).

> App icon for a children's piano learning game. Centred composition: a white
> piano key with a single amber music note on it, on a deep violet radial
> background (#2a1a6e to #0f0930), soft glow behind the note, two tiny
> sparkles. Bold, simple, readable at 48 pixels. No text, no border, flat
> square canvas, subtle 3D toy-like shading.

---

## 5. Праздничные спрайты (необязательно)

**Куда:** `public/img/fx/confetti.png`, `public/img/fx/sparkle-burst.png`
**Размер:** 512×512, PNG, прозрачный фон.

> Set of small celebration sprites on a transparent background: confetti pieces
> and star sparkles in amber #ffc23a, violet #a874ff, cyan #45d7ff and pink
> #ff6bd6. Flat vector-style shapes with soft glow, scattered across the canvas,
> no background, no text.

---

## Чего просить НЕ надо

Интерфейсных экранов, кнопок, панелей, HUD, иконок-действий, клавиатуры,
нотного стана, скриншотов приложения. Всё это рисует код — картинка вместо них
не масштабируется, не переводится и весит мегабайты. Из референса, который вы
присылали, кодом уже воспроизведено всё, кроме кота, надписи-логотипа и
живописных пейзажей.
