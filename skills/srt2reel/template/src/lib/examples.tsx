import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { WIDE_EXAMPLES } from './examples-wide';
import { useFonts } from './fonts';
import {
  Arrow,
  Badge,
  Bar,
  Books,
  Bubble,
  C,
  CAST,
  Cells,
  Classroom,
  Clock,
  Coin,
  Cup,
  Desk,
  Doc,
  Eye,
  F,
  FLOOR_Y,
  Headline,
  LANDSCAPE,
  Heart,
  Lamp,
  Laptop,
  Megaphone,
  Meter,
  Mini,
  Mood,
  O,
  Outdoor,
  Person,
  Phone,
  Room,
  Scene,
  Shop,
  Sofa,
  Stage,
  Stamp,
  StepCard,
  Street,
  Thought,
  Txt,
  blinkAt,
  breathe,
  num,
  pop,
  ramp,
  sp,
  useT,
  walk,
} from './kit';

// Example scenes to copy from. Times here are seconds into the scene (`at`); in a real
// story use `lf(second)` so that things appear on the spoken word.

const NightStudy: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room night window={40} glow={[436, 430]} f={f} />
      <Person x={150} y={560 + breathe(f)} s={0.8} {...CAST.student} blink={blinkAt(f)} hand={[150, -62]} elbow={[70, -90]} />
      <Desk />
      <Books x={300} y={500} />
      <Lamp x={459} y={500} />
      <Thought x={330} y={250} since={at(0.6)}>
        <rect x={-57} y={-21} width={114} height={42} rx={14} fill={C.accent} />
        <Txt y={9} size={26} fill="#fff" display maxWidth={100}>
          EXAM
        </Txt>
      </Thought>
    </Stage>
  );
};

const CafeTalk: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room window={0} />
      <path d="M0 150 Q135 180 270 150 T540 150" stroke={C.wood} strokeWidth={3} fill="none" />
      {[40, 130, 220, 310, 400, 490].map((x, i) => (
        <circle key={i} cx={x} cy={158 + (i % 2 ? 6 : 14)} r={8} fill="#FFD98A" opacity={0.7 + 0.3 * Math.sin(f / 10 + i)} />
      ))}
      <Sofa x={30} y={470} w={170} color="#96A5AB" />
      <Sofa x={340} y={470} w={170} color="#A9A08A" />
      <Person x={112} y={520 + breathe(f)} s={0.82} {...CAST.student} blink={blinkAt(f)} mouth={f % 12 < 6 && f > 20 && f < 50} />
      <Person x={428} y={520 + breathe(f + 20)} s={0.82} flip {...CAST.friend} blink={blinkAt(f + 40)} mood={f > 55 ? 'smile' : 'neutral'} />
      <Desk x={196} y={500} w={150} />
      <Cup x={222} y={496} f={f} handle />
      <Cup x={298} y={496} f={f + 9} />
      <Bubble x={300} y={250} text="Really?" since={at(1.8)} tail="r" />
    </Stage>
  );
};

const StreetMeet: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Street lamp={false} />
      <Shop x={185} y={FLOOR_Y + 8} w={170} sign="SHOP" open={ramp(at(0.4), 0, 30)} />
      <Person x={120} y={500 + breathe(f)} s={0.8} pose="stand" {...CAST.elder} wrap="#8F98A0" blink={blinkAt(f)} mouth={f % 10 < 5 && f > 15 && f < 45} arm="point" />
      <Person x={415} y={500 + breathe(f + 15)} s={0.8} pose="stand" flip {...CAST.student} blink={blinkAt(f + 30)} mood={f > 40 ? 'sad' : 'neutral'} />
      <Bubble x={200} y={238} text="?" since={at(0.5)} />
    </Stage>
  );
};

const Crowd: Scene = ({ t0, dur }) => {
  const { f } = useT(t0);
  const colors = ['#D9A93A', '#5F9D7A', '#C97F4A'];
  return (
    <Stage dur={dur}>
      <Room picture={205} rug />
      {colors.map((color, i) => (
        <Mini key={i} x={90 + i * 95} y={560} s={1.9} color={color} skin={['#9A6238', '#A86D40', '#8A5530'][i]} bob={Math.abs(Math.sin(f / 5 + i * 1.7)) * -9} />
      ))}
      {colors.map((_, i) => (
        <Bubble key={i} x={95 + i * 95} y={300 + (i % 2) * 30} text="Ha ha" since={f - 6 - i * 5} />
      ))}
      <Mini x={440} y={560} s={1.9} color="#6E96BB" flip bob={breathe(f, 1.5)} />
    </Stage>
  );
};

