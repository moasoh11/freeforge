/* FreeForge core: theme + component tree -> HTML preview / .rbxmx / Luau. No deps. */
(function (root) {
  'use strict';
  const THEMES = {
    neon:    { name:'Neon Night', bg:'#12121c', panel:'#1b1b2b', panel2:'#26263d', accent:'#00e5ff', accent2:'#ff3df2', text:'#f2f4ff', muted:'#8f93b8', good:'#3dff8b', bad:'#ff4d6d', radius:10, stroke:2, font:'GothamBold', gradient:true },
    candy:   { name:'Candy Pop', bg:'#ffe6f2', panel:'#fff7fb', panel2:'#ffd1e8', accent:'#ff5fa8', accent2:'#7a5cff', text:'#43203a', muted:'#a0708f', good:'#2fc77a', bad:'#ff4466', radius:18, stroke:3, font:'FredokaOne', gradient:true },
    medieval:{ name:'Medieval', bg:'#2b1d12', panel:'#3d2a1a', panel2:'#4f3622', accent:'#e0b04a', accent2:'#b5532f', text:'#f6e8c8', muted:'#b79b72', good:'#7fbf4a', bad:'#c2392e', radius:4, stroke:3, font:'Fantasy', gradient:false },
    scifi:   { name:'Sci-Fi', bg:'#06121a', panel:'#0b1f2c', panel2:'#10303f', accent:'#4df2c8', accent2:'#3d8bff', text:'#dffcff', muted:'#6aa5b3', good:'#4df28a', bad:'#ff5a5a', radius:2, stroke:2, font:'Code', gradient:true },
    ocean:   { name:'Ocean', bg:'#06223d', panel:'#0c3558', panel2:'#124a78', accent:'#5ee0ff', accent2:'#ffd24a', text:'#eafaff', muted:'#79a9c4', good:'#4de08a', bad:'#ff6b5a', radius:12, stroke:2, font:'FredokaOne', gradient:true },
    forest:  { name:'Forest', bg:'#10281a', panel:'#1a3a26', panel2:'#255234', accent:'#9be05a', accent2:'#e6c15a', text:'#f0f7e0', muted:'#8fb08a', good:'#7be05a', bad:'#d9533f', radius:14, stroke:3, font:'Cartoon', gradient:false },
    light:   { name:'Clean Light', bg:'#eef1f6', panel:'#ffffff', panel2:'#e4e9f2', accent:'#3b6cff', accent2:'#00b894', text:'#1c2333', muted:'#7a849b', good:'#1fa865', bad:'#e5484d', radius:12, stroke:1, font:'GothamMedium', gradient:false }
  };
  const FONT_ENUM_NUM = { SourceSans:3, SourceSansBold:4, Arial:1, ArialBold:2 }; // numeric ids we are sure of
  const FONT_FALLBACK = { GothamBold:'SourceSansBold', GothamMedium:'SourceSansBold', FredokaOne:'SourceSansBold', Fantasy:'SourceSansBold', Code:'SourceSans' };
  const CSS_FONT = { GothamBold:'Montserrat,Arial,sans-serif', GothamMedium:'Montserrat,Arial,sans-serif', FredokaOne:'"Comic Sans MS","Arial Rounded MT Bold",sans-serif', Fantasy:'Georgia,serif', Code:'"Courier New",monospace', SourceSans:'Arial,sans-serif', SourceSansBold:'Arial,sans-serif' };

  const U = (xs, xo, ys, yo) => ({ xs, xo, ys, yo });
  const N = (cls, props, children) => ({ cls, props: props || {}, children: children || [] });
  const hex2rgb = h => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.substr(i,2),16)/255); };
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
  const safeName = s => String(s).replace(/[^A-Za-z0-9_ ]/g,'').slice(0,48) || 'Item';

  // ---- styling helpers ----
  const mix = (h1,h2,k) => { const a=hex2rgb(h1), b=hex2rgb(h2); return '#'+a.map((x,i)=>Math.round((x+(b[i]-x)*k)*255).toString(16).padStart(2,'0')).join(''); };
  const lighten = (h,k) => mix(h,'#ffffff',k), darken = (h,k) => mix(h,'#000000',k);
  function deco(t, o) {
    o = o || {};
    const kids = [N('UICorner', { CornerRadius: { s:0, o: o.radius != null ? o.radius : t.radius } })];
    if (o.stroke !== false) kids.push(N('UIStroke', { Color: o.strokeColor || t.accent, Thickness: o.strokeThickness || t.stroke, ApplyStrokeMode: 1 }));
    if (o.gradient) kids.push(N('UIGradient', { c0: o.gradient[0], c1: o.gradient[1], Rotation: 90 }));
    return kids;
  }
  function frame(t, name, size, pos, bg, extra, kids, dopts) {
    return N('Frame', Object.assign({ Name:name, Size:size, Position:pos||U(0,0,0,0), BackgroundColor3:bg, BorderSizePixel:0 }, extra||{}),
      deco(t, dopts).concat(kids||[]));
  }
  function shadowOf(t, node, off) {
    off = off || 6; const p = node.props.Position;
    return N('Frame', { Name:node.props.Name+'Shadow', Size:node.props.Size, Position:U(p.xs,p.xo,p.ys,p.yo+off), BackgroundColor3:'#000000', BackgroundTransparency:0.55, BorderSizePixel:0 },
      [N('UICorner',{ CornerRadius:{ s:0, o:t.radius+2 } })]);
  }
  function label(t, name, text, size, pos, o) {
    o = o || {};
    return N('TextLabel', Object.assign({ Name:name, Text:text, Size:size, Position:pos||U(0,0,0,0), BackgroundTransparency:1,
      TextColor3:o.color||t.text, Font:o.font||t.font, TextSize:o.textSize||18, TextXAlignment:o.align||'Center', TextYAlignment:'Center', BorderSizePixel:0 }, o.extra||{}));
  }
  function button(t, name, text, size, pos, kind) {
    kind = kind || 'primary';
    const bg = kind==='primary' ? t.accent : kind==='danger' ? t.bad : kind==='good' ? t.good : t.panel2;
    const fg = (kind==='secondary') ? t.text : darken(bg,0.78);
    const kids = deco(t, { stroke:true, strokeColor: kind==='secondary' ? t.accent : darken(bg,0.35), strokeThickness:2, gradient:[lighten(bg,0.28), darken(bg,0.18)] });
    kids.push(N('Frame',{ Name:'Gloss', Size:U(1,-8,0.45,0), Position:U(0,4,0,3), BackgroundColor3:'#ffffff', BackgroundTransparency:0.84, BorderSizePixel:0, ZIndex:0 },[N('UICorner',{ CornerRadius:{ s:0, o:Math.max(2,t.radius-2) } })]));
    return N('TextButton', { Name:name, Text:text, Size:size, Position:pos||U(0,0,0,0), BackgroundColor3:bg, TextColor3:fg, Font:t.font, TextSize:18, AutoButtonColor:true, BorderSizePixel:0 }, kids);
  }
  function bar(t, name, pct, color, size, pos, text, icon) {
    return frame(t, name, size, pos, darken(t.panel2,0.4), {}, [
      frame(t, 'Fill', U(clamp(pct,0,1),0,1,0), U(0,0,0,0), color, {}, [
        N('Frame',{ Name:'Gloss', Size:U(1,-6,0.4,0), Position:U(0,3,0,2), BackgroundColor3:'#ffffff', BackgroundTransparency:0.8, BorderSizePixel:0 },[N('UICorner',{ CornerRadius:{ s:0, o:4 } })])
      ], { stroke:false, gradient:[lighten(color,0.35), darken(color,0.2)] }),
      label(t, 'Value', text||'', U(1,0,1,0), U(0,0,0,0), { textSize:14, extra:{ ZIndex:2 } })
    ], { strokeThickness:1, strokeColor:darken(t.accent,0.2) });
  }
  const list = (dir, pad, align) => N('UIListLayout', { FillDirection: dir, Padding:{ s:0, o:pad }, SortOrder:2, HorizontalAlignment: align==null?0:align });
  const pad = p => N('UIPadding', { PaddingTop:{s:0,o:p}, PaddingBottom:{s:0,o:p}, PaddingLeft:{s:0,o:p}, PaddingRight:{s:0,o:p} });
  // panel with header bar, title, optional close, gradient body
  function panel(t, name, size, pos, title, body, closable) {
    const kids = [
      N('Frame',{ Name:'Header', Size:U(1,0,0,48), Position:U(0,0,0,0), BackgroundColor3:t.accent, BorderSizePixel:0 },[
        N('UICorner',{ CornerRadius:{ s:0, o:t.radius } }),
        N('UIGradient',{ c0:lighten(t.accent,0.2), c1:darken(t.accent,0.35), Rotation:0 }),
        N('Frame',{ Name:'HeaderFill', Size:U(1,0,0,t.radius+2), Position:U(0,0,1,-(t.radius+2)), BackgroundColor3:darken(t.accent,0.2), BorderSizePixel:0 },[
          N('UIGradient',{ c0:lighten(t.accent,0.2), c1:darken(t.accent,0.35), Rotation:0 }) ])
      ]),
      label(t,'Title',title,U(1,-80,0,48),U(0,18,0,0),{ align:'Left', textSize:24, color:darken(t.accent,0.85) })
    ];
    if (closable) kids.push(button(t,'CloseButton','X',U(0,32,0,32),U(1,-42,0,8),'danger'));
    kids.push.apply(kids, body);
    const f = frame(t, name, size, pos, t.panel, { ClipsDescendants:false }, kids, { strokeThickness:t.stroke+1, strokeColor:t.accent, gradient:[lighten(t.panel,0.06), darken(t.panel,0.18)] });
    return [shadowOf(t, f, 8), f];
  }

  // ---- components ----
  const RARITY = ['#9aa3b5','#4ade80','#38bdf8','#c084fc','#fbbf24'];
  const COMPONENTS = {
    hud: { name:'HUD (health, stamina, coins)', build(t, o) {
      const f = frame(t,'HUD',U(0,330,0,124),U(0,16,1,-140),t.panel,{ BackgroundTransparency:0.05 },[
        frame(t,'Avatar',U(0,52,0,52),U(0,12,0,12),t.panel2,{},[label(t,'Face','\u263A',U(1,0,1,0),null,{ textSize:30 })],{ radius:26, strokeThickness:3 }),
        label(t,'Name','Player',U(0,200,0,20),U(0,74,0,10),{ align:'Left', textSize:16, color:t.muted }),
        label(t,'Level','Lv 12',U(0,60,0,20),U(1,-72,0,10),{ align:'Right', textSize:16, color:t.accent }),
        bar(t,'HealthBar',0.82,t.bad,U(1,-86,0,24),U(0,74,0,34),'\u2665 82 / 100'),
        bar(t,'StaminaBar',0.55,t.good,U(1,-86,0,16),U(0,74,0,64),'\u26A1'),
        label(t,'Coins','\u25CF 1,250',U(1,-24,0,28),U(0,12,0,88),{ align:'Left', color:'#fbbf24', textSize:20 })
      ],{ gradient:[lighten(t.panel,0.05), darken(t.panel,0.2)], strokeThickness:t.stroke+1 });
      return [shadowOf(t,f,5), f];
    }},
    inventory: { name:'Inventory grid', build(t, o) {
      const cols = clamp(o.cols||5,2,8), rows = clamp(o.rows||4,1,8), cell = 68, gap = 8;
      const w = cols*cell+(cols-1)*gap+32, h = rows*cell+(rows-1)*gap+32+56+40;
      const items = [['\u2694',3,'3'],['\u271A',1,'12'],['\u2605',2,''],['\u26E8',4,''],['\u25C6',3,'5'],['\u2709',0,'']];
      const slots = [];
      for (let i=1;i<=cols*rows;i++) {
        const it = items[i-1], rc = it ? RARITY[it[1]] : t.muted;
        const k = [];
        if (it) { k.push(label(t,'Icon',it[0],U(1,0,1,0),null,{ textSize:30 })); if (it[2]) k.push(label(t,'Qty',it[2],U(0,26,0,16),U(1,-30,1,-18),{ align:'Right', textSize:13, color:t.text, font:t.font })); 
          k.push(N('Frame',{ Name:'Rarity', Size:U(1,-12,0,4), Position:U(0,6,1,-8), BackgroundColor3:rc, BorderSizePixel:0 },[N('UICorner',{ CornerRadius:{ s:0, o:2 } })])); }
        slots.push(N('TextButton',{ Name:'Slot'+i, Text:'', Size:U(0,cell,0,cell), BackgroundColor3:darken(t.panel2,0.25), Font:t.font, TextSize:13, LayoutOrder:i, BorderSizePixel:0 },
          deco(t,{ strokeThickness:2, strokeColor: it?rc:darken(t.muted,0.4), radius:Math.max(3,t.radius-3), gradient:[lighten(t.panel2,0.04), darken(t.panel2,0.4)] }).concat(k)));
      }
      return panel(t,'Inventory',U(0,w,0,h),U(0.5,-w/2,0.5,-h/2),'Inventory',[
        N('Frame',{ Name:'Grid', Size:U(1,-32,1,-110), Position:U(0,16,0,64), BackgroundTransparency:1, BorderSizePixel:0 },
          [N('UIGridLayout',{ CellSize:U(0,cell,0,cell), CellPadding:U(0,gap,0,gap), SortOrder:2 })].concat(slots)),
        label(t,'Capacity','6 / '+(cols*rows)+' slots',U(0.5,0,0,24),U(0,16,1,-38),{ align:'Left', textSize:15, color:t.muted }),
        button(t,'SortButton','Sort',U(0,90,0,30),U(1,-106,1,-40),'secondary')
      ], true);
    }},
    shop: { name:'Shop list', build(t, o) {
      const items = [['\u27A4','Speed Boost',250,1],['\u2B06','Double Jump',500,2],['\u25CF','Pet Egg',1200,3],['\u2655','VIP Pass',5000,4]];
      const rows = items.map((it,i)=> frame(t,'Item'+(i+1),U(1,0,0,62),U(0,0,0,0),darken(t.panel2,0.1),{ LayoutOrder:i+1 },[
        frame(t,'IconBox',U(0,46,0,46),U(0,8,0.5,-23),darken(t.panel2,0.35),{},[label(t,'Icon',it[0],U(1,0,1,0),null,{ textSize:26 })],{ strokeThickness:2, strokeColor:RARITY[it[3]], radius:Math.max(3,t.radius-3) }),
        label(t,'ItemName',it[1],U(0.45,0,0,24),U(0,64,0,10),{ align:'Left', textSize:18 }),
        label(t,'Price','\u25CF '+it[2],U(0.45,0,0,20),U(0,64,0,34),{ align:'Left', color:'#fbbf24', textSize:15 }),
        button(t,'Buy','Buy',U(0,84,0,36),U(1,-96,0.5,-18),'good')
      ],{ strokeThickness:1, strokeColor:darken(t.muted,0.3), gradient:[lighten(t.panel2,0.03), darken(t.panel2,0.25)] }));
      const h = 64+16+items.length*70;
      return panel(t,'Shop',U(0,470,0,h),U(0.5,-235,0.5,-h/2),'Shop',[
        N('Frame',{ Name:'List', Size:U(1,-32,1,-72), Position:U(0,16,0,64), BackgroundTransparency:1, BorderSizePixel:0 }, [list(1,8)].concat(rows))
      ], true);
    }},
    buttons: { name:'Button pack', build(t, o) {
      const btns = [button(t,'Play','\u25B6  PLAY',U(1,-24,0,46),null,'primary'), button(t,'Shop','SHOP',U(1,-24,0,46),null,'good'), button(t,'Settings','SETTINGS',U(1,-24,0,46),null,'secondary'), button(t,'Quit','QUIT',U(1,-24,0,46),null,'danger')];
      btns.forEach((n,i)=>{ n.props.LayoutOrder=i; });
      const f = frame(t,'Buttons',U(0,220,0,252),U(0,16,0,16),t.panel,{},[
        N('UIPadding',{ PaddingTop:{s:0,o:14}, PaddingBottom:{s:0,o:14}, PaddingLeft:{s:0,o:12}, PaddingRight:{s:0,o:12} }), list(1,10,1)
      ].concat(btns),{ gradient:[lighten(t.panel,0.06), darken(t.panel,0.2)], strokeThickness:t.stroke+1 });
      return [shadowOf(t,f,6), f];
    }},
    quest: { name:'Quest / dialog', build(t, o) {
      const f = frame(t,'Dialog',U(0,430,0,210),U(1,-446,1,-226),t.panel,{},[
        frame(t,'Portrait',U(0,64,0,64),U(0,14,0,14),t.panel2,{},[label(t,'Face','\u2726',U(1,0,1,0),null,{ textSize:38 })],{ radius:12, strokeThickness:3 }),
        label(t,'Speaker','Old Guide',U(1,-100,0,26),U(0,90,0,14),{ align:'Left', textSize:22, color:t.accent }),
        label(t,'Tag','QUEST  \u2022  Easy',U(1,-100,0,18),U(0,90,0,40),{ align:'Left', textSize:13, color:t.muted }),
        label(t,'Message','Bring me 5 glowing crystals from the cave and I will reward you.',U(1,-32,0,56),U(0,16,0,86),{ align:'Left', textSize:17, extra:{ TextWrapped:true, TextYAlignment:'Top' } }),
        button(t,'Accept','Accept',U(0,124,0,40),U(1,-268,1,-54),'good'),
        button(t,'Decline','Decline',U(0,124,0,40),U(1,-140,1,-54),'secondary')
      ],{ gradient:[lighten(t.panel,0.06), darken(t.panel,0.2)], strokeThickness:t.stroke+1 });
      return [shadowOf(t,f,8), f];
    }}
  };

  const RESPONSIVE_SRC = [
    '-- FreeForge: scales every panel to the screen (design baseline 1920x1080, clamped for phones and tablets).',
    'local gui = script.Parent',
    'local camera = workspace.CurrentCamera',
    'local function update()',
    '\tlocal s = math.clamp(camera.ViewportSize.Y / 1080, 0.55, 1.4)',
    '\tfor _, child in ipairs(gui:GetChildren()) do',
    '\t\tlocal u = child:FindFirstChildOfClass("UIScale")',
    '\t\tif u then u.Scale = s end',
    '\tend',
    'end',
    'update()',
    'camera:GetPropertyChangedSignal("ViewportSize"):Connect(update)',
    ''].join('\n');
  function buildKit(opts) {
    opts = opts || {};
    const base = (opts.themeObj && typeof opts.themeObj === 'object') ? opts.themeObj : (THEMES[opts.theme] || THEMES.neon);
    const t = Object.assign({}, base);
    if (opts.accent && /^#[0-9a-fA-F]{6}$/.test(opts.accent)) t.accent = opts.accent;
    if (opts.accent2 && /^#[0-9a-fA-F]{6}$/.test(opts.accent2)) t.accent2 = opts.accent2;
    if (opts.radius != null) t.radius = clamp(+opts.radius||0,0,40);
    const comps = (opts.components && opts.components.length) ? opts.components : Object.keys(COMPONENTS);
    const kids = [].concat.apply([], comps.filter(k=>COMPONENTS[k]).map(k => COMPONENTS[k].build(t, opts)));
    // Responsive: proper AnchorPoints + UIScale per top-level element, driven by a LocalScript (DevForum: design mobile-first, anchor to edges, scale to viewport)
    kids.forEach(k => {
      const p = k.props, sz = p.Size, po = p.Position; if (!sz || !po) return;
      const ax = po.xs === 1 ? 1 : po.xs === 0.5 ? 0.5 : 0, ay = po.ys === 1 ? 1 : po.ys === 0.5 ? 0.5 : 0;
      p.AnchorPoint = { x: ax, y: ay };
      p.Position = U(po.xs, po.xo + ax * sz.xo, po.ys, po.yo + ay * sz.yo);
      k.children.push(N('UIScale', { Scale: 1 }));
    });
    kids.push(N('LocalScript', { Name:'ResponsiveScale', Source: RESPONSIVE_SRC }));
    return N('ScreenGui', { Name: safeName(opts.name||'FreeForgeUI'), ResetOnSpawn:false, ZIndexBehavior:1 }, kids);
  }

  // ---- RBXMX ----
  let ref;
  function propXml(cls, k, v) {
    const n = esc(k);
    if (k==='Size'||k==='Position'||k==='CellSize'||k==='CellPadding') return `<UDim2 name="${n}"><XS>${v.xs}</XS><XO>${v.xo}</XO><YS>${v.ys}</YS><YO>${v.yo}</YO></UDim2>`;
    if (k==='CornerRadius'||k==='Padding'||k.indexOf('Padding')===0) return `<UDim name="${n}"><S>${v.s}</S><O>${v.o}</O></UDim>`;
    if (/Color3$/.test(k) || (k==='Color' && typeof v==='string')) { const c = hex2rgb(v); return `<Color3 name="${n}"><R>${c[0]}</R><G>${c[1]}</G><B>${c[2]}</B></Color3>`; }
    if (k==='AnchorPoint') return `<Vector2 name="AnchorPoint"><X>${v.x}</X><Y>${v.y}</Y></Vector2>`;
    if (k==='Source') return `<ProtectedString name="Source"><![CDATA[${v}]]></ProtectedString>`;
    if (k==='Font') { const f = FONT_ENUM_NUM[v]!=null ? v : (FONT_FALLBACK[v]||'SourceSansBold'); return `<token name="Font">${FONT_ENUM_NUM[f]}</token>`; }
    if (k==='TextXAlignment') return `<token name="${n}">${{Left:0,Right:1,Center:2}[v]}</token>`;
    if (k==='TextYAlignment') return `<token name="${n}">${{Top:0,Center:1,Bottom:2}[v]}</token>`;
    if (k==='FillDirection'||k==='SortOrder'||k==='ApplyStrokeMode'||k==='HorizontalAlignment'||k==='ZIndexBehavior') return `<token name="${n}">${v}</token>`;
    if (typeof v==='boolean') return `<bool name="${n}">${v}</bool>`;
    if (typeof v==='string') return `<string name="${n}">${esc(v)}</string>`;
    if (k==='BorderSizePixel'||k==='ZIndex'||k==='LayoutOrder'||k==='TextSize') return `<int name="${n}">${Math.round(v)}</int>`;
    return `<float name="${n}">${v}</float>`;
  }
  function itemXml(node) {
    let props = '';
    const p = node.props;
    if (node.cls==='UIGradient') {
      const a=hex2rgb(p.c0), b=hex2rgb(p.c1);
      props += `<ColorSequence name="Color">0 ${a.join(' ')} 0 1 ${b.join(' ')} 0 </ColorSequence>`;
      props += `<float name="Rotation">${p.Rotation||0}</float>`;
    } else {
      // Name first, stable order
      if (p.Name!=null) props += propXml(node.cls,'Name',p.Name);
      Object.keys(p).forEach(k => { if (k!=='Name' && p[k]!==undefined && p[k]!==null) props += propXml(node.cls,k,p[k]); });
    }
    const id = 'RBX'+(++ref);
    return `<Item class="${node.cls}" referent="${id}"><Properties>${props}</Properties>${node.children.map(itemXml).join('')}</Item>`;
  }
  function toRbxmx(tree) { ref = 0; return `<roblox version="4"><Meta name="ExplicitAutoJoints">true</Meta>${itemXml(tree)}</roblox>`; }

  // ---- Luau ----
  const lz = n => Number(n.toFixed ? (+n).toFixed(4) : n);
  function luaVal(k, v, theme) {
    if (k==='Size'||k==='Position'||k==='CellSize'||k==='CellPadding') return `UDim2.new(${lz(v.xs)}, ${lz(v.xo)}, ${lz(v.ys)}, ${lz(v.yo)})`;
    if (/Padding(Top|Bottom|Left|Right)$|^CornerRadius$|^Padding$/.test(k)) return `UDim.new(${lz(v.s)}, ${lz(v.o)})`;
    if (/Color3$/.test(k) || (k==='Color' && typeof v==='string')) return `Color3.fromHex("${v}")`;
    if (k==='AnchorPoint') return `Vector2.new(${v.x}, ${v.y})`;
    if (k==='Font') return `Enum.Font.${/^[A-Za-z0-9]+$/.test(v)?v:'SourceSansBold'}`;
    if (k==='TextXAlignment') return `Enum.TextXAlignment.${v}`;
    if (k==='TextYAlignment') return `Enum.TextYAlignment.${v}`;
    if (k==='FillDirection') return `Enum.FillDirection.${v===0?'Horizontal':'Vertical'}`;
    if (k==='SortOrder') return `Enum.SortOrder.${v===2?'LayoutOrder':'Name'}`;
    if (k==='HorizontalAlignment') return `Enum.HorizontalAlignment.${['Left','Center','Right'][v]||'Left'}`;
    if (k==='ApplyStrokeMode') return v===1?'Enum.ApplyStrokeMode.Border':'Enum.ApplyStrokeMode.Contextual';
    if (k==='ZIndexBehavior') return v===1?'Enum.ZIndexBehavior.Sibling':'Enum.ZIndexBehavior.Global';
    if (typeof v==='boolean') return String(v);
    if (typeof v==='string') return JSON.stringify(v);
    return String(lz(v));
  }
  function toLuau(tree) {
    let out = [], n = 0;
    out.push('-- Generated by FreeForge. Paste into a LocalScript in StarterPlayerScripts (or run in the Studio command bar with the Players.LocalPlayer line adjusted).');
    out.push('local Players = game:GetService("Players")');
    out.push('local TweenService = game:GetService("TweenService")');
    out.push('local player = Players.LocalPlayer');
    out.push('local playerGui = player:WaitForChild("PlayerGui")');
    out.push('local function make(class, props, parent)');
    out.push('\tlocal inst = Instance.new(class)');
    out.push('\tfor k, v in pairs(props) do inst[k] = v end');
    out.push('\tinst.Parent = parent');
    out.push('\treturn inst');
    out.push('end');
    function emit(node, parentVar, depth) {
      if (node.cls==='LocalScript') return;
      const v = 'o' + (++n);
      const p = node.props; const parts = [];
      if (node.cls==='UIGradient') {
        out.push(`local ${v} = make("UIGradient", { Color = ColorSequence.new(Color3.fromHex("${p.c0}"), Color3.fromHex("${p.c1}")), Rotation = ${p.Rotation||0} }, ${parentVar})`);
      } else {
        Object.keys(p).forEach(k => { if (p[k]!==undefined && p[k]!==null) parts.push(`${k} = ${luaVal(k,p[k])}`); });
        out.push(`local ${v} = make("${node.cls}", { ${parts.join(', ')} }, ${parentVar})`);
      }
      node.children.forEach(c => emit(c, v, depth+1));
      return v;
    }
    out.push('local gui = make("ScreenGui", { Name = ' + JSON.stringify(tree.props.Name) + ', ResetOnSpawn = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling }, playerGui)');
    // Luau has a 200 local-variable limit per function: wrap each top-level component in its own do-block.
    tree.children.forEach(c => { out.push('do'); const before = out.length; emit(c, 'gui', 1); out.push('end'); });
    out.push('');
    out.push('-- Responsive scaling');
    out.push(RESPONSIVE_SRC.replace('local gui = script.Parent\n',''));
    out.push('-- Behaviour stubs');
    out.push('for _, d in ipairs(gui:GetDescendants()) do');
    out.push('\tif d:IsA("TextButton") and d.Name == "CloseButton" then');
    out.push('\t\td.MouseButton1Click:Connect(function() d.Parent.Visible = false end)');
    out.push('\tend');
    out.push('\tif d:IsA("TextButton") then');
    out.push('\t\tlocal base = d.Size');
    out.push('\t\td.MouseEnter:Connect(function() TweenService:Create(d, TweenInfo.new(0.12), { Size = UDim2.new(base.X.Scale, base.X.Offset + 4, base.Y.Scale, base.Y.Offset + 2) }):Play() end)');
    out.push('\t\td.MouseLeave:Connect(function() TweenService:Create(d, TweenInfo.new(0.12), { Size = base }):Play() end)');
    out.push('\tend');
    out.push('end');
    return out.join('\n') + '\n';
  }

  // ---- HTML preview ----
  function toHtml(tree, w, h) {
    function css(node, parentLayout) {
      const p = node.props; let s = ''; 
      const sz = p.Size, po = p.Position;
      const kidsLayout = node.children.find(c => c.cls==='UIListLayout' || c.cls==='UIGridLayout');
      const inFlow = parentLayout != null;
      if (sz) s += `width:calc(${sz.xs*100}% + ${sz.xo}px);height:calc(${sz.ys*100}% + ${sz.yo}px);`;
      if (!inFlow && po) s += `position:absolute;left:calc(${po.xs*100}% + ${po.xo}px);top:calc(${po.ys*100}% + ${po.yo}px);` + (p.AnchorPoint ? `translate:${-p.AnchorPoint.x*100}% ${-p.AnchorPoint.y*100}%;` : '');
      if (inFlow) s += 'position:relative;flex:none;';
      s += 'box-sizing:border-box;';
      if (p.BackgroundColor3 && p.BackgroundTransparency!==1) {
        const c = hex2rgb(p.BackgroundColor3).map(x=>Math.round(x*255)); const a = 1-(p.BackgroundTransparency||0);
        s += `background:rgba(${c.join(',')},${a});`;
      }
      if (node.cls==='TextLabel'||node.cls==='TextButton') {
        s += `color:${p.TextColor3};font:${p.TextSize||14}px ${CSS_FONT[p.Font]||'Arial'};font-weight:${/Bold/.test(p.Font)?700:500};display:flex;align-items:${p.TextYAlignment==='Top'?'flex-start':'center'};justify-content:${p.TextXAlignment==='Left'?'flex-start':p.TextXAlignment==='Right'?'flex-end':'center'};`;
        if (!p.TextWrapped) s += 'white-space:nowrap;'; else s += 'text-align:left;';
        if (node.cls==='TextButton') s += 'cursor:pointer;';
      }
      if (p.ZIndex) s += `z-index:${p.ZIndex};`;
      node.children.forEach(c => {
        if (c.cls==='UICorner') s += `border-radius:${c.props.CornerRadius.o}px;`;
        if (c.cls==='UIStroke') s += `box-shadow:inset 0 0 0 ${c.props.Thickness}px ${c.props.Color};`;
        if (c.cls==='UIGradient') s += `background-image:linear-gradient(${c.props.Rotation===0?'to right':'to bottom'},${c.props.c0},${c.props.c1});`;
        if (c.cls==='UIPadding') s += `padding:${c.props.PaddingTop.o}px ${c.props.PaddingRight.o}px ${c.props.PaddingBottom.o}px ${c.props.PaddingLeft.o}px;`;
      });
      if (kidsLayout && kidsLayout.cls==='UIListLayout') s += `display:flex;flex-direction:${kidsLayout.props.FillDirection===0?'row':'column'};gap:${kidsLayout.props.Padding.o}px;`;
      if (kidsLayout && kidsLayout.cls==='UIGridLayout') { const cp = kidsLayout.props.CellPadding; s += `display:flex;flex-wrap:wrap;align-content:flex-start;gap:${cp.yo}px ${cp.xo}px;`; }
      return s;
    }
    function html(node, parentLayout) {
      if (/^UI/.test(node.cls) || node.cls==='LocalScript') return '';
      const tag = node.cls==='TextButton' ? 'button' : 'div';
      const layout = node.children.find(c => c.cls==='UIListLayout' || c.cls==='UIGridLayout');
      const inner = (node.props.Text!=null ? esc(node.props.Text) : '') + node.children.map(c => html(c, layout ? layout.cls : null)).join('');
      return `<${tag} data-n="${esc(node.props.Name||'')}" style="${esc(css(node, parentLayout))}border:0;margin:0;">${inner}</${tag}>`;
    }
    return `<div class="ff-screen" style="position:relative;width:${w||960}px;height:${h||540}px;overflow:hidden;">${tree.children.map(c=>html(c,null)).join('')}</div>`;
  }

  // ---- validation used by tests ----
  function validateRbxmx(xml) {
    const errs = []; const stack = [];
    const re = /<(\/?)([A-Za-z0-9]+)([^>]*?)(\/?)>/g; let m;
    while ((m = re.exec(xml))) {
      if (m[4]==='/') continue;
      if (m[1]==='/') { const top = stack.pop(); if (top!==m[2]) { errs.push('mismatch '+top+' vs '+m[2]); break; } }
      else stack.push(m[2]);
    }
    if (stack.length) errs.push('unclosed: '+stack.join(','));
    const refs = (xml.match(/referent="([^"]+)"/g)||[]).map(x=>x);
    if (new Set(refs).size !== refs.length) errs.push('duplicate referents');
    if (/NaN|undefined|Infinity/.test(xml)) errs.push('bad value NaN/undefined');
    return errs;
  }

  const api = { THEMES, COMPONENTS, buildKit, toRbxmx, toLuau, toHtml, validateRbxmx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FreeForge = api;
})(typeof window !== 'undefined' ? window : globalThis);
