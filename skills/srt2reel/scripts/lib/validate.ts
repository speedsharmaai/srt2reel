import { displayWidth, hasEmoji, isSpaceless, plainCaption, wordingKey } from './text.ts';
import type { Caption, Format, Report, Silence, Story, Timed } from './types.ts';

export const MAX_LINES = 2;
export const FRAME = { portrait: { width: 1080, height: 1920 }, landscape: { width: 1920, height: 1080 } };

// Columns that fit on one caption line: a phone screen is narrow, a 16:9 frame is wide.
export const maxCols = (format: Format = 'portrait') => (format === 'landscape' ? 42 : 26);
const READING_SPEED = 30;
const MIN_ON_SCREEN = 0.5;
const MAX_LIFT = 250;
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;

export type Context = {
  story: Story;
  cues: Timed[];
  total: number;
  fps?: number;
  sceneIds?: Set<string> | null;
  silences?: Silence[];
  sfxNames?: string[];
  themes?: string[];
};

function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const around = (s: string) => s.slice(Math.max(0, i - 12), i + 12);
  return `near "${around(a)}" (captions) vs "${around(b)}" (SRT)`;
}

function checkWording(story: Story, cues: Timed[], errors: string[]) {
  const mine = wordingKey(story.captions.map((c) => c.t).join(' '));
  const theirs = wordingKey(cues.map((c) => c.text).join(' '));
  if (mine !== theirs) {
    errors.push(`Caption wording differs from the SRT ${firstDifference(mine, theirs)}. Captions must use the SRT's exact words.`);
  }
}

function checkHighlights(cap: Caption, n: number, errors: string[]) {
  const t = cap.t;
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '{') {
      depth++;
      const before = t[i - 1];
      if (depth === 1 && before && WORD_CHAR.test(before) && !isSpaceless(before)) {
        errors.push(`Caption ${n}: a highlight starts inside a word. Highlight whole words only.`);
      }
    } else if (t[i] === '}') {
      depth--;
      const after = t[i + 1];
      if (depth === 0 && after && WORD_CHAR.test(after) && !isSpaceless(after)) {
        errors.push(`Caption ${n}: a highlight ends inside a word. Highlight whole words only.`);
      }
    }
    if (depth < 0 || depth > 1) break;
  }
  if (depth !== 0) errors.push(`Caption ${n}: unbalanced { } in "${t}".`);
  if (/\{\s*\}/.test(t)) errors.push(`Caption ${n}: empty highlight { }.`);
}

function checkCaptions(story: Story, total: number, fps: number, errors: string[], warnings: string[]) {
  const frame = 1 / fps;
  story.captions.forEach((c, idx) => {
    const n = idx + 1;
    if (typeof c.t !== 'string' || !c.t.trim()) {
      errors.push(`Caption ${n} has no text.`);
      return;
    }
    if (!(c.e > c.s)) errors.push(`Caption ${n} ends before it starts.`);
    if (c.s < 0 || c.e > total + frame) errors.push(`Caption ${n} is outside the video (0 to ${total}s).`);
    const prev = story.captions[idx - 1];
    if (prev && c.s < prev.e - frame) errors.push(`Captions ${n - 1} and ${n} overlap.`);
    checkHighlights(c, n, errors);

    const lines = c.t.replace(/[{}]/g, '').split('\n');
    if (lines.length > MAX_LINES) errors.push(`Caption ${n} has ${lines.length} lines; the limit is ${MAX_LINES}.`);
    const limit = maxCols(story.format);
    const widest = Math.max(...lines.map(displayWidth));
    if (widest > limit * 1.5) errors.push(`Caption ${n} has a line ${widest} columns wide; split it (limit about ${limit}).`);
    else if (widest > limit) warnings.push(`Caption ${n} is ${widest} columns wide and will be shrunk to fit.`);

    const dur = c.e - c.s;
    const speed = displayWidth(plainCaption(c.t)) / dur;
    if (dur < MIN_ON_SCREEN) warnings.push(`Caption ${n} is on screen for only ${dur.toFixed(2)}s.`);
    else if (speed > READING_SPEED) warnings.push(`Caption ${n} needs ${speed.toFixed(0)} columns per second to read; let it end later, in the pause after it.`);
    if (hasEmoji(c.t)) warnings.push(`Caption ${n} contains emoji, which may render as an empty box.`);
  });
}

