import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, sceneIdsFrom, validateStory } from '../skills/srt2reel/scripts/lib/validate.ts';
import type { Context } from '../skills/srt2reel/scripts/lib/validate.ts';
import type { Story } from '../skills/srt2reel/scripts/lib/types.ts';

const cues = [
  { s: 0.1, e: 1.8, text: 'He studied all night.' },
  { s: 2.4, e: 4.0, text: 'Next time he told nobody.' },
];

const good = (): Story => ({
  lang: 'en',
  dir: 'ltr',
  page: '',
  theme: 'paper',
  captionLift: 0,
  captions: [
    { s: 0.1, e: 1.8, t: 'He studied {all night}.' },
    { s: 2.4, e: 4.0, t: 'Next time he told\n{nobody}.' },
  ],
  scenes: [
    { id: 'desk', s: 0, e: 2.1, tag: 'Night study' },
    { id: 'quiet', s: 2.1, e: 5.5 },
  ],
  speak: { hero: [[2.4, 4.0]] },
  sfx: [['pop', 2.4, 0.3]],
});

const ctx = (story: Story, extra: Partial<Context> = {}): Context => ({
  story,
  cues,
  total: 5.5,
  sceneIds: new Set(['desk', 'quiet']),
  silences: [{ s: 1.8, e: 2.4, d: 0.6 }],
  sfxNames: ['pop', 'tick'],
  themes: ['paper', 'mint'],
  ...extra,
});

const run = (mutate?: (s: Story) => void, extra?: Partial<Context>) => {
  const story = good();
  mutate?.(story);
  return validateStory(ctx(story, extra));
};

test('a correct story passes with no errors or warnings', () => {
  assert.deepEqual(run(), { errors: [], warnings: [] });
});

