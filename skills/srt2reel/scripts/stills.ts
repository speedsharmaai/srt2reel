import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pickFrames } from './lib/frames.ts';
import type { Shot } from './lib/frames.ts';
import { fail, fmt, loadPlan, loadStory, requireProject, run } from './lib/project.ts';
import { openProject } from './lib/remotion.ts';

// Renders the frames that matter and tiles them into contact sheets to look at
// before spending minutes on a full render.

const SCALE = 1 / 3;
const PARALLEL = 3;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    kit: { type: 'boolean', default: false },
    at: { type: 'string' },
    range: { type: 'string' },
    grid: { type: 'boolean', default: false },
  },
});

const p = requireProject(positionals[0]);
const outDir = join(p.out, values.kit ? 'kit' : 'stills');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const { renderer, common } = await openProject(p, { debug: !values.kit, grid: values.grid });
const browser = await renderer.openBrowser('chrome', { browserExecutable: common.browserExecutable, chromeMode: common.chromeMode, logLevel: 'error' });

try {
  const composition = await renderer.selectComposition({ ...common, id: values.kit ? 'Kit' : 'Reel', puppeteerInstance: browser });
  const fps = composition.fps;

  let shots: Shot[];
  if (values.kit) {
    const each = 90;
    shots = Array.from({ length: composition.durationInFrames / each }, (_, i) => ({ frame: i * each + 75, t: 0, label: `example ${i + 1}` }));
  } else if (values.at) {
    const times = values.at.split(',').map(Number);
    if (times.some((t) => !(t >= 0))) fail('--at takes seconds separated by commas, for example --at 1.5,12,30.2');
    shots = times.map((t) => ({ frame: Math.min(composition.durationInFrames - 1, Math.round(t * fps)), t, label: 'requested' }));
  } else {
    const range = values.range?.split('-').map(Number) as [number, number] | undefined;
    if (range && !(range.length === 2 && range[0] >= 0 && range[1] > range[0])) fail('--range takes start-end in seconds, for example --range 120-240');
    shots = pickFrames(loadStory(p), loadPlan(p).total, fps, 48, range);
    if (shots.length === 0) fail('No scenes or captions fall inside that range.');
  }

  const file = (i: number) => join(outDir, `${String(i + 1).padStart(3, '0')}.jpg`);
  let next = 0;
  const worker = async () => {
    while (next < shots.length) {
      const i = next++;
      await renderer.renderStill({ ...common, composition, frame: shots[i]!.frame, output: file(i), scale: SCALE, imageFormat: 'jpeg', jpegQuality: 85, puppeteerInstance: browser });
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  // Tall frames tile four across, wide frames three across, so that each cell stays readable.
  const wide = composition.width > composition.height;
  const columns = Math.min(wide ? 3 : 4, shots.length);
  const rows = Math.min(wide ? 4 : 3, Math.ceil(shots.length / columns));
  const per = columns * rows;
  const tile = run('ffmpeg', [
    '-y', '-v', 'error', '-start_number', '1', '-i', join(outDir, '%03d.jpg'),
    '-vf', `tile=${columns}x${rows}:padding=8:margin=8:color=white`,
    '-fps_mode', 'passthrough', '-q:v', '3', join(outDir, 'sheet_%02d.jpg'),
  ]);
  if (!tile.ok) fail(`Could not build the contact sheet.\n${tile.out}`);

  const sheets = readdirSync(outDir).filter((f) => f.startsWith('sheet_')).sort();
  console.log(`Rendered ${shots.length} frames into ${sheets.length} contact sheet(s). Cells read left to right, top to bottom.\n`);
  sheets.forEach((sheet, s) => {
    console.log(join(outDir, sheet));
    shots.slice(s * per, (s + 1) * per).forEach((shot, i) => {
      console.log(`  ${String(i + 1).padStart(2)}  ${values.kit ? '' : `${fmt(shot.t)}s  `}${shot.label}`);
    });
  });
  console.log('\nOpen every sheet and look at it before rendering.');
} finally {
  await browser.close({ silent: true });
}
