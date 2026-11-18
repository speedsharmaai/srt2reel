# Languages and scripts

The video's language is the language of the SRT. Nothing in the skill is tied to one language.

## What happens automatically

`init.ts` reads the SRT and:

1. Finds the script by counting letters (digits and punctuation do not count). A few foreign words in the text do not change the result.
2. Picks a language tag from the script when `--lang` is not given.
3. Sets the text direction: right-to-left for Arabic, Hebrew, Thaana, Syriac and N'Ko.
4. Installs a caption font and a heading font that cover the script, and copies them into the project. Rendering uses these local files and needs no network.
5. Wraps captions by what a reader sees: a letter with its marks counts once, and Chinese, Japanese and Korean characters count double.

## When to pass --lang

The script does not always tell the language. Pass `--lang` in these cases:

| Text | Guess | Pass |
|---|---|---|
| Latin script, not English | `en` | `es`, `fr`, `pt-BR`, `id`, `tr`, `vi`, `sw` ... |
| Chinese characters only | `zh` (Simplified) | `zh-TW` or `zh-HK` for Traditional |
| Arabic script | `ar` | `ur`, `fa`, `ps` |
| Devanagari | `hi` | `mr`, `ne` |
| Cyrillic | `ru` | `uk`, `bg`, `sr`, `kk` |
| Bengali script | `bn` | `as` |

The tag affects line breaking, number formatting and the choice between Chinese, Japanese and Korean fonts. A wrong tag for a Latin-script language still renders correctly.

## Fonts

| Script | Captions | Headings |
|---|---|---|
| Latin, Cyrillic, Greek, Vietnamese | Noto Sans | Noto Serif |
| Devanagari | Hind | Noto Serif Devanagari |
| Bengali | Hind Siliguri | Noto Serif Bengali |
| Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Sinhala | Noto Sans for that script | Noto Serif for that script |
| Arabic | Noto Sans Arabic | Noto Kufi Arabic |
| Hebrew | Noto Sans Hebrew | Noto Serif Hebrew |
| Thai, Lao, Khmer, Myanmar | Noto Sans for that script | Noto Serif for that script |
| Chinese Simplified, Traditional | Noto Sans SC, TC | Noto Serif SC, TC |
| Japanese | Noto Sans JP | Noto Serif JP |
| Korean | Noto Sans KR | Noto Serif KR |
| Ethiopic, Armenian, Georgian | Noto Sans for that script | Noto Serif for that script |
| Tibetan, Thaana, Syriac, N'Ko | Noto for that script | the same |

To use a different font, set `"fonts": { "text": "<id>", "display": "<id>" }` in `story.json`, where `<id>` is a font id from https://fontsource.org (for example `poppins`, `baloo-2`, `cairo`, `noto-nastaliq-urdu`, `kanit`). `check.ts` installs it and fails if the font cannot draw the story's characters.

## Right-to-left

Captions, tags and labels follow `dir` in `story.json`. In `Txt`, `anchor="start"` still means the left edge. Scene layout (who stands on which side) is not mirrored; mirror it yourself if the story needs it.

Key words are highlighted by colour only, so Arabic letters stay joined across a highlighted word. Highlight whole words.

## Numbers

Draw numbers with `num(n)`. It uses the language's own usual digits: Bengali and Persian get their native digits, Hindi and Arabic get Western digits, which is what current CLDR data gives as their default. To force a system, set `"numerals"` in `story.json` (`deva`, `arab`, `beng`, `thai`, `latn` ...).

## Limits

- Emoji in captions may render as an empty box on Linux. `check.ts` warns about them.
- Vertical text (traditional Mongolian, vertical Japanese) is not supported.
- Urdu in the Nastaliq style needs `"fonts": { "text": "noto-nastaliq-urdu" }`; its tall lines can make two-line captions large.
- Line breaking for Thai, Lao, Khmer, Myanmar, Chinese and Japanese uses the word boundaries built into Node. It is good, not perfect: look at the contact sheet and move a `\n` by hand where a break reads badly.
