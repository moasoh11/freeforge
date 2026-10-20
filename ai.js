/* FreeForge AI: free anonymous LLM (Pollinations text API, open GPT-OSS 20B) -> validated JSON for 3D models and UI themes. */
(function (root) {
  'use strict';
  const ENDPOINT = 'https://text.pollinations.ai/openai';
  const MATS = ['Plastic','Neon','Wood','Metal','Glass'], TYPES = ['box','cyl','ball'];
  const FONTS = ['GothamBold','GothamMedium','FredokaOne','Fantasy','Code','SourceSansBold'];
  const hex = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v.toLowerCase() : d;
  const num = (v, lo, hi, d) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const vec = (a, lo, hi, d) => Array.isArray(a) && a.length === 3 ? a.map((x,i) => num(x, lo, hi, d[i])) : d.slice();

  let lastCall = 0;
  const COOLDOWN_MS = 31000;
  const cooldownLeft = () => Math.max(0, Math.ceil((lastCall + COOLDOWN_MS - Date.now()) / 1000));
  async function ask(system, user, signal) {
    if (cooldownLeft() > 0) throw new Error('The free AI allows one request every 30 seconds. Try again in ' + cooldownLeft() + 's.');
    lastCall = Date.now();
    const r = await fetch(ENDPOINT, { method:'POST', headers:{ 'content-type':'application/json' }, signal,
      body: JSON.stringify({ model:'openai', temperature:0.7, max_tokens:6000, messages:[{ role:'system', content:system }, { role:'user', content:user }] }) });
    if (r.status === 402 || r.status === 429) { const ra = +r.headers.get('retry-after') || 30; lastCall = Date.now() - COOLDOWN_MS + ra * 1000; throw new Error('The free AI is rate limited right now. Try again in ' + ra + 's.'); }
    if (!r.ok) throw new Error('AI service error ' + r.status);
    const j = await r.json(); const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!c) throw new Error('Empty AI answer');
    return c;
  }
  function extractJson(text) {
    let t = String(text).replace(/```json|```/g, '');
    const a = t.indexOf('{'); if (a < 0) throw new Error('No JSON in answer');
    let body = t.slice(a); const b = body.lastIndexOf('}'); if (b > 0) body = body.slice(0, b + 1);
    const tryParse = x => { x = x.replace(/,\s*([}\]])/g, '$1'); return JSON.parse(x); };
    try { return tryParse(body); } catch (e) {}
    // repair a truncated answer: cut back to the last complete object and close the brackets
    let cut = body; for (let i = 0; i < 60; i++) { const k = cut.lastIndexOf('}'); if (k < 0) break; cut = cut.slice(0, k + 1);
      for (const tail of [']}', '}', ']}}']) { try { return tryParse(cut + tail); } catch (e) {} } cut = cut.slice(0, -1); }
    throw new Error('AI answer was not valid JSON');
  }
  const MODEL_SYSTEM = `You design low-poly Roblox models from primitive parts. Reply with ONLY one JSON object, no prose:
{"name":"Short Name","parts":[{"t":"box|cyl|ball","pos":[x,y,z],"size":[x,y,z],"rot":[rx,ry,rz],"color":"#rrggbb","mat":"Plastic|Neon|Wood|Metal|Glass"}]}
Rules: units are studs, Y is up, the model sits on y=0 and is centered on x=0,z=0, overall height 2 to 16. Use 8 to 36 parts. "cyl" is a cylinder standing upright (size = [diameter, height, diameter]). "ball" size = [d,d,d]. rot is degrees (use [0,0,0] unless needed). Use a coherent color palette (3-5 colors), Neon only for glowing details. Make the silhouette recognisable. Build in layers from the ground up: a part's pos y must equal its base height plus half its size y, so parts touch instead of floating. Add details (windows, trim, spots, handles) as small extra parts, and mirror them left/right.
Example mushroom: {"name":"Mushroom","parts":[{"t":"cyl","pos":[0,1.5,0],"size":[1.6,3,1.6],"color":"#f3e9d2","mat":"Plastic","rot":[0,0,0]},{"t":"ball","pos":[0,3.4,0],"size":[5,3.2,5],"color":"#d9363e","mat":"Plastic","rot":[0,0,0]},{"t":"ball","pos":[1.4,4.4,0.8],"size":[0.8,0.5,0.8],"color":"#ffffff","mat":"Plastic","rot":[0,0,0]},{"t":"ball","pos":[-1.2,4.5,-1],"size":[0.7,0.5,0.7],"color":"#ffffff","mat":"Plastic","rot":[0,0,0]}]}\nExample sword: {"name":"Sword","parts":[{"t":"box","pos":[0,5,0],"size":[0.5,6,0.12],"color":"#c9ced6","mat":"Metal","rot":[0,0,0]},{"t":"box","pos":[0,2,0],"size":[2.2,0.3,0.4],"color":"#d9a441","mat":"Metal","rot":[0,0,0]},{"t":"cyl","pos":[0,1,0],"size":[0.35,1.6,0.35],"color":"#8a5a2b","mat":"Wood","rot":[0,0,0]}]}`;
  function sanitizeModel(j) {
    const parts = (j && (j.parts || j.prims)) || []; if (!Array.isArray(parts) || !parts.length) throw new Error('AI returned no parts');
    const prims = parts.slice(0, 48).map(p => ({ t: TYPES.includes(p.t) ? p.t : 'box', pos: vec(p.pos, -30, 30, [0,1,0]), size: vec(p.size, 0.1, 30, [1,1,1]), rot: vec(p.rot, -360, 360, [0,0,0]),
      color: hex(p.color, '#c9ced6'), mat: MATS.includes(p.mat) ? p.mat : 'Plastic' }));
    return { name: String(j.name || 'AI Model').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 32) || 'AI Model', prims, spin: true, bob: false };
  }
  async function generateModel(prompt, signal) {
    const p = String(prompt || '').slice(0, 200).trim(); if (!p) throw new Error('Describe what to build');
    return sanitizeModel(extractJson(await ask(MODEL_SYSTEM, 'Build: ' + p, signal)));
  }
  const THEME_SYSTEM = `You design game UI color themes. Reply with ONLY one JSON object, no prose:
{"name":"Theme Name","bg":"#hex","panel":"#hex","panel2":"#hex","accent":"#hex","accent2":"#hex","text":"#hex","muted":"#hex","good":"#hex","bad":"#hex","radius":0-24,"stroke":1-4,"font":"GothamBold|GothamMedium|FredokaOne|Fantasy|Code"}
Rules: panel is a dark or light surface, panel2 slightly different, text must have strong contrast on panel, accent is the signature color, good is green-ish, bad is red-ish.`;
  function sanitizeTheme(j) {
    return { name: String(j.name || 'AI Theme').replace(/[^A-Za-z0-9 ]/g,'').slice(0,24) || 'AI Theme', bg: hex(j.bg,'#12121c'), panel: hex(j.panel,'#1b1b2b'), panel2: hex(j.panel2,'#26263d'),
      accent: hex(j.accent,'#00e5ff'), accent2: hex(j.accent2,'#ff3df2'), text: hex(j.text,'#f2f4ff'), muted: hex(j.muted,'#8f93b8'), good: hex(j.good,'#3dff8b'), bad: hex(j.bad,'#ff4d6d'),
      radius: num(j.radius,0,24,10), stroke: num(j.stroke,1,4,2), font: FONTS.includes(j.font) ? j.font : 'GothamBold', gradient: true };
  }
  async function generateTheme(prompt, signal) {
    const p = String(prompt || '').slice(0, 200).trim(); if (!p) throw new Error('Describe the game style');
    return sanitizeTheme(extractJson(await ask(THEME_SYSTEM, 'Game style: ' + p, signal)));
  }
  const api = { ask, extractJson, sanitizeModel, sanitizeTheme, generateModel, generateTheme, cooldownLeft, ENDPOINT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FreeForgeAI = api;
})(typeof window !== 'undefined' ? window : globalThis);