function checkScenes(ctx: Context, fps: number, errors: string[], warnings: string[]) {
  const { story, total, sceneIds, silences } = ctx;
  const frame = 1 / fps;
  const scenes = story.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    errors.push('The story has no scenes.');
    return;
  }
  const first = scenes[0]!;
  const last = scenes.at(-1)!;
  if (Math.abs(first.s) > frame) errors.push('The first scene must start at 0.');
  if (Math.abs(last.e - total) > frame) errors.push(`The last scene must end at ${total}s (it ends at ${last.e}s).`);

  scenes.forEach((sc, idx) => {
    const n = idx + 1;
    if (!sc.id) errors.push(`Scene ${n} has no id.`);
    else if (sceneIds && !sceneIds.has(sc.id)) errors.push(`Scene "${sc.id}" is not defined in src/scenes.tsx.`);
    if (!(sc.e > sc.s)) errors.push(`Scene ${n} ends before it starts.`);
    const prev = scenes[idx - 1];
    if (prev && Math.abs(sc.s - prev.e) > frame) {
      errors.push(`Scene ${n} starts at ${sc.s}s but scene ${n - 1} ends at ${prev.e}s; scenes must touch.`);
    }
    const len = sc.e - sc.s;
    if (len < 0.8) warnings.push(`Scene ${n} (${sc.id}) is only ${len.toFixed(2)}s long.`);
    if (len > 12) warnings.push(`Scene ${n} (${sc.id}) runs ${len.toFixed(1)}s; add a visual change inside it or split it.`);
    if (sc.tag && displayWidth(sc.tag) > 18) warnings.push(`Scene ${n} tag "${sc.tag}" is long; keep tags to 1-3 words.`);
    const inPause = silences?.some((x) => sc.s >= x.s - 0.05 && sc.s <= x.e + 0.05);
    if (prev && silences && !inPause) {
      const midSentence = story.captions.some((c) => sc.s > c.s + 0.15 && sc.s < c.e - 0.15);
      if (midSentence) warnings.push(`Scene ${n} cuts at ${sc.s}s while the voice is mid-sentence; move the cut to a pause.`);
    }
  });
}

function checkSettings(ctx: Context, errors: string[], warnings: string[]) {
  const { story, total, sfxNames, themes } = ctx;
  if (themes && !themes.includes(story.theme)) errors.push(`theme must be one of: ${themes.join(', ')}.`);
  if (story.dir !== 'ltr' && story.dir !== 'rtl') errors.push('dir must be "ltr" or "rtl".');
  if (story.format !== undefined && story.format !== 'portrait' && story.format !== 'landscape') errors.push('format must be "portrait" or "landscape".');
  const lift = story.captionLift ?? 0;
  if (typeof lift !== 'number' || lift < 0 || lift > MAX_LIFT) errors.push(`captionLift must be a number from 0 to ${MAX_LIFT}.`);
  try {
    Intl.getCanonicalLocales(story.lang);
  } catch {
    errors.push(`lang "${story.lang}" is not a valid language tag (use for example "en", "hi", "ar", "zh-TW").`);
  }
  for (const [who, windows] of Object.entries(story.speak ?? {})) {
    for (const w of windows) {
      if (!Array.isArray(w) || !(w[1] > w[0]) || w[0] < 0 || w[1] > total + 0.05) {
        errors.push(`speak.${who} has a bad window ${JSON.stringify(w)}; use [start, end] in seconds.`);
      }
    }
  }
  (story.sfx ?? []).forEach(([name, at, vol], idx) => {
    if (sfxNames && !sfxNames.includes(name)) errors.push(`sfx ${idx + 1}: unknown sound "${name}" (have: ${sfxNames.join(', ')}).`);
    if (!(at >= 0 && at < total)) errors.push(`sfx ${idx + 1}: time ${at}s is outside the video.`);
    if (!(vol > 0 && vol <= 1)) errors.push(`sfx ${idx + 1}: volume must be between 0 and 1.`);
  });
  if (story.format === 'landscape') return;
  if (total > 180) warnings.push(`The video is ${total.toFixed(0)}s; YouTube Shorts allows at most 180s. For a longer video use the landscape format.`);
  else if (total > 90) warnings.push(`The video is ${total.toFixed(0)}s; Facebook Reels via the API allows at most 90s.`);
}

export function validateStory(ctx: Context): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fps = ctx.fps ?? 30;
  if (!Array.isArray(ctx.story.captions) || ctx.story.captions.length === 0) {
    errors.push('The story has no captions.');
    return { errors, warnings };
  }
  checkWording(ctx.story, ctx.cues, errors);
  checkCaptions(ctx.story, ctx.total, fps, errors, warnings);
  checkScenes(ctx, fps, errors, warnings);
  checkSettings(ctx, errors, warnings);
  return { errors, warnings };
}

// Scene ids are the keys of the SCENES object in src/scenes.tsx.
export function sceneIdsFrom(source: string): Set<string> | null {
  const start = source.search(/export\s+const\s+SCENES\b/);
  if (start < 0) return null;
  const open = source.indexOf('{', source.indexOf('=', start));
  if (open < 0) return null;
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = source
    .slice(open + 1, end)
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const ids = new Set<string>();
  for (const part of body.split(',')) {
    const m = /^\s*(?:(['"])(.+?)\1|([A-Za-z_$][\w$]*))\s*(?::|$)/.exec(part);
    const id = m?.[2] ?? m?.[3];
    if (id) ids.add(id);
  }
  return ids;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const lin = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
