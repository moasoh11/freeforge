#!/usr/bin/env node
// FreeForge clip helper. Free: runs on our Cloudflare Worker (Whisper turbo + Llama), no keys needed.
// Usage: node clip.mjs <audio-or-video-file> [--count 3] [--min 15] [--max 45] [--style "funny"] [--out result.json]
// Needs: node 18+, ffmpeg. Only use media you have rights to. Free daily limit is ~30 MB of audio (~60 min) across everyone.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const W = 'https://freeforge-ai.moasoh-freeforge.workers.dev', ORIGIN = 'https://moasoh11.github.io';
const a = process.argv.slice(2); const file = a[0];
const opt = (k, d) => { const i = a.indexOf('--' + k); return i > 0 ? a[i + 1] : d; };
if (!file) { console.error('usage: node clip.mjs <file> [--count 3] [--min 15] [--max 45] [--style "funny"] [--out result.json]'); process.exit(1); }
const CH = 300; // seconds per chunk (16 kHz mono mp3, ~1.8 MB, well under the 6 MB limit)
const dir = mkdtempSync(join(tmpdir(), 'clip-'));
execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', '-f', 'segment', '-segment_time', String(CH), join(dir, 'c%03d.mp3')]);
const chunks = readdirSync(dir).filter(f => f.endsWith('.mp3')).sort();
const post = async (path, body) => {
  for (let t = 0; t < 4; t++) {
    const r = await fetch(W + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    if (r.status === 429) { await new Promise(s => setTimeout(s, 20000)); continue; }
    throw new Error(path + ' ' + r.status + ' ' + (j.error || ''));
  }
  throw new Error(path + ' rate limited');
};
const segments = []; let text = '';
for (let i = 0; i < chunks.length; i++) {
  const j = await post('/transcribe', { audio: readFileSync(join(dir, chunks[i])).toString('base64') });
  for (const s of j.segments) segments.push({ start: +(s.start + i * CH).toFixed(2), end: +(s.end + i * CH).toFixed(2), text: s.text });
  text += (j.text || '') + ' ';
  console.error('transcribed chunk', i + 1, '/', chunks.length);
}
const hl = await post('/highlights', { segments, count: +opt('count', 3), min_seconds: +opt('min', 15), max_seconds: +opt('max', 45), style: opt('style', 'most engaging') });
const result = { transcript: text.trim(), segments, clips: hl.clips };
writeFileSync(opt('out', 'clip-result.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify(hl.clips, null, 1));
console.error('Cut a clip with: ffmpeg -ss START -to END -i ' + file + ' -c:v libx264 -c:a aac clip.mp4');
