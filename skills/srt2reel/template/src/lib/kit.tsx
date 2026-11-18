import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { C, CX, FLOOR_Y, FPS, H, LANDSCAPE, POSE, RMS, SPRING, T, W, clamp, story } from './theme';
import { Look, Txt } from './figures';

export * from './figures';
export { Stage } from './chrome';
export { C, CX, F, FLOOR_Y, FPS, H, LANDSCAPE, LAYOUT, POSE, SPRING, T, W, clamp, fitSize, num } from './theme';

export type SceneProps = { t0: number; dur: number };
// A scene may take extra props, which come from its entry in story.json.
export type Scene<P = object> = React.FC<SceneProps & P>;
export type SceneMap = Record<string, React.FC<any>>;
export const O = C.outline;

// f: frames since the scene began. t: seconds on the video timeline.
// lf(sec): frames since that second of the video, for starting an animation on a spoken word.
// at(sec): frames since `sec` seconds into this scene.
export const useT = (t0: number) => {
  const f = useCurrentFrame();
  return { f, t: t0 + f / FPS, lf: (sec: number) => f - T(sec - t0), at: (sec: number) => f - T(sec) };
};
export const sp = (frame: number, config = SPRING) => spring({ frame, fps: FPS, config });
export const pop = (frame: number, config = SPRING) => Math.min(1, sp(frame, config));
export const ramp = (value: number, from: number, to: number, a = 0, b = 1) => interpolate(value, [from, to], [a, b], clamp);
export const breathe = (f: number, amount = 1.5, period = 22) => Math.sin(f / period) * amount;
export const blinkAt = (f: number) => f % 105 < 4;
export const walk = (f: number) => f / 4;

// True while `who` is inside one of their speak windows and the voice is audible on this frame.
export const mouthOpen = (who: string, t: number) => {
  const windows = story.speak[who] ?? [];
  if (!windows.some(([a, b]) => t >= a && t <= b)) return false;
  return (RMS[Math.floor(t * FPS)] ?? 0) > 0.2;
};

export const SKIN = { fair: '#EEC39A', tan: '#D3A075', brown: '#A86D40', deep: '#7D4E2D', dark: '#573520' };

// Starting points. Copy one and change colours, hair or clothes to make each character your own.
export const CAST: Record<string, Look> = {
  student: { skin: '#9A6238', shirt: '#6E96BB', pants: '#2A3550', hair: '#15110E' },
  friend: { skin: '#A86D40', shirt: '#D9A93A', pants: '#3A4660', hair: '#1B140F' },
  woman: { skin: '#B07748', shirt: '#B5543A', pants: '#3A4660', hair: '#1B140F', hairStyle: 'long', long: true },
  girl: { skin: '#C08A5A', shirt: '#7A5C8F', pants: '#2A3550', hair: '#221710', hairStyle: 'bun', skirt: '#3A4660' },
  father: { skin: '#946037', shirt: '#9DBBD6', pants: '#2B2F3F', hair: '#9A9A9A', glasses: true },
  mother: { skin: '#A5693D', shirt: '#5F9D7A', pants: '#2B2F3F', hair: '#2A1C14', hairStyle: 'bun', long: true },
  elder: { skin: '#8E5B34', shirt: '#EFE3C8', pants: '#444444', hair: '#8D8D8D', glasses: true, mustache: '#8D8D8D', long: true },
  grandma: { skin: '#9C6B45', shirt: '#8F6FA8', pants: '#444444', hair: '#B9B9B9', hairStyle: 'bun', glasses: true, long: true },
  worker: { skin: '#7D4E2D', shirt: '#C97F4A', pants: '#3B3F4A', hair: '#15110E', cap: '#2C483B' },
  scarfed: { skin: '#C08A5A', shirt: '#4F7CAC', pants: '#2A3550', hair: '#1B140F', scarf: '#E7D9C4', long: true },
};

// The user's own picture (a character, a product, a logo) placed in a scene.
// Put the file in public/art/ and pass its name. It is fitted inside the box, never stretched.
export const Art: React.FC<{ file: string; x: number; y: number; w: number; h: number; flip?: boolean; opacity?: number }> = ({ file, x, y, w, h, flip, opacity = 1 }) => (
  <foreignObject x={x} y={y} width={w} height={h}>
    <Img src={staticFile(`art/${file}`)} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: flip ? 'scaleX(-1)' : undefined, opacity }} />
  </foreignObject>
);

