import React from 'react';
import {
  Arrow,
  Badge,
  Bubble,
  C,
  Cells,
  Clock,
  Coin,
  FLOOR_Y,
  Headline,
  Look,
  Megaphone,
  Mini,
  O,
  Outdoor,
  Person,
  Room,
  Scene,
  SceneMap,
  Stage,
  StepCard,
  Street,
  Thought,
  Txt,
  blinkAt,
  breathe,
  mouthOpen,
  num,
  pop,
  ramp,
  sp,
  useT,
  walk,
} from './lib/kit';

const MAYA: Look = { skin: '#B07748', shirt: '#C8553A', pants: '#2A3550', hair: '#1B140F', hairStyle: 'bun' };
const SAM: Look = { skin: '#8E5B34', shirt: '#5F9D7A', pants: '#3A4660', hair: '#15110E', glasses: true };
const TEAM = ['#D9A93A', '#6E96BB', '#7A5C8F'];

const Dream: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room window={350} />
      <Person x={190} y={500 + breathe(f)} s={0.8} pose="stand" {...MAYA} blink={blinkAt(f)} mood="smile" />
      <Thought x={350} y={300} since={lf(0.9)} w={150} h={90}>
        <Coin x={-34} y={0} r={26} />
        <Txt x={28} y={11} size={30} display fill={C.accent}>
          {num(42)}
        </Txt>
      </Thought>
    </Stage>
  );
};

const Announce: Scene = ({ t0, dur }) => {
  const { f, t, lf } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room picture={205} rug />
      <Person x={120} y={500 + breathe(f)} s={0.8} pose="stand" {...MAYA} blink={blinkAt(f)} mouth={mouthOpen('maya', t)} mood="smile" arm={t > 4.9 ? 'raise' : 'rest'} />
      {TEAM.map((color, i) => (
        <Mini key={i} x={330 + i * 70} y={570} s={1.8} color={color} flip bob={breathe(f + i * 9, 1.5)} />
      ))}
      <Bubble x={215} y={250} text={`${num(42)} km!`} since={lf(5.0)} />
    </Stage>
  );
};

const Applause: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  const medal = pop(lf(9.9), { damping: 10, stiffness: 180, mass: 0.7 });
  return (
    <Stage dur={dur}>
      <Room picture={205} rug />
      {TEAM.map((color, i) => (
        <React.Fragment key={i}>
          <Mini x={110 + i * 95} y={570} s={1.8} color={color} bob={Math.abs(Math.sin(f / 4 + i * 1.3)) * -8} />
          <Bubble x={115 + i * 95} y={330 + (i % 2) * 26} text="Wow!" since={f - 4 - i * 5} />
        </React.Fragment>
      ))}
      <Person x={430} y={500 + breathe(f)} s={0.8} pose="stand" flip {...MAYA} blink={blinkAt(f)} mood="smile" />
      <g transform={`translate(385,${250 - (1 - medal) * 30}) scale(${medal})`} opacity={medal}>
        <path d="M-16 -64 L0 -20 L16 -64Z" fill={C.accent} stroke={O} strokeWidth={3} strokeLinejoin="round" />
        <Coin x={0} y={0} r={30} mark={num(1)} />
      </g>
    </Stage>
  );
};

const Bed: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room window={40} />
      <Clock x={420} y={250} r={44} t={7 + f / 200} />
      <rect x={70} y={540} width={400} height={70} rx={14} fill={C.wood} stroke={O} strokeWidth={4} />
      <rect x={60} y={470} width={30} height={150} rx={10} fill={C.woodDark} stroke={O} strokeWidth={4} />
      <rect x={96} y={500} width={110} height={48} rx={22} fill="#F3EEE2" stroke={O} strokeWidth={3} />
      <circle cx={160} cy={492} r={40} fill={MAYA.skin} stroke={O} strokeWidth={4} />
      <path d="M124 480 Q130 444 166 450 Q196 454 198 480 Q170 466 124 480Z" fill={MAYA.hair} stroke={O} strokeWidth={3} />
      <path d="M170 496 Q178 502 186 496" stroke={O} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d={`M176 ${548 + breathe(f, 2)} Q300 ${470 + breathe(f, 4)} 470 540 L470 600 L176 600Z`} fill="#6E96BB" stroke={O} strokeWidth={4} strokeLinejoin="round" />
      <Bubble x={250} y={390} text="Zzz" since={lf(12.4)} />
    </Stage>
  );
};

