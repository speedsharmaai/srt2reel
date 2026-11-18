# Platforms

## The file

`render.ts` writes one MP4 that meets the published upload specs of Instagram Reels, Facebook Reels and YouTube Shorts:

- 1080x1920, 30 fps, H.264, yuv420p, BT.709, index at the front of the file
- AAC stereo, 48 kHz, 192 kbps
- loudness evened to -14 LUFS with peaks under -1.5 dBTP

`check.ts` warns when the video is longer than 90 s (Facebook Reels through the API) or 180 s (YouTube Shorts).

## What the apps cover

Each app draws its own buttons and text over the top and bottom of a vertical video. The layout leaves room:

- the page name sits 120 px from the top and the scene tag 200 px
- the caption card ends 340 px above the bottom
- text stays 100 px in from each side

These numbers are a working default. No platform publishes an exact figure for ordinary posts. The published figures are for ads, which keep about 270 px clear at the top and up to 670 px at the bottom for the ad's button.

If the video will run as an ad, or the user reports that captions sit under the app's text, raise the captions with `"captionLift"` in `story.json` (in the 540x960 drawing space: 100 lifts the card by 200 px on the final video) and keep scene content above the card.

## Posting rules worth telling the user

Say these in the user's language when relevant. They are summaries of platform policies as of late 2025, not legal advice.

- Repetition: YouTube does not pay for "inauthentic content", which includes videos that look made from a template and posted in bulk. Meta has a similar rule for unoriginal content. A video built here has its own scenes drawn for its own story, but a channel that posts many near-identical videos is what these rules target.
- AI labels: an animated video does not need an "AI generated" label on YouTube, because it is clearly not real footage. A realistic synthetic or cloned voice may need the platform's label, on Meta and TikTok in particular. If the voice is the user's own recording, no label is needed.
- Claims: do not promise income, cures or guaranteed results in a video.
