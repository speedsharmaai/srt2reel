import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkProject, printReport } from './check.ts';
import { finalCheckTimes, loudnormFilter, parseLoudnorm, shrinkArgs, verifyStreams } from './lib/finish.ts';
import type { Probe } from './lib/finish.ts';
import { fail, loadPlan, loadStory, readJson, requireProject, run, writeJson } from './lib/project.ts';
import { FRAME } from './lib/validate.ts';
import { openProject } from './lib/remotion.ts';

// Renders the video, evens out its loudness, and checks the finished file.
// A render takes minutes, so --detach starts it in the background and --status reports on it.

type Status = { state: 'rendering' | 'finishing' | 'done' | 'failed'; percent: number; frames: number; total: number; message?: string; output?: string };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    detach: { type: 'boolean', default: false },
    status: { type: 'boolean', default: false },
    wait: { type: 'string' },
    concurrency: { type: 'string' },
    'max-mb': { type: 'string' },
  },
});

const p = requireProject(positionals[0]);
const statusFile = join(p.out, 'render.json');
const logFile = join(p.out, 'render.log');
const raw = join(p.out, 'raw.mp4');
const final = join(p.out, 'final.mp4');
mkdirSync(p.out, { recursive: true });

if (values.status) {
  if (!existsSync(statusFile)) fail('No render has been started for this project.');
  // --wait <seconds> blocks until the render ends or that much time has passed, whichever is first.
  const deadline = Date.now() + Number(values.wait ?? 0) * 1000;
  while (Date.now() < deadline && ['rendering', 'finishing'].includes(readJson<Status>(statusFile).state)) {
    await new Promise((r) => setTimeout(r, 2000));
  }
  const s = readJson<Status>(statusFile);
  console.log(`${s.state}  ${s.percent}%  (${s.frames}/${s.total} frames)`);
  if (s.message) console.log(s.message);
  if (s.state === 'failed' && existsSync(logFile)) console.log(readFileSync(logFile, 'utf8').slice(-1500));
  if (s.output) console.log(`Output: ${s.output}`);
  process.exit(s.state === 'failed' ? 1 : 0);
}

const report = checkProject(p);
if (report.errors.length) {
  printReport(report);
  process.exit(1);
}

if (values.detach) {
  const log = openSync(logFile, 'w');
  const flags = [...(values.concurrency ? ['--concurrency', values.concurrency] : []), ...(values['max-mb'] ? ['--max-mb', values['max-mb']] : [])];
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), p.root, ...flags], { detached: true, stdio: ['ignore', log, log] });
  child.unref();
  writeJson(statusFile, { state: 'rendering', percent: 0, frames: 0, total: 0 } satisfies Status);
  console.log(`Render started in the background. Check on it with:\n  node ${fileURLToPath(import.meta.url)} ${p.root} --status`);
  process.exit(0);
}

const plan = loadPlan(p);
const concurrency = values.concurrency ? Number(values.concurrency) : Math.max(1, Math.min(4, Math.floor(cpus().length / 2)));
if (!(concurrency >= 1)) fail('--concurrency must be a whole number of 1 or more.');
const maxMb = values['max-mb'] ? Number(values['max-mb']) : null;
if (maxMb !== null && !(maxMb >= 2)) fail('--max-mb must be a number of megabytes, 2 or more.');

let status: Status = { state: 'rendering', percent: 0, frames: 0, total: Math.round(plan.total * plan.fps) };
const save = (patch: Partial<Status>) => {
  status = { ...status, ...patch };
  writeJson(statusFile, status);
};

try {
  const { renderer, common } = await openProject(p);
  const composition = await renderer.selectComposition({ ...common, id: 'Reel' });
  save({ total: composition.durationInFrames });

  let lastSaved = 0;
  await renderer.renderMedia({
    ...common,
    composition,
    codec: 'h264',
    crf: 22,
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    imageFormat: 'jpeg',
    jpegQuality: 92,
    audioCodec: 'aac',
    concurrency,
    outputLocation: raw,
    overwrite: true,
    onProgress: ({ progress, renderedFrames }) => {
      if (Date.now() - lastSaved < 1000) return;
      lastSaved = Date.now();
      save({ percent: Math.round(progress * 95), frames: renderedFrames });
    },
  });

  save({ state: 'finishing', percent: 96, frames: composition.durationInFrames });
  const measure = run('ffmpeg', ['-hide_banner', '-i', raw, '-af', loudnormFilter(), '-vn', '-f', 'null', '-']);
  const measured = parseLoudnorm(measure.out);
  const audioArgs = measured ? ['-af', loudnormFilter(measured), '-ar', '48000', '-c:a', 'aac', '-b:a', '192k'] : ['-c:a', 'copy'];
  const mux = run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c:v', 'copy', ...audioArgs, '-movflags', '+faststart', final]);
  if (!mux.ok) throw new Error(`ffmpeg could not write the final file.\n${mux.out}`);

  const sizeMb = () => statSync(final).size / 1024 ** 2;
  let shrunk = false;
  if (maxMb !== null && sizeMb() > maxMb) {
    const small = join(p.out, 'final.small.mp4');
    const r = run('ffmpeg', ['-y', '-v', 'error', '-i', final, ...shrinkArgs(maxMb, plan.total), small]);
    if (!r.ok) throw new Error(`ffmpeg could not shrink the file to ${maxMb} MB.\n${r.out}`);
    renameSync(small, final);
    shrunk = true;
  }

  const probe = run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', final]);
  const size = FRAME[loadStory(p).format ?? 'portrait'];
  const problems = verifyStreams(JSON.parse(probe.out) as Probe, plan.total, plan.fps, size);

  const sheet = join(p.out, 'final_check.jpg');
  const checkTimes = finalCheckTimes(loadStory(p).captions, plan.total);
  const picks = checkTimes.map((t) => `eq(n\\,${Math.round(t * plan.fps)})`).join('+');
  run('ffmpeg', ['-y', '-v', 'error', '-i', final, '-vf', `select='${picks}',scale=-1:480,tile=${checkTimes.length}x1:padding=8:color=white`, '-frames:v', '1', '-q:v', '3', sheet]);
  rmSync(raw, { force: true });

  const message = [
    measured ? `Loudness: ${measured.input_i} LUFS in, normalised to -14 LUFS.` : 'Loudness could not be measured; the audio was left as rendered.',
    problems.length ? `Problems:\n${problems.map((x) => `  - ${x}`).join('\n')}` : `The file passed every check: ${size.width}x${size.height}, 30 fps, H.264, AAC 48 kHz, full length.`,
    `Size: ${sizeMb().toFixed(1)} MB${shrunk ? ` (re-encoded to stay under ${maxMb} MB)` : ''}.`,
    `Frames of the finished file at ${checkTimes.map((t) => `${t.toFixed(1)}s`).join(', ')}: ${sheet}`,
  ].join('\n');
  save({ state: problems.length ? 'failed' : 'done', percent: 100, message, output: final });
  console.log(`${message}\nOutput: ${final}`);
  process.exit(problems.length ? 1 : 0);
} catch (err) {
  if (existsSync(final)) renameSync(final, `${final}.failed`);
  save({ state: 'failed', message: (err as Error).message });
  console.error(err);
  process.exit(1);
}