const NIGHT = { wall: '#3B4466', floor: '#2B3150', line: '#222741', sky: '#141A33' };
const WALL_Y = LANDSCAPE ? 90 : 170;

const Window: React.FC<{ x: number; y: number; night?: boolean; f?: number }> = ({ x, y, night, f = 0 }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width={150} height={120} fill={night ? NIGHT.sky : '#BFD9E6'} />
    {night ? (
      <>
        {[[30, 30], [70, 65], [110, 20], [125, 90], [45, 100]].map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r={2.2} fill="#fff" opacity={0.5 + 0.5 * Math.sin(f / 12 + i)} />
        ))}
        <path d="M100 35 a18 18 0 1 0 14 28 a14 14 0 1 1 -14 -28Z" fill="#F3E7C0" />
      </>
    ) : (
      <>
        <circle cx={112} cy={34} r={15} fill="#F5D36B" />
        <path d="M0 120 L0 92 Q40 70 78 92 Q112 108 150 84 L150 120Z" fill="#9DB4A0" />
      </>
    )}
    <rect width={150} height={120} fill="none" stroke="#8D7A5C" strokeWidth={6} />
    <rect x={72} width={6} height={120} fill="#8D7A5C" />
  </g>
);

// An indoor wall and floor. `window` and `picture` are x positions; `glow` adds lamp light at night.
export const Room: React.FC<{ night?: boolean; window?: number; picture?: number; rug?: boolean; glow?: [number, number]; f?: number }> = ({ night, window, picture, rug, glow, f = 0 }) => (
  <>
    <defs>
      <radialGradient id="lampGlow">
        <stop offset="0" stopColor="#FFD98A" stopOpacity="0.55" />
        <stop offset="1" stopColor="#FFD98A" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill={night ? NIGHT.wall : C.wall} />
    <rect y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill={night ? NIGHT.floor : C.floor} />
    <rect y={FLOOR_Y - 4} width={W} height={6} fill={night ? NIGHT.line : C.floorLine} />
    {window !== undefined && <Window x={window} y={WALL_Y} night={night} f={f} />}
    {picture !== undefined && (
      <g transform={`translate(${picture},${WALL_Y + 10})`}>
        <rect width={130} height={96} rx={6} fill="#EFE6D3" stroke={C.wood} strokeWidth={8} />
        <path d="M12 82 L52 44 L80 68 L104 48 L120 82Z" fill="#9DB4A0" />
        <circle cx={92} cy={30} r={10} fill={C.gold} />
      </g>
    )}
    {rug && <rect x={W * 0.11} y={FLOOR_Y + 34} width={W * 0.78} height={36} rx={18} fill={C.accent} opacity={0.3} />}
    {glow && <circle cx={glow[0]} cy={glow[1]} r={230} fill="url(#lampGlow)" opacity={0.85 + 0.1 * Math.sin(f / 15)} />}
  </>
);

const Building: React.FC<{ x: number; w: number; h: number; color: string; lit: string; night?: boolean; f: number }> = ({ x, w, h, color, lit, night, f }) => (
  <g transform={`translate(${x},${FLOOR_Y + 24 - h})`}>
    <rect width={w} height={h} fill={color} />
    {[0, 1, 2].flatMap((r) =>
      [0, 1].map((c) => (
        <rect key={`${r}${c}`} x={28 + c * 58} y={30 + r * 92} width={36} height={50} fill={night ? '#FFD98A' : lit} opacity={night ? 0.5 + 0.25 * Math.sin(f / 18 + r * 2 + c + x) : 0.85} />
      )),
    )}
  </g>
);

