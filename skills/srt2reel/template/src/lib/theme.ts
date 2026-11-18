import themes from './themes.json';
import storyJson from '../story.json';
import audio from '../generated/audio.json';

export type Caption = { s: number; e: number; t: string; who?: string };
export type SceneCue = { id: string; s: number; e: number; tag?: string; props?: Record<string, unknown> };
export type Story = {
  lang: string;
  dir: 'ltr' | 'rtl';
  format?: 'portrait' | 'landscape';
  page: string;
  theme: string;
  captionLift: number;
  numerals?: string;
  captions: Caption[];
  scenes: SceneCue[];
  speak: Record<string, [number, number][]>;
  sfx: [string, number, number][];
};
export type Theme = (typeof themes)['paper'];

export const story = storyJson as unknown as Story;
export const C: Theme = (themes as Record<string, Theme>)[story.theme] ?? themes.paper;

export const FPS: number = audio.fps;
export const TOTAL: number = audio.total;
export const RMS: number[] = audio.rms;

// Scenes are drawn in a 540x960 space (960x540 for landscape) and rendered at twice that size.
export const LANDSCAPE = story.format === 'landscape';
export const W = LANDSCAPE ? 960 : 540;
export const H = LANDSCAPE ? 540 : 960;
export const CX = W / 2;
export const FLOOR_Y = LANDSCAPE ? 385 : 606;

// Sizes and positions that make a person fit the frame: <Person y={POSE.standY} s={POSE.s} />.
export const POSE = LANDSCAPE ? { s: 0.6, standY: 280, sitY: 300, deskY: 255 } : { s: 0.8, standY: 500, sitY: 560, deskY: 500 };

// Where the fixed parts sit, in the drawing space. Phone apps cover the top and bottom
// of a vertical video with their own buttons; see references/platforms.md.
const lift = story.captionLift ?? 0;
export const LAYOUT = LANDSCAPE
  ? { side: 60, pageTop: 22, tagTop: 20, captionBottom: 26 + lift, captionWidth: 720, captionSize: 26, contentTop: 80, contentBottom: 410 - lift }
  : { side: 50, pageTop: 60, tagTop: 100, captionBottom: 170 + lift, captionWidth: 440, captionSize: 28, contentTop: 155, contentBottom: 680 - lift };

export const F = { text: "'Reel Text', sans-serif", display: "'Reel Display', 'Reel Text', serif" };
export const RTL = story.dir === 'rtl';

export const T = (seconds: number) => Math.round(seconds * FPS);
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const SPRING = { damping: 14, stiffness: 150, mass: 0.8 };

const numberLocale = story.numerals ? `${story.lang}-u-nu-${story.numerals}` : story.lang;
const plain = new Intl.NumberFormat(numberLocale, { useGrouping: false });
const grouped = new Intl.NumberFormat(numberLocale);

// Digits in the story's own numbering system: num(12) is "12" in English and "১২" in Bengali.
export const num = (n: number, group = false) => (group ? grouped : plain).format(n);

const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-｠]/u;
const clusters = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// Columns a string takes on screen. CJK glyphs count as two.
export const cols = (text: string) => {
  let n = 0;
  for (const { segment } of clusters.segment(text)) n += WIDE.test(segment) ? 2 : 1;
  return n;
};

// A font size that keeps `text` inside `maxWidth`, never larger than `size`.
export const fitSize = (text: string, size: number, maxWidth: number, perCol = 0.58) => {
  const need = cols(text) * size * perCol;
  return need <= maxWidth ? size : Math.max(size * 0.5, (size * maxWidth) / need);
};
