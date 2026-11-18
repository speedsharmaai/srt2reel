# 0003: Fonts are chosen by script and rendered from local files

Date: 2026-11-18. Status: accepted.

## Decision

The script of the SRT decides the fonts. They are installed from Fontsource npm packages, copied into the project, and loaded by the video from those local files.

## Why

- A font that lacks the script draws empty boxes. Choosing by detected script means the user never has to know what a font subset is.
- Loading from Google Fonts at render time needs network access during the render, which sandboxes often lack, and makes a render depend on a remote server.
- Fontsource packages have one naming scheme for every font, so one piece of code handles a two-file Hindi font and a 200-file Chinese font.

## Details

- For Chinese, Japanese and Korean only the font files that contain characters used in the video are copied. `check.ts` repeats this whenever the text changes.
- `check.ts` compares every on-screen character with the unicode ranges of the installed files and fails if any is uncovered, because the browser's own font check cannot tell.
- A font that fails to load stops the render instead of falling back.