export const Street: React.FC<{ night?: boolean; f?: number; lamp?: boolean }> = ({ night, f = 0, lamp = true }) => (
  <>
    <rect width={W} height={H} fill={night ? '#2A3352' : '#CFD8DC'} />
    <Building x={-20} w={170} h={330} color={night ? '#4A4A66' : '#BFA98A'} lit="#E9DCB8" night={night} f={f} />
    {LANDSCAPE && <Building x={250} w={160} h={250} color={night ? '#454763' : '#B5A084'} lit="#E3D5B0" night={night} f={f} />}
    {LANDSCAPE && <Building x={560} w={170} h={300} color={night ? '#4A4A66' : '#BFA98A'} lit="#E9DCB8" night={night} f={f} />}
    <Building x={W - 140} w={180} h={370} color={night ? '#3F4160' : '#A89478'} lit="#D7C9A6" night={night} f={f} />
    <rect y={FLOOR_Y + 4} width={W} height={H - FLOOR_Y} fill={night ? '#3A3E55' : '#B8A88A'} />
    <rect y={FLOOR_Y} width={W} height={8} fill={night ? '#2C3046' : '#A39475'} />
    {lamp && (
      <>
        <rect x={CX - 8} y={FLOOR_Y - 356} width={10} height={360} fill="#4A3A2E" />
        <rect x={CX - 34} y={FLOOR_Y - 356} width={62} height={8} fill="#4A3A2E" />
        {night && <circle cx={CX - 18} cy={FLOOR_Y - 338} r={60} fill="#FFD98A" opacity={0.25} />}
      </>
    )}
  </>
);

const SKY_Y = LANDSCAPE ? 110 : 215;

export const Outdoor: React.FC<{ night?: boolean; f?: number; tree?: number }> = ({ night, f = 0, tree }) => (
  <>
    <rect width={W} height={H} fill={night ? '#1F2747' : '#BFDDEA'} />
    {night ? (
      <path transform={`translate(${W - 140},${SKY_Y - 25})`} d="M0 0 a34 34 0 1 0 26 52 a27 27 0 1 1 -26 -52Z" fill="#F3E7C0" />
    ) : (
      <circle cx={W - 120} cy={SKY_Y} r={34} fill="#F5D36B" />
    )}
    {[[0.13, -10], [0.41, 20], [0.61, -30]].map(([fx, dy], i) =>
      night ? (
        <circle key={i} cx={W * fx} cy={SKY_Y + dy} r={2.6} fill="#fff" opacity={0.5 + 0.5 * Math.sin(f / 12 + i * 2)} />
      ) : (
        <g key={i} transform={`translate(${W * fx + Math.sin(f / 90 + i) * 8},${SKY_Y + dy})`} fill="#fff" opacity={0.85}>
          <ellipse rx={34} ry={13} />
          <ellipse cx={18} cy={-9} rx={20} ry={12} />
        </g>
      ),
    )}
    <path
      d={`M0 ${FLOOR_Y - 46} Q${W * 0.22} ${FLOOR_Y - 136} ${W * 0.48} ${FLOOR_Y - 66} Q${W * 0.74} ${FLOOR_Y - 6} ${W} ${FLOOR_Y - 106} L${W} ${FLOOR_Y + 34} L0 ${FLOOR_Y + 34}Z`}
      fill={night ? '#2B4A45' : '#8DB58F'}
    />
    <rect y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill={night ? '#22403A' : '#7FAF7C'} />
    {tree !== undefined && <Tree x={tree} y={FLOOR_Y + 14} s={LANDSCAPE ? 0.8 : 1} />}
  </>
);

