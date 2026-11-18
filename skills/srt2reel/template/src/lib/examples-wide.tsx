import React from 'react';
import {
  Arrow,
  Bar,
  Books,
  Bubble,
  C,
  CAST,
  CX,
  Desk,
  Doc,
  H,
  Headline,
  Heart,
  Lamp,
  Mini,
  Outdoor,
  POSE,
  Person,
  Room,
  Scene,
  Stage,
  Stamp,
  StepCard,
  Street,
  Thought,
  Txt,
  W,
  blinkAt,
  breathe,
  num,
  pop,
  ramp,
  sp,
  useT,
  walk,
} from './kit';

// Example scenes for the 960x540 landscape format. A person stands at
// y={POSE.standY} or sits at y={POSE.sitY}, both at s={POSE.s}.

const WideDesk: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room night window={90} glow={[590, POSE.deskY - 60]} f={f} />
      <Person x={300} y={POSE.sitY + breathe(f)} s={POSE.s} {...CAST.student} blink={blinkAt(f)} hand={[150, -62]} elbow={[70, -90]} />
      <Desk x={350} w={330} />
      <Books x={430} y={POSE.deskY} />
      <Lamp x={620} y={POSE.deskY} />
      <Thought x={520} y={150} since={at(0.6)}>
        <rect x={-57} y={-21} width={114} height={42} rx={14} fill={C.accent} />
        <Txt y={9} size={26} fill="#fff" display maxWidth={100}>
          EXAM
        </Txt>
      </Thought>
    </Stage>
  );
};

const WideTalk: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room window={80} picture={720} rug />
      <Person x={330} y={POSE.standY + breathe(f)} s={POSE.s} pose="stand" {...CAST.woman} blink={blinkAt(f)} mouth={f % 12 < 6 && f > 20 && f < 50} arm="point" />
      <Person x={600} y={POSE.standY + breathe(f + 15)} s={POSE.s} pose="stand" flip {...CAST.father} blink={blinkAt(f + 30)} mood={f > 50 ? 'smile' : 'neutral'} />
      <Bubble x={420} y={120} text="Really?" since={at(0.6)} />
    </Stage>
  );
};

const WideStreet: Scene = ({ t0, dur }) => {
  const { f } = useT(t0);
  return (
    <Stage dur={dur}>
      <Street night f={f} />
      <Person x={ramp(f, 0, dur, 200, 420)} y={POSE.standY + Math.abs(Math.sin(walk(f))) * -5} s={POSE.s} pose="walk" step={walk(f)} {...CAST.worker} blink={blinkAt(f)} />
      <Person x={700} y={POSE.standY + breathe(f)} s={POSE.s} pose="stand" flip {...CAST.elder} blink={blinkAt(f + 40)} arm="wave" wave={f / 3} />
    </Stage>
  );
};

const WideNumbers: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  const focus = ramp(at(0.4), 0, 30, 100, 25);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={W} height={H} fill={C.bgAlt} />
      <Headline y={150} text="Focus fell" k={sp(at(0.1))} x={250} size={48} />
      <Bar x={60} y={200} label="Focus" value={focus / 100} show={`${num(Math.round(focus))}%`} k={sp(f)} />
      <Doc x={600} y={90} k={0.8} title="Result" />
      <Stamp x={712} y={250} k={sp(at(1.2), { damping: 9, stiffness: 220, mass: 0.7 })} r={64} />
    </Stage>
  );
};

const WideSteps: Scene = ({ t0, dur }) => {
  const { at } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={W} height={H} fill={C.bgAlt} />
      <StepCard x={250} y={250} n={num(1)} text="Work" k={sp(at(0.2))} />
      <Arrow x={CX - 40} y={250} len={70} angle={-90} k={ramp(at(0.9), 0, 12)} />
      <StepCard x={710} y={250} n={num(2)} text="Talk" k={sp(at(1.4))} />
    </Stage>
  );
};

const WidePark: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Outdoor f={f} tree={800} />
      <Person x={ramp(f, 0, dur, 180, 380)} y={POSE.standY - 10 + Math.abs(Math.sin(walk(f))) * -5} s={POSE.s} pose="walk" step={walk(f)} {...CAST.mother} blink={blinkAt(f)} mood="smile" />
      <Person x={600} y={POSE.standY + 30} s={0.4} pose="stand" flip {...CAST.girl} blink={blinkAt(f + 50)} mood="smile" arm="wave" wave={f / 3} />
      <Heart x={500} y={150} s={pop(at(1.5)) * 1.2} />
      {[0, 1, 2].map((i) => (
        <Mini key={i} x={60 + i * 44} y={POSE.standY + 40} s={1.3} color={['#D9A93A', '#5F9D7A', '#C97F4A'][i]!} bob={breathe(f + i * 10, 1.5)} />
      ))}
    </Stage>
  );
};

export const WIDE_EXAMPLES: Record<string, Scene> = { WideDesk, WideTalk, WideStreet, WideNumbers, WideSteps, WidePark };
