import React from 'react';
import { Arrow, Bar, Bubble, C, CAST, CX, H, Headline, Outdoor, POSE, Person, Room, Scene, SceneMap, Stage, StepCard, Street, W, blinkAt, breathe, num, ramp, sp, useT } from './lib/kit';

// Reusable scenes. Their content comes from "props" in story.json, and their timing
// is counted from the start of the scene with at(), so one component serves many moments.

const Talk: Scene<{ left: string; right: string; bubble: string; place: 'room' | 'street' | 'park' }> = ({ t0, dur, left, right, bubble, place }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      {place === 'room' ? <Room window={80} picture={730} rug /> : place === 'street' ? <Street /> : <Outdoor f={f} tree={820} />}
      <Person x={330} y={POSE.standY + breathe(f)} s={POSE.s} pose="stand" {...CAST[left]!} blink={blinkAt(f)} arm="point" />
      <Person x={610} y={POSE.standY + breathe(f + 15)} s={POSE.s} pose="stand" flip {...CAST[right]!} blink={blinkAt(f + 30)} mood={at(1) > 0 ? 'smile' : 'neutral'} />
      <Bubble x={430} y={120} text={bubble} since={at(0.5)} />
    </Stage>
  );
};

const Stat: Scene<{ label: string; value: number; big: string }> = ({ t0, dur, label, value, big }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={W} height={H} fill={C.bgAlt} />
      <Headline y={210} x={260} text={big} k={sp(at(0.1))} size={120} fill={C.accent} />
      <Bar x={500} y={170} label={label} value={ramp(at(0.3), 0, 30, 0, value)} show={`${num(Math.round(value * 100))}%`} k={sp(f)} />
    </Stage>
  );
};

const Steps: Scene<{ a: string; b: string }> = ({ t0, dur, a, b }) => {
  const { at } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={W} height={H} fill={C.bgAlt} />
      <StepCard x={250} y={240} n={num(1)} text={a} k={sp(at(0.2))} />
      <Arrow x={CX - 40} y={240} len={70} angle={-90} k={ramp(at(0.6), 0, 10)} />
      <StepCard x={710} y={240} n={num(2)} text={b} k={sp(at(0.9))} />
    </Stage>
  );
};

export const SCENES: SceneMap = { talk: Talk, stat: Stat, steps: Steps };