// A small shop front. (x, y) is its bottom-left corner on the ground. `open` runs from
// 0 (shutter down) to 1 (shutter up), so it can be animated.
export const Shop: React.FC<{ x: number; y: number; w?: number; sign?: string; open?: number; color?: string }> = ({ x, y, w = 220, sign, open = 1, color = C.good }) => {
  const gap = { x: 18, y: 86, w: w - 36, h: 144 };
  const stripe = w / 6;
  const shutter = gap.h * (1 - Math.max(0, Math.min(1, open)));
  return (
    <g transform={`translate(${x},${y - 230})`}>
      <rect y={40} width={w} height={190} fill={C.card} stroke={O} strokeWidth={4} />
      <rect x={gap.x} y={gap.y} width={gap.w} height={gap.h} fill={C.night} stroke={O} strokeWidth={3} />
      {[0, 1, 2].map((row) => (
        <React.Fragment key={row}>
          <rect x={gap.x + 8} y={gap.y + 40 + row * 40} width={gap.w - 16} height={5} fill={C.wood} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={gap.x + 14 + (i * (gap.w - 40)) / 3} y={gap.y + 20 + row * 40} width={14} height={20} rx={3} fill={[C.accent, C.gold, C.card, C.good][(i + row) % 4]} />
          ))}
        </React.Fragment>
      ))}
      {shutter > 0 && (
        <>
          <rect x={gap.x} y={gap.y} width={gap.w} height={shutter} fill="#9AA3AA" stroke={O} strokeWidth={3} />
          {Array.from({ length: Math.floor(shutter / 14) }).map((_, i) => (
            <rect key={i} x={gap.x + 4} y={gap.y + 10 + i * 14} width={gap.w - 8} height={2} fill="#00000030" />
          ))}
        </>
      )}
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={i} d={`M${i * stripe} 40 H${(i + 1) * stripe} V66 Q${(i + 0.5) * stripe} 86 ${i * stripe} 66Z`} fill={i % 2 ? C.card : C.accent} stroke={O} strokeWidth={3} strokeLinejoin="round" />
      ))}
      <rect x={-6} y={0} width={w + 12} height={42} rx={6} fill={color} stroke={O} strokeWidth={4} />
      {sign && (
        <Txt x={w / 2} y={30} size={24} fill="#fff" display maxWidth={w - 20}>
          {sign}
        </Txt>
      )}
    </g>
  );
};

export const Tree: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-12} y={-150} width={24} height={150} rx={8} fill={C.wood} stroke={O} strokeWidth={3} />
    <circle cx={0} cy={-190} r={64} fill="#4E8A5A" stroke={O} strokeWidth={3} />
    <circle cx={-44} cy={-150} r={40} fill="#5B9A66" stroke={O} strokeWidth={3} />
    <circle cx={46} cy={-152} r={42} fill="#467F52" stroke={O} strokeWidth={3} />
  </g>
);

export const Classroom: React.FC<{ board?: string }> = ({ board }) => (
  <>
    <rect width={W} height={H} fill={C.wall} />
    <rect y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill={C.floor} />
    <rect y={FLOOR_Y - 4} width={W} height={6} fill={C.floorLine} />
    <rect x={CX - 200} y={WALL_Y + 20} width={400} height={200} rx={8} fill="#2F4A40" stroke={C.wood} strokeWidth={10} />
    <rect x={CX - 180} y={WALL_Y + 222} width={360} height={10} rx={4} fill={C.woodDark} />
    {board && (
      <Txt x={CX} y={WALL_Y + 135} size={44} fill="#F3EEE2" display maxWidth={350}>
        {board}
      </Txt>
    )}
  </>
);

// A table seen from the side. People sit behind it: draw them first, then the desk.
export const Desk: React.FC<{ x?: number; y?: number; w?: number }> = ({ x = 215, y = POSE.deskY, w = 330 }) => (
  <>
    <rect x={x} y={y} width={w} height={14} rx={5} fill={C.wood} stroke={O} strokeWidth={3} />
    <rect x={x + 7} y={y + 14} width={14} height={FLOOR_Y + 48 - y - 14} fill={C.woodDark} />
    <rect x={x + w - 35} y={y + 14} width={14} height={FLOOR_Y + 48 - y - 14} fill={C.woodDark} />
  </>
);

export const Books: React.FC<{ x: number; y: number; n?: number }> = ({ x, y, n = 3 }) => (
  <>
    {[C.accent, C.good, C.gold, C.navy].slice(0, n).map((color, i) => (
      <rect key={i} x={x + i * 4} y={y - 14 - i * 12} width={90} height={14} rx={3} fill={color} stroke={O} strokeWidth={2.5} />
    ))}
  </>
);

