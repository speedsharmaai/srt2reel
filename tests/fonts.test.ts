import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FONT_TABLE,
  closestWeight,
  fontsFor,
  neededFaces,
  parseFontCss,
  parseUnicodeRange,
  uncovered,
} from '../skills/srt2reel/scripts/lib/fonts.ts';
import { detectScript, scriptForLang } from '../skills/srt2reel/scripts/lib/text.ts';

const css = `
/* hind-devanagari-600-normal */
@font-face {
  font-family: 'Hind';
  font-style: normal;
  font-display: swap;
  font-weight: 600;
  src: url(./files/hind-devanagari-600-normal.woff2) format('woff2'), url(./files/hind-devanagari-600-normal.woff) format('woff');
  unicode-range: U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF;
}
/* hind-latin-600-normal */
@font-face {
  font-family: 'Hind';
  font-weight: 600;
  src: url(./files/hind-latin-600-normal.woff2) format('woff2');
  unicode-range: U+0000-00FF,U+0131,U+2000-206F;
}
`;

test('reads file, weight and range from a fontsource stylesheet', () => {
  const faces = parseFontCss(css);
  assert.deepEqual(
    faces.map((f) => [f.file, f.weight]),
    [
      ['files/hind-devanagari-600-normal.woff2', 600],
      ['files/hind-latin-600-normal.woff2', 600],
    ],
  );
  assert.match(faces[0].range, /^U\+0900-097F/);
});

test('parses single code points, ranges and wildcards', () => {
  assert.deepEqual(parseUnicodeRange('U+0131, U+0900-097F, U+4??'), [
    [0x131, 0x131],
    [0x900, 0x97f],
    [0x400, 0x4ff],
  ]);
});

test('reports characters no font file covers', () => {
  const faces = parseFontCss(css);
  assert.deepEqual(uncovered(faces, 'नमस्ते hello 123'), []);
  assert.deepEqual(uncovered(faces, 'नमस्ते 你好'), ['你', '好']);
});

test('joiners and variation selectors are not reported as missing', () => {
  const faces = [{ file: 'a', weight: 400, range: 'U+0041-005A' }];
  assert.deepEqual(uncovered(faces, 'A‍B️'), []);
});

test('keeps every file of a small font', () => {
  const faces = parseFontCss(css);
  assert.equal(neededFaces(faces, 'x').length, 2);
});

test('keeps only the files a large font needs for this text', () => {
  const faces = Array.from({ length: 100 }, (_, i) => ({
    file: `f-${i}.woff2`,
    weight: 700,
    range: i === 99 ? 'U+0000-00FF' : `U+${(0x4e00 + i * 0x100).toString(16)}-${(0x4eff + i * 0x100).toString(16)}`,
  }));
  const kept = neededFaces(faces, '你好');
  // 你 is U+4F60 (file 1), 好 is U+597D (file 11), file 99 holds Latin
  assert.deepEqual(kept.map((f) => f.file).sort(), ['f-1.woff2', 'f-11.woff2', 'f-99.woff2']);
});

test('picks the nearest weight a font really has', () => {
  assert.equal(closestWeight([300, 400, 500, 600, 700], 800), 700);
  assert.equal(closestWeight([400], 800), 400);
  assert.equal(closestWeight([600, 700, 800], 700), 700);
  assert.equal(closestWeight([600, 800], 700), 800);
});

test('every script the detector can return has fonts', () => {
  const samples = {
    en: 'Hello', ru: 'Привет', el: 'Γειά', hi: 'नमस्ते', bn: 'নমস্কার', pa: 'ਸਤ ਸ੍ਰੀ', gu: 'નમસ્તે', or: 'ନମସ୍କାର',
    ta: 'வணக்கம்', te: 'నమస్తే', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം', si: 'ආයුබෝවන්', ar: 'مرحبا', he: 'שלום', th: 'สวัสดี',
    lo: 'ສະບາຍດີ', km: 'សួស្តី', my: 'မင်္ဂလာပါ', zh: '你好', 'zh-TW': '你好', ja: 'こんにちは', ko: '안녕하세요',
    am: 'ሰላም', hy: 'Բարեւ', ka: 'გამარჯობა', bo: 'བཀྲ་ཤིས', dv: 'ހެލޯ',
  };
  for (const [lang, text] of Object.entries(samples)) {
    const script = scriptForLang(lang, detectScript(text).script);
    assert.ok(FONT_TABLE[script], `${lang} -> ${script}`);
    assert.ok(fontsFor(script).text);
  }
  assert.equal(fontsFor(scriptForLang('zh-TW', 'Hani')).text, 'noto-sans-tc');
  assert.equal(fontsFor(scriptForLang('ja', 'Jpan')).text, 'noto-sans-jp');
});

test('an unknown script falls back to Noto Sans', () => {
  assert.deepEqual(fontsFor('Xxxx'), { text: 'noto-sans', display: 'noto-serif' });
});
