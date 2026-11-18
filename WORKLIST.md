# Worklist

## State

Version 0.1.0, built 2026-11-18. The repository is public since the same day: github.com/speedsharmaai/srt2reel. No release, no marketplace listing, no demo video.

Phase 01 has started: three stories are written and voiced (two Hindi, one English). No video is built from them yet. That material stays out of the repository.

Works, checked by running it:

- portrait and landscape videos, rendered end to end
- English, Hindi, Arabic and Japanese captions, tags and labels
- captions generated from the SRT and verified against it
- a 15-minute landscape render with 286 scenes
- 110 unit tests, clean type-check
- a fresh agent building a Hindi video from the skill folder alone

Not checked yet:

- any machine other than the owner's Mac (no Linux sandbox, no Windows, no claude.ai)
- scripts beyond the four rendered ones
- a real long-form story; the long tests repeat one short voice

## Next three things

1. Phase 01: make three real videos for a speedsharma page, at least one in Hindi and one long landscape one. Fix what gets in the way.
2. Run the skill once inside a Linux container with only Node and ffmpeg, to find what a clean sandbox is missing.
3. Finish the public release: add a plugin icon, record a demo video. The plugin install from GitHub was tried on 2026-11-18 and works. Announcing it needs the owner's go-ahead.

## Later

- Word-by-word caption highlighting, as an optional add-on that aligns the SRT text to the audio (ctc-forced-aligner or stable-ts; both need Python and a model download).
- More character motion: running, turning to face the viewer, carrying things.
- A square 1:1 format.
- Render a sample in each remaining script and add the frames to the docs.
- Resume a failed long render from where it stopped instead of from the start.
