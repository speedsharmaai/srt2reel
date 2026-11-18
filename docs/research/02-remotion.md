# Remotion: current state

Researched 2026-11-18. Items marked UNVERIFIED could not be confirmed from a primary source.

## Version

- Latest stable is 4.0.545 (npm `latest`, released 18 Nov 2026). No breaking changes listed.
  https://registry.npmjs.org/remotion/latest, https://github.com/remotion-dev/remotion/releases
- Remotion 5.0 is not released. Its planned changes: `--color-space` default becomes `bt709`, `getVideoMetadata()` is removed, Google Fonts loading needs explicit weights and subsets.
  https://www.remotion.dev/docs/5-0-migration
- Peer deps: react and react-dom `>=16.8.0`.
- Node floor: the repo says `>=16`; other pages disagree. UNVERIFIED. srt2reel requires Node 20 or newer.

Decision: pin every Remotion package to the same exact 4.0.x version in the template, so a later 5.0 cannot change a user's render.

## Render CLI

Source: https://www.remotion.dev/docs/cli/render

- `--gl` default is null (Chrome decides).
- `--concurrency` takes a number or a percentage.
- `--crf` cannot be combined with `--video-bitrate`.
- `--image-format` default is `jpeg`. PNG is slower and only needed for transparency.
- `--timeout` default is 30000 ms.
- `--frames` renders one frame, a range or a list.
- `--browser-executable` and `--chrome-mode` exist.
- `npx remotion browser ensure` downloads Chrome Headless Shell into `node_modules` on first need.
  https://www.remotion.dev/docs/chrome-headless-shell, https://www.remotion.dev/docs/cli/browser

## Captions

- `@remotion/captions` `parseSrt()` strips a BOM, normalises line endings and joins multi-line cues. It does not strip HTML or ASS tags.
  https://raw.githubusercontent.com/remotion-dev/remotion/main/packages/captions/src/parse-srt.ts
- `createTikTokStyleCaptions()` groups word tokens into pages. It needs word-level timings, which a plain SRT does not have.
  https://www.remotion.dev/docs/captions/create-tiktok-style-captions

Decision: srt2reel has its own small SRT parser in `scripts/`, because it must also handle tags, legacy encodings and broken files, and it runs in plain Node before any bundle exists.

## Audio

- `getAudioDurationInSeconds` is deprecated. https://www.remotion.dev/docs/get-audio-duration-in-seconds
- No documented per-frame loudness API could be confirmed. UNVERIFIED.

Decision: duration and per-frame loudness come from ffmpeg in a Node script (`scripts/audio.mjs`), written to a JSON file the composition imports. This removes the old Python and numpy dependency and needs no browser.

## Composition length

- `calculateMetadata` runs once per render and can return `durationInFrames`. Data it returns must be JSON-serialisable.
  https://www.remotion.dev/docs/calculate-metadata

## Fonts

- Offline path: `@remotion/fonts` `loadFont({family, url: staticFile(...), weight})`. https://www.remotion.dev/docs/fonts/
- `@remotion/google-fonts` serves from `fonts.gstatic.com`, so it needs network at render time (inferred).
- Arabic needs an explicit font and `dir="rtl"`. https://github.com/remotion-dev/remotion/pull/12374
- Chrome Headless Shell on Linux has no Indic or CJK system fonts, so the font must be bundled and a real frame must be looked at.

Decision: fonts are local woff2 files in `public/fonts/`, loaded with `@remotion/fonts`. No network at render time.

## Rules for scene code

Sources: https://www.remotion.dev/docs/ai/system-prompt, https://www.remotion.dev/docs/random, https://www.remotion.dev/docs/timeout

- No `Math.random()`. Use `random(seed)`.
- Clamp every `interpolate()`.
- Assets in `public/` are read with `staticFile()`.
- `delayRender` aborts after 30 s by default.
- Animation is a pure function of the frame number.

## Official Remotion skills

- `remotion-dev/skills` holds 13 skills (best-practices, captions, render, license and others). Install with `npx remotion skills add`.
  https://github.com/remotion-dev/skills
- srt2reel does not copy them. The README points to them for people who want to go beyond the kit.

## License

- Remotion is free for individuals and companies of up to 3 people. Larger teams need a Company License.
  https://www.remotion.dev/docs/license/pricing.md
- The skill and README say this, because the skill installs Remotion on the user's machine.

## Linux dependencies

- Chrome Headless Shell needs `libnss3`, `libdbus-1-3`, `libatk1.0-0`, `libasound2`, `libxrandr2`, `libxkbcommon-dev`, `libxfixes3`, `libxcomposite1`, `libxdamage1`, `libgbm-dev`, `libcups2`, `libcairo2`, `libpango-1.0-0`, `libatk-bridge2.0-0`.
  https://www.remotion.dev/docs/miscellaneous/linux-dependencies
- Pointing `--browser-executable` at a Playwright Chromium is UNVERIFIED in the docs; the environment check tests it by rendering one frame.

## Performance

- Remotion's guidance: use `npx remotion benchmark` to pick concurrency; cloud machines have no GPU.
  https://www.remotion.dev/docs/performance
