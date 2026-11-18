# 0001: Scripts are TypeScript that Node runs directly

Date: 2026-11-18. Status: accepted.

## Decision

Every script in the skill is a `.ts` file run as `node script.ts`. There is no build step and no compiled JavaScript in the repository.

## Why

The owner asked for TypeScript, not JavaScript. Node 22.18 and later run TypeScript files by stripping the types, so the source can be the thing that runs. A build step would mean shipping generated JavaScript inside the skill, and a second copy of every file that can drift from the first.

## What it costs

- Node 22.18 or newer is required. `doctor.ts` checks this, and SKILL.md's troubleshooting page explains the error an older Node gives.
- Only type syntax that can be erased is allowed (no enums, no parameter properties). `erasableSyntaxOnly` in tsconfig enforces it.
- Imports between scripts carry the `.ts` extension, which Node requires. The video template is bundled by Remotion and keeps extension-less imports.
