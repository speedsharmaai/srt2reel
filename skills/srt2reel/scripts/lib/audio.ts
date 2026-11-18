import { spawnSync } from 'node:child_process';
import type { Silence } from './types.ts';

const PCM_RATE = 16000;
const ENVELOPE_HZ = 100;

export function probeDuration(file: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
    encoding: 'utf8',
  });
  const d = Number(r.stdout?.trim());
  if (r.status !== 0 || !(d > 0)) throw new Error(`ffprobe could not read the duration of ${file}. ${r.stderr ?? ''}`.trim());
  return d;
}

export function decodePcm(file: string): { samples: Float32Array; rate: number } {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(PCM_RATE), '-f', 'f32le', '-'], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${file}. ${r.stderr?.toString() ?? ''}`.trim());
  const copy = new Uint8Array(r.stdout);
  const samples = new Float32Array(copy.buffer, 0, Math.floor(copy.byteLength / 4));
  if (samples.length === 0) throw new Error(`${file} has no audio.`);
  return { samples, rate: PCM_RATE };
}

export function rmsWindows(samples: ArrayLike<number>, rate: number, hz: number): Float64Array {
  const n = Math.floor((samples.length * hz) / rate);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * rate) / hz);
    const b = Math.floor(((i + 1) * rate) / hz);
    let sum = 0;
    for (let j = a; j < b; j++) sum += samples[j]! * samples[j]!;
    out[i] = Math.sqrt(sum / Math.max(1, b - a));
  }
  return out;
}

export function normalize(values: ArrayLike<number>): number[] {
  let max = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! > max) max = values[i]!;
  return Array.from(values, (v) => Math.round((v / Math.max(max, 1e-9)) * 1000) / 1000);
}

const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-6));

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

// The silence threshold adapts to the recording instead of using one fixed level.
// 30 dB under the loud speech level sits below trailing consonants in a clean voice;
// a noisy room lifts it to 6 dB over the noise floor; it never comes within 10 dB of speech.
export function silenceThresholdDb(envelope: ArrayLike<number>): number {
  const db = Array.from(envelope, toDb).sort((a, b) => a - b);
  const floor = percentile(db, 0.05);
  const speech = percentile(db, 0.95);
  return Math.min(Math.max(speech - 30, floor + 6), speech - 10);
}

const round = (v: number) => Math.round(v * 100) / 100;

export function findSilences(
  envelope: ArrayLike<number>,
  hz: number,
  { minDur = 0.12, thresholdDb }: { minDur?: number; thresholdDb?: number } = {},
): Silence[] {
  const thr = thresholdDb ?? silenceThresholdDb(envelope);
  const out: Silence[] = [];
  let start = -1;
  const close = (end: number) => {
    const s = start / hz;
    const e = end / hz;
    if (e - s >= minDur) out.push({ s: round(s), e: round(e), d: round(e - s) });
    start = -1;
  };
  for (let i = 0; i < envelope.length; i++) {
    const quiet = toDb(envelope[i]!) < thr;
    if (quiet && start < 0) start = i;
    if (!quiet && start >= 0) close(i);
  }
  if (start >= 0) close(envelope.length);
  return out;
}

export function analyzeVoice(file: string, fps: number) {
  const duration = probeDuration(file);
  const { samples, rate } = decodePcm(file);
  const envelope = rmsWindows(samples, rate, ENVELOPE_HZ);
  return {
    duration,
    rms: normalize(rmsWindows(samples, rate, fps)),
    silences: findSilences(envelope, ENVELOPE_HZ),
    thresholdDb: Math.round(silenceThresholdDb(envelope) * 10) / 10,
  };
}
