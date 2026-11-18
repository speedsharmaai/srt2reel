# Platform specs, loudness and policy

Researched 2026-11-18. This is the weakest of the four research notes: several official pages were unreachable (Meta Ads Guide 404, TikTok help 503), so the safe-zone numbers are third-party. Items marked UNVERIFIED are treated as defaults a user can change, not as facts.

## Safe zones on a 1080x1920 frame

No official pixel spec could be fetched. Third-party figures:

| Platform | Top | Bottom | Sides | Source |
|---|---|---|---|---|
| Meta Reels (ads) | about 269 px | about 672 px | about 65 px | https://superscale.ai/learn/meta-ad-sizes |
| TikTok (ads) | 198-240 px | 528-660 px | 120-185 px | https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs |
| YouTube Shorts | not found | not found | not found | |

These are ad specs, which reserve room for a call-to-action button. Organic posts cover less of the bottom. Sources disagree on the bottom margin (20% to 40%).

Decision: two layouts.

- `organic` (default): top 250 px, bottom 420 px, sides 120 px. Captions sit just above the bottom margin.
- `ads`: top 270 px, bottom 672 px, sides 120 px. Captions move up to clear the ad button, and the scene area gets shorter.

Both are constants in one file, and the README says where the numbers come from and that they are not official.

## Upload specs

| Platform | Container and codec | Frame rate | Audio | Limits | Source |
|---|---|---|---|---|---|
| Instagram Reels (Graph API) | MP4 or MOV, moov atom at front, H.264 or HEVC, progressive, closed GOP, 4:2:0, max 25 Mbps | 23-60 | AAC, 48 kHz max, 128 kbps | 3 s to 15 min, 300 MB | https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media |
| Facebook Reels (Page API) | MP4, H.264 or H.265, 1080x1920 recommended | 24-60 fixed | AAC-LC, 48 kHz, 128 kbps or more | 3 to 90 s | https://developers.facebook.com/docs/video-api/guides/reels-publishing |
| YouTube Shorts | MP4, 8 Mbps at 1080p 30 fps, closed GOP of half the frame rate, BT.709 | | AAC-LC, 48 kHz, stereo | up to 3 min | https://support.google.com/youtube/answer/1722171, https://support.google.com/youtube/answer/10059070 |
| TikTok | UNVERIFIED | | | | |

Decision: output is MP4, H.264, yuv420p, BT.709, 30 fps fixed, keyframe every 15 frames, AAC 48 kHz stereo 192 kbps, moov atom at the front. That one file meets every row above. The final check warns when the video is longer than 90 s (Facebook Reels API limit) or 180 s (Shorts limit).

## Loudness

- A documented loudness target for any of the four platforms was not found. YouTube's -14 LUFS is widely quoted but UNVERIFIED from an official page.
- ffmpeg `loudnorm`: linear mode needs the measured values from a first pass. It falls back to dynamic mode when the target cannot be reached without clipping. Dynamic mode upsamples to 192 kHz, so the output sample rate must be set explicitly.
  https://ffmpeg.org/ffmpeg-filters.html

Decision: two passes. Measure first, then normalise to -14 LUFS with a -1.5 dBTP ceiling, `-ar 48000`, video stream copied untouched.

## Policies a template-made video has to respect

- YouTube, since 15 July 2025: "inauthentic content" is not monetised. That includes content that "looks like it's made with a template", "templated storylines", and AI content "giving the impression of mass production".
  https://support.google.com/youtube/answer/1311392
- Meta announced a similar crackdown on unoriginal content in July 2025 (secondary source).
  https://www.searchenginejournal.com/meta-follows-youtube-in-crackdown-on-unoriginal-content/551096/
- YouTube AI disclosure: required for realistic AI content, not for content that is clearly not real. Animation does not need a label. A real person's voice made to say something they did not say does.
  https://support.google.com/youtube/answer/14328491
- Meta and TikTok: realistic AI video or audio must be labelled (search summaries only, UNVERIFIED in detail).
  https://transparency.meta.com/governance/tracking-impact/labeling-ai-content/

What srt2reel does about it: every video gets its own scenes drawn for its own story, so two videos do not share a storyline or layout. The skill never writes the story. The README tells users plainly that posting many near-identical videos is what these policies target, and that a cloned or realistic synthetic voice may need the platform's AI label.

## Word-by-word caption timing

An SRT has a start and end per caption, not per word. To highlight each word as it is spoken, the audio has to be aligned to the known text.

- ctc-forced-aligner: aligns a given transcript, 1100+ languages (MMS model). https://github.com/MahmoudAshraf97/ctc-forced-aligner
- stable-ts: `align()` syncs plain text to audio using a Whisper model. https://github.com/jianfch/stable-ts
- whisper.cpp and faster-whisper transcribe again; they do not align a supplied transcript.

Decision: not in the first version. Both aligners need Python and a model download of hundreds of megabytes, which breaks the "Node and ffmpeg only" rule. It is on the worklist as an optional add-on.

## Finding pauses

- ffmpeg `silencedetect`: `noise` defaults to -60 dB, `d` (minimum silence) defaults to 2 s.
  https://ffmpeg.org/ffmpeg-filters.html
- No published threshold for clean versus noisy voice recordings was found.

Decision: the threshold is not a fixed number. `scripts/audio.mjs` measures the loudness of every 1/30 s frame, takes the quiet end of that distribution as the noise floor, and sets the silence threshold relative to it. A phone recording with room noise and a clean studio voice both get sensible pauses.

## Readability and safety

- WCAG 1.4.3: text contrast at least 4.5:1, or 3:1 for large text.
  https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- WCAG 2.3.1: nothing flashes more than three times in one second.
  https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html

Every theme's caption colours are unit-tested for 4.5:1 contrast. The scene guide forbids strobing.

## Not found

Official evidence on hooks, cut frequency, ideal length or the share of muted viewers was not found. The pacing advice in the scene guide is carried over from the original skill and is labelled as practice, not as evidence.
