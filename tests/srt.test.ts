import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeText, joinLines, parseSrt, stripTags } from '../skills/srt2reel/scripts/lib/srt.ts';

const basic = `1
00:00:00,100 --> 00:00:01,770
Hello there.

2
00:00:02,380 --> 00:00:03,960
Second line
continues here.
`;

test('parses index, times and multi-line text', () => {
  const { cues, warnings } = parseSrt(basic);
  assert.deepEqual(cues, [
    { i: 1, s: 0.1, e: 1.77, text: 'Hello there.' },
    { i: 2, s: 2.38, e: 3.96, text: 'Second line continues here.' },
  ]);
  assert.deepEqual(warnings, []);
});

test('accepts CRLF, a BOM, dot milliseconds and position suffixes', () => {
  const input = '﻿1\r\n00:00:01.500 --> 00:00:02.000 X1:10 X2:20\r\nHi\r\n\r\n';
  assert.deepEqual(parseSrt(input).cues, [{ i: 1, s: 1.5, e: 2, text: 'Hi' }]);
});

test('accepts cues with no index lines and no blank line between them', () => {
  const input = '00:00:01,000 --> 00:00:02,000\nOne\n2\n00:00:03,000 --> 00:00:04,000\nTwo\n';
  assert.deepEqual(
    parseSrt(input).cues.map((c) => c.text),
    ['One', 'Two'],
  );
});

test('keeps a caption that is only a number', () => {
  const input = '1\n00:00:01,000 --> 00:00:02,000\n42\n\n2\n00:00:03,000 --> 00:00:04,000\nNext\n';
  assert.deepEqual(
    parseSrt(input).cues.map((c) => c.text),
    ['42', 'Next'],
  );
});

test('accepts a WebVTT header and short timestamps', () => {
  const input = 'WEBVTT\n\n00:01.000 --> 00:02.500\nHi\n';
  assert.deepEqual(parseSrt(input).cues, [{ i: 1, s: 1, e: 2.5, text: 'Hi' }]);
});

test('reads hours', () => {
  const input = '1\n01:02:03,250 --> 01:02:04,000\nLate\n';
  assert.equal(parseSrt(input).cues[0].s, 3723.25);
});

test('strips markup, ASS overrides and stray braces', () => {
  assert.equal(stripTags('<i>Hi</i> <font color="#fff">you</font>'), 'Hi you');
  assert.equal(stripTags('{\\an8}Top text'), 'Top text');
  assert.equal(stripTags('a {b} c'), 'a b c');
  assert.equal(stripTags('3 < 5 and 5 > 3'), '3 < 5 and 5 > 3');
});

test('drops empty cues and reorders by start time', () => {
  const input = '1\n00:00:05,000 --> 00:00:06,000\nB\n\n2\n00:00:01,000 --> 00:00:02,000\nA\n\n3\n00:00:07,000 --> 00:00:08,000\n<i></i>\n';
  assert.deepEqual(
    parseSrt(input).cues.map((c) => [c.i, c.text]),
    [
      [1, 'A'],
      [2, 'B'],
    ],
  );
});

test('shortens the earlier of two overlapping cues and says so', () => {
  const input = '1\n00:00:01,000 --> 00:00:03,000\nA\n\n2\n00:00:02,000 --> 00:00:04,000\nB\n';
  const { cues, warnings } = parseSrt(input);
  assert.equal(cues[0].e, 2);
  assert.equal(warnings.length, 1);
});

test('skips a cue that ends before it starts', () => {
  const input = '1\n00:00:03,000 --> 00:00:01,000\nBad\n\n2\n00:00:04,000 --> 00:00:05,000\nGood\n';
  const { cues, warnings } = parseSrt(input);
  assert.deepEqual(
    cues.map((c) => c.text),
    ['Good'],
  );
  assert.equal(warnings.length, 1);
});

test('fails clearly when there are no cues', () => {
  assert.throws(() => parseSrt('just some text'), /No subtitle cues/);
});

test('joins lines without a space in scripts that do not use spaces', () => {
  assert.equal(joinLines(['今日は', '晴れです']), '今日は晴れです');
  assert.equal(joinLines(['สวัสดี', 'ครับ']), 'สวัสดีครับ');
  assert.equal(joinLines(['नमस्ते', 'दुनिया']), 'नमस्ते दुनिया');
});

test('decodes UTF-8 with and without a BOM', () => {
  assert.equal(decodeText(Buffer.from('नमस्ते', 'utf8')), 'नमस्ते');
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('hi')])), 'hi');
});

test('decodes UTF-16 with a BOM and without one', () => {
  const le = Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nHello\n', 'utf16le');
  assert.match(decodeText(Buffer.concat([Buffer.from([0xff, 0xfe]), le])), /Hello/);
  assert.match(decodeText(le), /Hello/);
});

test('decodes a legacy encoding when told which one', () => {
  const cp1252 = Buffer.from([0x63, 0x61, 0x66, 0xe9]);
  assert.equal(decodeText(cp1252, 'windows-1252'), 'café');
});

test('refuses bytes that are not UTF-8 instead of producing garbage', () => {
  assert.throws(() => decodeText(Buffer.from([0x63, 0x61, 0x66, 0xe9])), /not valid UTF-8/);
  assert.throws(() => decodeText(Buffer.from('x'), 'not-a-real-encoding'), /Unknown encoding/);
});
