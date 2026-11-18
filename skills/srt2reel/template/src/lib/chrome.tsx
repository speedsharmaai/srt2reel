import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame } from 'remotion';
import { C, Caption, F, FPS, H, LANDSCAPE, LAYOUT, SPRING, T, W, clamp, cols, story } from './theme';

// A scene's children are SVG elements drawn in the 540x960 space.
export const Stage: React.FC<{ dur: number; push?: number; bg?: string; children: React.ReactNode }> = ({ dur, push = 0.05, bg, children }) => {
  const f = useCurrentFrame();
  const scale = 1 + push * (f / Math.max(1, dur));
  const opacity = interpolate(f, [0, 4], [0.55, 1], clamp);
  return (
    <AbsoluteFill style={{ background: bg ?? C.bg, opacity }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 58%' }}>
        <div style={{ width: W, height: H, transform: 'scale(2)', transformOrigin: '0 0', position: 'relative', overflow: 'hidden' }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
            {children}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CAPTION_SIZE = LAYOUT.captionSize;
const CAPTION_MAX_WIDTH = LAYOUT.captionWidth;
const CAPTION_PAD = 24;
const KEEP_WORDS = story.lang.toLowerCase().startsWith('ko') ? 'keep-all' : 'normal';

// {word} marks a key word. Only the colour changes, so joined scripts such as Arabic stay joined.
const highlight = (line: string) =>
  line.split(/(\{[^}]+\})/).map((part, i) =>
    part.startsWith('{') ? (
      <span key={i} style={{ color: C.accent }}>
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

const captionSize = (text: string) => {
  const widest = Math.max(...text.replace(/[{}]/g, '').split('\n').map(cols));
  const room = (CAPTION_MAX_WIDTH - CAPTION_PAD * 2) / (CAPTION_SIZE * 0.54);
  return widest <= room ? CAPTION_SIZE : Math.max(21, (CAPTION_SIZE * room) / widest);
};

const CaptionCard: React.FC<{ cap: Caption; len: number }> = ({ cap, len }) => {
  const f = useCurrentFrame();
  const enter = spring({ frame: f, fps: FPS, config: SPRING });
  const leave = interpolate(f, [len - 5, len], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: LAYOUT.side,
        right: LAYOUT.side,
        bottom: LAYOUT.captionBottom,
        display: 'flex',
        justifyContent: 'center',
        opacity: Math.min(1, enter) * leave,
        transform: `translateY(${(1 - enter) * 14}px) scale(${0.92 + 0.08 * enter})`,
      }}
    >
      <div
        dir={story.dir}
        lang={story.lang}
        style={{
          maxWidth: CAPTION_MAX_WIDTH,
          boxSizing: 'border-box',
          padding: `12px ${CAPTION_PAD}px`,
          borderRadius: 20,
          background: C.card,
          boxShadow: '0 4px 14px #0003',
          fontFamily: F.text,
          fontWeight: 700,
          fontSize: captionSize(cap.t),
          lineHeight: 1.38,
          color: C.cardInk,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          wordBreak: KEEP_WORDS,
          overflowWrap: 'anywhere',
          textWrap: 'balance',
        }}
      >
        {cap.who && (
          <div style={{ fontSize: 17, fontWeight: 600, color: C.muted, marginBottom: 2 }}>
            <i style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: C.muted, marginInlineEnd: 6, verticalAlign: 'middle' }} />
            {cap.who}
          </div>
        )}
        {highlight(cap.t)}
      </div>
    </div>
  );
};

const pill: React.CSSProperties = { position: 'absolute', left: '50%', whiteSpace: 'nowrap', color: C.cardInk };

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const scene = story.scenes.find((x) => x.tag && t >= x.s + 0.15 && t < x.e);
  const pop = spring({ frame: f - T((scene?.s ?? 0) + 0.2), fps: FPS, config: SPRING });
  return (
    <AbsoluteFill>
      <div style={{ width: W, height: H, transform: 'scale(2)', transformOrigin: '0 0', position: 'relative' }}>
        {story.page !== '' && (
          <div
            dir={story.dir}
            style={{
              ...pill,
              ...(LANDSCAPE ? { left: 'auto', right: LAYOUT.side } : { transform: 'translateX(-50%)' }),
              top: LAYOUT.pageTop,
              padding: '5px 22px',
              borderRadius: 24,
              background: `${C.card}D9`,
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {story.page}
          </div>
        )}
        {scene && (
          <div
            dir={story.dir}
            lang={story.lang}
            style={{
              ...pill,
              top: LAYOUT.tagTop,
              transform: `translateX(-50%) scale(${0.85 + 0.15 * Math.min(1, pop)})`,
              opacity: Math.min(1, pop),
              padding: '7px 24px 8px',
              borderRadius: 30,
              background: C.card,
              border: `3px solid ${C.accent}`,
              boxShadow: '0 4px 12px #0003',
              fontFamily: F.text,
              fontWeight: 700,
              fontSize: 27,
              lineHeight: 1.25,
            }}
          >
            <i style={{ display: 'inline-block', width: 13, height: 13, borderRadius: '50%', background: C.accent, marginInlineEnd: 11, verticalAlign: 'middle' }} />
            {scene.tag}
          </div>
        )}
        {story.captions.map((cap, i) => {
          const len = T(cap.e + 0.18) - T(cap.s);
          return (
            <Sequence key={i} from={T(cap.s)} durationInFrames={len} layout="none">
              <CaptionCard cap={cap} len={len} />
            </Sequence>
          );
        })}
      </div>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(30,15,5,0.22) 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill
        style={{
          opacity: 0.1,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${(f % 3) + 1}'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")`,
        }}
      />
    </AbsoluteFill>
  );
};
