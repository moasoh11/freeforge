// FreeForge AI proxy (Cloudflare Worker, free plan). Uses the Workers AI binding, so no model keys exist anywhere.
// Protections: Origin allowlist, per-IP rate limit (RL binding), global daily cap (KV), input clamping, no logging of prompts.
const ALLOWED_ORIGINS = ['https://moasoh11.github.io'];
const DAILY_CAP = { image: 120, llm: 150 };          // stays inside the 10,000 free neurons/day (about 170 images at 1024x1024)
const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

const cors = origin => ({ 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', 'vary': 'origin' });
const json = (obj, status, origin) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(origin) } });
const clamp = (v, lo, hi, d) => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

async function takeDaily(env, kind) {
  if (!env.KV) return true;                                  // KV not bound: rely on RL only
  const key = 'd:' + new Date().toISOString().slice(0, 10) + ':' + kind;
  const n = parseInt(await env.KV.get(key) || '0', 10);
  if (n >= DAILY_CAP[kind]) return false;
  await env.KV.put(key, String(n + 1), { expirationTtl: 172800 });
  return true;
}
function b64ToBytes(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const ok = ALLOWED_ORIGINS.includes(origin);
    const o = ok ? origin : ALLOWED_ORIGINS[0];
    if (req.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors(o) });
    const url = new URL(req.url);
    if (url.pathname === '/health') return json({ ok: true, image: IMAGE_MODEL, llm: LLM_MODEL }, 200, o);
    if (!ok) return json({ error: 'origin not allowed' }, 403, o);
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, o);
    if (!['/image', '/llm'].includes(url.pathname)) return json({ error: 'not found' }, 404, o);
    const len = +req.headers.get('content-length') || 0; if (len > 4000) return json({ error: 'too large' }, 413, o);

    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    if (env.RL) { const r = await env.RL.limit({ key: ip + url.pathname }); if (!r.success) return json({ error: 'Too many requests. Wait a minute and try again.' }, 429, o); }
    let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400, o); }

    if (url.pathname === '/image') {
      const prompt = String(body.prompt || '').trim().slice(0, 240);
      if (prompt.length < 3) return json({ error: 'prompt too short' }, 400, o);
      const style = { icon: 'game item icon, centered, clean background, vibrant, soft lighting, stylized 3D render', thumbnail: 'video game key art, dramatic lighting, vibrant colors, bold composition', texture: 'seamless tileable game texture, flat top-down, no text', ui: 'game UI panel art, clean, ornate border, no text' }[body.style] || 'stylized game asset, vibrant, clean';
      const w = clamp(body.width, 512, 1024, 1024), h = clamp(body.height, 512, 1024, 1024);
      if (!(await takeDaily(env, 'image'))) return json({ error: 'Daily free AI image budget is used up. Try again tomorrow.' }, 503, o);
      try {
        const out = await env.AI.run(IMAGE_MODEL, { prompt: prompt + ', ' + style + ', no text, no watermark', steps: 4 });
        const b64 = out && (out.image || out.result && out.result.image); if (!b64) throw new Error('no image');
        return new Response(b64ToBytes(b64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store', ...cors(o) } });
      } catch (e) { return json({ error: 'Image model error. Try again.', detail: String(e && e.message || e).slice(0, 200) }, 502, o); }
    }
    // /llm
    const system = String(body.system || '').slice(0, 2500), user = String(body.user || '').slice(0, 400);
    if (user.length < 3) return json({ error: 'prompt too short' }, 400, o);
    if (!(await takeDaily(env, 'llm'))) return json({ error: 'Daily free AI text budget is used up. Try again tomorrow.' }, 503, o);
    try {
      const out = await env.AI.run(LLM_MODEL, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 1800, temperature: 0.7 });
      const rsp = out && out.response; return json({ text: typeof rsp === 'string' ? rsp : (rsp != null ? JSON.stringify(rsp) : '') }, 200, o);
    } catch (e) { return json({ error: 'Text model error. Try again.' }, 502, o); }
  }
};
