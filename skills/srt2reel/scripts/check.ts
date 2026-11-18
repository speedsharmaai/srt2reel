import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncFonts } from './lib/fontsync.ts';
import { loadPlan, loadStory, readJson, requireProject, run, sceneSources } from './lib/project.ts';
import type { Paths } from './lib/project.ts';
import { SFX_NAMES } from './lib/sfx.ts';
import type { Report } from './lib/types.ts';
import { sceneIdsFrom, validateStory } from './lib/validate.ts';

// Checks a project before any frame is rendered: caption wording against the SRT,
// timing, scenes, fonts, and that the scene code compiles.

export function checkProject(p: Paths, { types = true } = {}): Report {
  let story;
  try {
    story = loadStory(p);
  } catch (err) {
    return { errors: [`src/story.json is not valid JSON: ${(err as Error).message}`], warnings: [] };
  }
  const plan = loadPlan(p);
  const scenesSource = readFileSync(p.scenes, 'utf8');
  const sceneIds = sceneIdsFrom(scenesSource);

  const report = validateStory({
    story,
    cues: plan.cues,
    total: plan.total,
    fps: plan.fps,
    sceneIds,
    silences: plan.silences,
    sfxNames: SFX_NAMES,
    themes: Object.keys(readJson<Record<string, unknown>>(p.themes)),
  });
  if (!sceneIds) report.errors.push('src/scenes.tsx must export a SCENES object: export const SCENES: Record<string, Scene> = { ... }');

  if (report.errors.length === 0) {
    const fonts = syncFonts(p, story, sceneSources(p));
    if (fonts.missing.length) {
      report.errors.push(`The font ${fonts.ids.text} cannot draw: ${fonts.missing.join(' ')}. Set "lang" correctly in story.json, or set "fonts" to a font that covers this text.`);
    }
  }

  if (types) {
    const tsc = join(p.root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
    if (!existsSync(tsc)) report.errors.push('TypeScript is not installed in the project. Run init.ts again.');
    else {
      const r = run(tsc, ['--noEmit', '--pretty', 'false'], p.root);
      if (!r.ok) report.errors.push(`The scene code does not compile:\n${r.out.split('\n').slice(0, 25).join('\n')}`);
    }
  }
  return report;
}

export function printReport(report: Report) {
  for (const w of report.warnings) console.log(`  warn   ${w}`);
  for (const e of report.errors) console.log(`  ERROR  ${e}`);
  console.log(
    report.errors.length
      ? `\n${report.errors.length} error(s). Fix them and run check again.`
      : `\nCheck passed${report.warnings.length ? ` with ${report.warnings.length} warning(s)` : ''}.`,
  );
}

if (import.meta.main) {
  const report = checkProject(requireProject(process.argv[2]));
  printReport(report);
  process.exit(report.errors.length ? 1 : 0);
}
