import React from 'react';
import { AbsoluteFill, Audio, Sequence, getInputProps, staticFile, useCurrentFrame } from 'remotion';
import { Overlay, Stage } from './lib/chrome';
import { Txt } from './lib/figures';
import { useFonts } from './lib/fonts';
import { C, CX, FPS, H, LAYOUT, T, W, story } from './lib/theme';
import { SCENES } from './scenes';

const Missing: React.FC<{ id: string; dur: number }> = ({ id, dur }) => (
  <Stage dur={dur} bg="#7A1F1F">
    <Txt x={CX} y={H / 2} size={34} fill="#fff" maxWidth={460}>
      {`Missing scene: ${id}`}
    </Txt>
  </Stage>
);

// Shown only on preview stills, so each cell of a contact sheet says what it is.
const DebugLabel: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const scene = story.scenes.find((x) => t >= x.s && t < x.e);
  const caption = story.captions.findIndex((x) => t >= x.s && t <= x.e) + 1;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, padding: '10px 22px', background: '#000c', color: '#fff', font: '700 44px monospace' }}>
      {t.toFixed(2)}s · {scene?.id ?? 'no scene'}
      {caption > 0 && ` · caption ${caption}`}
    </div>
  );
};

// Shown on preview stills made with --grid: scene content belongs inside the box.
const Grid: React.FC = () => {
  const line = { stroke: '#E0159B', strokeWidth: 2, strokeDasharray: '8 6', fill: 'none' };
  return (
    <svg width={W * 2} height={H * 2} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect x={LAYOUT.side} y={LAYOUT.contentTop} width={W - LAYOUT.side * 2} height={LAYOUT.contentBottom - LAYOUT.contentTop} {...line} />
      {Array.from({ length: Math.floor(W / 100) }).map((_, i) => (
        <text key={`x${i}`} x={(i + 1) * 100} y={LAYOUT.contentTop - 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="#E0159B">
          {(i + 1) * 100}
        </text>
      ))}
      {Array.from({ length: Math.floor(H / 100) }).map((_, i) => (
        <text key={`y${i}`} x={LAYOUT.side - 4} y={(i + 1) * 100 + 4} textAnchor="end" fontSize={11} fontFamily="monospace" fill="#E0159B">
          {(i + 1) * 100}
        </text>
      ))}
    </svg>
  );
};

export const Video: React.FC = () => {
  useFonts();
  const debug = getInputProps().debug === true;
  const grid = getInputProps().grid === true;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {story.scenes.map(({ id, s, e, props }, i) => {
        const Scene = SCENES[id];
        const dur = T(e) - T(s);
        return (
          <Sequence key={i} from={T(s)} durationInFrames={dur}>
            {Scene ? <Scene t0={s} dur={dur} {...props} /> : <Missing id={id} dur={dur} />}
          </Sequence>
        );
      })}
      <Overlay />
      {grid && <Grid />}
      {debug && <DebugLabel />}
      <Audio src={staticFile('voice.mp3')} volume={1} />
      <Audio src={staticFile('sfx/pad.wav')} volume={0.1} />
      {story.scenes.slice(1).map(({ s }, i) => (
        <Sequence key={`cut${i}`} from={T(s)}>
          <Audio src={staticFile('sfx/tick.wav')} volume={0.16} />
        </Sequence>
      ))}
      {story.sfx.map(([name, at, volume], i) => (
        <Sequence key={`sfx${i}`} from={T(at)}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
