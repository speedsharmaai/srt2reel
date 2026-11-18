import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AudioData, FontManifest, Plan, Story } from './types.ts';

export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TEMPLATE_DIR = join(SKILL_DIR, 'template');
export const FPS = 30;

export function paths(projectDir: string) {
  const root = resolve(projectDir);
  return {
    root,
    pkg: join(root, 'package.json'),
    story: join(root, 'src', 'story.json'),
    scenes: join(root, 'src', 'scenes.tsx'),
    themes: join(root, 'src', 'lib', 'themes.json'),
    audio: join(root, 'src', 'generated', 'audio.json'),
    fonts: join(root, 'src', 'generated', 'fonts.json'),
    plan: join(root, '.srt2reel', 'plan.json'),
    voice: join(root, 'public', 'voice.mp3'),
    publicFonts: join(root, 'public', 'fonts'),
    sfx: join(root, 'public', 'sfx'),
    out: join(root, 'out'),
    entry: join(root, 'src', 'index.ts'),
  };
}

export type Paths = ReturnType<typeof paths>;

// All scene code the author wrote: scenes.tsx and anything else in src/ outside lib/ and generated/.
export function sceneSources(p: Paths): string {
  const src = join(p.root, 'src');
  const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f) && !/^(lib|generated)[\\/]/.test(f));
  return files.map((f) => readFileSync(join(src, f), 'utf8')).join('\n');
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, value: unknown, compact = false) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, compact ? undefined : 2)}\n`);
}

export function requireProject(projectDir: string | undefined): Paths {
  if (!projectDir) fail('Give the project folder as the first argument.');
  const p = paths(projectDir);
  if (!existsSync(p.plan) || !existsSync(p.story)) {
    fail(`${p.root} is not an srt2reel project yet. Run init.ts on it first.`);
  }
  return p;
}

export const loadStory = (p: Paths) => readJson<Story>(p.story);
export const loadPlan = (p: Paths) => readJson<Plan>(p.plan);
export const loadAudio = (p: Paths) => readJson<AudioData>(p.audio);
export const loadFonts = (p: Paths) => readJson<FontManifest>(p.fonts);

export function fail(message: string): never {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

export function run(cmd: string, args: string[], cwd?: string): { ok: boolean; out: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

export const has = (cmd: string, arg = '--version') => run(cmd, [arg], tmpdir()).ok;

// pnpm when it is installed, npm otherwise. A project keeps whichever installed it.
export function packageManager(p: Paths): 'pnpm' | 'npm' {
  if (existsSync(join(p.root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(p.root, 'package-lock.json'))) return 'npm';
  return pnpmVersion() ? 'pnpm' : 'npm';
}

export function pnpmVersion(): string | null {
  const r = run('pnpm', ['--version'], tmpdir());
  const v = r.out.split('\n').at(-1)?.trim() ?? '';
  return r.ok && /^\d+\.\d+\.\d+/.test(v) ? v : null;
}

export function install(p: Paths, packages: string[] = []) {
  const pm = packageManager(p);
  if (pm === 'pnpm') {
    // A packageManager pin stops a parent folder's setting (for example yarn in $HOME) from blocking pnpm.
    const pkg = readJson<Record<string, unknown>>(p.pkg);
    if (!pkg.packageManager) writeJson(p.pkg, { ...pkg, packageManager: `pnpm@${pnpmVersion()}` });
  }
  const args = packages.length ? [pm === 'pnpm' ? 'add' : 'install', ...packages] : ['install'];
  console.log(`> ${pm} ${args.join(' ')}`);
  const r = run(pm, args, p.root);
  if (!r.ok) fail(`${pm} ${args.join(' ')} failed. This step needs network access to the npm registry.\n${r.out.slice(-1500)}`);
}

export const fmt = (seconds: number) => seconds.toFixed(2).padStart(6);
