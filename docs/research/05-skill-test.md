# Testing the skill with a fresh agent

Date: 2026-11-18.

## What was tested

Whether an agent that has only the skill folder can build a complete video. This is the gate for phase 00.

A new agent was given a copy of `skills/srt2reel`, the Hindi example voice (24 s) and its SRT, and one sentence from a user in Hindi asking for a video. It was told not to read the scripts' source, the repository's README, tests or other examples, and to report every point where the instructions made it guess.

## Result

It produced a finished video: 7 scenes, 25.6 s, 6.1 MB. The final check printed:

```
done  100%  (767/767 frames)
Loudness: -19.04 LUFS in, normalised to -14 LUFS.
The file passed every check: 1080x1920, 30 fps, H.264, AAC 48 kHz, full length.
```

- No script failed or warned.
- Caption wording matched the SRT, and Devanagari conjuncts, nukta letters and the rupee sign all rendered.
- It drew props the kit did not have: a shop front, a savings jar, a light bulb.
- It took 38 tool calls and about 13 minutes. Three rounds of preview frames were needed, all to fix positions.

## What it found

The scripts cost it almost nothing. Its effort went into working out where things are and how big they are, by measuring the kit picture.

| Finding | What was changed |
|---|---|
| The kit list named pieces but not their props, anchor points or sizes | `references/scenes.md` now has a table for every piece with all three |
| No formula for how tall or wide a person is | Added: head top, feet and width as a function of `y` and `s`, and how many people fit |
| `delay` on bubbles was described one way and used another | It was a real bug: a bubble given `lf(second)` was drawn from the first frame instead of popping in. Replaced by `since`, which means one thing |
| Zones could only be judged by eye | `stills.ts --grid` draws the content box and a ruler |
| The street's lamp post could not be removed | `lamp={false}` |
| It had to draw a shop from nothing | Added a `Shop` piece with a shutter that opens |
| `arm="wave"` looked like a salute | The pose was redrawn with the hand away from the head |
| The speaker name above a caption was too small to read | Larger |
| `final_check.jpg` caught frames just before things appeared | Frames are now taken late inside four captions, and their times are printed |
| No way to wait for a render without sleeping | `render.ts --status --wait <seconds>` |
| `raw.mp4` was left beside `final.mp4` | Deleted after a successful render |
| "8 to 16 scenes per minute" did not fit a 25 s video | The skill now gives counts for short videos |
| Several small unknowns in `story.json` (auto-wrap, phrases in braces, the closing hold, rounding of the last scene end) | Each is now stated in `references/story.md` |
| "pauses found: 14" but 8 listed | The line now says how many are long enough to cut on |
| A pointer to a file outside the skill | Removed |

## What it did not test

One agent, one language, one short story, on the owner's machine. It says nothing about weaker agents, long videos written by an agent, or other machines.