test('changed wording is an error that shows where', () => {
  const { errors } = run((s) => (s.captions[1].t = 'Next time he told no one.'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /wording differs/);
  assert.match(errors[0], /nobody/);
});

test('a dropped caption is a wording error', () => {
  const { errors } = run((s) => s.captions.pop());
  assert.match(errors[0], /wording differs/);
});

test('merging two captions keeps the wording valid', () => {
  const { errors } = run((s) => {
    s.captions = [{ s: 0.1, e: 4.0, t: 'He studied all night.\nNext time he told nobody.' }];
  });
  assert.deepEqual(errors, []);
});

test('overlapping or backwards captions are errors', () => {
  assert.match(run((s) => (s.captions[1].s = 1.0)).errors.join(), /overlap/);
  assert.match(run((s) => (s.captions[0].e = 0.05)).errors.join(), /ends before it starts/);
  assert.match(run((s) => (s.captions[1].e = 9)).errors.join(), /outside the video/);
});

test('a highlight must cover whole words', () => {
  assert.match(run((s) => (s.captions[0].t = 'He stud{ied all night}.')).errors.join(), /starts inside a word/);
  assert.match(run((s) => (s.captions[0].t = 'He studied {all nig}ht.')).errors.join(), /ends inside a word/);
  assert.match(run((s) => (s.captions[0].t = 'He studied {all night.')).errors.join(), /unbalanced/);
  assert.match(run((s) => (s.captions[0].t = 'He studied {}all night.')).errors.join(), /empty highlight/);
});

test('a highlight may sit inside text that has no spaces', () => {
  const zhCues = [{ s: 0, e: 2, text: '他每天晚上学习' }];
  const story = { ...good(), lang: 'zh', captions: [{ s: 0, e: 2, t: '他{每天晚上}学习' }], speak: {}, sfx: [] };
  assert.deepEqual(validateStory(ctx(story, { cues: zhCues })).errors, []);
});

test('too many lines or a very wide line is an error; a slightly wide one is a warning', () => {
  const wide = 'He studied all night and then some more.';
  const wideCues = [{ s: 0.1, e: 4, text: wide }];
  const one = (t: string) => validateStory(ctx({ ...good(), captions: [{ s: 0.1, e: 4, t }] }, { cues: wideCues }));
  assert.match(one(wide).errors.join(), /split it/);
  assert.match(one('He studied\nall night\nand then some more.').errors.join(), /3 lines/);
  const slightly = validateStory(
    ctx({ ...good(), captions: [{ s: 0.1, e: 4, t: 'He studied all night and then.' }] }, { cues: [{ s: 0, e: 4, text: 'He studied all night and then.' }] }),
  );
  assert.deepEqual(slightly.errors, []);
  assert.match(slightly.warnings.join(), /shrunk to fit/);
});

test('captions too fast to read are flagged', () => {
  const { warnings } = run((s) => (s.captions[1]!.e = 3.1));
  assert.match(warnings.join(), /columns per second/);
  assert.deepEqual(run((s) => (s.captions[1]!.e = 3.6)).warnings, []);
});

test('scenes must start at zero, touch each other and end with the video', () => {
  assert.match(run((s) => (s.scenes[0].s = 0.5)).errors.join(), /start at 0/);
  assert.match(run((s) => (s.scenes[1].s = 2.5)).errors.join(), /must touch/);
  assert.match(run((s) => (s.scenes[1].e = 5)).errors.join(), /must end at 5.5s/);
  assert.match(run((s) => (s.scenes = [])).errors.join(), /no scenes/);
});

test('a scene id missing from scenes.tsx is an error', () => {
  assert.match(run((s) => (s.scenes[1].id = 'ghost')).errors.join(), /"ghost" is not defined/);
});

test('a cut in the middle of speech is a warning', () => {
  const { errors, warnings } = run((s) => {
    s.scenes[0].e = 3.2;
    s.scenes[1].s = 3.2;
  });
  assert.deepEqual(errors, []);
  assert.match(warnings.join(), /mid-sentence/);
});

test('very short and very long scenes are warnings', () => {
  const short = run((s) => {
    s.scenes = [
      { id: 'desk', s: 0, e: 2.1 },
      { id: 'quiet', s: 2.1, e: 2.4 },
      { id: 'desk', s: 2.4, e: 5.5 },
    ];
  });
  assert.match(short.warnings.join(), /only 0.30s/);
  const long = validateStory(ctx({ ...good(), scenes: [{ id: 'desk', s: 0, e: 20 }] }, { total: 20 }));
  assert.match(long.warnings.join(), /add a visual change/);
});

test('bad settings are named', () => {
  assert.match(run((s) => (s.captionLift = 900)).errors.join(), /captionLift must be/);
  assert.match(run((s) => (s.theme = 'neon')).errors.join(), /theme must be/);
  assert.match(run((s) => (s.dir = 'up' as never)).errors.join(), /dir must be/);
  assert.match(run((s) => (s.lang = 'not a lang')).errors.join(), /not a valid language tag/);
});

test('bad speak windows and sound effects are errors', () => {
  assert.match(run((s) => (s.speak.hero = [[4, 2]])).errors.join(), /bad window/);
  assert.match(run((s) => (s.sfx = [['boom', 1, 0.5]])).errors.join(), /unknown sound "boom"/);
  assert.match(run((s) => (s.sfx = [['pop', 99, 0.5]])).errors.join(), /outside the video/);
  assert.match(run((s) => (s.sfx = [['pop', 1, 3]])).errors.join(), /volume/);
});

test('warns about platform length limits', () => {
  const story = { ...good(), scenes: [{ id: 'desk', s: 0, e: 100 }] };
  assert.match(validateStory(ctx(story, { total: 100 })).warnings.join(), /Facebook Reels/);
  const longer = { ...good(), scenes: [{ id: 'desk', s: 0, e: 200 }] };
  assert.match(validateStory(ctx(longer, { total: 200 })).warnings.join(), /YouTube Shorts/);
});

test('landscape allows wider captions and has no short-video length limit', () => {
  const text = 'He studied all night and then some more.';
  const wide: Story = { ...good(), format: 'landscape', captions: [{ s: 0.1, e: 4, t: text }], scenes: [{ id: 'desk', s: 0, e: 200 }] };
  const out = validateStory(ctx(wide, { cues: [{ s: 0, e: 4, text }], total: 200 }));
  assert.deepEqual(out.errors, []);
  assert.doesNotMatch(out.warnings.join(), /Shorts|Reels|shrunk/);
  assert.match(run((s) => (s.format = 'square' as never)).errors.join(), /format must be/);
});

test('emoji in a caption is a warning', () => {
  const story = { ...good(), captions: [{ s: 0.1, e: 4, t: 'He studied 🎉' }] };
  const out = validateStory(ctx(story, { cues: [{ s: 0, e: 4, text: 'He studied 🎉' }] }));
  assert.match(out.warnings.join(), /emoji/);
});

test('reads scene ids from the SCENES object', () => {
  const src = `
    const Desk = () => null;
    export const SCENES: Record<string, Scene> = {
      desk: Desk,
      'tea-shop': TeaShop, // a comment, with: colons
      "result day": (p) => <Result {...p} big={true} n={3} />,
      Shorthand,
    };
    export const other = { nope: 1 };
  `;
  assert.deepEqual([...sceneIdsFrom(src)!].sort(), ['Shorthand', 'desk', 'result day', 'tea-shop']);
  assert.equal(sceneIdsFrom('export const nothing = 1'), null);
});

test('contrast matches known WCAG values', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
  assert.equal(contrast('#777777', '#777777'), 1);
  assert.ok(Math.abs(contrast('#767676', '#ffffff') - 4.54) < 0.02);
});
