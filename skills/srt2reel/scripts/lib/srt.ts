import { TextDecoder } from 'node:util';
import { isSpaceless } from './text.ts';
import type { Cue } from './types.ts';

const ENCODING_HINT =
  "Pass --encoding with the file's real encoding (for example windows-1252, windows-1256, gbk, big5, shift_jis, euc-kr, tis-620).";

export function decodeText(bytes: Uint8Array, encoding?: string): string {
  const buf = Buffer.from(bytes);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return decode(buf.subarray(3), 'utf-8');
  if (buf[0] === 0xff && buf[1] === 0xfe) return decode(buf.subarray(2), 'utf-16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) return decode(buf.subarray(2), 'utf-16be');
  if (encoding) return decode(buf, encoding);
  if (looksUtf16(buf, 1)) return decode(buf, 'utf-16le');
  if (looksUtf16(buf, 0)) return decode(buf, 'utf-16be');
  try {
    return decode(buf, 'utf-8');
  } catch {
    throw new Error(`The subtitle file is not valid UTF-8. ${ENCODING_HINT}`);
  }
}

function decode(buf: Buffer, encoding: string): string {
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(encoding, { fatal: true });
  } catch {
    throw new Error(`Unknown encoding "${encoding}". ${ENCODING_HINT}`);
  }
  return decoder.decode(buf);
}

// UTF-16 text in a mostly-ASCII file has a zero byte in every other position.
function looksUtf16(buf: Buffer, zeroAt: 0 | 1): boolean {
  const n = Math.min(buf.length & ~1, 400);
  if (n < 8) return false;
  let zeros = 0;
  for (let i = zeroAt; i < n; i += 2) if (buf[i] === 0) zeros++;
  return zeros / (n / 2) > 0.6;
}

const STAMP = /(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/;

function toSeconds(m: RegExpExecArray): number {
  const frac = m[4] ? Number(`0.${m[4]}`) : 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + frac;
}

function parseTimingLine(line: string): { s: number; e: number } | null {
  const arrow = line.indexOf('-->');
  if (arrow < 0) return null;
  const a = STAMP.exec(line.slice(0, arrow));
  const b = STAMP.exec(line.slice(arrow + 3));
  if (!a || !b) return null;
  return { s: toSeconds(a), e: toSeconds(b) };
}

export function stripTags(line: string): string {
  return line
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/[{}]/g, '');
}

export function joinLines(lines: string[]): string {
  let out = '';
  for (const line of lines) {
    if (!out) {
      out = line;
      continue;
    }
    const glue = isSpaceless(out.at(-1)) && isSpaceless(line[0]) ? '' : ' ';
    out += glue + line;
  }
  return out;
}

export function parseSrt(input: string): { cues: Cue[]; warnings: string[] } {
  const lines = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const raw: { s: number; e: number; lines: string[] }[] = [];
  let cur: (typeof raw)[number] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const timing = parseTimingLine(line);
    if (timing) {
      cur = { ...timing, lines: [] };
      raw.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.trim() === '') {
      cur = null;
      continue;
    }
    const isIndex = /^\s*\d+\s*$/.test(line) && parseTimingLine(lines[i + 1] ?? '');
    if (isIndex) {
      cur = null;
      continue;
    }
    cur.lines.push(line);
  }

  const warnings: string[] = [];
  const cues: { s: number; e: number; text: string }[] = [];
  for (const c of raw) {
    const text = joinLines(c.lines.map((l) => stripTags(l).trim()).filter(Boolean))
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    if (!(c.e > c.s)) {
      warnings.push(`Skipped a cue whose end is not after its start (${c.s}s): "${text}"`);
      continue;
    }
    cues.push({ s: c.s, e: c.e, text });
  }
  cues.sort((a, b) => a.s - b.s);
  for (let i = 1; i < cues.length; i++) {
    const prev = cues[i - 1]!;
    const cur2 = cues[i]!;
    if (cur2.s < prev.e - 0.001) {
      warnings.push(`Cues ${i} and ${i + 1} overlap; the earlier one was shortened.`);
      prev.e = cur2.s;
    }
  }
  if (cues.length === 0) throw new Error('No subtitle cues found. Is this an SRT file?');
  return { cues: cues.map((c, i) => ({ i: i + 1, ...c })), warnings };
}
