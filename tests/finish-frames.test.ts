import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalCheckTimes, loudnormFilter, parseLoudnorm, shrinkArgs, verifyStreams } from '../skills/srt2reel/scripts/lib/finish.ts';
import type { Probe } from '../skills/srt2reel/scripts/lib/finish.ts';
import { pickFrames } from '../skills/srt2reel/scripts/lib/frames.ts';
import { sampleRate, synth, wavBytes } from '../skills/srt2reel/scripts/lib/sfx.ts';
import type { Story } from '../skills/srt2reel/scripts/lib/types.ts';

const ffmpegOutput = `
[Parsed_loudnorm_0 @ 0x600000] 
{
	"input_i" : "-17.11",
	"input_tp" : "-3.20",
	"input_lra" : "4.10",
	"input_thresh" : "-27.40",
	"output_i" : "-14.02",
	"normalization_type" : "dynamic",
	"target_offset" : "0.02"
}
[out#0/null @ 0x6000] video:0KiB audio:6000KiB`;

test('reads the loudness measurement out of ffmpeg output', () => {
  const m = parseLoudnorm(ffmpegOutput);
  assert.equal(m?.input_i, '-17.11');
  assert.equal(m?.target_offset, '0.02');
});

test('gives up on a measurement of pure silence or missing output', () => {
  assert.equal(parseLoudnorm(ffmpegOutput.replace('-17.11', '-inf')), null);
  assert.equal(parseLoudnorm('no json here'), null);
});

test('the second pass uses the measured values in linear mode', () => {
  assert.match(loudnormFilter(), /print_format=json/);
  const f = loudnormFilter(parseLoudnorm(ffmpegOutput)!);
  assert.match(f, /I=-14:TP=-1.5/);
  assert.match(f, /measured_I=-17.11/);
  assert.match(f, /linear=true/);
});

const probe = (): Probe => ({
  streams: [
    { codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920, pix_fmt: 'yuv420p', r_frame_rate: '30/1' },
    { codec_type: 'audio', codec_name: 'aac', sample_rate: '48000' },
  ],
  format: { duration: '36.05' },
});

test('a correct file has no problems', () => {
  assert.deepEqual(verifyStreams(probe(), 36.03, 30), []);
});

test('each wrong property is reported', () => {
  const bad = probe();
  bad.streams[0]!.width = 720;
  bad.streams[0]!.pix_fmt = 'yuv444p';
  bad.streams[0]!.r_frame_rate = '25/1';
  bad.streams[1]!.sample_rate = '44100';
  bad.format.duration = '30';
  const problems = verifyStreams(bad, 36.03, 30).join('\n');
  for (const word of ['720x1920', 'yuv444p', '25/1', '44100', '30.00s']) assert.match(problems, new RegExp(word));
});

test('a file with no audio or no video is reported', () => {
  assert.match(verifyStreams({ streams: [probe().streams[0]!], format: { duration: '36' } }, 36, 30).join(), /no audio/);
  assert.match(verifyStreams({ streams: [probe().streams[1]!], format: { duration: '36' } }, 36, 30).join(), /no video/);
});

test('final check frames fall late inside captions, spread over the video', () => {
  const captions = Array.from({ length: 8 }, (_, i) => ({ s: i * 10, e: i * 10 + 5 }));
  assert.deepEqual(finalCheckTimes(captions, 80), [14, 34, 54, 74]);
  assert.deepEqual(finalCheckTimes([{ s: 1, e: 2 }], 10), [1.8]);
  assert.deepEqual(finalCheckTimes([], 8), [1, 3, 5, 7]);
});

test('the shrink bitrate fits the size limit', () => {
  const args = shrinkArgs(28, 60);
  const kbps = Number(/^(\d+)k$/.exec(args[args.indexOf('-b:v') + 1]!)![1]);
  const megabytes = ((kbps + 192) * 60) / 8 / 1024;
  assert.ok(megabytes < 28 && megabytes > 25, String(megabytes));
  assert.ok(args.includes('copy'));
});

const story: Story = {
  lang: 'en', dir: 'ltr', page: '', theme: 'paper', captionLift: 0,
  captions: [
    { s: 0.2, e: 2.0, t: 'One' },
    { s: 2.6, e: 4.4, t: 'Two' },
    { s: 5.0, e: 8.0, t: 'Three' },
  ],
  scenes: [
    { id: 'a', s: 0, e: 2.3 },
    { id: 'b', s: 2.3, e: 10 },
  ],
  speak: {}, sfx: [],
};

test('preview frames cover every scene, every caption and the last frame', () => {
  const shots = pickFrames(story, 10, 30);
  const labels = shots.map((s) => s.label).join(' | ');
  for (const word of ['scene a', 'scene b', 'caption 1', 'caption 2', 'caption 3', 'last frame']) assert.match(labels, new RegExp(word));
  assert.equal(shots.at(-1)!.frame, 299);
  for (let i = 1; i < shots.length; i++) assert.ok(shots[i]!.frame > shots[i - 1]!.frame);
});

test('preview frames can be limited to one stretch of a long video', () => {
  const shots = pickFrames(story, 10, 30, 48, [2.5, 6]);
  assert.deepEqual(shots.map((s) => s.label), ['scene b', 'caption 2']);
});

test('the finished file is checked against the frame size of its format', () => {
  const wide = probe();
  wide.streams[0]!.width = 1920;
  wide.streams[0]!.height = 1080;
  assert.deepEqual(verifyStreams(wide, 36.03, 30, { width: 1920, height: 1080 }), []);
  assert.match(verifyStreams(wide, 36.03, 30).join(), /expected 1080x1920/);
});

test('preview frames are capped for long videos but keep every scene', () => {
  const long: Story = { ...story, captions: Array.from({ length: 200 }, (_, i) => ({ s: i, e: i + 0.8, t: 'x' })), scenes: [{ id: 'a', s: 0, e: 100 }, { id: 'b', s: 100, e: 200 }] };
  const shots = pickFrames(long, 200, 30, 20);
  assert.ok(shots.length <= 20);
  assert.match(shots.map((s) => s.label).join(), /scene a/);
  assert.match(shots.map((s) => s.label).join(), /scene b/);
});

test('sound effects are valid 16-bit mono WAV data', () => {
  const samples = synth('tick', 5);
  const wav = wavBytes(samples);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(40), samples.length * 2);
  assert.equal(wav.length, 44 + samples.length * 2);
});

test('the ambient pad is exactly as long as the video and fades in and out', () => {
  const pad = synth('pad', 3);
  assert.equal(pad.length, sampleRate('pad') * 3);
  assert.ok(sampleRate('pad') < sampleRate('pop'));
  assert.equal(pad[0], 0);
  assert.ok(Math.abs(pad.at(-1)!) < 0.001);
});

test('noise-based sounds are identical on every run', () => {
  assert.deepEqual(synth('stamp', 1), synth('stamp', 1));
  assert.throws(() => synth('boom', 1), /Unknown sound/);
});
