import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import { EXAMPLE_FRAMES, Kit } from './lib/examples';
import { FPS, H, T, TOTAL, W } from './lib/theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Video} durationInFrames={Math.max(1, T(TOTAL))} fps={FPS} width={W * 2} height={H * 2} />
    <Composition id="Kit" component={Kit} durationInFrames={EXAMPLE_FRAMES} fps={FPS} width={W * 2} height={H * 2} />
  </>
);