const Pressure: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  const eyes: [number, number][] = [[330, 210], [420, 290], [250, 190], [70, 320], [400, 400], [340, 350]];
  return (
    <Stage dur={dur}>
      <Room night window={40} glow={[436, 430]} f={f} />
      <Person x={150} y={560 + breathe(f)} s={0.8} {...CAST.student} blink={blinkAt(f)} mood="sad" hand={[150, -62]} elbow={[70, -90]} />
      <Desk />
      <Books x={300} y={500} />
      {eyes.map(([x, y], i) => (
        <Eye key={i} x={x} y={y} since={f - 8 - i * 8} look={[155, 340]} />
      ))}
      <g opacity={ramp(at(1.5), 0, 6)}>
        <Meter x={462} y={270} value={ramp(at(1.5), 0, 30, 0, 0.92)} label="Stress" light />
      </g>
    </Stage>
  );
};

const FocusDrop: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  const focus = ramp(at(0.4), 0, 30, 100, 25);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <Bar x={80} y={210} label="Focus" value={focus / 100} show={`${num(Math.round(focus))}%`} k={sp(f)} />
      <g opacity={pop(at(1.4))} transform={`translate(0,${(1 - pop(at(1.4))) * 60})`}>
        <Doc x={175} y={400} k={0.68} title="Result" />
        <Txt x={270} y={590} size={90} fill={C.accent} display opacity={0.5 + 0.5 * Math.sin(f / 6)}>
          ?
        </Txt>
      </g>
    </Stage>
  );
};

const ResultDay: Scene = ({ t0, dur }) => {
  const { at } = useT(t0);
  return (
    <Stage dur={dur} bg={C.night}>
      <rect width={540} height={960} fill={C.night} />
      <Doc x={130} y={210} title="Result" />
      <Stamp x={270} y={420} k={sp(at(0.7), { damping: 9, stiffness: 220, mass: 0.7 })} />
    </Stage>
  );
};

const YearOfWork: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Room />
      <Person x={150} y={560 + breathe(f)} s={0.8} {...CAST.student} blink={blinkAt(f)} mood={f > 60 ? 'smile' : 'neutral'} hand={[150, -62]} elbow={[70, -90]} />
      <Desk />
      <Books x={300} y={500} />
      <Laptop x={420} y={500} flip />
      <Cells x={36} y={200} count={12} filled={ramp(at(0.3), 0, 60, 0, 12)} labels={Array.from({ length: 12 }, (_, i) => num(i + 1))} f={f} />
    </Stage>
  );
};

const GoodNews: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  const happy: Mood = f > 40 ? 'smile' : 'neutral';
  return (
    <Stage dur={dur}>
      <Room rug />
      <Sofa x={290} y={440} />
      <Person x={410} y={540 + breathe(f)} s={0.8} flip {...CAST.father} blink={blinkAt(f)} mood={happy} />
      <Person
        x={100}
        y={500 + breathe(f + 12)}
        s={0.8}
        pose="stand"
        {...CAST.student}
        blink={blinkAt(f + 30)}
        mood={happy}
        arm="raise"
        hand={[130, -150]}
        hold={
          <g transform="translate(12,-70) rotate(-8)">
            <rect width={52} height={66} rx={5} fill={C.card} stroke={O} strokeWidth={3} />
            <path d="M14 40 l8 8 l16 -18" stroke={C.good} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        }
      />
      <Badge x={270} y={230} text="Passed" k={sp(at(1.2), { damping: 10, stiffness: 160, mass: 0.8 })} />
    </Stage>
  );
};

const Lesson: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <Headline y={230} text="The lesson is simple" k={sp(at(0.1))} />
      <Megaphone y={470} k={pop(at(0.8)) * (1 + 0.02 * Math.sin(f / 8))} crossed={sp(at(1.6), { damping: 9, stiffness: 220, mass: 0.7 })} />
    </Stage>
  );
};

