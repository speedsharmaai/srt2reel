# When something goes wrong

## doctor.ts will not start

`node doctor.ts` fails with `Unknown file extension ".ts"` or a syntax error: Node is older than 22.18. Check with `node --version`. The scripts are TypeScript and need a Node that runs it directly. Tell the user to install Node 22 or 24.

## doctor.ts prints FAIL

- `ffmpeg` or `ffprobe` missing: it prints the install command for each system. In a sandbox where nothing can be installed, the video cannot be built there; say so.
- No package manager: Node was installed without npm. Reinstall Node.

## init.ts

- `pnpm install failed` or `npm install failed`: the first run downloads Remotion and fonts from the npm registry. With no network access the project cannot be created.
- `The subtitle file is not valid UTF-8`: the SRT is in an old encoding. Ask the user which language the file is in and pass `--encoding`: `windows-1252` (Western European), `windows-1251` (Cyrillic), `windows-1256` (Arabic), `gbk` (Simplified Chinese), `big5` (Traditional Chinese), `shift_jis` (Japanese), `euc-kr` (Korean), `tis-620` (Thai).
- `No subtitle cues found`: the file is not an SRT. Ask for the right file.
- `The SRT ends at X but the voice is Y long`: the two files may not belong together, or the SRT was made for a different cut of the audio. Ask the user.
- Captions look split in odd places: merge or split them by hand in `story.json`. Only the wording is fixed.

## check.ts

- `Caption wording differs from the SRT near "..."`: a word was changed, added or lost while editing `story.json`. The message shows the place. Restore the SRT's wording. To start the captions again from the SRT: run `init.ts` with `--force` (this replaces `story.json`).
- `Scene "x" is not defined in src/scenes.tsx`: the id in `story.json` is not a key of `SCENES`.
- `The last scene must end at ...`: set the last scene's `e` to the video length printed by `init.ts`.
- `The font ... cannot draw: ...`: the language guess was wrong or the text mixes scripts. Set `lang` in `story.json`, or set `fonts` to a font that covers those characters.
- `The scene code does not compile`: the TypeScript errors follow. The usual causes are a kit piece that was not imported and a prop that does not exist; the tables in `references/scenes.md` list every piece and its props.

## stills.ts and render.ts

- `No browser is available to render with`: Remotion could not download its browser and none is installed. Install Chrome or Chromium, or set the environment variable `SRT2REEL_BROWSER` to a Chromium executable.
- On Linux the browser fails to start with a missing library (`libnss3`, `libgbm`, `libasound2` ...): install the libraries listed at https://www.remotion.dev/docs/miscellaneous/linux-dependencies
- A scene is blank: its component does not return a `<Stage>`, or it has HTML inside the `Stage`.
- A red frame saying `Missing scene: x`: same cause as the check error above.
- Letters show as empty boxes: run `check.ts` again; it reinstalls the fonts for the current text.
- `A delayRender() was called but not cleared`: a font or picture did not load. Check that pictures are in `public/art/` and named exactly as in the scene.
- The render is slow or the machine runs out of memory: pass `--concurrency 1`.
- The file is too large to hand over: render again with `--max-mb <limit>`.
- `--status` says `failed`: it prints the end of `PROJECT/out/render.log`. Fix the cause and start the render again.

## Changing the voice or the SRT after starting

Run `init.ts` again on the same project with the new files and `--force`. It rebuilds the captions and timings; `scenes.tsx` is kept, and the scene times in `story.json` have to be set again.
