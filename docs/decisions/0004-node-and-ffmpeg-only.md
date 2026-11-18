# 0004: The only tools needed are Node and ffmpeg

Date: 2026-11-18. Status: accepted.

## Decision

No Python, no numpy, no PIL, no speech models. Audio analysis, sound effects, contact sheets and final checks are done with Node and ffmpeg.

## Why

Every extra runtime is a way for the first run to fail on someone else's machine. The original skill needed Python with numpy for loudness and PIL for contact sheets, and told the agent to install numpy with `--break-system-packages`. ffmpeg already has to be there to make a video, and it can decode audio and tile images.

## What was left out because of this

Word-by-word caption highlighting needs the audio aligned to the text, and the tools that do it are Python with model downloads of hundreds of megabytes. It is on the worklist as an optional add-on, not part of the default path.