export const Lamp: React.FC<{ x: number; y: number; flip?: boolean }> = ({ x, y, flip }) => (
  <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`}>
    <rect x={-23} y={-12} width={46} height={12} rx={5} fill="#3B2A20" />
    <path d="M0 -12 L-13 -80 L27 -108" stroke="#3B2A20" strokeWidth={7} fill="none" strokeLinecap="round" />
    <path d="M12 -116 L52 -108 L37 -82 Z" fill="#E8B84A" stroke={O} strokeWidth={3} />
  </g>
);

export const Laptop: React.FC<{ x: number; y: number; flip?: boolean }> = ({ x, y, flip }) => (
  <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`}>
    <path d="M-6 -4 L-30 -74 L60 -74 L84 -4Z" fill="#DADFE6" stroke={O} strokeWidth={3} strokeLinejoin="round" />
    <path d="M2 -12 L-18 -66 L54 -66 L72 -12Z" fill="#7FA6C9" />
    <rect x={-14} y={-6} width={110} height={8} rx={4} fill="#B9C0CA" stroke={O} strokeWidth={3} />
  </g>
);

export const Sofa: React.FC<{ x: number; y: number; w?: number; color?: string }> = ({ x, y, w = 190, color = '#8C6A4F' }) => (
  <rect x={x} y={y} width={w} height={210} rx={34} fill={color} />
);

export const Cup: React.FC<{ x: number; y: number; f?: number; handle?: boolean }> = ({ x, y, f = 0, handle }) => (
  <g transform={`translate(${x},${y})`}>
    <rect y={-50} width={34} height={50} rx={5} fill="#FBF6EE" stroke={O} strokeWidth={3} />
    <rect y={-38} width={34} height={9} fill={C.accent} />
    {handle && <path d="M34 -38 q18 4 0 24" fill="none" stroke="#FBF6EE" strokeWidth={7} />}
    <path d="M17 -58 q-6 -12 0 -22 q6 -10 0 -22" stroke="#fff" strokeWidth={3} fill="none" opacity={0.35 + 0.3 * Math.sin(f / 9)} transform={`translate(0,${-(f % 26) * 0.5})`} />
  </g>
);

export const Phone: React.FC<{ x?: number; y?: number; s?: number; lit?: boolean }> = ({ x = 0, y = 0, s = 1, lit = true }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-17} y={-30} width={34} height={60} rx={7} fill="#26262B" stroke={O} strokeWidth={3} />
    <rect x={-12} y={-23} width={24} height={44} rx={3} fill={lit ? '#9FD0F0' : '#3A3A42'} />
  </g>
);

export const Coin: React.FC<{ x: number; y: number; r?: number; mark?: string }> = ({ x, y, r = 24, mark }) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={r} fill={C.gold} stroke={O} strokeWidth={3} />
    <circle r={r - 6} fill="none" stroke="#00000030" strokeWidth={2.5} />
    {mark && (
      <Txt y={r * 0.36} size={r} fill={C.ink}>
        {mark}
      </Txt>
    )}
  </g>
);

export const Heart: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 1, color = C.accent }) => (
  <path transform={`translate(${x},${y}) scale(${s})`} d="M0 18 C-34 -6 -26 -34 -8 -30 C-2 -29 0 -22 0 -22 C0 -22 2 -29 8 -30 C26 -34 34 -6 0 18Z" fill={color} stroke={O} strokeWidth={3} strokeLinejoin="round" />
);

export const Clock: React.FC<{ x: number; y: number; r?: number; t?: number }> = ({ x, y, r = 46, t = 0 }) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={r} fill={C.card} stroke={O} strokeWidth={4} />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={-2} y={-r + 6} width={4} height={8} fill={C.muted} transform={`rotate(${i * 90})`} />
    ))}
    <rect x={-2.5} y={-r * 0.5} width={5} height={r * 0.5} rx={2} fill={O} transform={`rotate(${t * 30})`} />
    <rect x={-1.5} y={-r * 0.78} width={3} height={r * 0.78} rx={1.5} fill={C.accent} transform={`rotate(${t * 360})`} />
    <circle r={4} fill={O} />
  </g>
);

export const Eye: React.FC<{ x: number; y: number; since?: number; look: [number, number] }> = ({ x, y, since = 999, look }) => {
  const k = sp(since, { damping: 12, stiffness: 120, mass: 0.7 });
  const dx = look[0] - x;
  const dy = look[1] - y;
  const n = Math.hypot(dx, dy) || 1;
  return (
    <g transform={`translate(${x},${y}) scale(${k})`} opacity={Math.min(1, k)}>
      <ellipse rx={24} ry={15} fill="#F6EFE8" stroke={O} strokeWidth={3} />
      <circle cx={(dx / n) * 8} cy={(dy / n) * 5} r={7} fill={O} />
    </g>
  );
};

