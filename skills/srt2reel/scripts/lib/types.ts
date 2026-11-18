export type Cue = { i: number; s: number; e: number; text: string };
export type Timed = { s: number; e: number; text: string };
export type Silence = { s: number; e: number; d: number };
export type Caption = { s: number; e: number; t: string; who?: string };
export type SceneCue = { id: string; s: number; e: number; tag?: string; props?: Record<string, unknown> };
export type Format = 'portrait' | 'landscape';
export type Sfx = [name: string, at: number, volume: number];

export type Story = {
  lang: string;
  dir: 'ltr' | 'rtl';
  format?: Format;
  page: string;
  theme: string;
  captionLift: number;
  numerals?: string;
  fonts?: { text?: string; display?: string };
  captions: Caption[];
  scenes: SceneCue[];
  speak: Record<string, [number, number][]>;
  sfx: Sfx[];
};

export type Face = { file: string; weight: number; range: string };
export type FontManifest = {
  text: { id: string; faces: Face[] };
  display: { id: string; faces: Face[] };
};

export type AudioData = { fps: number; duration: number; total: number; rms: number[] };

// Everything prepare learned about the inputs, kept beside the project for later checks.
export type Plan = {
  fps: number;
  hold: number;
  voiceDuration: number;
  total: number;
  script: string;
  thresholdDb: number;
  cues: Cue[];
  silences: Silence[];
  cuts: { at: number; pause: number; beforeCaption: number | null; insideCaption: number | null }[];
};

export type Report = { errors: string[]; warnings: string[] };
