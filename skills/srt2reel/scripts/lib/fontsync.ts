import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DISPLAY_WEIGHTS, TEXT_WEIGHTS, closestWeight, fontsFor, neededFaces, parseFontCss, uncovered } from './fonts.ts';
import { install, writeJson } from './project.ts';
import type { Paths } from './project.ts';
import { detectScript, scriptForLang } from './text.ts';
import type { Face, FontManifest, Story } from './types.ts';

const packageDir = (p: Paths, id: string) => join(p.root, 'node_modules', '@fontsource', id);

function facesFor(p: Paths, id: string, wanted: number[], text: string): Face[] {
  const dir = packageDir(p, id);
  const available = readdirSync(dir)
    .map((f) => /^(\d+)\.css$/.exec(f)?.[1])
    .filter((w): w is string => !!w)
    .map(Number);
  if (available.length === 0) throw new Error(`@fontsource/${id} has no weight stylesheets.`);
  const weights = [...new Set(wanted.map((w) => closestWeight(available, w)))];
  const out: Face[] = [];
  for (const weight of weights) {
    const faces = parseFontCss(readFileSync(join(dir, `${weight}.css`), 'utf8'));
    for (const face of neededFaces(faces, text)) {
      const name = basename(face.file);
      copyFileSync(join(dir, face.file), join(p.publicFonts, name));
      out.push({ file: `fonts/${name}`, weight, range: face.range });
    }
  }
  return out;
}

export function storyText(story: Story, scenesSource: string): string {
  const parts = [story.page, ...story.captions.flatMap((c) => [c.t, c.who ?? '']), ...story.scenes.flatMap((s) => [s.tag ?? '', s.props ? JSON.stringify(s.props) : ''])];
  return `${parts.join(' ')} ${scenesSource}`;
}

// Installs the fonts for the story's script, copies the files the video needs into
// public/fonts and records them. Returns characters that no installed font can draw.
export function syncFonts(p: Paths, story: Story, scenesSource: string): { ids: { text: string; display: string }; missing: string[] } {
  const captionText = story.captions.map((c) => c.t).join(' ');
  const script = scriptForLang(story.lang, detectScript(captionText).script);
  const auto = fontsFor(script);
  const ids = { text: story.fonts?.text ?? auto.text, display: story.fonts?.display ?? auto.display };

  const absent = [...new Set([ids.text, ids.display])].filter((id) => !existsSync(join(packageDir(p, id), 'package.json')));
  if (absent.length) install(p, absent.map((id) => `@fontsource/${id}`));

  rmSync(p.publicFonts, { recursive: true, force: true });
  mkdirSync(p.publicFonts, { recursive: true });
  const text = storyText(story, scenesSource);
  const manifest: FontManifest = {
    text: { id: ids.text, faces: facesFor(p, ids.text, TEXT_WEIGHTS, text) },
    display: { id: ids.display, faces: facesFor(p, ids.display, DISPLAY_WEIGHTS, text) },
  };
  writeJson(p.fonts, manifest);

  const onScreen = storyText(story, '');
  return { ids, missing: uncovered([...manifest.text.faces, ...manifest.display.faces], onScreen) };
}
