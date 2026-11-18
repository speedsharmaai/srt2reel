// Loudness target for short-form video: -14 LUFS with a -1.5 dBTP ceiling.
const TARGET = 'I=-14:TP=-1.5:LRA=11';

export type Loudness = { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string };

// With no measurement this is the measuring pass; with one it is the correcting pass.
export function loudnormFilter(m?: Loudness): string {
  if (!m) return `loudnorm=${TARGET}:print_format=json`;
  return `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
}

export function parseLoudnorm(ffmpegOutput: string): Loudness | null {
  const block = /\{[^{}]*"input_i"[^{}]*\}/.exec(ffmpegOutput)?.[0];
  if (!block) return null;
  try {
    const m = JSON.parse(block) as Loudness;
    const usable = [m.input_i, m.input_tp, m.input_lra, m.input_thresh, m.target_offset].every((v) => Number.isFinite(Number(v)));
    return usable ? m : null;
  } catch {
    return null;
  }
}

// ffmpeg arguments that re-encode the picture at a bitrate chosen to land under `maxMb`.
export function shrinkArgs(maxMb: number, seconds: number, audioKbps = 192): string[] {
  const totalKbps = (maxMb * 8 * 1024 * 0.96) / seconds;
  const videoKbps = Math.max(300, Math.floor(totalKbps - audioKbps));
  return [
    '-c:v', 'libx264', '-preset', 'medium', '-b:v', `${videoKbps}k`, '-maxrate', `${Math.floor(videoKbps * 1.4)}k`, '-bufsize', `${videoKbps * 2}k`,
    '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'copy', '-movflags', '+faststart',
  ];
}

// Four moments to look at in the finished file: late in a caption, when everything
// that scene shows has had time to appear.
export function finalCheckTimes(captions: { s: number; e: number }[], total: number, count = 4): number[] {
  if (captions.length === 0) return Array.from({ length: count }, (_, i) => ((i + 0.5) * total) / count);
  const n = Math.min(count, captions.length);
  return Array.from({ length: n }, (_, i) => {
    const c = captions[Math.min(captions.length - 1, Math.floor(((i + 0.5) * captions.length) / n))]!;
    return Math.round((c.s + (c.e - c.s) * 0.8) * 100) / 100;
  });
}

type Stream = {
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  r_frame_rate?: string;
  sample_rate?: string;
};
export type Probe = { streams: Stream[]; format: { duration?: string; format_name?: string } };

export function verifyStreams(probe: Probe, total: number, fps: number, size = { width: 1080, height: 1920 }): string[] {
  const problems: string[] = [];
  const video = probe.streams.find((s) => s.codec_type === 'video');
  const audio = probe.streams.find((s) => s.codec_type === 'audio');
  if (!video) problems.push('The file has no video stream.');
  else {
    if (video.width !== size.width || video.height !== size.height) problems.push(`Size is ${video.width}x${video.height}, expected ${size.width}x${size.height}.`);
    if (video.codec_name !== 'h264') problems.push(`Video codec is ${video.codec_name}, expected h264.`);
    if (video.pix_fmt !== 'yuv420p') problems.push(`Pixel format is ${video.pix_fmt}, expected yuv420p.`);
    const [num, den] = (video.r_frame_rate ?? '0/1').split('/').map(Number) as [number, number];
    if (Math.abs(num / den - fps) > 0.01) problems.push(`Frame rate is ${video.r_frame_rate}, expected ${fps}.`);
  }
  if (!audio) problems.push('The file has no audio stream.');
  else {
    if (audio.codec_name !== 'aac') problems.push(`Audio codec is ${audio.codec_name}, expected aac.`);
    if (audio.sample_rate !== '48000') problems.push(`Audio sample rate is ${audio.sample_rate}, expected 48000.`);
  }
  const duration = Number(probe.format.duration);
  if (!(Math.abs(duration - total) <= 0.15)) problems.push(`Length is ${duration.toFixed(2)}s, expected ${total.toFixed(2)}s.`);
  return problems;
}
