/* FreeForge Engine: one prompt in, a consistent asset pack out.
   prompt -> style bible (genre, theme, palette, thumbnail style, hero model, motion)
   -> UI kit + 3D hero model + animation + thumbnail/icon specs, all sharing that style
   -> files (Luau, rbxmx, glb, json) packed into a zip. Original code; no third-party assets. */
(function (root) {
  'use strict';
  const GENRES = [
    { id:'horror',    kw:/horror|spooky|haunt|scary|zombie|ghost|dark|halloween|creep|nightmare/, theme:'medieval', thumb:'dark',    pal:'dark',    model:'crate',   anim:'shake',   accent:'#ff5a3d', accent2:'#8c2f39' },
    { id:'mech',      kw:/mech|robot|android|battle bot|titan|factory bot|engineer/, theme:'scifi', thumb:'neon', pal:'neon', model:'robot', anim:'pulse', accent:'#4df2c8', accent2:'#ff7a2f' },
    { id:'scifi',     kw:/sci-?fi|space|robot|cyber|galaxy|alien|laser|mech|futur|neon city|station/, theme:'scifi', thumb:'neon', pal:'neon', model:'crystal', anim:'glow', accent:'#4df2c8', accent2:'#3d8bff' },
    { id:'cute',      kw:/cute|pet|candy|sweet|bakery|cake|kawaii|bunny|cat|dog|rainbow|simulator|garden|pastel/, theme:'candy', thumb:'candy', pal:'candy', model:'pet', anim:'bounce', accent:'#ff5fa8', accent2:'#7a5cff' },
    { id:'pirate',    kw:/pirate|ship|sail|ocean|sea|island|treasure|fish|beach|boat|naval/, theme:'ocean', thumb:'ocean', pal:'ocean', model:'ship', anim:'bounce', accent:'#5ee0ff', accent2:'#ffd24a' },
    { id:'racing',    kw:/rac(e|ing)|car|drift|drive|speedway|kart|vehicle|truck|street/, theme:'neon', thumb:'neon', pal:'neon', model:'car', anim:'slideIn', accent:'#ff3d5a', accent2:'#ffd23d' },
    { id:'combat',    kw:/battle|fight|pvp|arena|war|shield|defen[cs]e|army|survival|royale|shooter/, theme:'medieval', thumb:'dark', pal:'fantasy', model:'shield', anim:'shake', accent:'#e0b04a', accent2:'#c2392e' },
    { id:'nature',    kw:/farm|forest|nature|garden|camp|animal|zoo|jungle|village|cozy|mushroom|harvest/, theme:'forest', thumb:'forest', pal:'forest', model:'mushroom', anim:'popIn', accent:'#9be05a', accent2:'#e6c15a' },
    { id:'fantasy',   kw:/fantasy|medieval|sword|dragon|knight|kingdom|rpg|magic|wizard|castle|quest|dungeon|elf/, theme:'medieval', thumb:'sunburst', pal:'fantasy', model:'sword', anim:'popIn', accent:'#e0b04a', accent2:'#b5532f' },
    { id:'tycoon',    kw:/tycoon|factory|shop|store|cash|money|business|empire|restaurant|city|mine/, theme:'neon', thumb:'sunburst', pal:'fantasy', model:'chest', anim:'slideIn', accent:'#3dff8b', accent2:'#ffd23d' },
    { id:'obby',      kw:/obby|parkour|race|speed|run|tower of|climb|adventure/, theme:'light', thumb:'sunburst', pal:'candy', model:'tower', anim:'pulse', accent:'#2f8bff', accent2:'#ff7a2f' }
  ];
  const FALLBACK = GENRES.find(g => g.id === 'fantasy');
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const safe = s => String(s || 'FreeForge').replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/\s+/g, '_').slice(0, 24) || 'FreeForge';
  const titleCase = s => String(s).replace(/\b\w/g, c => c.toUpperCase());

  // Step 1: style bible. Deterministic keyword plan, optionally upgraded by a free AI theme.
  function plan(prompt, opts) {
    opts = opts || {};
    const p = String(prompt || '').trim().slice(0, 120); if (!p) throw new Error('Describe your game first');
    const low = p.toLowerCase();
    let best = FALLBACK, score = 0;
    GENRES.forEach(g => { const m = low.match(new RegExp('\\b(?:' + g.kw.source + ')', 'g')); const sc = m ? m.length : 0; if (sc > score) { score = sc; best = g; } });
    const seed = hash(low);
    const bible = { prompt: p, name: safe(p), title: titleCase(p).slice(0, 28), genre: best.id, theme: best.theme, themeObj: null, thumbStyle: best.thumb, palette: best.pal, model: best.model, motion: best.anim, accent: best.accent, accent2: best.accent2, seed, aiTheme: false };
    return bible;
  }

  // Merge AI choices (already validated against our menus) over a keyword plan.
  function hue(hx) { const r = parseInt(hx.substr(1, 2), 16) / 255, g = parseInt(hx.substr(3, 2), 16) / 255, bl = parseInt(hx.substr(5, 2), 16) / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn; if (d < 0.12) return null; let h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h = h * 60; return h < 0 ? h + 360 : h; }
  function applyAi(bible, over) {
    over = over || {}; const g = GENRES.find(x => x.id === over.genre);
    const b = Object.assign({}, bible);
    if (g) { b.genre = g.id; b.theme = g.theme; b.thumbStyle = g.thumb; b.palette = g.pal; b.model = g.model; b.motion = g.anim; b.accent = g.accent; b.accent2 = g.accent2; }
    ['model', 'motion', 'accent', 'accent2', 'motions', 'dur', 'ease', 'copy'].forEach(k => { if (over[k]) b[k] = over[k]; });
    if (over.title) { b.title = over.title; b.name = safe(over.title); }
    if (over.accent) { // make thumbnail and 3D palette follow the AI's brand color
      const h = hue(over.accent);
      const pick = h == null ? null : (h >= 165 && h < 255) ? ['ocean', 'ocean'] : (h >= 75 && h < 165) ? ['forest', 'forest'] : (h >= 255 && h < 345) ? ['candy', 'candy'] : null;
      if (pick) { b.thumbStyle = pick[0]; b.palette = pick[1]; }
    }
    b.aiPlanned = true; return b;
  }

  // Step 2: build every asset from the bible. `ai` is optional (AI hero model and/or theme already applied to the bible).
  function build(bible, opts) {
    opts = opts || {}; const F = opts.core || root.FreeForge, G = opts.g3d || root.FreeForge3D, A = opts.anim || root.FreeForgeAnim;
    const kit = F.buildKit({ theme: bible.theme, themeObj: bible.themeObj || undefined, accent: bible.accent, accent2: bible.accent2, name: bible.name + 'UI', copy: bible.copy });
    const model = opts.aiModel || G.buildModel({ model: bible.model, palette: bible.palette, accent: bible.accent });
    const name = bible.name;
    const files = {};
    files['ui/' + name + '_UI.lua'] = F.toLuau(kit);
    files['ui/' + name + '_UI.rbxmx'] = F.toRbxmx(kit);
    files['animation/' + name + '_' + bible.motion + '.lua'] = A.uiLuau(bible.motion, { dur: bible.dur, ease: bible.ease });
    if (bible.motions) Object.keys(bible.motions).forEach(k => { const m = bible.motions[k]; if (A.PRESETS[m]) files['animation/' + name + '_' + k + '_' + m + '.lua'] = A.uiLuau(m, { dur: bible.dur, ease: bible.ease }).replace('-- Generated by FreeForge.', '-- Generated by FreeForge (' + k + ' animation).'); });
    files['model3d/' + name + '_hero.rbxmx'] = G.toRbxmx(model, name + 'Hero');
    files['model3d/' + name + '_hero.lua'] = G.toLuau(model, name + 'Hero');
    const glb = G.toGlb(model, name + 'Hero'); files['model3d/' + name + '_hero.glb'] = glb;
    const thumbSpec = { style: bible.thumbStyle, title: bible.title.toUpperCase(), subtitle: 'NEW UPDATE', seed: bible.seed % 997, model };
    const iconSpec = { model, rarity: bible.accent, yaw: 35 };
    files['STYLE.json'] = JSON.stringify({ prompt: bible.prompt, genre: bible.genre, theme: bible.theme, palette: bible.palette, thumbnailStyle: bible.thumbStyle, heroModel: model.name || bible.model, motion: bible.motion, accent: bible.accent, accent2: bible.accent2, aiTheme: bible.aiTheme }, null, 2);
    files['README.txt'] = 'FreeForge asset pack for "' + bible.prompt + '"\n\nui/        paste the .lua into a LocalScript, or insert the .rbxmx\nanimation/ TweenService animation for the UI\nmodel3d/   hero model as .rbxmx, .lua builder script or .glb\nthumbnail.png and icon.png are added when generated in the browser.\n\nEverything here shares one style (STYLE.json). Made free with FreeForge, nothing was uploaded except an optional typed AI prompt.\n';
    return { bible, kit, model, thumbSpec, iconSpec, files };
  }

  // Step 3: store-only ZIP writer (no dependencies)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = s => typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8'));
  function zip(files) {
    const parts = [], central = []; let off = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    Object.keys(files).forEach(path => {
      const raw = files[path], data = typeof raw === 'string' ? enc(raw) : raw, nm = enc(path), crc = crc32(data);
      const lh = Uint8Array.from([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), 0, 0]);
      parts.push(lh, nm, data);
      central.push(Uint8Array.from([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), nm);
      off += lh.length + nm.length + data.length;
    });
    const cs = central.reduce((a, b) => a + b.length, 0);
    const end = Uint8Array.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(Object.keys(files).length), ...u16(Object.keys(files).length), ...u32(cs), ...u32(off), 0, 0]);
    const all = parts.concat(central, [end]); const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; all.forEach(b => { out.set(b, p); p += b.length; }); return out;
  }
  const api = { GENRES, plan, applyAi, build, zip, crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FreeForgeEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
