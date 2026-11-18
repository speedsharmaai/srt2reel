const SCRIPT_ROWS: [code: string, unicodeName: string, lang: string][] = [
  ['Latn', 'Latin', 'en'],
  ['Cyrl', 'Cyrillic', 'ru'],
  ['Grek', 'Greek', 'el'],
  ['Deva', 'Devanagari', 'hi'],
  ['Beng', 'Bengali', 'bn'],
  ['Guru', 'Gurmukhi', 'pa'],
  ['Gujr', 'Gujarati', 'gu'],
  ['Orya', 'Oriya', 'or'],
  ['Taml', 'Tamil', 'ta'],
  ['Telu', 'Telugu', 'te'],
  ['Knda', 'Kannada', 'kn'],
  ['Mlym', 'Malayalam', 'ml'],
  ['Sinh', 'Sinhala', 'si'],
  ['Arab', 'Arabic', 'ar'],
  ['Hebr', 'Hebrew', 'he'],
  ['Thai', 'Thai', 'th'],
  ['Laoo', 'Lao', 'lo'],
  ['Khmr', 'Khmer', 'km'],
  ['Mymr', 'Myanmar', 'my'],
  ['Hani', 'Han', 'zh'],
  ['Hira', 'Hiragana', 'ja'],
  ['Kana', 'Katakana', 'ja'],
  ['Hang', 'Hangul', 'ko'],
  ['Ethi', 'Ethiopic', 'am'],
  ['Armn', 'Armenian', 'hy'],
  ['Geor', 'Georgian', 'ka'],
  ['Tibt', 'Tibetan', 'bo'],
  ['Thaa', 'Thaana', 'dv'],
  ['Syrc', 'Syriac', 'syr'],
  ['Nkoo', 'Nko', 'nqo'],
];
const SCRIPTS = SCRIPT_ROWS.map(([code, name, lang]) => ({ code, lang, re: new RegExp(`\\p{Script=${name}}`, 'gu') }));

const RTL = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo']);
const SPACELESS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}　-〿＀-￯]/u;
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-｠]/u;
const EMOJI = /\p{Extended_Pictographic}/u;

export type Detected = { script: string; dir: 'ltr' | 'rtl'; counts: Record<string, number> };
export type Token = { text: string; space: boolean };

export const isSpaceless = (ch: string | undefined): boolean => !!ch && SPACELESS.test(ch);
export const hasEmoji = (text: string): boolean => EMOJI.test(text);

