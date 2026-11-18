# Writing scenes

`PROJECT/src/scenes.tsx` holds one React component per scene and the `SCENES` object that maps scene ids to them. Everything is imported from `./lib/kit`.

## Contents

- [A scene](#a-scene)
- [The drawing space](#the-drawing-space)
- [Landscape](#landscape)
- [Timing](#timing)
- [People](#people)
- [Backgrounds](#backgrounds)
- [Props](#props)
- [Cards and graphics](#cards-and-graphics)
- [Text](#text)
- [Resizing a piece](#resizing-a-piece)
- [The user's own pictures](#the-users-own-pictures)
- [Drawing something new](#drawing-something-new)
- [Rules for scene code](#rules-for-scene-code)
- [Pacing](#pacing)

## A scene

```tsx
import React from 'react';
import { Bubble, Look, Person, Scene, SceneMap, Stage, Street, blinkAt, breathe, mouthOpen, useT } from './lib/kit';

const RAVI: Look = { skin: '#9A6238', shirt: '#6E96BB', pants: '#2A3550', hair: '#15110E' };
const UNCLE: Look = { skin: '#8E5B34', shirt: '#EFE3C8', pants: '#444444', hair: '#8D8D8D', glasses: true, mustache: '#8D8D8D' };

const Asked: Scene = ({ t0, dur }) => {
  const { f, t, lf } = useT(t0);
  return (
    <Stage dur={dur}>
      <Street />
      <Person x={120} y={500 + breathe(f)} s={0.8} pose="stand" {...UNCLE} blink={blinkAt(f)} mouth={mouthOpen('uncle', t)} />
      <Person x={415} y={500 + breathe(f + 15)} s={0.8} pose="stand" flip {...RAVI} blink={blinkAt(f + 30)} mood={t > 17.2 ? 'sad' : 'neutral'} />
      <Bubble x={205} y={240} text="?" since={lf(16.8)} />
    </Stage>
  );
};

export const SCENES: SceneMap = { asked: Asked };
```

- A scene is `({ t0, dur }) => ...`. `t0` is the scene's start in seconds on the video; `dur` is its length in frames (30 per second).
- `<Stage dur={dur}>` wraps it and its children must be SVG elements. Forgetting `Stage`, or putting HTML inside it, gives a blank scene. `Stage` takes `bg` for a flat background colour and `push` (default 0.05) for the slow zoom.
- Later elements are drawn on top of earlier ones. Draw the background first.
- Define each character's `Look` once at the top of the file and reuse it in every scene, so that the character looks the same throughout.
- Every scene id used in `story.json` must be a key of `SCENES`.

`PROJECT/src/lib/examples.tsx` has fourteen complete scenes to copy from. `SKILL/assets/kit.jpg` shows them. The kit picture has no tag or caption on it; the zones are in the next section.

## The drawing space

Portrait scenes are drawn in a 540 wide by 960 tall space (rendered at twice that). Backgrounds fill all of it. Keep everything that matters inside the content zone:

| Zone | y | What is there |
|---|---|---|
| top | 0 to 155 | platform buttons, the page name pill, the scene tag |
| content | 155 to 680 | your scene |
| captions | 680 to 790 | the caption card |
| bottom | 790 to 960 | platform buttons and text |

- Keep important content between x = 50 and x = 490. The slow zoom pushes the edges out of frame.
- A scene with no tag may use the space from y = 110.
- The floor line of rooms and streets is `FLOOR_Y` (606).

To see these lines on the preview frames, run `node SKILL/scripts/stills.ts PROJECT --grid`. It draws the content box and a ruler every 100 units, which also makes it easy to read off where to move something.

## Landscape

A landscape project is drawn in a 960 wide by 540 tall space. The same kit works; these values change:

| | Portrait | Landscape |
|---|---|---|
| drawing space | 540 x 960 | 960 x 540 |
| content zone | x 50 to 490, y 155 to 680 | x 60 to 900, y 80 to 410 |
| tag | centred, y 100 to 150 | centred, y 20 to 62 |
| caption card | ends at y 790 | ends at y 514, up to 720 wide |
| floor line `FLOOR_Y` | 606 | 385 |
| person | `s={0.8}`, stands at `y={500}`, sits at `y={560}` | `s={0.6}`, stands at `y={280}`, sits at `y={300}` |

Write scenes with the constants instead of the numbers and they are right for the project's format: `W`, `H`, `CX` (the centre x), `FLOOR_Y`, and `POSE` (`POSE.s`, `POSE.standY`, `POSE.sitY`, `POSE.deskY`).

```tsx
<Person x={330} y={POSE.standY + breathe(f)} s={POSE.s} pose="stand" {...ASHA} />
<rect width={W} height={H} fill={C.bgAlt} />
```

A wide frame has room for two things side by side: two people talking with space between them, a headline on the left and a chart on the right, two step cards in a row (`<StepCard x={250} ... />` and `<StepCard x={710} ... />`). Do not leave half the frame empty.

`PROJECT/src/lib/examples-wide.tsx` has six landscape scenes; `SKILL/assets/kit-wide.jpg` shows them.

## Timing

`const { f, t, lf, at } = useT(t0);`

- `f`: frames since this scene began. Use it for idle motion.
- `t`: seconds on the video timeline. Compare it with caption times: `mood={t > 17.2 ? 'sad' : 'neutral'}`.
- `lf(sec)`: frames since that second of the video; negative before it. Use it to start an animation on a spoken word: `sp(lf(19.0))`.
- `at(sec)`: frames since `sec` seconds into this scene.

Helpers:

- `sp(frame)`: a spring that is 0 while `frame` is negative, then rises to about 1 with a little overshoot. Pass a config for a harder hit: `sp(lf(19), { damping: 9, stiffness: 220, mass: 0.7 })`.
- `pop(frame)`: the same, capped at 1. Use for opacity and scale.
- `ramp(value, from, to, a, b)`: a straight clamped move, for counters and slides. `ramp(lf(24.7), 0, 54, 0, 12)` goes from 0 to 12 over 54 frames.
- `breathe(f)`: a slow 1.5 px bob. `blinkAt(f)`: true for a few frames every 3.5 s. Offset `f` per character so that they do not move together.
- `walk(f)`: the leg phase for a walking person.
- `mouthOpen('name', t)`: true while that name is inside one of its `speak` windows and the voice is audible.

Pieces that pop in (`Bubble`, `Thought`, `Eye`) take `since`: the number of frames that have passed since the moment they should appear. Pass `lf(second)` to appear on a second of the video, `at(second)` to appear that long into the scene, or `f - 6` for six frames in. While `since` is negative the piece is invisible, so no `t > ...` guard is needed. Leave `since` out and the piece is there from the first frame.

## People

`<Person x y s flip pose mood mouth blink arm ... {...LOOK} />`. `(x, y)` is the hip. The person faces right; `flip` faces left.

Size at scale `s`:

- head top is at `y - 345 * s`, feet at `y + 220 * s` when standing
- a standing person is about 130 * s wide; with a raised or pointing arm, about 200 * s toward the side they face
- a sitting person reaches `180 * s` forward (the knees and feet) and the feet are at `y + 200 * s`

At `s={0.8}` three standing people fit side by side in portrait only if they are about 150 apart; use `s={0.7}` for three or more. In landscape five fit at `s={0.6}`.

| Prop | Values |
|---|---|
| `pose` | `sit` (default), `stand`, `walk` (also pass `step={walk(f)}`) |
| `mood` | `neutral`, `smile`, `sad`, `shock`, `angry` |
| `mouth` | boolean, open while speaking |
| `blink` | boolean |
| `arm` | `rest`, `raise`, `point`, `wave` (also pass `wave={f / 3}`) |
| `hand`, `elbow` | `[x, y]` relative to the hip, before scaling, to place the arm yourself. Sitting at a desk: `hand={[150, -62]} elbow={[70, -90]}`. The shoulder is at `[0, -160]`. |
| `hold` | any SVG, drawn at the hand: `hold={<Phone />}` |

A `Look` is the character's appearance:

| Field | Meaning |
|---|---|
| `skin`, `shirt`, `pants`, `hair` | colours (required) |
| `hairStyle` | `short` (default), `long`, `bun`, `bald` |
| `cap`, `scarf` | a colour; a cap or a head covering replaces the hair |
| `long` | a long top (tunic, kurta, coat) when standing |
| `skirt`, `wrap` | a colour; a skirt, or a wrap-around lower garment (lungi, sarong) |
| `glasses` | boolean |
| `mustache`, `beard` | a colour |

`CAST` has ten ready looks: `student`, `friend`, `woman`, `girl`, `father`, `mother`, `elder`, `grandma`, `worker`, `scarfed`. `SKIN` has five skin tones: `fair`, `tan`, `brown`, `deep`, `dark`. Start from one and change it: `const ASHA: Look = { ...CAST.woman, shirt: '#2C7A6B' }`. Choose looks that fit the people in the story.

Children are the same figure at a smaller `s` (about 0.5).

| Piece | Props | Anchor and size |
|---|---|---|
| `Mini` | `x y s color skin hair flip bob` | A small faceless figure for crowds. `(x, y)` is the hip; head top at `y - 113 * s`, feet at `y + 38 * s`, 34 * s wide. `bob` shifts it vertically: `bob={Math.abs(Math.sin(f / 5 + i)) * -9}` reads as laughing or clapping. |
| `Bubble` | `x y text since w tail dark` | A speech bubble. `(x, y)` is the centre of the pill, which is 42 tall and as wide as the text needs (or `w`). The tail hangs 16 below, on the left (`tail="l"`, default) or right. One or two words. |
| `Thought` | `x y w h since trail` + children | A thought cloud. `(x, y)` is its centre; default 170 x 74. Two dots trail down from its lower-left corner (`trail="l"`, default) or lower-right, ending about 60 below and 20 outside the corner, so put the thinker's head there. Children are drawn at the cloud's centre. |

## Backgrounds

| Piece | Props | Notes |
|---|---|---|
| `Room` | `night window picture rug glow f` | Wall and floor. `window={x}` puts a 150 x 120 window with its left edge at x, top at y = 170. `picture={x}` puts a 130 x 96 framed picture at x, top at y = 180. `rug` adds a rug on the floor. `glow={[x, y]}` adds warm lamp light; use it with `night`. Pass `f` at night so the stars twinkle. |
| `Street` | `night f lamp` | Buildings left and right, a road. A lamp post stands in the centre from the floor up to y = 250; `lamp={false}` removes it. |
| `Outdoor` | `night f tree` | Sky, sun or moon at the top right, clouds or stars, hills, grass. `tree={x}` adds a tree. |
| `Classroom` | `board` | A wall with a 400 x 200 board, centred, from y = 190. `board="text"` writes on it. |

For a flat card background: `<Stage dur={dur} bg={C.bgAlt}>` then `<rect width={W} height={H} fill={C.bgAlt} />`. `C.bg` is the default background, `C.night` and `C.navy` are the dark ones.

Colours the backgrounds use, for matching your own drawings: day sky `#BFDDEA`, street sky `#CFD8DC`, night sky `#1F2747`, grass `#7FAF7C`, road `#B8A88A`, night wall `#3B4466`.

## Props

| Piece | Props | Anchor and size |
|---|---|---|
| `Desk` | `x y w` | A table seen from the side. `(x, y)` is the top-left of the table top; defaults x = 215, y = 500, w = 330 (so by default it runs off the right edge, which reads as a long desk). Legs go down to the floor. A person sits behind it: draw the person, then the desk. |
| `Books` | `x y n` | A stack of up to four books. `(x, y)` is the bottom-left; 90 wide, 14 per book. Put `y` at the desk top. |
| `Lamp` | `x y flip` | A desk lamp. `(x, y)` is the centre of its base; 116 tall, the head leans right. |
| `Laptop` | `x y flip` | `(x, y)` is the front-left of the base; 110 wide, 74 tall. |
| `Sofa` | `x y w color` | An armchair or sofa block. `(x, y)` is the top-left; w default 190, 210 tall. Draw it before the person sitting on it. |
| `Shop` | `x y w sign open color` | A shop front with a sign and awning. `(x, y)` is the bottom-left on the ground; w default 220, 230 tall. `open` from 0 (shutter down) to 1 (up): `open={ramp(lf(18.5), 0, 30)}` raises the shutter. |
| `Cup` | `x y f handle` | A cup with steam. `(x, y)` is the bottom-left; 34 x 50. |
| `Phone` | `x y s lit` | `(x, y)` is the centre; 34 x 60. |
| `Coin` | `x y r mark` | `(x, y)` is the centre; r default 24. `mark` is a character drawn on it. |
| `Heart` | `x y s color` | `(x, y)` is the centre; about 68 x 52. |
| `Clock` | `x y r t` | `(x, y)` is the centre; r default 46. `t` is the time in hours: `t={7 + f / 200}`. |
| `Tree` | `x y s` | `(x, y)` is the base of the trunk; about 130 wide, 254 tall. |
| `Eye` | `x y since look` | An eye that pops in and looks at the point `look={[x, y]}`; 48 x 30. Several of them, each a few frames later, read as "everyone is watching". |

## Cards and graphics

`k` is always a spring value: `k={sp(lf(32.2))}`.

| Piece | Props | Anchor and size |
|---|---|---|
| `Doc` | `x y k title color` | A paper document. `(x, y)` is the top-left; 280 x 360 at `k={1}`; `k` scales it from that corner. |
| `Stamp` | `x y k ok r` | A round stamp that slams on: a tick when `ok`, a cross otherwise. `(x, y)` is the centre; r default 86, so about 186 across. |
| `Bar` | `x y label value show k color` | A labelled bar in a card. `(x, y)` is the top-left; 380 x 150. `value` from 0 to 1; `show` is the text on the right ("25%"). |
| `Meter` | `x y value label h light` | A vertical gauge. `(x, y)` is the top centre; 36 wide, h default 220. The label sits above it; `light` makes the label pale for dark scenes. |
| `Cells` | `x y count filled perRow labels f` | Numbered boxes that fill one by one. `(x, y)` is the top-left; each box 64 x 54, 78 apart across and 66 down; six per row is 454 wide. `filled` may be fractional: `filled={ramp(lf(24.7), 0, 54, 0, 12)}`. |
| `StepCard` | `y n text k x` | A numbered card. `(x, y)` is its centre (x defaults to the centre of the frame); 380 x 140. |
| `Headline` | `y text k size fill x` | One large line that rises in, centred on x; `y` is the text baseline. Shrinks to fit the frame. |
| `Badge` | `x y text k color w` | A coloured pill. `(x, y)` is the centre; w default 220, 60 tall. |
| `Arrow` | `x y len k angle` | `(x, y)` is the tail. It points down for `len` (default 90) plus a 10 head. `angle={-90}` points right, `angle={90}` left. |
| `Megaphone` | `x y k crossed` | `(x, y)` is the centre; about 340 x 240 at `k={1}`. `k` is its scale, so `k={0.4 * pop(lf(22))}` gives a small one. `crossed` is a spring value that stamps a "no" mark on it. |

## Text

- `<Txt x y size fill display anchor maxWidth>text</Txt>` draws text in the story's font, script and direction. `y` is the baseline. `display` uses the heading font. `anchor` is `start`, `middle` (default) or `end`; `start` always means the left edge is at `x`, in right-to-left languages too. `maxWidth` shrinks the text to fit.
- Do not use a raw `<text>` element: it will not have the right font and will show empty boxes in most scripts.
- `num(12)` formats a number in the story's own digits. Use it for every number you draw.
- Write all labels in the language of the SRT. Keep them to one to three words.

## Resizing a piece

Pieces without a size prop are resized by wrapping them: `<g transform="translate(400,300) scale(0.5)"><Megaphone x={0} y={0} k={1} /></g>`. The same wrapper rotates (`rotate(-8)`) or fades (`opacity`).

## The user's own pictures

When the user supplies pictures (a character, a product, a logo), copy them to `PROJECT/public/art/` and place them with `<Art file="name.png" x y w h flip />`. `(x, y)` is the top-left of the box. The picture is fitted inside the box and never stretched. PNG with a transparent background works best.

## Drawing something new

Most stories need a thing the kit does not have. Draw it as plain SVG shapes in the same style:

- outline colour `O`, stroke width 3 to 4, rounded joins
- flat fills from the theme `C`: `C.accent`, `C.good`, `C.gold`, `C.card`, `C.ink`, `C.wood`, `C.woodDark`, `C.line`, `C.wall`, `C.floor`, `C.bg`, `C.bgAlt`, `C.night`, `C.navy`
- no gradients except a soft glow, no photos, no emoji

Example, a bed with someone asleep in it:

```tsx
<rect x={70} y={540} width={400} height={70} rx={14} fill={C.wood} stroke={O} strokeWidth={4} />
<rect x={96} y={500} width={110} height={48} rx={22} fill="#F3EEE2" stroke={O} strokeWidth={3} />
<circle cx={160} cy={492} r={40} fill={RAVI.skin} stroke={O} strokeWidth={4} />
<path d={`M176 ${548 + breathe(f, 2)} Q300 ${470 + breathe(f, 4)} 470 540 L470 600 L176 600Z`} fill="#6E96BB" stroke={O} strokeWidth={4} strokeLinejoin="round" />
```

Build a prop from a few rectangles, circles and one or two paths. If the same prop appears in several scenes, make it a small component at the top of `scenes.tsx`.

## Rules for scene code

The renderer draws each frame on its own, in any order, in several browser tabs at once. So:

- Everything on screen must be computed from `f` or `t`. No `useState` for animation, no timers, no CSS animations or transitions.
- No `Math.random()` and no `Date.now()`. Use `random('seed')` from `remotion` if you need noise.
- Files in `public/` are loaded with `staticFile('name')`.
- Do not edit files under `src/lib/`.

## Pacing

These are working habits, not measured results.

- Cut on pauses. A new scene every 4 to 7 seconds; shorter for a quick beat, never under 1 second.
- Every scene has some motion: breathing, blinking, a spring pop.
- One idea per card, on screen for 1 to 3 seconds.
- Show the caption's key idea as a thing (a prop, a number, an icon), not only as a person talking.
- Add `stamp` when something slams down and `pop` when something appears.
