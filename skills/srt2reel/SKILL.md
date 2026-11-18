---
name: srt2reel
description: Builds a finished animated story video from a narration audio file and its SRT subtitles, in any language or script. Makes vertical 1080x1920 shorts for Reels, Shorts and TikTok, or landscape 1920x1080 videos up to about 15 minutes for YouTube. Draws flat-vector scenes with characters, shows the SRT's exact words as timed captions with highlighted key words, adds scene tags and sound effects, and checks the finished file. Use when the user provides a voice recording (MP3, WAV, M4A) together with an SRT file and wants an animated, captioned video made from them. Does not write stories or scripts and does not generate voices.
license: MIT
compatibility: Needs Node.js 22.18 or newer, ffmpeg and ffprobe, and network access to the npm registry on first use. Renders with Remotion in a Chromium browser, which is downloaded automatically if none is installed.
metadata:
  version: "0.1.0"
---

# srt2reel

Turns a voice file and its SRT into a 30 fps story video: animated scenes with simple vector characters, caption cards that show the SRT's own words, a tag naming each scene, and soft sound effects. Two formats: `portrait` (1080x1920, for shorts) and `landscape` (1920x1080, for longer videos).

The skill builds videos. It never writes the story. If the user gives only a topic or an idea, tell them this needs the voice file and its SRT, and ask for both.

Talk to the user in the language they write to you in, in short plain sentences. They may not be technical.

## Where things are

The skill folder is `${CLAUDE_SKILL_DIR}`. If that appears as a literal placeholder, it is the folder that contains this SKILL.md. It is called `SKILL` below.

- `SKILL/scripts/` holds five commands. Run them as written; do not rewrite them.
- `SKILL/template/` is the video project that `init.ts` copies.
- `SKILL/references/` holds details to read when a step points to them.
- `SKILL/assets/kit.jpg` shows every ready-made scene piece (`kit-wide.jpg` for landscape).

Each video gets its own project folder, called `PROJECT` below. Use `~/reels/<short-name>`.

## Inputs

1. The voice file (MP3, WAV or M4A).
2. The SRT file with the exact words spoken. If it is missing, ask for it. Do not transcribe the audio yourself: speech-to-text gets words wrong, and the SRT is the source of truth.
3. Optional: a page or channel name (shown as a small watermark), a colour theme (`paper`, `mint`, `sky`), character or scene ideas, pictures of their own to use.

Choose the format from what the user asks for. A short for Reels, Shorts or TikTok is `portrait`. A video for a YouTube channel, a lesson, or anything over three minutes is `landscape`. If it is not clear, ask.

## Steps

Work through these in order. Each command prints what it did and what to do next.

### 1. Check the machine

```
node SKILL/scripts/doctor.ts
```

If it prints `FAIL`, tell the user plainly what is missing and stop. Do not try to work around a missing ffmpeg or Node. A `warn` line is fine.

### 2. Create the project

```
node SKILL/scripts/init.ts PROJECT --voice <voice file> --srt <srt file> [--format landscape] [--lang <tag>] [--page "<name>"] [--theme <name>]
```

This copies the template, installs it, measures the voice, finds the real pauses, and writes `PROJECT/src/story.json` with one caption per SRT cue, already timed to the voice and wrapped to fit. It also installs the right fonts for the language.

Read its whole output. It lists every caption with its time and every pause long enough to cut a scene on. If it warns that the SRT and the voice do not match in length, ask the user before going on.

The language is guessed from the script of the SRT. Pass `--lang` when the guess could be wrong: a Latin-script language other than English (`es`, `fr`, `id`, `vi`), Traditional Chinese (`zh-TW`), Urdu or Persian (`ur`, `fa`), Marathi or Nepali (`mr`, `ne`). See [references/languages.md](references/languages.md).

### 3. Plan the scenes

Read the captions as one story and split it into scenes. Start a new scene when the place, time, speaker or idea changes, about every 4 to 7 seconds. A 25-second story has 5 to 7 scenes; a 60-second one has 9 to 14. One scene per caption is too many. Put each cut on one of the listed pauses, not inside a sentence.

For each scene decide: where it is, who is in it, what they are doing, and one visual that shows what the caption says (a prop, a number, a gauge, a stamp) so that it is not only a person talking. Use a dark scene for the low point of the story. End on the story's last lesson or outcome.

