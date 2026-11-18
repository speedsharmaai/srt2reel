import type { Face } from './types.ts';

type Pair = [text: string, display: string];

// Fontsource package ids, [caption font, heading font] per script.
// Every id was checked against https://api.fontsource.org/v1/fonts on 2026-11-18.
const NOTO: Pair = ['noto-sans', 'noto-serif'];
export const FONT_TABLE: Record<string, Pair> = {
  Latn: NOTO,
  Cyrl: NOTO,
  Grek: NOTO,
  Deva: ['hind', 'noto-serif-devanagari'],
  Beng: ['hind-siliguri', 'noto-serif-bengali'],
  Guru: ['noto-sans-gurmukhi', 'noto-serif-gurmukhi'],
  Gujr: ['noto-sans-gujarati', 'noto-serif-gujarati'],
  Orya: ['noto-sans-oriya', 'noto-serif-oriya'],
  Taml: ['noto-sans-tamil', 'noto-serif-tamil'],
  Telu: ['noto-sans-telugu', 'noto-serif-telugu'],
  Knda: ['noto-sans-kannada', 'noto-serif-kannada'],
  Mlym: ['noto-sans-malayalam', 'noto-serif-malayalam'],
  Sinh: ['noto-sans-sinhala', 'noto-serif-sinhala'],
  Arab: ['noto-sans-arabic', 'noto-kufi-arabic'],
  Hebr: ['noto-sans-hebrew', 'noto-serif-hebrew'],
  Thai: ['noto-sans-thai', 'noto-serif-thai'],
  Laoo: ['noto-sans-lao', 'noto-serif-lao'],
  Khmr: ['noto-sans-khmer', 'noto-serif-khmer'],
  Mymr: ['noto-sans-myanmar', 'noto-serif-myanmar'],
  Hans: ['noto-sans-sc', 'noto-serif-sc'],
  Hani: ['noto-sans-sc', 'noto-serif-sc'],
  Hant: ['noto-sans-tc', 'noto-serif-tc'],
  Jpan: ['noto-sans-jp', 'noto-serif-jp'],
  Hang: ['noto-sans-kr', 'noto-serif-kr'],
  Ethi: ['noto-sans-ethiopic', 'noto-serif-ethiopic'],
  Armn: ['noto-sans-armenian', 'noto-serif-armenian'],
  Geor: ['noto-sans-georgian', 'noto-serif-georgian'],
  Tibt: ['noto-serif-tibetan', 'noto-serif-tibetan'],
  Thaa: ['noto-sans-thaana', 'noto-sans-thaana'],
  Syrc: ['noto-sans-syriac', 'noto-sans-syriac'],
  Nkoo: ['noto-sans-nko', 'noto-sans-nko'],
};

export const TEXT_WEIGHTS = [600, 700];
export const DISPLAY_WEIGHTS = [800];

export function fontsFor(script: string): { text: string; display: string } {
  const [text, display] = FONT_TABLE[script] ?? NOTO;
  return { text, display };
}

export function closestWeight(available: number[], wanted: number): number {
  return [...available].sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || b - a)[0]!;
}

type Range = [lo: number, hi: number];

export function parseUnicodeRange(value: string): Range[] {
  return value
    .split(',')
    .map((part) => part.trim().replace(/^U\+/i, ''))
    .filter(Boolean)
    .map((part): Range => {
      if (part.includes('?')) return [parseInt(part.replace(/\?/g, '0'), 16), parseInt(part.replace(/\?/g, 'F'), 16)];
      const [lo, hi] = part.split('-');
      return [parseInt(lo!, 16), parseInt(hi ?? lo!, 16)];
    });
}

export function parseFontCss(css: string): Face[] {
  const faces: Face[] = [];
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
    const file = /url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/.exec(block)?.[1];
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    const range = /unicode-range:\s*([^;}]+)/.exec(block)?.[1]?.trim();
    if (!file || !weight) continue;
    faces.push({ file: file.replace(/^\.\//, ''), weight, range: range ?? 'U+0-10FFFF' });
  }
  return faces;
}

const covers = (ranges: Range[], cp: number) => ranges.some(([lo, hi]) => cp >= lo && cp <= hi);

function codePoints(text: string): Set<number> {
  const set = new Set<number>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp > 0x20 && cp !== 0x7f && cp !== 0xfeff) set.add(cp);
  }
  return set;
}

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCodePoint(0x20 + i)).join('');

// Chinese, Japanese and Korean fonts ship as about a hundred files per weight.
// Only the files that hold characters the video uses are kept.
export function neededFaces(faces: Face[], text: string, manyFiles = 24): Face[] {
  if (faces.length <= manyFiles) return faces;
  const used = codePoints(text + ASCII);
  return faces.filter((f) => {
    const ranges = parseUnicodeRange(f.range);
    for (const cp of used) if (covers(ranges, cp)) return true;
    return false;
  });
}

const JOINERS = new Set([0x200c, 0x200d, 0x200e, 0x200f, 0x2060]);

export function uncovered(faces: Face[], text: string): string[] {
  const ranges = faces.flatMap((f) => parseUnicodeRange(f.range));
  const missing: string[] = [];
  for (const cp of codePoints(text)) {
    if (JOINERS.has(cp) || (cp >= 0xfe00 && cp <= 0xfe0f)) continue;
    if (!covers(ranges, cp)) missing.push(String.fromCodePoint(cp));
  }
  return missing;
}
