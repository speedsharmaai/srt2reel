import React from 'react';
import { spring } from 'remotion';
import { C, F, FPS, RTL, SPRING, cols, fitSize, story } from './theme';

const O = C.outline;
const SHOE = '#1F1A17';

type Anchor = 'start' | 'middle' | 'end';

// SVG text in the story's font, script and direction. `anchor` is physical:
// "start" puts the left edge at x in every language.
export const Txt: React.FC<{
  x?: number;
  y?: number;
  size: number;
  children: string | number;
  fill?: string;
  weight?: number;
  display?: boolean;
  anchor?: Anchor;
  maxWidth?: number;
  opacity?: number;
}> = ({ x = 0, y = 0, size, children, fill = C.ink, weight, display, anchor = 'middle', maxWidth, opacity }) => {
  const text = String(children);
  const physical: Anchor = RTL && anchor !== 'middle' ? (anchor === 'start' ? 'end' : 'start') : anchor;
  return (
    <text
      x={x}
      y={y}
      textAnchor={physical}
      direction={story.dir}
      lang={story.lang}
      fontFamily={display ? F.display : F.text}
      fontWeight={weight ?? (display ? 800 : 700)}
      fontSize={maxWidth ? fitSize(text, size, maxWidth, display ? 0.66 : 0.58) : size}
      fill={fill}
      opacity={opacity}
    >
      {text}
    </text>
  );
};

export type Mood = 'neutral' | 'smile' | 'sad' | 'shock' | 'angry';
export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hairStyle?: 'short' | 'long' | 'bun' | 'bald';
  cap?: string;
  scarf?: string;
  long?: boolean;
  skirt?: string;
  wrap?: string;
  glasses?: boolean;
  mustache?: string;
  beard?: string;
};
export type PersonProps = Look & {
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  pose?: 'sit' | 'stand' | 'walk';
  step?: number;
  mood?: Mood;
  mouth?: boolean;
  blink?: boolean;
  arm?: 'rest' | 'raise' | 'point' | 'wave';
  wave?: number;
  hand?: [number, number];
  elbow?: [number, number];
  hold?: React.ReactNode;
};

const shade = (hex: string, by: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * by))));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const armFor = (p: PersonProps): [[number, number], [number, number]] => {
  if (p.hand && p.elbow) return [p.elbow, p.hand];
  const sway = Math.sin(p.wave ?? 0) * 18;
  const preset: Record<string, [[number, number], [number, number]]> = {
    sit: [[62, -96], [128, -126]],
    rest: [[10, -90], [18, -30]],
    raise: [[64, -112], [120, -150]],
    point: [[76, -150], [150, -168]],
    wave: [[88, -196], [136 + sway, -288]],
  };
  const [elbow, hand] = preset[p.arm ?? (p.pose === 'sit' ? 'sit' : 'rest')] ?? preset.rest;
  return [p.elbow ?? elbow, p.hand ?? hand];
};

const Leg: React.FC<{ x: number; angle: number; color: string; dim?: boolean }> = ({ x, angle, color, dim }) => (
  <g transform={`rotate(${angle} ${x + 22} 0)`}>
    <rect x={x} y={0} width={44} height={205} rx={20} fill={dim ? shade(color, 0.86) : color} stroke={O} strokeWidth={4} />
    <ellipse cx={x + 30} cy={208} rx={32} ry={13} fill={SHOE} stroke={O} strokeWidth={3} />
  </g>
);

const Lower: React.FC<PersonProps> = ({ pose = 'sit', pants, skin, skirt, wrap, step = 0 }) => {
  if (pose === 'sit') {
    return (
      <>
        <rect x={-45} y={-30} width={190} height={60} rx={28} fill={skirt ?? wrap ?? pants} stroke={O} strokeWidth={4} />
        <rect x={98} y={-8} width={54} height={190} rx={26} fill={skirt ? skin : (wrap ?? pants)} stroke={O} strokeWidth={4} />
        <ellipse cx={132} cy={184} rx={48} ry={17} fill={SHOE} stroke={O} strokeWidth={3} />
      </>
    );
  }
  if (wrap) {
    return (
      <>
        <rect x={-46} y={-30} width={104} height={238} rx={22} fill={wrap} stroke={O} strokeWidth={4} />
        <path d="M-46 60 H58 M-46 130 H58 M-10 -30 V208 M24 -30 V208" stroke="#00000030" strokeWidth={3} />
        <ellipse cx={14} cy={214} rx={44} ry={13} fill={shade(SHOE, 2.6)} stroke={O} strokeWidth={3} />
      </>
    );
  }
  const swing = pose === 'walk' ? Math.sin(step) * 24 : 0;
  const legColor = skirt ? skin : pants;
  return (
    <>
      <Leg x={-34} angle={-swing} color={legColor} dim />
      <Leg x={-10} angle={swing} color={legColor} />
      {skirt && <path d="M-46 -24 H48 L72 128 Q0 146 -70 128 Z" fill={skirt} stroke={O} strokeWidth={4} strokeLinejoin="round" />}
    </>
  );
};

