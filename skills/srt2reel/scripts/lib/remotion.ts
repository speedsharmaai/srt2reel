import { createRequire } from 'node:module';
import { join } from 'node:path';
import { findBrowsers, isHeadlessShell } from './browser.ts';
import { fail } from './project.ts';
import type { Paths } from './project.ts';

// The slice of Remotion's Node API these scripts use. Remotion is loaded from the
// project's own node_modules, so the skill folder itself needs no install.
export type Composition = { id: string; durationInFrames: number; fps: number; width: number; height: number };
type BrowserChoice = { browserExecutable: string | null; chromeMode: 'headless-shell' | 'chrome-for-testing' };
type Common = BrowserChoice & { serveUrl: string; inputProps: Record<string, unknown>; logLevel: 'error'; timeoutInMilliseconds: number };
type Renderer = {
  ensureBrowser(o: Partial<BrowserChoice> & { logLevel: 'error' }): Promise<unknown>;
  openBrowser(kind: 'chrome', o: BrowserChoice & { logLevel: 'error' }): Promise<{ close(o?: { silent: boolean }): Promise<void> }>;
  selectComposition(o: Common & { id: string; puppeteerInstance?: unknown }): Promise<Composition>;
  renderStill(o: Common & { composition: Composition; frame: number; output: string; scale: number; imageFormat: 'jpeg'; jpegQuality: number; puppeteerInstance?: unknown }): Promise<unknown>;
  renderMedia(o: Common & {
    composition: Composition;
    codec: 'h264';
    crf: number;
    pixelFormat: 'yuv420p';
    colorSpace: 'bt709';
    imageFormat: 'jpeg';
    jpegQuality: number;
    audioCodec: 'aac';
    concurrency: number;
    outputLocation: string;
    overwrite: true;
    onProgress(p: { progress: number; renderedFrames: number; encodedFrames: number }): void;
  }): Promise<unknown>;
};

async function chooseBrowser(renderer: Renderer): Promise<BrowserChoice> {
  const forced = process.env.SRT2REEL_BROWSER;
  const local = findBrowsers();
  if (forced && local[0] === forced) return { browserExecutable: forced, chromeMode: isHeadlessShell(forced) ? 'headless-shell' : 'chrome-for-testing' };
  try {
    await renderer.ensureBrowser({ logLevel: 'error' });
    return { browserExecutable: null, chromeMode: 'headless-shell' };
  } catch (err) {
    const found = local[0];
    if (!found) {
      fail(
        `No browser is available to render with. Remotion could not download its own (${(err as Error).message.split('\n')[0]}) and none was found on this machine. ` +
          'Install Chrome or Chromium, or set SRT2REEL_BROWSER to a Chromium executable.',
      );
    }
    return { browserExecutable: found, chromeMode: isHeadlessShell(found) ? 'headless-shell' : 'chrome-for-testing' };
  }
}

export async function openProject(p: Paths, inputProps: Record<string, unknown> = {}) {
  const require = createRequire(p.pkg);
  let bundle: (o: { entryPoint: string; publicDir: string }) => Promise<string>;
  let renderer: Renderer;
  try {
    ({ bundle } = require('@remotion/bundler'));
    renderer = require('@remotion/renderer');
  } catch {
    fail('Remotion is not installed in the project. Run init.ts on it again.');
  }
  const browser = await chooseBrowser(renderer);
  const serveUrl = await bundle({ entryPoint: p.entry, publicDir: join(p.root, 'public') });
  // The default 30 s is too short for a cold first frame on a slow machine with many font files.
  const common: Common = { ...browser, serveUrl, inputProps, logLevel: 'error', timeoutInMilliseconds: 120_000 };
  return { renderer, common, browser };
}