const Asked: Scene = ({ t0, dur }) => {
  const { f, t, lf } = useT(t0);
  return (
    <Stage dur={dur}>
      <Street />
      <Person x={120} y={500 + breathe(f)} s={0.8} pose="stand" {...SAM} blink={blinkAt(f)} mouth={mouthOpen('sam', t)} arm={t > 16.7 ? 'point' : 'rest'} />
      <Person x={415} y={500 + breathe(f + 15)} s={0.8} pose="stand" flip {...MAYA} blink={blinkAt(f + 30)} mood={t > 17.2 ? 'sad' : 'neutral'} />
      <Bubble x={205} y={240} text="?" since={lf(16.8)} />
    </Stage>
  );
};

const Zero: Scene = ({ t0, dur }) => {
  const { lf } = useT(t0);
  const slam = sp(lf(19.0), { damping: 9, stiffness: 220, mass: 0.7 });
  return (
    <Stage dur={dur} bg={C.night}>
      <rect width={540} height={960} fill={C.night} />
      <g transform={`translate(270,430) scale(${2.2 - 1.2 * Math.min(1, slam)})`} opacity={Math.min(1, slam)}>
        <Txt y={60} size={220} display fill={C.accent}>
          {num(0)}
        </Txt>
      </g>
      <Txt x={270} y={590} size={40} fill={C.card} opacity={ramp(lf(19.3), 0, 8)}>
        km
      </Txt>
    </Stage>
  );
};

const Restart: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  return (
    <Stage dur={dur}>
      <Outdoor night f={f} tree={470} />
      <Person x={ramp(f, 0, dur, 90, 300)} y={470 + Math.abs(Math.sin(walk(f * 1.6))) * -8} s={0.7} pose="walk" step={walk(f * 1.6)} {...MAYA} blink={blinkAt(f)} arm="raise" />
      <Megaphone x={400} y={300} k={0.42 * pop(lf(22.4))} crossed={sp(lf(23.0), { damping: 9, stiffness: 220, mass: 0.7 })} />
    </Stage>
  );
};

const Daily: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <Headline y={250} text={`+${num(1)} km`} k={sp(lf(25.3))} size={72} fill={C.good} />
      <Cells x={40} y={330} count={12} filled={ramp(lf(24.7), 0, 54, 0, 12)} labels={Array.from({ length: 12 }, (_, i) => num(i + 1))} f={f} />
      <Person x={240} y={560} s={0.42} pose="walk" step={walk(f * 1.6)} {...MAYA} arm="raise" />
    </Stage>
  );
};

const Finish: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  const cross = ramp(lf(27.3), 0, 40, 60, 290);
  const done = lf(28.6) > 0;
  return (
    <Stage dur={dur}>
      <Outdoor f={f} />
      <rect x={330} y={300} width={12} height={FLOOR_Y - 280} fill={C.woodDark} stroke={O} strokeWidth={3} />
      <rect x={488} y={300} width={12} height={FLOOR_Y - 280} fill={C.woodDark} stroke={O} strokeWidth={3} />
      <rect x={326} y={292} width={178} height={46} rx={8} fill={C.accent} stroke={O} strokeWidth={3} />
      <Txt x={415} y={325} size={26} fill="#fff" display maxWidth={160}>
        FINISH
      </Txt>
      <Person x={cross} y={480 + Math.abs(Math.sin(walk(f * 1.6))) * -8} s={0.7} pose={done ? 'stand' : 'walk'} step={walk(f * 1.6)} {...MAYA} blink={blinkAt(f)} mood="smile" arm="wave" wave={f / 3} />
      <Badge x={160} y={250} text={`${num(42)} km`} k={sp(lf(28.6), { damping: 10, stiffness: 160, mass: 0.8 })} w={200} />
    </Stage>
  );
};

const Lesson: Scene = ({ t0, dur }) => {
  const { f, lf } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <Megaphone y={430} k={pop(lf(30.5)) * (1 + 0.02 * Math.sin(f / 8))} crossed={sp(lf(31.0), { damping: 9, stiffness: 220, mass: 0.7 })} />
    </Stage>
  );
};

const Steps: Scene = ({ t0, dur }) => {
  const { lf } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <StepCard y={290} n={num(1)} text="Work" k={sp(lf(32.2))} />
      <Arrow x={270} y={385} k={ramp(lf(33.2), 0, 10)} />
      <StepCard y={580} n={num(2)} text="Talk" k={sp(lf(33.5))} />
    </Stage>
  );
};

export const SCENES: SceneMap = {
  dream: Dream,
  announce: Announce,
  applause: Applause,
  bed: Bed,
  asked: Asked,
  zero: Zero,
  restart: Restart,
  daily: Daily,
  finish: Finish,
  lesson: Lesson,
  steps: Steps,
};
