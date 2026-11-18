import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast } from '../skills/srt2reel/scripts/lib/validate.ts';

const themes = JSON.parse(readFileSync(new URL('../skills/srt2reel/template/src/lib/themes.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;

// WCAG 1.4.3: 4.5:1 for text, 3:1 for large bold text such as captions and labels.
for (const [name, c] of Object.entries(themes)) {
  test(`theme ${name}: caption text is readable on its card`, () => {
    assert.ok(contrast(c.cardInk!, c.card!) >= 4.5);
    assert.ok(contrast(c.accent!, c.card!) >= 3, `key words: ${contrast(c.accent!, c.card!).toFixed(2)}`);
    assert.ok(contrast(c.muted!, c.card!) >= 3, `speaker name: ${contrast(c.muted!, c.card!).toFixed(2)}`);
  });

  test(`theme ${name}: headings and labels are readable`, () => {
    assert.ok(contrast(c.ink!, c.bg!) >= 4.5);
    assert.ok(contrast(c.ink!, c.bgAlt!) >= 4.5);
    assert.ok(contrast('#FFFFFF', c.accent!) >= 3, `white on accent: ${contrast('#FFFFFF', c.accent!).toFixed(2)}`);
    assert.ok(contrast('#FFFFFF', c.good!) >= 3);
    assert.ok(contrast(c.card!, c.night!) >= 4.5);
  });

  test(`theme ${name}: has every colour the kit uses`, () => {
    assert.deepEqual(Object.keys(c).sort(), Object.keys(themes.paper!).sort());
    for (const value of Object.values(c)) assert.match(value, /^#[0-9A-F]{6}$/i);
  });
}
