import React from 'react';
import { Books, CAST, CX, Desk, Lamp, POSE, Person, Room, Scene, SceneMap, Stage, blinkAt, breathe, useT } from './lib/kit';

// One component per scene. story.json says when each one is on screen.
// This starter scene is a placeholder: replace it with scenes drawn for the story.
const Opening: Scene = ({ t0, dur }) => {
  const { f } = useT(t0);
  const x = CX - 120;
  return (
    <Stage dur={dur}>
      <Room night window={x - 250 > 0 ? x - 250 : 40} glow={[x + 286, POSE.deskY - 70]} f={f} />
      <Person x={x} y={POSE.sitY + breathe(f)} s={POSE.s} {...CAST.student} blink={blinkAt(f)} hand={[150, -62]} elbow={[70, -90]} />
      <Desk x={x + 65} />
      <Books x={x + 150} y={POSE.deskY} />
      <Lamp x={x + 309} y={POSE.deskY} />
    </Stage>
  );
};

export const SCENES: SceneMap = {
  opening: Opening,
};
