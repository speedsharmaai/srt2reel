# 0002: Captions are generated from the SRT and checked against it

Date: 2026-11-18. Status: accepted.

## Decision

`init.ts` writes the captions from the SRT. `check.ts` compares all caption text with the SRT and fails on any difference. The agent may restyle and retime captions but cannot change their words.

## Why

In the skill this project started from, the model copied the SRT text into a data file by hand. A model retyping fifty lines of Bengali or Arabic drops or alters a word sooner or later, and nobody notices until the video is posted. The words a person recorded are the one thing that must not change, so a program copies them and a program verifies them.

## How the comparison works

Both sides are normalised to Unicode NFC and stripped of whitespace, line breaks and highlight braces, then compared as one string. That lets the agent merge, split and re-wrap captions freely while any changed letter is still caught. The error message shows the text around the first difference.
