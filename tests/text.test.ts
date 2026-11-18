import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultLang,
  detectScript,
  displayWidth,
  graphemes,
  hasEmoji,
  joinTokens,
  plainCaption,
  scriptForLang,
  splitIndex,
  tokens,
  wordingKey,
  wrapLines,
} from '../skills/srt2reel/scripts/lib/text.ts';
import type { Detected, Token } from '../skills/srt2reel/scripts/lib/text.ts';

const texts = (toks: Token[]) => toks.map((t) => t.text);

test('detects the dominant script and its direction', () => {
  assert.deepEqual(pick(detectScript('Hello world')), ['Latn', 'ltr']);
  assert.deepEqual(pick(detectScript('वह रोज़ पढ़ता था')), ['Deva', 'ltr']);
  assert.deepEqual(pick(detectScript('তানভীর সারা রাত পড়ত')), ['Beng', 'ltr']);
  assert.deepEqual(pick(detectScript('كان يدرس كل ليلة')), ['Arab', 'rtl']);
  assert.deepEqual(pick(detectScript('הוא למד כל לילה')), ['Hebr', 'rtl']);
  assert.deepEqual(pick(detectScript('เขาอ่านหนังสือทุกคืน')), ['Thai', 'ltr']);
  assert.deepEqual(pick(detectScript('Он учился каждую ночь')), ['Cyrl', 'ltr']);
  assert.deepEqual(pick(detectScript('அவன் தினமும் படித்தான்')), ['Taml', 'ltr']);
});

const pick = (r: Detected) => [r.script, r.dir];

test('tells Chinese, Japanese and Korean apart', () => {
  assert.equal(detectScript('他每天晚上学习').script, 'Hani');
  assert.equal(detectScript('彼は毎晩勉強した').script, 'Jpan');
  assert.equal(detectScript('그는 매일 밤 공부했다').script, 'Hang');
});

test('a few foreign words do not change the script', () => {
  assert.equal(detectScript('उसने iPhone खरीदा और बहुत खुश हुआ').script, 'Deva');
  assert.equal(detectScript('12345 !!! ...').script, 'Latn');
});

test('picks a default language for a script', () => {
  assert.equal(defaultLang('Deva'), 'hi');
  assert.equal(defaultLang('Jpan'), 'ja');
  assert.equal(defaultLang('Xxxx'), 'en');
});

test('the language decides which Han font family is used', () => {
  assert.equal(scriptForLang('zh', 'Hani'), 'Hans');
  assert.equal(scriptForLang('zh-TW', 'Hani'), 'Hant');
  assert.equal(scriptForLang('ja', 'Hani'), 'Jpan');
  assert.equal(scriptForLang('ko', 'Hani'), 'Hang');
  assert.equal(scriptForLang('hi', 'Deva'), 'Deva');
});

test('counts what a reader sees, not code units', () => {
  assert.equal(displayWidth('hello'), 5);
  assert.equal(displayWidth('你好'), 4);
  assert.equal(displayWidth('한국'), 4);
  assert.equal('कि'.length, 2);
  assert.equal(displayWidth('कि'), 1);
  assert.equal(displayWidth('ที่'), 1);
  assert.equal(graphemes('é').length, 1);
});

test('keeps punctuation with its word', () => {
  assert.deepEqual(texts(tokens('Hello, world! Bye.')), ['Hello,', 'world!', 'Bye.']);
  assert.deepEqual(texts(tokens('state-of-the-art idea')), ['state-of-the-art', 'idea']);
  assert.deepEqual(texts(tokens("don't stop")), ["don't", 'stop']);
});

test('keeps an opening quote with the word after it', () => {
  assert.deepEqual(texts(tokens('He said "hello there" twice')), ['He', 'said', '"hello', 'there"', 'twice']);
  assert.deepEqual(texts(tokens('“Tell nobody,” he said')), ['“Tell', 'nobody,”', 'he', 'said']);
  assert.deepEqual(texts(tokens('(yes) no')), ['(yes)', 'no']);
});