A video longer than about two minutes has too many scenes to write one by one. Follow [references/long-videos.md](references/long-videos.md) for those.

### 4. Write the two story files

Only these two files change from video to video. Leave everything under `src/lib/` alone.

- `PROJECT/src/story.json`: scene list with times and tags, key words in captions, who speaks when, sound effects. Format and rules: [references/story.md](references/story.md).
- `PROJECT/src/scenes.tsx`: one small component per scene, and the `SCENES` object that names them. How to draw scenes, the full kit, and the layout zones: [references/scenes.md](references/scenes.md). Look at `SKILL/assets/kit.jpg` first, then copy from `PROJECT/src/lib/examples.tsx` (`examples-wide.tsx` for landscape).

Caption wording is fixed. You may add `{braces}` around key words, change line breaks, merge two captions or split one, and move times. You may not add, drop or change a word. The check in step 5 rejects any difference.

On-screen text you add yourself (tags, labels, speech bubbles) must be in the language of the SRT. Keep it to a word or two that names what the narration already says: a place, a shop sign, a reaction. Do not add new facts or sentences.

### 5. Check, and repeat until clean

```
node SKILL/scripts/check.ts PROJECT
```

It compares caption wording with the SRT, checks times, scenes, highlights and fonts, and compiles the scene code. Fix every `ERROR` and run it again. Read each `warn` and fix the ones that are real problems.

### 6. Look at the frames, and repeat until right

```
node SKILL/scripts/stills.ts PROJECT
```

This renders one frame shortly after every cut and one in the middle of every caption, and tiles them into contact sheets. Open every sheet it lists and look at it. Each cell is labelled with its time, scene and caption number.

Look for, and fix:

- anything covering or touching the tag at the top or the caption card at the bottom
- text that overflows its card, or letters drawn as empty boxes
- a scene that does not show what its caption says
- a character whose look changes between scenes
- a blank or nearly empty scene

Add `--grid` to draw the content box and a ruler on every frame; use it to see what crosses a zone and where to move it. To look again at a few moments after a fix: `node SKILL/scripts/stills.ts PROJECT --at 12.5,30`. Each run replaces the sheets from the run before.

Never render the full video without having looked at the sheets.

### 7. Render

A render takes roughly as long as the video on a fast machine and several times longer on a small one, so run it in the background and poll:

```
node SKILL/scripts/render.ts PROJECT --detach
node SKILL/scripts/render.ts PROJECT --status
```

`--status` prints `rendering`, then `finishing`, then `done` or `failed`. Check it every 20 to 30 seconds and do not end your turn before it reaches `done` or `failed`. If you cannot pause between checks, let the command wait for you: `node SKILL/scripts/render.ts PROJECT --status --wait 100` returns as soon as the render ends, or after 100 seconds; run it again until it does.

If files you hand to the user have a size limit (claude.ai chats allow 30 MB), add `--max-mb 28`.

The render evens out loudness and then checks the finished file: frame size, frame rate, codecs, length. `--status` prints the result and the path of `final_check.jpg`, four frames taken from the finished file at the times it lists. Look at that image.

### 8. Deliver

Give the user `PROJECT/out/final.mp4`. Add one line saying what is not perfect, and one suggested next step. If everything is fine, say so in one line.

## Rules for what goes in a video

- Show only what the SRT says. Do not add claims, facts or promises of your own.
- No politics, hatred, or shaming of real people. No medical or financial advice presented as fact. Treat sensitive subjects gently.
- Do not copy another creator's characters, scenes or designs. Draw this story's own.
- Never promise the user views, reach or income.
- Nothing may flash more than three times in a second.

## Things the user should know

Say these once, when they are relevant, in the user's language:

- The video is built with Remotion, which is free for individuals and for companies of up to three people. Larger companies need a Remotion licence: https://www.remotion.dev/docs/license
- Platforms act against channels that post many near-identical template videos, and may require a label on a cloned or realistic synthetic voice. See [references/platforms.md](references/platforms.md).

## When something goes wrong

See [references/troubleshooting.md](references/troubleshooting.md). If the machine cannot render video at all (no browser can start, no ffmpeg, no network for the first install), say so plainly and stop instead of producing something else.
