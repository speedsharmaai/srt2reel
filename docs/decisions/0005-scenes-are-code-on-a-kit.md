# 0005: Scenes are code written on a kit, with props for reuse

Date: 2026-11-18. Status: accepted.

## Decision

The agent writes each scene as a small React component built from kit pieces (people, rooms, props, cards). Timing and text live in `story.json`. A scene may take props from its `story.json` entry so that one component can be reused.

## Why

A fixed set of templates filled with data would be easier to validate, but every video would look like every other one, which is what platform rules on template content punish and what viewers skip. Drawing scenes for the story is the point of the tool.

A fifteen-minute video has more than a hundred scenes, and writing each by hand is not practical. Props give a middle path: a dozen scene kinds written once, varied through data.

## Consequence

Scene code can be wrong in ways data cannot. So the scene code is type-checked by `check.ts`, and `stills.ts` renders a frame of every scene for the agent to look at before any full render.
