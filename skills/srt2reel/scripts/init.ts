import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { analyzeVoice } from './lib/audio.ts';
import { syncFonts } from './lib/fontsync.ts';
import { FPS, TEMPLATE_DIR, fail, fmt, install, paths, readJson, run, sceneSources, writeJson } from './lib/project.ts';
import { writeSfx } from './lib/sfx.ts';
import { decodeText, parseSrt } from './lib/srt.ts';
import { defaultLang, detectScript, plainCaption } from './lib/text.ts';
import { buildCaptions, cutPoints, totalDuration } from './lib/timing.ts';
import type { AudioData, Plan, Story } from './lib/types.ts';
import { FRAME, maxCols } from './lib/validate.ts';

// Creates a video project from a voice file and its subtitles:
// copies the template, installs it, measures the voice, and writes captions from the SRT.

const USAGE = `Usage: node init.ts <project-dir> --voice <audio file> --srt <subtitle file>
  --format <name>     portrait (9:16, default) or landscape (16:9, for longer videos)
  --lang <tag>        language of the subtitles, e.g. en, hi, ar, zh-TW (default: guessed from the script)
  --page <name>       page or channel name shown as a small watermark (default: none)
  --theme <name>      paper, mint or sky (default: paper)
  --encoding <name>   encoding of the SRT when it is not UTF-8 or UTF-16
  --hold <seconds>    how long the last scene stays after the voice ends (default: 1.5)
  --force             replace an existing story.json`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    voice: { type: 'string' },
    srt: { type: 'string' },
    lang: { type: 'string' },
    format: { type: 'string', default: 'portrait' },
    page: { type: 'string', default: '' },
    theme: { type: 'string', default: 'paper' },
    encoding: { type: 'string' },
    hold: { type: 'string', default: '1.5' },
    force: { type: 'boolean', default: false },
  },
});

const dir = positionals[0];
if (!dir || !values.voice || !values.srt) fail(USAGE);
for (const file of [values.voice, values.srt]) if (!existsSync(file)) fail(`File not found: ${file}`);
if (values.format !== 'portrait' && values.format !== 'landscape') fail('--format must be portrait or landscape.');
const format = values.format;
const hold = Number(values.hold);
if (!(hold >= 0 && hold <= 10)) fail('--hold must be a number of seconds from 0 to 10.');

const p = paths(dir);

if (!existsSync(p.pkg)) {
  mkdirSync(p.root, { recursive: true });
  cpSync(TEMPLATE_DIR, p.root, { recursive: true, filter: (src) => !src.includes('node_modules') });
  console.log(`Created ${p.root}`);
}
if (!existsSync(join(p.root, 'node_modules', 'remotion'))) install(p);

mkdirSync(join(p.root, 'public'), { recursive: true });
if (extname(values.voice).toLowerCase() === '.mp3') {
  if (resolve(values.voice) !== p.voice) copyFileSync(values.voice, p.voice);
} else {
  const r = run('ffmpeg', ['-y', '-v', 'error', '-i', values.voice, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', p.voice]);
  if (!r.ok) fail(`Could not convert ${values.voice} to MP3.\n${r.out}`);
}

let cues: Plan['cues'];
let srtWarnings: string[];
try {
  ({ cues, warnings: srtWarnings } = parseSrt(decodeText(readFileSync(values.srt), values.encoding)));
} catch (err) {
  fail((err as Error).message);
}

const voice = analyzeVoice(p.voice, FPS);
const total = totalDuration(voice.duration, hold, FPS);
const allText = cues.map((c) => c.text).join(' ');
const detected = detectScript(allText);
const lang = values.lang ?? defaultLang(detected.script);
try {
  Intl.getCanonicalLocales(lang);
} catch {
  fail(`--lang "${lang}" is not a valid language tag. Use for example en, hi, bn, ar, zh-TW, pt-BR.`);
}
const themes = Object.keys(readJson<Record<string, unknown>>(p.themes));
if (!themes.includes(values.theme)) fail(`--theme must be one of: ${themes.join(', ')}.`);

const captions = buildCaptions(cues, voice.silences, voice.duration, { maxCols: maxCols(format), locale: lang });
const cuts = cutPoints(voice.silences, captions, voice.duration);

const audio: AudioData = { fps: FPS, duration: voice.duration, total, rms: voice.rms };
writeJson(p.audio, audio, true);
const plan: Plan = { fps: FPS, hold, voiceDuration: voice.duration, total, script: detected.script, thresholdDb: voice.thresholdDb, cues, silences: voice.silences, cuts };
writeJson(p.plan, plan, true);

const keepStory = existsSync(p.story) && readJson<Story>(p.story).captions.length > 0 && !values.force;
const story: Story = keepStory
  ? readJson<Story>(p.story)
  : {
      lang,
      dir: detected.dir,
      format,
      page: values.page,
      theme: values.theme,
      captionLift: 0,
      captions,
      scenes: [{ id: 'opening', s: 0, e: total }],
      speak: {},
      sfx: [],
    };
if (!keepStory) writeJson(p.story, story);

writeSfx(p.sfx, total);
const fonts = syncFonts(p, story, sceneSources(p));

const warnings = [...srtWarnings];
const lastCue = cues.at(-1)!;
if (lastCue.e > voice.duration + 1 || lastCue.e < voice.duration * 0.6) {
  warnings.push(`The SRT ends at ${lastCue.e.toFixed(1)}s but the voice is ${voice.duration.toFixed(1)}s long. Check that these two files belong together.`);
}
if (fonts.missing.length) warnings.push(`No installed font can draw: ${fonts.missing.join(' ')}`);
if (keepStory) warnings.push('story.json already had captions and was kept. Pass --force to rebuild it from the SRT.');

const summary = [
  `Project      ${p.root}`,
  `Language     ${story.lang} (${detected.script}, ${story.dir})`,
  `Fonts        ${fonts.ids.text} for captions, ${fonts.ids.display} for headings`,
  `Voice        ${voice.duration.toFixed(2)}s, ${voice.silences.length} pauses found, ${cuts.length} of them long enough to cut a scene on`,
  `Video        ${total.toFixed(2)}s = ${Math.round(total * FPS)} frames at ${FPS} fps, ${FRAME[story.format ?? 'portrait'].width}x${FRAME[story.format ?? 'portrait'].height}`,
  '',
  `Captions (${captions.length}), timed to the voice:`,
  ...captions.map((c, i) => `  ${String(i + 1).padStart(3)}  ${fmt(c.s)} - ${fmt(c.e)}  ${plainCaption(c.t)}`),
  '',
  'Pauses long enough to cut a scene on:',
  ...(cuts.length ? cuts.map((c) => `  ${fmt(c.at)}s  (${c.pause.toFixed(2)}s pause${c.beforeCaption ? `, before caption ${c.beforeCaption}` : ''}${c.insideCaption ? `, inside caption ${c.insideCaption}` : ''})`) : ['  none found; cut between captions instead']),
  ...(warnings.length ? ['', 'Warnings:', ...warnings.map((w) => `  - ${w}`)] : []),
  '',
  'Next: edit src/story.json (scenes, key words) and src/scenes.tsx, then run check.ts.',
].join('\n');

writeFileSync(join(p.root, '.srt2reel', 'plan.txt'), `${summary}\n`);
console.log(`\n${summary}`);
