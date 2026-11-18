import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSilences, normalize, rmsWindows, silenceThresholdDb } from '../skills/srt2reel/scripts/lib/audio.ts';
import { buildCaptions, cutPoints, snapCues, totalDuration } from '../skills/srt2reel/scripts/lib/timing.ts';
import { displayWidth, wordingKey } from '../skills/srt2reel/scripts/lib/text.ts';

// 100 Hz envelope: speech 0-1 s, pause 1-1.5 s, speech 1.5-3 s, pause 3-3.4 s, speech 3.4-4 s
function envelope(speech: number, quiet: number): number[] {
  const env: number[] = [];
  const fill = (from: number, to: number, v: number) => {
    for (let i = from * 100; i < to * 100; i++) env.push(v);
  };
  fill(0, 1, speech);
  fill(1, 1.5, quiet);
  fill(1.5, 3, speech);
  fill(3, 3.4, quiet);
  fill(3.4, 4, speech);
  return env;
}

test('rms of a constant signal is that constant', () => {
  const samples = new Float32Array(1600).fill(0.5);
  const rms = rmsWindows(samples, 16000, 100);
  assert.equal(rms.length, 10);
  assert.ok(Math.abs(rms[0] - 0.5) < 1e-6);
});

test('rms windows follow the frame rate', () => {
  const samples = new Float32Array(16000);
  samples.fill(1, 8000);
  const rms = rmsWindows(samples, 16000, 30);
  assert.equal(rms.length, 30);
  assert.equal(rms[0], 0);
  assert.equal(rms[29], 1);
});

test('normalize scales to a 0..1 range and survives silence', () => {
  assert.deepEqual(normalize([0, 0.25, 0.5]), [0, 0.5, 1]);
  assert.deepEqual(normalize([0, 0]), [0, 0]);
});

test('finds pauses in a clean voice', () => {
  const silences = findSilences(envelope(0.2, 0), 100);
  assert.deepEqual(silences, [
    { s: 1, e: 1.5, d: 0.5 },
    { s: 3, e: 3.4, d: 0.4 },
  ]);
});

test('finds the same pauses when the room is noisy', () => {
  const silences = findSilences(envelope(0.2, 0.01), 100);
  assert.deepEqual(
    silences.map((x) => [x.s, x.e]),
    [
      [1, 1.5],
      [3, 3.4],
    ],
  );
});

test('the threshold stays under speech and over the noise floor', () => {
  const thr = silenceThresholdDb(envelope(0.2, 0.01));
  assert.ok(thr > 20 * Math.log10(0.01));
  assert.ok(thr < 20 * Math.log10(0.2));
});

test('ignores gaps shorter than the minimum', () => {
  const env = new Array(100).fill(0.2);
  for (let i = 40; i < 45; i++) env[i] = 0;
  assert.deepEqual(findSilences(env, 100), []);
});

test('reports silence that runs to the end of the file', () => {
  const env = [...new Array(100).fill(0.2), ...new Array(50).fill(0)];
  assert.deepEqual(findSilences(env, 100), [{ s: 1, e: 1.5, d: 0.5 }]);
});

const silences = [
  { s: 0, e: 0.12, d: 0.12 },
  { s: 1.8, e: 2.4, d: 0.6 },
  { s: 4.0, e: 4.7, d: 0.7 },
];

test('snaps cue edges to nearby pauses', () => {
  const cues = [
    { i: 1, s: 0, e: 2.0, text: 'One' },
    { i: 2, s: 2.0, e: 4.2, text: 'Two' },
  ];
  assert.deepEqual(snapCues(cues, silences, 6), [
    { i: 1, s: 0.12, e: 1.8, text: 'One' },
    { i: 2, s: 2.4, e: 4, text: 'Two' },
  ]);
});

test('leaves a cue alone when no pause is near', () => {
  const cues = [{ i: 1, s: 2.9, e: 3.4, text: 'Mid' }];
  assert.deepEqual(snapCues(cues, silences, 6), cues);
});

