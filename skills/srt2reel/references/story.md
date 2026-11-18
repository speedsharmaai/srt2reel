# story.json

`PROJECT/src/story.json` holds everything about the video that is data: captions, scene times, who speaks, sounds. `init.ts` writes the first version. All times are seconds on the final video.

```json
{
  "lang": "en",
  "dir": "ltr",
  "format": "portrait",
  "page": "",
  "theme": "paper",
  "captionLift": 0,
  "captions": [
    { "s": 0.2, "e": 2.05, "t": "Maya wanted to\nrun a {marathon}." },
    { "s": 4.99, "e": 7.99, "t": "\"I'm going to run {forty-two}\nkilometres,\" she said.", "who": "Maya" }
  ],
  "scenes": [
    { "id": "dream", "s": 0, "e": 2.34, "tag": "The big idea" },
    { "id": "announce", "s": 2.34, "e": 8.29, "tag": "At the office" }
  ],
  "speak": { "maya": [[4.99, 7.0]] },
  "sfx": [["pop", 0.9, 0.3]]
}
```

## Captions

`init.ts` fills these from the SRT with times moved onto the real pauses in the voice. Usually you only add key words.

- `t` is the text. `{word}` shows that word in the accent colour. Mark one or two key words or short phrases per caption. A brace may hold several words (`{stayed in bed}`) but must start and end on whole words. `\n` is a line break; two lines at most, about 26 columns each in portrait and 42 in landscape (Chinese, Japanese and Korean characters are twice as wide, so half as many).
- `who` adds a small speaker name above a quoted line. Write it in the story's language.
- `s` and `e` are start and end. Captions must not overlap.
- A caption with no `\n` that is too wide is wrapped automatically when drawn, so nothing overflows. Add `\n` yourself only to choose where the break falls.

You may merge two captions, split one, move a line break, or change times. You may not change, add or drop a word: `check.ts` compares all caption text with the SRT and fails on any difference. Spacing and line breaks are ignored in that comparison.

When a caption is short and spoken fast, let its `e` run into the pause after it so that it can be read. The last caption may stay up into the closing hold.

## Scenes

A list in time order. Each entry names a component in `scenes.tsx` by `id`.

- The first scene starts at `0`. Each scene starts where the previous one ends. The last scene ends at the video length printed by `init.ts` (voice length plus the hold); the number printed there, to two decimals, is close enough.
- The hold is the 1.5 seconds after the voice ends. The last scene simply stays on screen for it; let its final picture settle and do not start anything new.
- Put each cut at a pause from the list `init.ts` printed (also saved in `PROJECT/.srt2reel/plan.txt`).
- `tag` is optional: one to three words naming the place or time, shown in a chip at the top. Give a tag to scenes that change place or time. Leave it out for cards and close-ups.
- The same `id` may appear more than once to return to a scene.
- `props` is optional: an object handed to the scene component, so that one component can serve many moments. `{ "id": "talk", "s": 40.2, "e": 46.9, "props": { "left": "asha", "right": "uncle", "bubble": "?" } }`. See [long-videos.md](long-videos.md).

## speak

Who is talking and when, so that mouths move: `"name": [[start, end], ...]`. The name is whatever you pass to `mouthOpen('name', t)` in the scene. Use the time window of the quoted line, not of the narration around it. When the narrator only reports that someone spoke ("he told the whole street"), there is no quoted line; leave the mouth closed and show the telling another way, with a gesture or a speech bubble. The mouth moves only on frames where the voice is audible.

## sfx

`[name, time, volume]`. Names: `pop` (something appears), `stamp` (a stamp or number slams down), `whoosh` (a move or a mood change), `printer` (paper, a document), `tick`. Volume is 0 to 1; 0.3 to 0.5 is right. A soft tick on every cut and a quiet ambient pad under the whole video are added automatically, so do not add those.

## Settings

- `lang`: BCP 47 language tag. Decides fonts for Chinese, Japanese and Korean, line breaking, and number formatting.
- `dir`: `ltr` or `rtl`. Set by `init.ts` from the script.
- `format`: `portrait` (1080x1920) or `landscape` (1920x1080). Set by `init.ts --format`. Changing it later means redrawing the scenes, because the drawing space changes.
- `page`: page or channel name for the small pill at the top. Empty string for none.
- `theme`: `paper` (warm cream, red accent), `mint` (soft green), `sky` (soft blue).
- `captionLift`: pixels (in the drawing space, 0 to 250) to raise the caption card. Use it when the video will run as an ad, where a button covers more of the bottom. Keep scene content above the raised card.
- `numerals`: optional Unicode numbering system for `num()`, for example `deva`, `arab`, `thai`. By default each language uses its own usual digits.
- `fonts`: optional `{ "text": "<id>", "display": "<id>" }` with Fontsource font ids, to replace the automatic choice. See [languages.md](languages.md).