test('tokens join back to the original text', () => {
  for (const s of ['Hello, world! Bye.', 'He said "hello there" twice', 'वह रोज़ पढ़ता था।', 'كان يدرس، كل ليلة.']) {
    assert.equal(joinTokens(tokens(s)), s);
  }
});

test('breaks Thai, Chinese and Japanese between words without adding spaces', () => {
  const thai = tokens('เขาอ่านหนังสือทุกคืน', 'th');
  assert.ok(thai.length > 2);
  assert.equal(joinTokens(thai), 'เขาอ่านหนังสือทุกคืน');
  const zh = tokens('他说「你好」然后走了。', 'zh');
  assert.equal(joinTokens(zh), '他说「你好」然后走了。');
  assert.ok(texts(zh).some((t) => t.startsWith('「')));
  assert.ok(!texts(zh).some((t) => t.startsWith('」') || t.startsWith('。')));
});

test('keeps Japanese particles and verb endings with their word', () => {
  assert.deepEqual(texts(tokens('でも、一行も書きませんでした。', 'ja')), ['でも、', '一行も', '書きませんでした。']);
  assert.deepEqual(texts(tokens('彼女は友達みんなに話しました。', 'ja')), ['彼女は', '友達みんなに', '話しました。']);
  assert.deepEqual(wrapLines('でも、一行も書きませんでした。', 26, 'ja'), ['でも、一行も', '書きませんでした。']);
});

test('keeps a number with its counter word in Japanese and Chinese', () => {
  assert.ok(texts(tokens('黙って一ページずつ書きました。', 'ja')).includes('一ページずつ'));
  assert.ok(texts(tokens('他跑了42公里。', 'zh')).some((t) => t.startsWith('42公里')));
});

test('plain caption joins lines without a space where the script has none', () => {
  assert.equal(plainCaption('でも、一行も\n書きませんでした。'), 'でも、一行も書きませんでした。');
});

test('does not split inside an Indic word', () => {
  assert.deepEqual(texts(tokens('शिक्षा प्रस्तुत संबंध', 'hi')), ['शिक्षा', 'प्रस्तुत', 'संबंध']);
  assert.deepEqual(texts(tokens('শিক্ষা প্রস্তুত সম্পর্ক', 'bn')), ['শিক্ষা', 'প্রস্তুত', 'সম্পর্ক']);
});

test('prefers to split after a clause end near the middle', () => {
  const toks = tokens('When the result came, he gave it to his father');
  assert.equal(joinTokens(toks.slice(0, splitIndex(toks))), 'When the result came,');
});

test('wraps only when the text is too wide, into two balanced lines', () => {
  assert.deepEqual(wrapLines('Short one.', 26), ['Short one.']);
  const lines = wrapLines('Next time he told nobody at all about it', 26);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => displayWidth(l) <= 26));
  assert.ok(Math.abs(displayWidth(lines[0]) - displayWidth(lines[1])) <= 8);
});

test('keeps both lines inside the limit when the text allows it', () => {
  assert.deepEqual(wrapLines('Everyone clapped. It already felt like winning.', 26), ['Everyone clapped. It', 'already felt like winning.']);
  assert.deepEqual(wrapLines('So she started again, and this time she told nobody.', 26), ['So she started again, and', 'this time she told nobody.']);
});

test('wraps wide scripts by display width', () => {
  const lines = wrapLines('他每天晚上都在房间里认真学习到很晚', 26, 'zh');
  assert.equal(lines.length, 2);
  assert.equal(lines.join(''), '他每天晚上都在房间里认真学习到很晚');
});

test('wording comparison ignores spacing, breaks and highlight braces', () => {
  assert.equal(wordingKey('He told {nobody}\nat all.'), wordingKey('He told nobody at all.'));
  assert.notEqual(wordingKey('He told nobody.'), wordingKey('He told no one.'));
  assert.equal(wordingKey('é'), wordingKey('é'));
});

test('plain caption removes braces and line breaks', () => {
  assert.equal(plainCaption('He told {nobody}\nat all.'), 'He told nobody at all.');
});

test('spots emoji', () => {
  assert.equal(hasEmoji('nice 🎉'), true);
  assert.equal(hasEmoji('nice'), false);
});