test('never lets two captions overlap or run past the voice', () => {
  const cues = [
    { i: 1, s: 0, e: 3.2, text: 'A' },
    { i: 2, s: 3.0, e: 9, text: 'B' },
  ];
  const out = snapCues(cues, [], 6);
  assert.ok(out[0].e <= out[1].s);
  assert.equal(out[1].e, 6);
});

test('does not snap a cue into nothing', () => {
  const cues = [{ i: 1, s: 2.2, e: 2.1 + 0.2, text: 'Tiny' }];
  const out = snapCues(cues, silences, 6);
  assert.ok(out[0].e - out[0].s > 0);
});

test('captions keep every word of the cues', () => {
  const cues = [
    { s: 0, e: 6, text: 'This is a very long subtitle cue that someone exported as one block and it clearly cannot fit on two lines of a phone screen.' },
    { s: 6, e: 7, text: 'Short.' },
  ];
  const caps = buildCaptions(cues, [], 60, { maxCols: 26, locale: 'en' });
  assert.equal(wordingKey(caps.map((c) => c.t).join(' ')), wordingKey(cues.map((c) => c.text).join(' ')));
  assert.ok(caps.length > 2);
  for (const c of caps) {
    assert.ok(c.t.split('\n').length <= 2);
    for (const line of c.t.split('\n')) assert.ok(displayWidth(line) <= 30, line);
  }
});

test('split captions share the cue time in order with no gaps', () => {
  const cues = [{ s: 2, e: 8, text: 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen.' }];
  const caps = buildCaptions(cues, [], 60, { maxCols: 26, locale: 'en' });
  assert.equal(caps[0]!.s, 2);
  assert.equal(caps.at(-1)!.e, 8);
  for (let i = 1; i < caps.length; i++) assert.equal(caps[i].s, caps[i - 1].e);
});

test('a short cue becomes one caption unchanged', () => {
  assert.deepEqual(buildCaptions([{ s: 1, e: 2, text: 'Hello.' }], [], 60, { maxCols: 26, locale: 'en' }), [{ s: 1, e: 2, t: 'Hello.' }]);
});

test('suggests scene cuts in the middle of longer pauses', () => {
  const caps = [
    { s: 0.12, e: 1.8, t: 'One' },
    { s: 2.4, e: 4, t: 'Two' },
    { s: 4.7, e: 5.8, t: 'Three' },
  ];
  assert.deepEqual(cutPoints(silences, caps, 6), [
    { at: 2.1, pause: 0.6, beforeCaption: 2, insideCaption: null },
    { at: 4.35, pause: 0.7, beforeCaption: 3, insideCaption: null },
  ]);
});

test('says when a pause falls inside a caption instead of between two', () => {
  const caps = [{ s: 0.12, e: 5.8, t: 'One long caption' }];
  assert.deepEqual(cutPoints(silences, caps, 6), [
    { at: 2.1, pause: 0.6, beforeCaption: null, insideCaption: 1 },
    { at: 4.35, pause: 0.7, beforeCaption: null, insideCaption: 1 },
  ]);
});

test('a cue that ends exactly where the next pause ends is pulled back to the pause start', () => {
  const cues = [
    { s: 0.12, e: 2.4, text: 'One' },
    { s: 2.4, e: 4.0, text: 'Two' },
  ];
  assert.deepEqual(snapCues(cues, silences, 6).map((c) => [c.s, c.e]), [
    [0.12, 1.8],
    [2.4, 4],
  ]);
});

test('a split caption lands on the pause between its two halves', () => {
  const text = 'A month later, someone asked, "How is the training going?"';
  const pauses = [{ s: 3.0, e: 3.4, d: 0.4 }];
  const caps = buildCaptions([{ s: 1, e: 5, text }], pauses, 10, { maxCols: 26, locale: 'en' });
  assert.equal(caps.length, 2);
  assert.equal(caps[0]!.e, 3);
  assert.equal(caps[1]!.s, 3.4);
});

test('total length is the voice plus the hold, rounded up to a whole frame', () => {
  assert.equal(totalDuration(57.52, 1.5, 30), 1771 / 30);
  assert.equal(totalDuration(10, 1.5, 30), 11.5);
});
