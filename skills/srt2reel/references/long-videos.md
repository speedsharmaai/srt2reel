# Long videos

A portrait short has 5 to 15 scenes, and each can be drawn by hand. A ten-minute video has more than a hundred. Build it from a small set of reusable scenes instead.

## Use the landscape format

Create the project with `--format landscape`. YouTube Shorts stops at three minutes and Reels at 90 seconds, so a long video is a 16:9 video. See the Landscape section of [scenes.md](scenes.md).

## Write reusable scenes

A scene component can take props. The values come from the scene's entry in `story.json`, so one component serves every moment of its kind.

`src/scenes.tsx`:

```tsx
const PEOPLE: Record<string, Look> = {
  asha: { ...CAST.woman, shirt: '#2C7A6B' },
  uncle: CAST.elder,
};

const Talk: Scene<{ left: string; right: string; bubble?: string; place: 'room' | 'street' | 'park'; speaker?: string }> = ({ t0, dur, left, right, bubble, place, speaker }) => {
  const { f, t, at } = useT(t0);
  return (
    <Stage dur={dur}>
      {place === 'room' ? <Room window={80} picture={730} rug /> : place === 'street' ? <Street /> : <Outdoor f={f} tree={820} />}
      <Person x={330} y={POSE.standY + breathe(f)} s={POSE.s} pose="stand" {...PEOPLE[left]!} blink={blinkAt(f)} mouth={speaker === left && mouthOpen(left, t)} />
      <Person x={610} y={POSE.standY + breathe(f + 15)} s={POSE.s} pose="stand" flip {...PEOPLE[right]!} blink={blinkAt(f + 30)} mouth={speaker === right && mouthOpen(right, t)} />
      {bubble && <Bubble x={430} y={120} text={bubble} since={at(0.5)} />}
    </Stage>
  );
};

export const SCENES: SceneMap = { talk: Talk, stat: Stat, steps: Steps };
```

`src/story.json`:

```json
{ "id": "talk", "s": 40.2, "e": 46.9, "tag": "At the shop", "props": { "left": "asha", "right": "uncle", "place": "street", "bubble": "?", "speaker": "uncle" } }
```

Rules for a reusable scene:

- Time its animations from the start of the scene with `at(seconds)`, not with `lf(second of the video)`. A scene that names a second of the video only works once.
- Keep every character's `Look` in one object at the top and refer to it by name in props.
- Make 8 to 15 scene kinds for a long video: two or three ways to show people talking, a person alone, a title card, a list card, a number or chart card, a document, a walk, a dark card for the low point. Vary the background, the people, the mood and the text through props.
- A scene that happens once (the opening, the ending, the turning point) can still be written by hand.

Do not show the same scene with the same props twice in a row. Change something at every cut.

## Work in parts

1. Read all the captions and outline the whole story first: its sections, and which scene kind suits each.
2. Write the scene kinds, then fill in `story.json` for the first two minutes. Run `check.ts` and look at the stills before going on. Fixing a scene kind early fixes every later use of it.
3. Fill in the rest a section at a time. Until every section is done, `check.ts` reports that the last scene does not reach the end; that is expected.
4. Look at a long video one stretch at a time: `node SKILL/scripts/stills.ts PROJECT --range 120-240` renders only the frames between those seconds. Without `--range` it picks up to 48 frames spread over the whole video, which is too thin to judge ten minutes.

For very long files, scene code can be split: put components in `src/scenes/talk.tsx` and so on, and import them into `src/scenes.tsx`, which must still export `SCENES`.

## Rendering

- A render runs at roughly the speed of the video on a recent laptop and several times slower on a small cloud machine. Tell the user the expected wait before starting.
- Poll `--status` once a minute rather than every 20 seconds.
- Expect about 16 MB per minute of video. If the file must stay under a limit, pass `--max-mb`.
- If a render fails part-way, fix the cause and start it again; it starts from the beginning.
