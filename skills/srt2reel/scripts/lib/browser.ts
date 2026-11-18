import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { run } from './project.ts';

function playwrightShells(): string[] {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/pw-browsers',
    join(homedir(), '.cache', 'ms-playwright'),
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    join(homedir(), 'AppData', 'Local', 'ms-playwright'),
  ].filter((r): r is string => !!r && existsSync(r));
  const found: string[] = [];
  for (const root of roots) {
    for (const dir of readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
      for (const sub of readdirSync(join(root, dir))) {
        for (const exe of ['headless_shell', 'chrome-headless-shell', 'headless_shell.exe', 'chrome-headless-shell.exe']) {
          const file = join(root, dir, sub, exe);
          if (existsSync(file)) found.push(file);
        }
      }
    }
  }
  return found;
}

function systemBrowsers(): string[] {
  const fixed = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(existsSync);
  if (process.platform === 'win32') return fixed;
  const onPath = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
    .map((name) => run('which', [name]))
    .filter((r) => r.ok && r.out)
    .map((r) => r.out.split('\n')[0]!);
  return [...fixed, ...onPath];
}

// Browsers already on this machine, best first. SRT2REEL_BROWSER overrides the search.
export function findBrowsers(): string[] {
  const forced = process.env.SRT2REEL_BROWSER;
  if (forced && existsSync(forced)) return [forced];
  return [...playwrightShells(), ...systemBrowsers()];
}

export const isHeadlessShell = (file: string) => /headless[_-]shell/i.test(file);
