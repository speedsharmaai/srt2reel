# How the pieces fit

```
voice.mp3 + voice.srt
        |
     init.ts ------------------------------------------------------------+
        |  copies template/, installs it                                 |
        |  ffmpeg: duration, loudness per frame, pauses                  |
        |  SRT -> cues -> captions snapped to pauses and wrapped         |
        v                                                                v
  PROJECT/src/story.json        PROJECT/src/generated/audio.json   PROJECT/.srt2reel/plan.json
  (captions, one scene)         (length, loudness per frame)        (SRT cues, pauses: kept for checks)
        |
   the agent edits story.json and writes src/scenes.tsx
        |
     check.ts   wording vs plan.json cues, timing, scene ids, fonts, tsc
        |
     stills.ts  Remotion renders chosen frames -> contact sheets -> the agent looks
        |
     render.ts  Remotion renders raw.mp4 -> ffmpeg loudness pass -> final.mp4 -> ffprobe checks
```

## Who owns which file

| File | Written by | Read by |
|---|---|---|
| `src/story.json` | `init.ts`, then the agent | the video, `check.ts`, `stills.ts` |
| `src/scenes.tsx` | the agent | the video, `check.ts` |
| `src/lib/*` | the template, never edited | the video |
| `src/generated/audio.json` | `init.ts` | the video (length, mouth movement) |
| `src/generated/fonts.json` | `init.ts`, `check.ts` | the video (which font files to load) |
| `.srt2reel/plan.json` | `init.ts` | `check.ts`, `stills.ts`, `render.ts` |
| `public/voice.mp3`, `public/sfx/*`, `public/fonts/*` | `init.ts`, `check.ts` | the video |
| `out/*` | `stills.ts`, `render.ts` | the agent, the user |

## Where the logic lives

Everything that can be tested without a browser is in `skills/srt2reel/scripts/lib/` as plain functions: SRT parsing, script detection, line wrapping, pause detection, caption timing, validation, font coverage, frame picking, loudness arguments, file verification, sound synthesis. The five command files only read arguments, call those functions, and print.

The video template knows nothing about the scripts. It reads three JSON files and the agent's scene code.
