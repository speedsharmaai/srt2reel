# 0006: Safe margins are defaults, stated as such

Date: 2026-11-18. Status: accepted.

## Decision

The portrait layout keeps the tag 200 px from the top and the caption card 340 px above the bottom, on a 1920 px tall frame. `captionLift` in `story.json` raises the captions for ads. The documentation says these are working defaults.

## Why

No platform publishes an exact figure for how much of an ordinary vertical post its interface covers. The figures that exist are for ads, come from third parties, and disagree with each other (see `docs/research/04-platforms.md`). Presenting any of them as fact would be dishonest, and the ad figures leave too little room for a scene.

The defaults match where the original skill placed its captions, which was in use on Facebook and Instagram Reels.
