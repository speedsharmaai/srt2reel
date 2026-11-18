import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 44100;
// The pad holds no sound above a few hundred hertz, so a low rate keeps a long video's file small.
const PAD_RATE = 11025;
export const SFX_NAMES = ['tick', 'pop', 'stamp', 'printer', 'whoosh', 'pad'];

export function wavBytes(samples: Float32Array, rate = RATE): Buffer {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32767), 44 + i * 2);
  return b;
}

// A fixed seed keeps the noise-based sounds identical on every run.
function noise() {
  let seed = 7;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
}

function make(seconds: number, sample: (t: number) => number, rate = RATE): Float32Array {
  const out = new Float32Array(Math.floor(rate * seconds));
  for (let i = 0; i < out.length; i++) out[i] = sample(i / rate);
  return out;
}

export function synth(name: string, padSeconds: number): Float32Array {
  const rnd = noise();
  const TAU = 2 * Math.PI;
  switch (name) {
    case 'tick':
      return make(0.07, (t) => Math.sin(TAU * 1400 * t) * Math.exp(-t * 60) * 0.5);
    case 'pop': {
      let phase = 0;
      return make(0.18, (t) => {
        phase += (TAU * (520 * Math.exp(-t * 14) + 120)) / RATE;
        return Math.sin(phase) * Math.exp(-t * 22) * 0.7;
      });
    }
    case 'stamp': {
      let phase = 0;
      return make(0.5, (t) => {
        phase += (TAU * (95 * Math.exp(-t * 6) + 45)) / RATE;
        return Math.sin(phase) * Math.exp(-t * 9) * 0.9 + rnd() * Math.exp(-t * 90) * 0.5;
      });
    }
    case 'printer':
      return make(1.3, (t) => {
        const gate = Math.floor(t * 38) % 2 === 0 ? 1 : 0.25;
        const env = Math.min(1, t * 20) * Math.min(1, (1.3 - t) * 12);
        return rnd() * 0.35 * gate * env + Math.sin(TAU * (900 + 60 * Math.sin(t * 38 * 6.28)) * t) * 0.06 * env;
      });
    case 'whoosh': {
      let low = 0;
      return make(0.35, (t) => {
        const swell = Math.sin((Math.PI * t) / 0.35);
        low += (0.05 + 0.4 * swell) * (rnd() - low);
        return low * swell * 1.2;
      });
    }
    case 'pad': {
      const notes = [110, 164.81, 220, 277.18];
      return make(padSeconds, (t) => {
        let v = 0;
        notes.forEach((hz, k) => {
          v += Math.sin(TAU * hz * t + Math.sin(t * 0.3 + k)) * 0.12 + Math.sin(TAU * hz * 1.003 * t) * 0.08;
        });
        const lfo = 0.75 + 0.25 * Math.sin((TAU * t) / 9);
        const fade = Math.min(1, t / 3) * Math.min(1, (padSeconds - t) / 3);
        return v * lfo * fade * 0.5;
      }, PAD_RATE);
    }
    default:
      throw new Error(`Unknown sound "${name}".`);
  }
}

export const sampleRate = (name: string) => (name === 'pad' ? PAD_RATE : RATE);

// The ambient pad is made exactly as long as the video, so it never cuts out early.
export function writeSfx(dir: string, videoSeconds: number) {
  mkdirSync(dir, { recursive: true });
  for (const name of SFX_NAMES) writeFileSync(join(dir, `${name}.wav`), wavBytes(synth(name, videoSeconds), sampleRate(name)));
}
