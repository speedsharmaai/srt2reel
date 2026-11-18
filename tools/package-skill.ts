import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Zips skills/srt2reel into dist/srt2reel.zip for upload to claude.ai, after checking
// that the folder holds nothing that should not ship.

const root = resolve(import.meta.dirname, '..');
const skill = join(root, 'skills', 'srt2reel');
const dist = join(root, 'dist');
const zip = join(dist, 'srt2reel.zip');

const problems: string[] = [];
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const files = walk(skill);

for (const file of files) {
  const rel = file.slice(skill.length + 1);
  if (/(^|\/)(node_modules|out|\.srt2reel)\//.test(rel)) problems.push(`build output inside the skill: ${rel}`);
  if (/\.(js|mjs|cjs)$/.test(rel)) problems.push(`JavaScript file (scripts are TypeScript): ${rel}`);
  if (/\.(mp3|mp4|wav)$/.test(rel)) problems.push(`media file: ${rel}`);
}

const skillMd = readFileSync(join(skill, 'SKILL.md'), 'utf8');
const front = /^---\n([\s\S]*?)\n---/.exec(skillMd)?.[1] ?? '';
const name = /^name:\s*(.+)$/m.exec(front)?.[1]?.trim();
const description = /^description:\s*(.+)$/m.exec(front)?.[1]?.trim() ?? '';
if (name !== 'srt2reel') problems.push(`SKILL.md name is "${name}", expected "srt2reel" to match the folder`);
if (description.length === 0 || description.length > 1024) problems.push(`SKILL.md description is ${description.length} characters; it must be 1 to 1024`);
if (skillMd.split('\n').length > 500) problems.push('SKILL.md is over 500 lines');
for (const link of skillMd.matchAll(/\]\((references\/[^)]+)\)/g)) {
  if (!existsSync(join(skill, link[1]!))) problems.push(`SKILL.md links to a missing file: ${link[1]}`);
}

if (problems.length) {
  console.error(problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

mkdirSync(dist, { recursive: true });
rmSync(zip, { force: true });
const r = spawnSync('zip', ['-r', '-q', '-X', zip, 'srt2reel', '-x', '*.DS_Store'], { cwd: join(root, 'skills'), encoding: 'utf8' });
if (r.status !== 0) {
  console.error(`zip failed: ${r.stderr}`);
  process.exit(1);
}
console.log(`${files.length} files, ${(statSync(zip).size / 1024).toFixed(0)} KB -> ${zip}`);
