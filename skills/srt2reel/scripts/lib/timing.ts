import { displayWidth, joinTokens, splitIndex, tokens, wrapLines } from './text.ts';
import type { Caption, Plan, Silence, Timed } from './types.ts';

const SNAP_WINDOW = 0.35;
const MIN_CAPTION = 0.3;
const EDGE = 0.08;
const r2 = (v: number) => Math.round(v * 100) / 100;

function nearest(values: number[], target: number, window: number): number | null {
  let best: number | null = null;
  for (const v of values) {
    const d = Math.abs(v - target);
    if (d <= window && (best === null || d < Math.abs(best - target))) best = v;
  }
  return best;
}

// SRT times are often a little early or late. A cue edge that falls inside a pause,
// or close to one, is moved to where the voice really starts or stops.
export function snapCues<T extends Timed>(cues: T[], silences: Silence[], duration: number): T[] {
  const speechStarts = silences.map((x) => x.e).filter((t) => t < duration - 0.01);
  const speechEnds = silences.map((x) => x.s).filter((t) => t > 0.01);
  const pauseAt = (t: number) => silences.find((x) => t >= x.s - EDGE && t <= x.e + EDGE);
  const out = cues.map((c) => {
    const startPause = pauseAt(c.s);
    const endPause = pauseAt(c.e);
    const s = startPause && startPause.e < duration - 0.01 ? startPause.e : (nearest(speechStarts, c.s, SNAP_WINDOW) ?? c.s);
    const e = endPause && endPause.s > 0.01 ? endPause.s : (nearest(speechEnds, c.e, SNAP_WINDOW) ?? c.e);
    return e - s >= MIN_CAPTION ? { ...c, s, e } : { ...c };
  });
  for (let i = 0; i < out.length; i++) {
    const c = out[i]!;
    const next = out[i + 1];
    c.e = Math.min(c.e, duration);
    if (next && c.e > next.s) {
      const mid = (c.e + next.s) / 2;
      c.e = mid;
      next.s = mid;
    }
    c.s = r2(c.s);
    c.e = r2(c.e);
  }
  return out;
}

function splitCue(cue: Timed, maxCols: number, locale: string): Timed[] {
  if (displayWidth(cue.text) <= maxCols * 2) return [cue];
  const toks = tokens(cue.text, locale);
  if (toks.length < 2) return [cue];
  const cut = splitIndex(toks);
  const left = joinTokens(toks.slice(0, cut));
  const right = joinTokens(toks.slice(cut));
  const share = displayWidth(left) / (displayWidth(left) + displayWidth(right));
  const mid = r2(cue.s + (cue.e - cue.s) * share);
  return [
    ...splitCue({ s: cue.s, e: mid, text: left }, maxCols, locale),
    ...splitCue({ s: mid, e: cue.e, text: right }, maxCols, locale),
  ];
}

// Cues too long for two lines are split first, then every edge is moved onto the
// nearest real pause, then each caption is wrapped.
export function buildCaptions(
  cues: Timed[],
  silences: Silence[],
  duration: number,
  { maxCols, locale }: { maxCols: number; locale: string },
): Caption[] {
  const pieces = cues.flatMap((c) => splitCue({ s: c.s, e: c.e, text: c.text }, maxCols, locale));
  return snapCues(pieces, silences, duration).map((c) => ({ s: c.s, e: c.e, t: wrapLines(c.text, maxCols, locale).join('\n') }));
}

// Pauses long enough to cut a scene on, with the caption that follows each.
export function cutPoints(silences: Silence[], captions: Caption[], duration: number, minPause = 0.3): Plan['cuts'] {
  return silences
    .filter((x) => x.d >= minPause && x.s > 0.2 && x.e < duration - 0.2)
    .map((x) => {
      const inside = captions.findIndex((c) => c.s < x.s - EDGE && c.e > x.e + EDGE);
      const next = captions.findIndex((c) => c.s >= x.s - EDGE);
      return {
        at: r2((x.s + x.e) / 2),
        pause: x.d,
        beforeCaption: inside >= 0 || next < 0 ? null : next + 1,
        insideCaption: inside < 0 ? null : inside + 1,
      };
    });
}

export function totalDuration(voiceDuration: number, hold: number, fps: number): number {
  return Math.ceil((voiceDuration + hold) * fps) / fps;
}