// A paper document with a coloured header. (x, y) is its top-left corner.
export const Doc: React.FC<{ x: number; y: number; k?: number; title?: string; color?: string }> = ({ x, y, k = 1, title, color = C.good }) => (
  <g transform={`translate(${x},${y}) scale(${k})`}>
    <rect width={280} height={360} rx={14} fill={C.card} stroke={O} strokeWidth={3} />
    <path d="M0 60 V14 Q0 0 14 0 H266 Q280 0 280 14 V60Z" fill={color} />
    {title && (
      <Txt x={140} y={42} size={26} fill="#fff" display maxWidth={250}>
        {title}
      </Txt>
    )}
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={30} y={96 + i * 36} width={i % 2 ? 150 : 220} height={12} rx={6} fill={C.line} />
    ))}
  </g>
);

// A round stamp that slams down: a tick when `ok`, a cross otherwise. k is a spring value.
export const Stamp: React.FC<{ x: number; y: number; k: number; ok?: boolean; r?: number }> = ({ x, y, k, ok, r = 86 }) => {
  const color = ok ? C.good : C.accent;
  const q = Math.min(1, k);
  return (
    <g transform={`translate(${x},${y}) rotate(-14) scale(${2.6 - 1.6 * q})`} opacity={q}>
      <circle r={r} fill="none" stroke={color} strokeWidth={14} />
      {ok ? (
        <path d={`M${-r * 0.5} 0 L${-r * 0.12} ${r * 0.4} L${r * 0.55} ${-r * 0.4}`} stroke={color} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={`M${-r * 0.53} ${-r * 0.53} L${r * 0.53} ${r * 0.53} M${r * 0.53} ${-r * 0.53} L${-r * 0.53} ${r * 0.53}`} stroke={color} strokeWidth={22} strokeLinecap="round" />
      )}
    </g>
  );
};

// A labelled bar that fills from 0 to 1. (x, y) is the card's top-left corner.
export const Bar: React.FC<{ x: number; y: number; label: string; value: number; show?: string; k?: number; color?: string }> = ({ x, y, label, value, show, k = 1, color = C.good }) => (
  <g transform={`translate(${x},${y}) scale(${Math.min(1, k)})`} opacity={Math.min(1, k)}>
    <rect width={380} height={150} rx={20} fill={C.card} stroke={O} strokeWidth={3} />
    <Txt x={30} y={52} size={26} anchor="start" fill={C.cardInk} maxWidth={show ? 210 : 320}>
      {label}
    </Txt>
    {show && (
      <Txt x={350} y={54} size={32} anchor="end" fill={C.accent} display>
        {show}
      </Txt>
    )}
    <rect x={30} y={88} width={320} height={26} rx={13} fill={C.line} />
    <rect x={30} y={88} width={320 * Math.max(0, Math.min(1, value))} height={26} rx={13} fill={color} />
  </g>
);

// A vertical gauge that fills from 0 to 1, with a label on top. (x, y) is the top centre.
export const Meter: React.FC<{ x: number; y: number; value: number; label?: string; h?: number; light?: boolean }> = ({ x, y, value, label, h = 220, light }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-18} width={36} height={h} rx={18} fill={C.card} stroke={O} strokeWidth={3} />
    <rect x={-12} y={h - 6 - (h - 12) * Math.max(0, Math.min(1, value))} width={24} height={(h - 12) * Math.max(0, Math.min(1, value))} rx={12} fill={C.accent} />
    {label && (
      <Txt y={-12} size={20} fill={light ? C.card : C.ink} maxWidth={110}>
        {label}
      </Txt>
    )}
  </g>
);

// Numbered cells that fill one by one, for days, months or steps. `filled` may be fractional.
export const Cells: React.FC<{ x: number; y: number; count: number; filled: number; perRow?: number; labels?: string[]; f: number }> = ({ x, y, count, filled, perRow = 6, labels, f }) => (
  <g transform={`translate(${x},${y})`}>
    {Array.from({ length: count }).map((_, i) => {
      const on = i < Math.floor(filled);
      return (
        <g key={i} transform={`translate(${(i % perRow) * 78},${Math.floor(i / perRow) * 66})`}>
          <rect width={64} height={54} rx={12} fill={on ? C.good : C.floor} stroke={O} strokeWidth={2.5} />
          {labels?.[i] && (
            <Txt x={32} y={36} size={24} fill={on ? '#fff' : C.muted} maxWidth={54}>
              {labels[i]}
            </Txt>
          )}
        </g>
      );
    })}
  </g>
);