const TwoSteps: Scene = ({ t0, dur }) => {
  const { at } = useT(t0);
  return (
    <Stage dur={dur} bg={C.bgAlt}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <StepCard y={290} n={num(1)} text="Work" k={sp(at(0.2))} />
      <Arrow x={270} y={385} k={ramp(at(0.9), 0, 12)} />
      <StepCard y={580} n={num(2)} text="Announce" k={sp(at(1.4))} />
    </Stage>
  );
};

const WalkInPark: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  return (
    <Stage dur={dur}>
      <Outdoor f={f} tree={440} />
      <Person x={ramp(f, 0, dur, 60, 250)} y={470 + Math.abs(Math.sin(walk(f))) * -5} s={0.66} pose="walk" step={walk(f)} {...CAST.woman} blink={blinkAt(f)} mood="smile" />
      <Person x={390} y={500} s={0.5} pose="stand" flip {...CAST.girl} blink={blinkAt(f + 50)} mood="smile" arm="wave" wave={f / 3} />
      <Heart x={330} y={300} s={pop(at(1.5)) * 1.2} />
    </Stage>
  );
};

const PhoneShock: Scene = ({ t0, dur }) => {
  const { f, at } = useT(t0);
  const seen = f > 35;
  return (
    <Stage dur={dur}>
      <Classroom board={seen ? '!' : '2 + 2'} />
      <Person x={200} y={500 + breathe(f)} s={0.8} pose="stand" {...CAST.scarfed} blink={!seen && blinkAt(f)} mood={seen ? 'shock' : 'neutral'} arm="raise" hand={[96, -196]} elbow={[70, -120]} hold={<Phone x={18} y={-22} />} />
      <Clock x={450} y={500} t={f / 45} />
      <Coin x={90} y={470} mark="$" />
      <Bubble x={330} y={250} text="!" since={at(1.2)} tail="l" />
    </Stage>
  );
};

const row = (keys: string[], y: number, s: number, f: number, moods: Mood[]) =>
  keys.map((key, i) => (
    <React.Fragment key={key}>
      <Person x={66 + i * 104} y={y} s={s} pose="stand" {...CAST[key]} mood={moods[i % moods.length]} blink={blinkAt(f + i * 20)} />
      <Txt x={78 + i * 104} y={y + 150 * (s / 0.42) * 0.72} size={15} fill={C.ink}>
        {key}
      </Txt>
    </React.Fragment>
  ));

const CastSheet: Scene = ({ t0, dur }) => {
  const { f } = useT(t0);
  const keys = Object.keys(CAST);
  return (
    <Stage dur={dur} push={0}>
      <rect width={540} height={960} fill={C.bgAlt} />
      <rect y={FLOOR_Y + 40} width={540} height={2} fill={C.line} />
      {row(keys.slice(0, 5), 330, 0.42, f, ['neutral', 'smile', 'sad', 'shock', 'angry'])}
      {row(keys.slice(5), 590, 0.42, f, ['smile', 'neutral', 'angry', 'sad', 'shock'])}
    </Stage>
  );
};

export const EXAMPLES: Record<string, Scene> = {
  NightStudy,
  CafeTalk,
  StreetMeet,
  Crowd,
  Pressure,
  FocusDrop,
  ResultDay,
  YearOfWork,
  GoodNews,
  Lesson,
  TwoSteps,
  WalkInPark,
  PhoneShock,
  CastSheet,
};

// The portrait examples above are drawn for 540x960; landscape projects get their own set.
const SHOWN = LANDSCAPE ? WIDE_EXAMPLES : EXAMPLES;
export const EXAMPLE_LENGTH = 90;
export const EXAMPLE_FRAMES = Object.keys(SHOWN).length * EXAMPLE_LENGTH;

// Plays every example in turn with its name on top. Rendered by scripts/stills.ts --kit.
export const Kit: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {Object.entries(SHOWN).map(([name, Example], i) => (
        <Sequence key={name} from={i * EXAMPLE_LENGTH} durationInFrames={EXAMPLE_LENGTH}>
          <Example t0={0} dur={EXAMPLE_LENGTH} />
          <div style={{ position: 'absolute', top: LANDSCAPE ? 60 : 200, left: 0, right: 0, textAlign: 'center', fontFamily: F.text, fontWeight: 700, fontSize: 44, color: '#fff' }}>
            <span style={{ background: '#000a', padding: '6px 22px', borderRadius: 14 }}>{name}</span>
          </div>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