const Face: React.FC<{ mood: Mood; mouth?: boolean; blink?: boolean }> = ({ mood, mouth, blink }) => {
  const shock = mood === 'shock';
  const brow = {
    neutral: 'M26 -300 Q38 -308 50 -300',
    smile: 'M26 -300 Q38 -309 50 -301',
    sad: 'M24 -296 L50 -306',
    angry: 'M24 -308 L52 -296',
    shock: 'M24 -308 Q38 -320 52 -308',
  }[mood];
  const lips = {
    neutral: 'M48 -242 Q58 -237 66 -243',
    smile: 'M44 -244 Q58 -226 72 -246',
    sad: 'M48 -236 Q58 -246 68 -236',
    angry: 'M46 -238 Q58 -244 70 -238',
    shock: '',
  }[mood];
  return (
    <>
      {blink ? (
        <path d="M24 -278 Q36 -272 48 -278" stroke={O} strokeWidth={4} fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx={36} cy={-278} r={shock ? 15 : 13} fill="#fff" stroke={O} strokeWidth={3} />
          <circle cx={40} cy={-278} r={shock ? 5 : 6} fill={O} />
        </>
      )}
      <path d={brow} stroke={O} strokeWidth={4} fill="none" strokeLinecap="round" />
      {mouth ? (
        <ellipse cx={60} cy={-240} rx={8} ry={11} fill="#3B1A14" />
      ) : shock ? (
        <ellipse cx={60} cy={-238} rx={7} ry={9} fill="#3B1A14" />
      ) : (
        <path d={lips} stroke={O} strokeWidth={4} fill="none" strokeLinecap="round" />
      )}
    </>
  );
};

const HairBack: React.FC<Look> = ({ hair, hairStyle, scarf }) => {
  if (scarf) return <path d="M-50 -250 Q-76 -206 -58 -150 Q-20 -136 20 -168 L10 -230 Z" fill={scarf} stroke={O} strokeWidth={4} strokeLinejoin="round" />;
  if (hairStyle === 'long') return <path d="M-54 -300 Q-86 -244 -72 -158 Q-48 -140 -22 -160 L-16 -262 Z" fill={hair} stroke={O} strokeWidth={4} strokeLinejoin="round" />;
  if (hairStyle === 'bun') return <circle cx={-44} cy={-326} r={23} fill={hair} stroke={O} strokeWidth={4} />;
  return null;
};

const HairTop: React.FC<Look> = ({ hair, hairStyle = 'short', cap, scarf }) => {
  if (scarf) {
    return <path d="M-60 -262 Q-62 -346 12 -342 Q72 -338 72 -286 Q34 -322 0 -306 Q-30 -290 -26 -236 Q-28 -210 -8 -200 L-34 -196 Q-62 -214 -60 -262 Z" fill={scarf} stroke={O} strokeWidth={4} strokeLinejoin="round" />;
  }
  if (cap) {
    return (
      <>
        <path d="M-58 -288 Q-56 -350 10 -346 Q68 -342 72 -294 Q8 -306 -58 -288 Z" fill={cap} stroke={O} strokeWidth={4} strokeLinejoin="round" />
        <path d="M64 -302 Q100 -302 112 -284 Q88 -280 68 -288 Z" fill={shade(cap, 0.8)} stroke={O} strokeWidth={4} strokeLinejoin="round" />
      </>
    );
  }
  if (hairStyle === 'bald') return null;
  return <path d="M-58 -282 Q-46 -346 14 -340 Q68 -334 70 -284 Q40 -308 -12 -300 Z" fill={hair} stroke={O} strokeWidth={3} strokeLinejoin="round" />;
};

