import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import manifest from '../generated/fonts.json';

type Face = { file: string; weight: number; range: string };

const FAMILIES: [string, Face[]][] = [
  ['Reel Text', manifest.text.faces as Face[]],
  ['Reel Display', manifest.display.faces as Face[]],
];

// Fonts are local files listed in generated/fonts.json. A font that fails to load stops
// the render, because the fallback would draw empty boxes for most scripts.
export const useFonts = () => {
  const [handle] = useState(() => delayRender('Loading fonts'));
  useEffect(() => {
    const loads = FAMILIES.flatMap(([family, faces]) =>
      faces.map((face) =>
        new FontFace(family, `url(${staticFile(face.file)})`, { weight: String(face.weight), unicodeRange: face.range })
          .load()
          .then((loaded) => document.fonts.add(loaded)),
      ),
    );
    Promise.all(loads)
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(new Error(`A font file failed to load: ${err}`)));
  }, [handle]);
};
