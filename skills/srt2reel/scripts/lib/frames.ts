import type { Story } from './types.ts';

export type Shot = { frame: number; t: number; label: string };

const MIN_GAP = 0.2;

// Frames worth looking at before a render: shortly after every cut, the middle of
// every caption, and the very last frame.
// `range` limits the result to one stretch of a long video.
export function pickFrames(story: Story, total: number, fps: number, max = 48, range: [number, number] = [0, Infinity]): Shot[] {
  const lastFrame = Math.max(0, Math.round(total * fps) - 1);
  const inRange = (shot: { t: number }) => shot.t >= range[0] && shot.t <= range[1];
  const sceneShots = story.scenes.map((sc) => ({ t: sc.s + Math.min(0.7, (sc.e - sc.s) / 2), label: `scene ${sc.id}` })).filter(inRange);
  const captionShots = story.captions.map((c, i) => ({ t: (c.s + c.e) / 2, label: `caption ${i + 1}` })).filter(inRange);
  const end = { t: lastFrame / fps, label: 'last frame' };

  const room = Math.max(0, max - sceneShots.length - 1);
  const thinned =
    captionShots.length <= room
      ? captionShots
      : Array.from({ length: room }, (_, k) => captionShots[Math.floor((k * captionShots.length) / room)]!);

  const ordered = [...sceneShots, ...thinned, ...(inRange(end) ? [end] : [])].sort((a, b) => a.t - b.t);
  const out: Shot[] = [];
  for (const shot of ordered) {
    const frame = Math.min(lastFrame, Math.max(0, Math.round(shot.t * fps)));
    const prev = out.at(-1);
    if (prev && (frame === prev.frame || shot.t - prev.t < MIN_GAP)) {
      prev.label += ` + ${shot.label}`;
      continue;
    }
    out.push({ frame, t: frame / fps, label: shot.label });
  }
  return out;
}
