import { statfsSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { findBrowsers } from './lib/browser.ts';
import { has, pnpmVersion, run } from './lib/project.ts';

// Checks that this machine can build a video, before any time is spent on one.

const MIN_NODE = [22, 18];
const lines: string[] = [];
let blocked = false;

const ok = (what: string) => lines.push(`  ok    ${what}`);
const warn = (what: string) => lines.push(`  warn  ${what}`);
const bad = (what: string) => {
  lines.push(`  FAIL  ${what}`);
  blocked = true;
};

const [major, minor] = process.versions.node.split('.').map(Number) as [number, number];
if (major > MIN_NODE[0]! || (major === MIN_NODE[0] && minor >= MIN_NODE[1]!)) ok(`Node ${process.versions.node}`);
else bad(`Node ${process.versions.node} is too old; ${MIN_NODE.join('.')} or newer is needed.`);

for (const tool of ['ffmpeg', 'ffprobe']) {
  if (has(tool, '-version')) ok(tool);
  else bad(`${tool} is not installed (macOS: brew install ffmpeg, Debian/Ubuntu: apt install ffmpeg, Windows: winget install ffmpeg).`);
}

const pnpm = pnpmVersion();
if (pnpm) ok(`pnpm ${pnpm}`);
else if (has('npm')) ok(`npm ${run('npm', ['--version'], tmpdir()).out}`);
else bad('Neither pnpm nor npm is available.');

const browsers = findBrowsers();
if (browsers.length) ok(`browser found: ${browsers[0]}`);
else warn('No Chrome or Chromium found. Remotion will download its own (about 90 MB) on the first render, which needs network access.');

try {
  const fs = statfsSync(tmpdir());
  const freeGb = (fs.bavail * fs.bsize) / 1024 ** 3;
  if (freeGb < 1.5) warn(`Only ${freeGb.toFixed(1)} GB of disk is free; a project needs about 1 GB.`);
  else ok(`${freeGb.toFixed(0)} GB disk free`);
} catch {
  warn('Could not read free disk space.');
}

ok(`${cpus().length} CPU cores`);

console.log(lines.join('\n'));
console.log(blocked ? '\nThis machine cannot build the video yet. Fix the FAIL lines above.' : '\nReady.');
process.exit(blocked ? 1 : 0);