// A flat-vector person seen in three-quarter view, facing right. (x, y) is the hip.
export const Person: React.FC<PersonProps> = (p) => {
  const { x, y, s = 1, flip, pose = 'sit', skin, shirt, long, glasses, mustache, beard, mood = 'neutral', mouth, blink, hold } = p;
  const [elbow, hand] = armFor(p);
  const armPts = `0,-160 ${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}`;
  const torsoH = long && pose !== 'sit' ? 300 : 200;
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <HairBack {...p} />
      <Lower {...p} />
      <rect x={-45} y={-195} width={92} height={torsoH} rx={38} fill={shirt} stroke={O} strokeWidth={4} />
      <rect x={-14} y={-228} width={30} height={40} rx={10} fill={skin} stroke={O} strokeWidth={4} />
      <circle cx={6} cy={-272} r={62} fill={skin} stroke={O} strokeWidth={4} />
      {!p.scarf && <ellipse cx={-16} cy={-262} rx={13} ry={19} fill={shade(skin, 0.88)} stroke={O} strokeWidth={3} />}
      {beard && <path d="M-22 -244 Q-12 -202 34 -206 Q72 -210 78 -246 Q62 -228 40 -230 Q8 -228 -22 -244 Z" fill={beard} stroke={O} strokeWidth={3} strokeLinejoin="round" />}
      <HairTop {...p} />
      <Face mood={mood} mouth={mouth} blink={blink} />
      {glasses && (
        <>
          <circle cx={38} cy={-278} r={21} fill="#ffffff22" stroke={O} strokeWidth={3} />
          <path d="M17 -280 L-8 -286" stroke={O} strokeWidth={3} />
        </>
      )}
      {mustache && <path d="M48 -256 Q62 -266 76 -256 Q62 -250 48 -256 Z" fill={mustache} stroke={O} strokeWidth={2} />}
      <polyline points={armPts} fill="none" stroke={O} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={armPts} fill="none" stroke={shirt} strokeWidth={38} strokeLinecap="round" strokeLinejoin="round" />
      {hold && <g transform={`translate(${hand[0]},${hand[1]})`}>{hold}</g>}
      <circle cx={hand[0]} cy={hand[1]} r={23} fill={skin} stroke={O} strokeWidth={4} />
    </g>
  );
};

// A small faceless figure for crowds and diagrams. (x, y) is the hip.
export const Mini: React.FC<{ x: number; y: number; s?: number; color: string; skin?: string; hair?: string; flip?: boolean; bob?: number }> = ({ x, y, s = 1, color, skin = '#9A6238', hair = '#17120F', flip, bob = 0 }) => (
  <g transform={`translate(${x},${y + bob}) scale(${flip ? -s : s},${s})`}>
    <rect x={-12} y={-12} width={10} height={50} rx={5} fill="#2A3550" />
    <rect x={2} y={-12} width={10} height={50} rx={5} fill="#2A3550" />
    <rect x={-17} y={-76} width={34} height={70} rx={17} fill={color} />
    <circle cx={0} cy={-96} r={17} fill={skin} />
    <path d="M-17 -100 Q-12 -118 4 -114 Q17 -112 17 -100 Q4 -108 -17 -100Z" fill={hair} />
    <circle cx={7} cy={-96} r={2.6} fill="#17120F" />
  </g>
);

// A speech bubble that pops in. `since` is the number of frames since it should appear
// (lf(second) or at(second)); it stays hidden while that is negative. Without `since` it
// is there from the start. Its width follows the text unless `w` is given.
export const Bubble: React.FC<{ x: number; y: number; text: string; since?: number; w?: number; tail?: 'l' | 'r'; dark?: boolean }> = ({ x, y, text, since = 999, w, tail = 'l', dark }) => {
  const pop = spring({ frame: since, fps: FPS, config: SPRING });
  const width = w ?? Math.max(54, cols(text) * 13 + 34);
  const fill = dark ? '#2F2A27' : C.card;
  return (
    <g transform={`translate(${x},${y}) scale(${pop})`} opacity={Math.min(1, pop)}>
      <rect x={-width / 2} y={-26} width={width} height={42} rx={20} fill={fill} stroke={O} strokeWidth={2.5} />
      <path d={tail === 'l' ? 'M-14 14 L-24 30 L2 14Z' : 'M14 14 L24 30 L-2 14Z'} fill={fill} stroke={O} strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={tail === 'l' ? -12 : 0} y={11} width={12} height={6.5} fill={fill} />
      <Txt y={5} size={22} fill={dark ? C.card : C.cardInk} maxWidth={width - 20}>
        {text}
      </Txt>
    </g>
  );
};

// A thought cloud with a trail of dots toward the thinker. Put any SVG inside it.
export const Thought: React.FC<{ x: number; y: number; w?: number; h?: number; since?: number; trail?: 'l' | 'r'; children?: React.ReactNode }> = ({ x, y, w = 170, h = 74, since = 999, trail = 'l', children }) => {
  const pop = spring({ frame: since, fps: FPS, config: SPRING });
  const dir = trail === 'l' ? -1 : 1;
  return (
    <g transform={`translate(${x},${y}) scale(${pop})`} opacity={Math.min(1, pop)}>
      <circle cx={dir * (w / 2 + 18)} cy={h / 2 + 54} r={8} fill={C.card} stroke={O} strokeWidth={2.5} />
      <circle cx={dir * (w / 2 - 2)} cy={h / 2 + 28} r={13} fill={C.card} stroke={O} strokeWidth={2.5} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={C.card} stroke={O} strokeWidth={3} />
      {children}
    </g>
  );
};
