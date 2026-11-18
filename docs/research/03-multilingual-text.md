# Captions in any language

Researched 2026-11-18. Items marked UNVERIFIED could not be confirmed from a primary source and are tested by a real render instead.

## Detecting the script

- JavaScript regex supports `\p{Script=...}` and `\p{Script_Extensions=...}` with the `u` flag. TC39 recommends `Script_Extensions` for most uses.
  https://github.com/tc39/proposal-regexp-unicode-property-escapes
- Rule used here (ours, not sourced): count letters per script, ignore digits and punctuation, take the largest group.
- Right-to-left scripts: Arabic, Hebrew, Syriac, Thaana, N'Ko. Everything else is left-to-right.

## Fonts

- Fontsource publishes each Google font as an npm package. Static fonts are `@fontsource/<id>`, variable ones `@fontsource-variable/<id>`.
  https://fontsource.org/docs/getting-started/install
- Files are named `files/<id>-<subset>-<weight>-normal.woff2`, for example `hind-devanagari-400-normal.woff2`.
  https://cdn.jsdelivr.net/npm/@fontsource/hind@5.3.0/400.css
- Chinese, Japanese and Korean fonts are split into about 100 numbered files per weight, each with its own `unicode-range`, for example `noto-sans-sc-4-400-normal.woff2`. Loading one file does not give a working font.
  https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.3.1/400.css
- The font list for every script is at https://api.fontsource.org/v1/fonts. Each id in `scripts/fonts-table.mjs` is checked against that API.

Decision: `scripts/fonts.mjs` reads the package's own CSS, copies every file it names into `public/fonts/`, and writes a manifest of family, weight, file and unicode-range. The composition registers one `FontFace` per manifest entry. The same code path handles a two-file Hindi font and a 200-file Chinese one.

## Line breaking and length

- `.length` counts UTF-16 code units, not what a reader sees as characters. Indic conjuncts and combining marks make it badly wrong. Count grapheme clusters instead (UAX #29).
  https://unicode.org/reports/tr29/
- `Intl.Segmenter` gives grapheme and word boundaries, including for Thai, Lao, Khmer, Myanmar, Chinese and Japanese, which have no spaces.
  https://developer.mozilla.org/en-US/docs/Web/API/Intl/Segmenter
- `word-break: keep-all` stops breaks inside Korean words. https://developer.mozilla.org/en-US/docs/Web/CSS/word-break
- `text-wrap: balance` evens out line lengths, up to 6 lines in Chromium.
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap
- BudouX gives nicer phrase breaks for Japanese, Chinese and Thai (about 15 KB). Not used in the first version. https://github.com/google/budoux

Decision: caption width is judged by display width, not character count. Wide characters (CJK) count as 2, combining marks as 0. The check script reports captions that will not fit, and the caption card also shrinks its font to fit the safe width, so nothing overflows.

## How much text a viewer can read

Netflix timed text style guides:

| Language | Characters per line | Lines | Characters per second (adult) | Source |
|---|---|---|---|---|
| Hindi | 42 | 2 | 22 | https://partnerhelp.netflixstudios.com/hc/en-us/articles/115003196707 |
| Arabic | 42 | 2 | 20 | https://partnerhelp.netflixstudios.com/hc/en-us/articles/215517947 |
| Thai | 35 | 2 | 17 | https://partnerhelp.netflixstudios.com/hc/en-us/articles/220448308 |
| Japanese | 13 full-width | 2 | 4 (needs a re-check) | https://partnerhelp.netflixstudios.com/hc/en-us/articles/215767517 |

- General: minimum 5/6 of a second per caption, maximum 7 seconds, maximum 2 lines.
  https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617
- English, Bengali, Korean and Chinese figures: UNVERIFIED.

Those numbers are for films on a wide screen. A vertical short has much larger text, so srt2reel uses a shorter line (about 26 display columns, 13 for wide scripts) and warns on anything faster than 20 characters per second.

## Right-to-left text

- Arabic needs `dir="rtl"` and an Arabic font.
- Chromium keeps Arabic letters joined across a span when only the colour changes. Changing font or font features across a span breaks joining.
  https://lists.w3.org/Archives/Public/public-i18n-archive/2022OctDec/0201.html

Decision: key words are highlighted by colour only, same font and weight, and only whole words. The check script rejects a highlight that starts or ends inside a word.

## Numerals

CLDR default numbering systems:

- Hindi: Western digits by default, Devanagari digits optional.
- Bengali: Bengali digits by default.
- Arabic: Western digits by default, Arabic-Indic optional.
- Persian: extended Arabic-Indic digits by default.

Source: https://github.com/unicode-org/cldr-json (cldr-numbers-full, `numbers.json` per locale)

Decision: `num()` formats with `Intl.NumberFormat` for the story's locale, so each language gets its own default. A story can force a numbering system.

## Reading SRT files

- `TextDecoder` accepts any WHATWG encoding label and strips a BOM by default.
  https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/TextDecoder
- Behaviour with CRLF, comma or dot milliseconds, missing index lines, overlapping cues and tags such as `<i>` or `{\an8}`: UNVERIFIED from a spec, so the parser has a unit test for each.

Decision: the parser reads UTF-8 and UTF-16 (by BOM), falls back to a user-given encoding, and fails with a clear message when the bytes are not valid text instead of producing garbage captions.

## Missing glyphs

- `document.fonts.check()` does not check glyph coverage, so it cannot detect tofu boxes.
  https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check
- Emoji in captions: a colour emoji font on Linux is UNVERIFIED. The check script warns when a caption contains emoji.

Decision: `scripts/fonts.mjs` compares every character in the captions against the unicode-ranges of the installed font files and lists characters no file covers. The contact sheet is still the final check.
