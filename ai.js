/* FreeForge AI: free anonymous LLM (Pollinations text API, open GPT-OSS 20B) -> validated JSON for 3D models and UI themes. */
(function (root) {
  'use strict';
  const ENDPOINT = 'https://text.pollinations.ai/openai';
  let WORKER_URL = 'https://freeforge-ai.moasoh-freeforge.workers.dev'; // set after the Cloudflare Worker is deployed; enables parallel multi-pass

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
    const r = await fetch(ENDPOINT, { method:'POST', headers:{ 'content-type':'application/json' }, signal: signal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(90000) : undefined),
      body: JSON.stringify({ model:'openai', temperature:0.7, max_tokens:6000, reasoning_effort:'low', messages:[{ role:'system', content:system + '\nThink very briefly. Output the JSON immediately.' }, { role:'user', content:user }] }) });
    if (r.status === 402 || r.status === 429) { const ra = +r.headers.get('retry-after') || 30; lastCall = Date.now() - COOLDOWN_MS + ra * 1000; throw new Error('The free AI is rate limited right now. Try again in ' + ra + 's.'); }
    if (!r.ok) throw new Error('AI service error ' + r.status);
    const j = await r.json(); const m0 = j.choices && j.choices[0] && j.choices[0].message; const c = m0 && (m0.content || (m0.reasoning && m0.reasoning.indexOf('{') >= 0 ? m0.reasoning : ''));
    if (!c) throw new Error('Empty AI answer');
    return c;
  }
  async function askProxy(system, user, signal) {
    const r = await fetch(WORKER_URL + '/llm', { method:'POST', headers:{ 'content-type':'application/json' }, signal: signal || AbortSignal.timeout(60000), body: JSON.stringify({ system, user: String(user).slice(0, 400) }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) {} throw new Error(m || 'AI proxy error ' + r.status); }
    const j = await r.json(); if (!j.text) throw new Error('Empty AI answer'); return j.text;
  }
  async function generateImage(prompt, style, signal) {
    const p = String(prompt || '').trim().slice(0, 200); if (p.length < 3) throw new Error('Describe the picture first');
    if (!WORKER_URL) throw new Error('AI images are not available right now');
    const r = await fetch(WORKER_URL + '/image', { method:'POST', headers:{ 'content-type':'application/json' }, signal: signal || AbortSignal.timeout(60000), body: JSON.stringify({ prompt: p, style: style || 'thumbnail' }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) {} throw new Error(m || 'AI image error ' + r.status); }
    const url = URL.createObjectURL(await r.blob());
    return await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Bad image')); im.src = url; });
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
    // ---- multi-pass: plan -> build each section -> assemble ----
  const PLAN_SYSTEM = `You are a 3D modeler planning a low-poly Roblox model made of primitive parts. Reply with ONLY one JSON object, no prose:
{"name":"Short Name","palette":["#hex","#hex","#hex","#hex"],"sections":[{"name":"blade","detail":"what this section looks like and which parts it needs","center":[x,y,z],"size":[w,h,d]}]}
Rules: studs, Y up, the whole model sits on y=0, centered on x=0 and z=0, total height 3 to 16. Use 3 to 6 sections that together cover the whole object with no big gaps; "center" is the middle of the section's box and "size" is its box. Sections may overlap slightly so they connect.`;
  const SECTION_SYSTEM = `You build ONE section of a low-poly Roblox model from primitive parts. Reply with ONLY one JSON object, no prose:
{"parts":[{"t":"box|cyl|ball","pos":[x,y,z],"size":[x,y,z],"rot":[rx,ry,rz],"color":"#rrggbb","mat":"Plastic|Neon|Wood|Metal|Glass"}]}
Rules: coordinates are LOCAL to the section: (0,0,0) is the middle of the section box, and every part must stay inside the box you are given. "cyl" is upright (size = [diameter, height, diameter]), "ball" size = [d,d,d], rot in degrees. Use 5 to 14 parts with real detail (trim, edges, handles, windows, studs, bevels made from thin rotated boxes). Use only the given palette colors (Neon only for glowing bits). Parts must touch their neighbours.`;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function waitCooldown(onStatus) { let l; while ((l = cooldownLeft()) > 0) { if (onStatus) onStatus('waiting ' + l + 's for the free AI rate limit'); await sleep(Math.min(l, 5) * 1000 + 200); } }
  async function generateModelMulti(prompt, opts) {
    opts = opts || {}; const onStatus = opts.onStatus || (() => {}), signal = opts.signal;
    const p = String(prompt || '').slice(0, 200).trim(); if (!p) throw new Error('Describe what to build');
    const par = !!(WORKER_URL && opts.fast); if (!par) await waitCooldown(onStatus); onStatus('planning');
    const plan = extractJson(await (par ? askProxy : ask)(PLAN_SYSTEM, 'Object: ' + p, signal));
    const palette = (Array.isArray(plan.palette) ? plan.palette : []).map(c => hex(c, null)).filter(Boolean).slice(0, 6);
    const secs = (Array.isArray(plan.sections) ? plan.sections : []).slice(0, 6).map(sx => ({ name: String(sx.name || 'part').slice(0, 24), detail: String(sx.detail || '').slice(0, 160), center: vec(sx.center, -20, 20, [0, 4, 0]), size: vec(sx.size, 0.5, 24, [4, 4, 4]) }));
    if (!secs.length) throw new Error('AI plan had no sections');
    const secPrompt = sec => `Whole object: ${p}\nPalette: ${palette.join(', ') || 'your choice'}\nSection: ${sec.name}. ${sec.detail}\nSection box size: ${sec.size.join(' x ')} (local coords from -${(sec.size[0]/2).toFixed(1)} to ${(sec.size[0]/2).toFixed(1)} in x, same idea for y and z).`;
    const answers = par ? secs.map(sec => { onStatus('building all ' + secs.length + ' sections in parallel'); return askProxy(SECTION_SYSTEM, secPrompt(sec), signal).catch(() => askProxy(SECTION_SYSTEM, secPrompt(sec), signal)); }) : null;
    if (par) answers.forEach(a => a.catch(() => {}));
    const prims = [];
    for (let i = 0; i < secs.length; i++) {
      const sec = secs[i]; if (!par) await waitCooldown(onStatus); onStatus('building ' + sec.name + ' (' + (i + 1) + '/' + secs.length + ')');
      let j; try { j = extractJson(par ? await answers[i] : await ask(SECTION_SYSTEM, secPrompt(sec)));
      } catch (e) { if (!par && /rate limited/.test(e.message)) { await waitCooldown(onStatus); i--; } continue; }
      const raw = (Array.isArray(j.parts) ? j.parts : []).slice(0, 16).map(q => ({ t: TYPES.includes(q.t) ? q.t : 'box', pos: vec(q.pos, -30, 30, [0, 0, 0]), size: vec(q.size, 0.05, 30, [1, 1, 1]), rot: vec(q.rot, -360, 360, [0, 0, 0]), color: hex(q.color, palette[0] || '#c9ced6'), mat: MATS.includes(q.mat) ? q.mat : 'Plastic' }));
      if (!raw.length) { if (!sec.retried) { sec.retried = 1; i--; } continue; }
      // auto-fit: scale the section's parts uniformly so their bounding box fills the planned box
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      raw.forEach(q => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q.pos[k] - q.size[k] / 2); hi[k] = Math.max(hi[k], q.pos[k] + q.size[k] / 2); } });
      let f = 1e9; for (let k = 0; k < 3; k++) { const ext = Math.max(hi[k] - lo[k], 0.05); f = Math.min(f, sec.size[k] / ext); }
      f = Math.max(0.2, Math.min(f, 40));
      const mid = [0, 1, 2].map(k => (lo[k] + hi[k]) / 2);
      raw.forEach(q => { prims.push({ t: q.t, pos: [0, 1, 2].map(k => (q.pos[k] - mid[k]) * f + sec.center[k]), size: q.size.map(v => Math.max(0.1, v * f)), rot: q.rot, color: q.color, mat: q.mat }); });
    }
    if (!prims.length) throw new Error('AI built no parts');
    // normalise overall scale so the object's longest side is about 8 studs
    { const lo = [1e9,1e9,1e9], hi = [-1e9,-1e9,-1e9]; prims.forEach(q => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q.pos[k]-q.size[k]/2); hi[k] = Math.max(hi[k], q.pos[k]+q.size[k]/2); } });
      const ext = Math.max(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2], 0.1), g = Math.max(0.25, Math.min(8 / ext, 20));
      prims.forEach(q => { for (let k = 0; k < 3; k++) { q.pos[k] = (q.pos[k] - (lo[k]+hi[k])/2) * g; q.size[k] = Math.max(0.2, q.size[k] * g); } }); }
    // drop the model onto y=0 and center it
    let minY = 1e9; prims.forEach(q => { minY = Math.min(minY, q.pos[1] - q.size[1] / 2); }); prims.forEach(q => { q.pos[1] -= minY; });
    return { name: String(plan.name || 'AI Model').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 32) || 'AI Model', prims: prims.slice(0, 120), spin: true, bob: false, passes: secs.length + 1 };
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
  const api = { ask, extractJson, sanitizeModel, sanitizeTheme, generateModel, generateTheme, generateModelMulti, generateImage, setWorker: u => { WORKER_URL = String(u || '').replace(/\/$/, ''); }, cooldownLeft, ENDPOINT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FreeForgeAI = api;
})(typeof window !== 'undefined' ? window : globalThis);
