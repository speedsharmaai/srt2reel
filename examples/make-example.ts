import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Builds a voice and its SRT from a text file, one sentence per line. Development only:
// it is how the examples and dogfood inputs in this repository were made.
// Usage: node examples/make-example.ts <lines.txt> <voice> <out-dir>
//   <voice> is one of:
//     a macOS `say` voice                Samantha, Lekha ...
//     kokoro:<voice>                     kokoro:am_michael; needs KOKORO_PYTHON, a Python with the kokoro package
//     eleven:<voice id>                  an ElevenLabs voice; needs ELEVENLABS_API_KEY. The text is sent to ElevenLabs.
//   ELEVEN_MODEL picks the ElevenLabs model (default eleven_multilingual_v2).

const [linesFile, voice, outDir] = process.argv.slice(2);
if (!linesFile || !voice || !outDir) {
  console.error('Usage: node examples/make-example.ts <lines.txt> <voice | kokoro:voice> <out-dir>');
  process.exit(1);
}

const PAUSE = 0.55;
const lines = readFileSync(linesFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const work = mkdtempSync(join(tmpdir(), 'srt2reel-'));
mkdirSync(outDir, { recursive: true });

const sh = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr}`);
  return r.stdout.trim();
};
const stamp = (t: number) => {
  const ms = Math.round(t * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

// ElevenLabs reads the whole story in one request, which keeps the delivery natural, and
// returns the time of every character. Each line's cue comes straight from those times.
if (voice.startsWith('eleven:')) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Set ELEVENLABS_API_KEY first.');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.slice(7)}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n'), model_id: process.env.ELEVEN_MODEL ?? 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as {
    audio_base64: string;
    alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = body.alignment;
  const spans: [number, number][] = [];
  let from = -1;
  characters.forEach((ch, i) => {
    const text = ch.trim() !== '';
    if (text && from < 0) from = i;
    if ((ch.includes('\n') || i === characters.length - 1) && from >= 0) {
      let to = i;
      while (to > from && characters[to]!.trim() === '') to--;
      spans.push([starts[from]!, ends[to]!]);
      from = -1;
    }
  });
  if (spans.length !== lines.length) throw new Error(`ElevenLabs returned timings for ${spans.length} lines, expected ${lines.length}.`);
  writeFileSync(join(outDir, 'voice.mp3'), Buffer.from(body.audio_base64, 'base64'));
  writeFileSync(join(outDir, 'voice.srt'), lines.map((line, i) => `${i + 1}\n${stamp(spans[i]![0])} --> ${stamp(spans[i]![1])}\n${line}\n`).join('\n'));
  console.log(`${lines.length} lines, ${spans.at(-1)![1].toFixed(1)}s, ${lines.join('\n').length} characters sent -> ${outDir}`);
  process.exit(0);
}

const list: string[] = [];
const cues: string[] = [];
let t = 0.2;
sh('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', '0.2', join(work, 'lead.wav')]);
sh('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', String(PAUSE), join(work, 'gap.wav')]);
list.push(`file '${join(work, 'lead.wav')}'`);

const KOKORO = `
import sys, numpy as np, soundfile as sf
from kokoro import KPipeline
lines = [l.strip() for l in open(sys.argv[1], encoding='utf8') if l.strip()]
voice, out = sys.argv[2], sys.argv[3]
pipe = KPipeline(lang_code=voice[0], repo_id='hexgrad/Kokoro-82M')
for i, line in enumerate(lines):
    audio = np.concatenate([np.asarray(r.audio, dtype=np.float32) for r in pipe(line, voice=voice, speed=1.0)])
    sf.write(f'{out}/raw{i}.wav', audio, 24000)
`;

if (voice.startsWith('kokoro:')) {
  const python = process.env.KOKORO_PYTHON;
  if (!python) throw new Error('Set KOKORO_PYTHON to a Python that has the kokoro package.');
  sh(python, ['-c', KOKORO, linesFile, voice.slice(7), work]);
}

lines.forEach((line, i) => {
  const wav = join(work, `${i}.wav`);
  let spoken = join(work, `raw${i}.wav`);
  if (!voice.startsWith('kokoro:')) {
    spoken = join(work, `${i}.aiff`);
    sh('say', ['-v', voice, '-o', spoken, line]);
  }
  // Leading and trailing silence is cut so that the pauses between lines are all the same length.
  sh('ffmpeg', ['-y', '-v', 'error', '-i', spoken, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ar', '22050', '-ac', '1', wav]);
  const dur = Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]));
  const end = t + dur + (i < lines.length - 1 ? PAUSE : 0);
  cues.push(`${i + 1}\n${stamp(t)} --> ${stamp(end)}\n${line}\n`);
  list.push(`file '${wav}'`);
  if (i < lines.length - 1) list.push(`file '${join(work, 'gap.wav')}'`);
  t = end;
});

writeFileSync(join(work, 'list.txt'), list.join('\n'));
sh('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', join(work, 'list.txt'), '-c:a', 'libmp3lame', '-b:a', '128k', join(outDir, 'voice.mp3')]);
writeFileSync(join(outDir, 'voice.srt'), cues.join('\n'));
console.log(`${lines.length} lines, ${t.toFixed(1)}s -> ${dirname(join(outDir, 'voice.mp3'))}`);