export function detectScript(text: string): Detected {
  const counts: Record<string, number> = {};
  for (const { code, re } of SCRIPTS) {
    const n = text.match(re)?.length ?? 0;
    if (n) counts[code] = n;
  }
  const kana = (counts.Hira ?? 0) + (counts.Kana ?? 0);
  if (kana) {
    counts.Jpan = kana + (counts.Hani ?? 0);
    delete counts.Hira;
    delete counts.Kana;
    delete counts.Hani;
  }
  if (counts.Hang && counts.Hani) {
    counts.Hang += counts.Hani;
    delete counts.Hani;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const script = ranked[0]?.[0] ?? 'Latn';
  return { script, dir: RTL.has(script) ? 'rtl' : 'ltr', counts };
}

export function defaultLang(script: string): string {
  if (script === 'Jpan') return 'ja';
  return SCRIPTS.find((s) => s.code === script)?.lang ?? 'en';
}

// Han characters alone do not say which language they are; the language tag does.
export function scriptForLang(lang: string, detected: string): string {
  const base = lang.toLowerCase();
  if (detected === 'Hani' || detected === 'Jpan' || detected === 'Hang') {
    if (base.startsWith('ja')) return 'Jpan';
    if (base.startsWith('ko')) return 'Hang';
    if (/^zh-(hant|tw|hk|mo)/.test(base)) return 'Hant';
    return detected === 'Hani' ? 'Hans' : detected;
  }
  return detected;
}

const graphemeSeg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function graphemes(text: string): string[] {
  return [...graphemeSeg.segment(text)].map((s) => s.segment);
}

// Columns a string takes on screen: CJK glyphs are twice as wide, and a cluster
// of base letter plus marks is one column however many code points it holds.
export function displayWidth(text: string): number {
  let w = 0;
  for (const g of graphemes(text)) w += WIDE.test(g) ? 2 : 1;
  return w;
}

const OPENER = /^[\p{Ps}\p{Pi}]+$/u;
const HIRAGANA_ONLY = /^[\p{Script=Hiragana}ー]+$/u;
const ENDS_WITH_NUMBER = /[\p{N}〇一二三四五六七八九十百千万]$/u;
const STRAIGHT_QUOTE = /^["']+$/;

// Unbreakable pieces of a caption. A break may fall between any two tokens.
// Punctuation stays with its word, and an opening quote or bracket stays with the word after it.
export function tokens(text: string, locale = 'en'): Token[] {
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  const out: Token[] = [];
  let opening = '';
  const closeOpening = () => {
    const last = out.at(-1);
    if (!last) return;
    last.text += opening;
    opening = '';
  };
  for (const { segment, isWordLike } of seg.segment(text)) {
    const prev = out.at(-1);
    if (/^\s+$/.test(segment)) {
      closeOpening();
      if (prev) prev.space = true;
      continue;
    }
    const startsPhrase = !prev || prev.space;
    if (!isWordLike && (OPENER.test(segment) || (STRAIGHT_QUOTE.test(segment) && startsPhrase))) {
      opening += segment;
      continue;
    }
    const sameSpacedRun = !isSpaceless(segment[0]) && !(prev && isSpaceless(prev.text.at(-1)));
    // In Japanese, particles and verb endings are written in hiragana and belong to the word before them.
    // A number stays with the counter word after it (一ページ, 3月, 五人).
    const counter = !!prev && isSpaceless(segment[0]) && ENDS_WITH_NUMBER.test(prev.text);
    const attaches = !isWordLike || sameSpacedRun || HIRAGANA_ONLY.test(segment) || counter;
    if (prev && !prev.space && !opening && attaches) {
      prev.text += segment;
      continue;
    }
    out.push({ text: opening + segment, space: false });
    opening = '';
  }
  closeOpening();
  return out;
}

export function joinTokens(toks: Token[]): string {
  let s = '';
  toks.forEach((t, i) => {
    s += t.text;
    if (t.space && i < toks.length - 1) s += ' ';
  });
  return s;
}

const CLAUSE_END = /[,;:.!?…—–।॥،؛؟、。，；：！？]["'”’»」』）]*$/u;

// Index to cut a token list in two near the middle, at a clause end when one is close.
// With `maxCols`, a cut that leaves either half wider than that is avoided.
export function splitIndex(toks: Token[], maxCols = Infinity): number {
  const widths = toks.map((t) => displayWidth(t.text) + (t.space ? 1 : 0));
  const total = widths.reduce((a, b) => a + b, 0);
  let best = 1;
  let bestScore = Infinity;
  let acc = 0;
  for (let i = 1; i < toks.length; i++) {
    acc += widths[i - 1]!;
    const off = Math.abs(acc - total / 2) / total;
    const tooWide = acc - (toks[i - 1]!.space ? 1 : 0) > maxCols || total - acc > maxCols;
    const score = off - (CLAUSE_END.test(toks[i - 1]!.text) ? 0.15 : 0) + (tooWide ? 1 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function wrapLines(text: string, maxCols: number, locale = 'en'): string[] {
  if (displayWidth(text) <= maxCols) return [text];
  const toks = tokens(text, locale);
  if (toks.length < 2) return [text];
  const cut = splitIndex(toks, maxCols);
  return [joinTokens(toks.slice(0, cut)), joinTokens(toks.slice(cut))];
}

// Wording comparison ignores spacing, line breaks and highlight braces.
export function wordingKey(text: string): string {
  return text.normalize('NFC').replace(/[{}\s]/gu, '');
}

export function plainCaption(t: string): string {
  return joinLinesPlain(t.replace(/[{}]/g, '').split('\n').map((l) => l.trim()));
}

function joinLinesPlain(lines: string[]): string {
  return lines.reduce((out, line) => (out && !(isSpaceless(out.at(-1)) && isSpaceless(line[0])) ? `${out} ${line}` : out + line), '').trim();
}