// A card with a numbered dot and a short line, for lists and takeaways. k is a spring value.
export const StepCard: React.FC<{ y: number; n: string; text: string; k: number; x?: number }> = ({ y, n, text, k, x = CX }) => {
  const q = Math.min(1, k);
  return (
    <g transform={`translate(${x},${y + (1 - q) * 40}) scale(${0.9 + 0.1 * q})`} opacity={q}>
      <rect x={-190} y={-70} width={380} height={140} rx={24} fill={C.card} stroke={O} strokeWidth={3} />
      <circle cx={-120} cy={0} r={34} fill={C.accent} />
      <Txt x={-120} y={14} size={40} fill="#fff" display>
        {n}
      </Txt>
      <Txt x={55} y={16} size={50} fill={C.cardInk} display maxWidth={230}>
        {text}
      </Txt>
    </g>
  );
};

// One large line of text that rises in. Use for titles, numbers and the closing lesson.
export const Headline: React.FC<{ y: number; text: string; k: number; size?: number; fill?: string; x?: number }> = ({ y, text, k, size = 54, fill = C.ink, x = CX }) => {
  const q = Math.min(1, k);
  return (
    <g opacity={q} transform={`translate(0,${(1 - q) * 20})`}>
      <Txt x={x} y={y} size={size} fill={fill} display maxWidth={Math.min(W - 100, 720)}>
        {text}
      </Txt>
    </g>
  );
};

// A coloured pill with a label. k is a spring value.
export const Badge: React.FC<{ x: number; y: number; text: string; k: number; color?: string; w?: number }> = ({ x, y, text, k, color = C.good, w = 220 }) => {
  const q = Math.min(1, k);
  return (
    <g transform={`translate(${x},${y}) scale(${q})`} opacity={q}>
      <rect x={-w / 2} y={-30} width={w} height={60} rx={30} fill={color} stroke={O} strokeWidth={3} />
      <Txt y={12} size={32} fill="#fff" display maxWidth={w - 40}>
        {text}
      </Txt>
    </g>
  );
};

export const Arrow: React.FC<{ x: number; y: number; len?: number; k?: number; angle?: number }> = ({ x, y, len = 90, k = 1, angle = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${angle})`} opacity={Math.min(1, k)}>
    <path d={`M0 0 V${len * Math.min(1, k)}`} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
    <path d={`M-26 ${len * Math.min(1, k) - 20} L0 ${len * Math.min(1, k) + 10} L26 ${len * Math.min(1, k) - 20}`} stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

// A megaphone with an optional "no" mark over it. k and crossed are spring values.
export const Megaphone: React.FC<{ x?: number; y?: number; k: number; crossed?: number }> = ({ x = CX, y = LANDSCAPE ? 250 : 430, k, crossed = 0 }) => (
  <g transform={`translate(${x},${y}) scale(${k})`}>
    <path d="M-120 -40 L40 -120 L40 120 L-120 40Z" fill="#8C6A4F" stroke={O} strokeWidth={5} strokeLinejoin="round" />
    <rect x={-170} y={-46} width={64} height={92} rx={16} fill={C.wood} stroke={O} strokeWidth={5} />
    <rect x={-100} y={40} width={34} height={80} rx={12} fill={C.wood} stroke={O} strokeWidth={5} />
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${70 + i * 34} ${-40 - i * 10} Q${100 + i * 34} 0 ${70 + i * 34} ${40 + i * 10}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
    ))}
    <g transform={`translate(80,70) scale(${crossed})`} opacity={Math.min(1, crossed)}>
      <circle r={62} fill={C.accent} stroke={O} strokeWidth={5} />
      <path d="M-28 -28 L28 28 M28 -28 L-28 28" stroke="#fff" strokeWidth={14} strokeLinecap="round" />
    </g>
  </g>
);
