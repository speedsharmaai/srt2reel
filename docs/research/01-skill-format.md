# Skill format and packaging

Researched 2026-11-18. Items marked UNVERIFIED could not be confirmed from a primary source.

## What the spec requires

Source: https://agentskills.io/specification

- `name`: required, 1-64 chars, lowercase letters, digits and hyphens, no leading, trailing or double hyphen, and it must match the parent directory name.
- `description`: required, 1-1024 chars, says what the skill does and when to use it.
- Optional: `license`, `compatibility` (max 500 chars), `metadata` (string map), `allowed-tools` (experimental).
- `scripts/`, `references/`, `assets/` are recommended directory names, not required ones.
- Keep SKILL.md under 500 lines and under about 5000 tokens.
- Reference files by relative path from the skill root, one level deep.
- Validator: `skills-ref validate ./my-skill`.

## Anthropic's authoring advice

Source: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

- Write the description in third person. The name cannot contain `anthropic` or `claude`.
- Give low freedom to fragile steps ("run exactly this script") and more freedom where judgment helps.
- Build a feedback loop: run a validator, fix, repeat.
- Scripts should solve the problem rather than hand an error back to the model. No unexplained constants.
- Forward slashes in paths, even on Windows. Do not offer many options; give one default.
- Reference files over 100 lines need a table of contents.
- Write evaluations before long documentation. There is no built-in eval runner.
- From Anthropic's own `skill-creator` skill: all "when to use" text belongs in the description, not the body.
  https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md

## Claude Code

Source: https://code.claude.com/docs/en/skills

- Locations: `~/.claude/skills/<name>/`, `.claude/skills/<name>/`, or `<plugin>/skills/<name>/`.
- `${CLAUDE_SKILL_DIR}` is the directory holding SKILL.md. It is substituted in the SKILL.md body. It is not an environment variable, so a script cannot read it; the body has to put it into the command string.
  https://code.claude.com/docs/en/plugins/manifest-reference
- Outside Claude Code only spec fields work, and whether `${CLAUDE_SKILL_DIR}` is substituted elsewhere is UNVERIFIED. So the skill uses paths relative to the skill root and tells the agent how to find that root.

## Packaging as a plugin

Sources: https://code.claude.com/docs/en/plugins/manifest-reference and https://code.claude.com/docs/en/plugins/marketplace-reference

- `.claude-plugin/plugin.json` needs only `name`.
- Skills live in `skills/<name>/SKILL.md`. One repo can be a plugin and also hold a plain skill folder people zip and upload.
- A top-level `bin/` directory makes claude.ai and Cowork refuse the plugin, so this repo has none.
- `.claude-plugin/marketplace.json` needs `name`, `owner`, `plugins`.
- Install: `/plugin marketplace add <owner>/<repo>` then `/plugin install <plugin>@<marketplace>`.

## claude.ai and the API sandbox

- claude.ai: upload a ZIP of the skill folder. https://support.claude.com/en/articles/12512180-using-skills-in-claude
- Chat files are limited to 30 MB each. https://support.claude.com/en/articles/12111783-create-and-share-skills-with-claude
- The API code-execution container has Python 3.11, 1 CPU, 5 GiB RAM, and no internet access. No ffmpeg or Chromium is listed.
  https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool
- The best-practices page says claude.ai can install from npm and PyPI. Whether its sandbox has Node, ffmpeg or a browser is UNVERIFIED.

What this means for srt2reel: the first step has to be an environment check that stops early with a plain message when Node, ffmpeg or a browser is missing, instead of failing halfway through a render.

## Other agents

Source: https://github.com/vercel-labs/skills and its docs/agents.md

- `npx skills add <owner>/<repo>` installs into `.claude/skills/` for Claude Code and `.agents/skills/` for Codex, Gemini CLI, Copilot, Cursor and OpenCode. These paths are Vercel's table, not each vendor's own docs.
- Remotion ships its own skills: `npx remotion skills add`. https://www.remotion.dev/docs/cli/skills

## Security expectations

Source: https://support.claude.com/en/articles/12512180-using-skills-in-claude

- Anthropic tells users to install skills only from trusted sources and to read bundled scripts and dependencies, watching for anything that connects to a network.
- So the README states what each script reads and writes, and the scripts make no network calls of their own.
