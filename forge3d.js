/* FreeForge 3D: parametric models from primitives -> software preview, GLB (glTF 2.0 binary), .rbxmx Parts, Luau. No deps. */
(function (root) {
  'use strict';
  const PALETTES = {
    fantasy: { a:'#c9ced6', b:'#8a5a2b', c:'#d9a441', d:'#4f9d3a', e:'#b0472f', glow:'#7be0ff' },
    neon:    { a:'#1d2236', b:'#2e3558', c:'#00e5ff', d:'#3dff8b', e:'#ff3df2', glow:'#00e5ff' },
    candy:   { a:'#ffd1e8', b:'#ff8fc4', c:'#ffe066', d:'#7be0a8', e:'#9a7bff', glow:'#ffffff' },
    ocean:   { a:'#e8f4ff', b:'#7a4a22', c:'#ffd24a', d:'#2a9d8f', e:'#d94a3a', glow:'#5ee0ff' },
    forest:  { a:'#d9c9a0', b:'#6b4423', c:'#e6c15a', d:'#3f9a45', e:'#b5532f', glow:'#b6ff6a' },
    dark:    { a:'#3a3f4b', b:'#262a33', c:'#b8892f', d:'#2f5d3a', e:'#8c2f39', glow:'#ff7a45' }
  };
  const hex2rgb = h => { h=h.replace('#',''); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)/255); };
  function rng(seed){ let s=(seed>>>0)||1; return () => ((s = (s*1664525 + 1013904223)>>>0) / 4294967296); }
  const P = (t,pos,size,color,o) => Object.assign({ t, pos, size, rot:[0,0,0], color, mat:'Plastic' }, o||{});

  // ---- model generators: return array of primitives. Units = studs, Y up, origin at base center ----
  const MODELS = {
    sword: { name:'Sword', build(p) { const c=p.pal; return [
      P('box',[0,3.2,0],[0.5,5.4,0.12],c.a,{ mat:'Metal' }), P('box',[0,0.2,0],[2.2,0.3,0.4],c.c,{ mat:'Metal' }),
      P('cyl',[0,-0.8,0],[0.35,1.6,0.35],c.b,{ mat:'Wood' }), P('ball',[0,-1.75,0],[0.6,0.6,0.6],c.c,{ mat:'Metal' }),
      P('box',[0,6.0,0],[0.3,0.4,0.1],c.a,{ mat:'Metal', rot:[0,0,45] }), P('box',[0,3.2,0],[0.12,4.6,0.14],c.glow,{ mat:'Neon' }) ].map(m=>{ m.pos[1]+=1.8; return m; }); } },
    tree: { name:'Tree', build(p) { const c=p.pal, r=rng(p.seed); const out=[ P('cyl',[0,1.5,0],[1.2,3,1.2],c.b,{ mat:'Wood' }) ];
      const n = 4; for (let i=0;i<n;i++) { const w = 6 - i*1.1 + r()*0.5; out.push(P('cyl',[ (r()-.5)*0.3, 3.4+i*1.5, (r()-.5)*0.3 ],[w,1.7,w],i%2? c.d : mix(c.d,'#ffffff',0.12),{})); }
      out.push(P('ball',[0,3.4+n*1.5,0],[1.4,1.4,1.4],c.d,{})); return out; } },
    house: { name:'House', build(p) { const c=p.pal; return [
      P('box',[0,2,0],[8,4,6],c.a,{}), P('box',[0,0,0].map((v,i)=>i==1?4.6:0),[8.8,0.3,6.8],c.b,{ mat:'Wood' }),
      P('box',[-2.1,5.3,0],[5,0.5,7.2],c.e,{ rot:[0,0,32] }), P('box',[2.1,5.3,0],[5,0.5,7.2],c.e,{ rot:[0,0,-32] }),
      P('box',[0,1.3,3.01],[1.6,2.6,0.2],c.b,{ mat:'Wood' }), P('ball',[0.5,1.3,3.15],[0.25,0.25,0.25],c.c,{ mat:'Metal' }),
      P('box',[-2.4,2.6,3.02],[1.4,1.4,0.15],c.glow,{ mat:'Neon' }), P('box',[2.4,2.6,3.02],[1.4,1.4,0.15],c.glow,{ mat:'Neon' }),
      P('box',[2.8,6.6,-1.2],[1,2.2,1],c.b,{}) ]; } },
    crate: { name:'Crate', build(p) { const c=p.pal; const o=[ P('box',[0,1.5,0],[3,3,3],c.b,{ mat:'Wood' }) ];
      [[-1.4,0],[1.4,0]].forEach(a=>{ o.push(P('box',[a[0],1.5,0],[0.3,3.1,3.1],c.c,{ mat:'Metal' })); o.push(P('box',[0,1.5,a[0]],[3.1,3.1,0.3],c.c,{ mat:'Metal' })); });
      o.push(P('box',[0,3.05,0],[3.2,0.2,3.2],c.c,{ mat:'Metal' })); return o; } },
    potion: { name:'Potion', build(p) { const c=p.pal; return [
      P('ball',[0,1.5,0],[3,3,3],c.glow,{ mat:'Glass' }), P('ball',[0,1.2,0],[2.4,2.0,2.4],c.e,{ mat:'Neon' }),
      P('cyl',[0,3.4,0],[1.1,1.8,1.1],c.glow,{ mat:'Glass' }), P('cyl',[0,4.5,0],[1.2,0.5,1.2],c.b,{ mat:'Wood' }) ]; } },
    crystal: { name:'Crystal cluster', build(p) { const c=p.pal, r=rng(p.seed), o=[]; const cols=[c.glow,c.e,c.d];
      for (let i=0;i<7;i++){ const h=2+r()*(i==0?5:3), w=0.7+r()*0.5, a=r()*6.28, d=i==0?0:1+r()*1.5; o.push(P('box',[Math.cos(a)*d,h/2,Math.sin(a)*d],[w,h,w],cols[i%3],{ mat:'Neon', rot:[(r()-.5)*24,r()*90,(r()-.5)*24] })); }
      o.push(P('cyl',[0,0.25,0],[5,0.5,5],c.a,{ mat:'Metal' })); return o; } },
    chest: { name:'Treasure chest', build(p) { const c=p.pal; return [
      P('box',[0,1.1,0],[4,2.2,2.6],c.b,{ mat:'Wood' }), P('cyl',[0,2.2,0],[2.6,4,2.6],c.b,{ mat:'Wood', rot:[0,0,90] }),
      P('box',[0,1.3,1.35],[4.1,0.35,0.15],c.c,{ mat:'Metal' }), P('box',[1.9,1.4,0],[0.3,2.8,2.7],c.c,{ mat:'Metal' }), P('box',[-1.9,1.4,0],[0.3,2.8,2.7],c.c,{ mat:'Metal' }),
      P('box',[0,2.2,1.4],[0.7,0.9,0.2],c.c,{ mat:'Metal' }), P('ball',[0,2.1,1.5],[0.25,0.25,0.25],c.glow,{ mat:'Neon' }) ]; } },
    tower: { name:'Tower', build(p) { const c=p.pal, o=[ P('cyl',[0,5,0],[4.4,10,4.4],c.a,{}) , P('cyl',[0,10.4,0],[5.2,0.8,5.2],c.b,{}) ];
      for (let i=0;i<8;i++){ const a=i/8*6.283; o.push(P('box',[Math.cos(a)*2.3,11.2,Math.sin(a)*2.3],[0.9,1.2,0.9],c.a,{ rot:[0,-a*57.3,0] })); }
      o.push(P('cyl',[0,12.6,0],[3.2,1.6,3.2],c.e,{})); o.push(P('cyl',[0,14,0],[0.25,3,0.25],c.b,{})); o.push(P('box',[0.7,14.8,0],[1.4,0.9,0.1],c.c,{}));
      o.push(P('box',[0,1.4,2.15],[1.4,2.8,0.2],c.b,{ mat:'Wood' })); o.push(P('box',[0,6.5,2.2],[0.7,1.6,0.15],c.glow,{ mat:'Neon' })); return o; } },
    ship: { name:'Pirate ship', build(p) { const c=p.pal, o=[ P('box',[0,1.2,0],[4,1.6,10],c.b,{ mat:'Wood' }), P('box',[0,1.9,-4.6],[3.6,1.6,1.6],c.b,{ mat:'Wood' }), P('box',[0,0.5,4.8],[2.6,1,2],c.b,{ mat:'Wood', rot:[-20,0,0] }),
      P('cyl',[0,6,-0.5],[0.35,9,0.35],c.b,{ mat:'Wood' }), P('box',[0,6.4,-0.2],[0.12,4.2,3.6],c.a,{}), P('box',[0,3.2,-0.2],[0.14,0.5,3.8],c.e,{}), P('box',[0,10.7,-0.4],[0.1,0.8,1.3],c.e,{}), P('ball',[0,11.3,-0.5],[0.5,0.5,0.5],c.c,{ mat:'Metal' }),
      P('box',[0,1.5,0],[4.2,0.25,10.2],c.c,{ mat:'Metal' }) ]; [-1,1].forEach(s=>{ o.push(P('cyl',[s*2.1,1.3,1],[0.5,0.5,0.5],c.glow,{ mat:'Neon', rot:[0,0,90] })); o.push(P('cyl',[s*2.1,1.3,-1.4],[0.5,0.5,0.5],c.glow,{ mat:'Neon', rot:[0,0,90] })); }); return o.map(m=>{ m.pos[1]+=0.2; return m; }); } },
    car: { name:'Race car', build(p) { const c=p.pal, o=[ P('box',[0,1.1,0],[3.2,0.9,7],c.e,{ mat:'Metal' }), P('box',[0,1.8,-0.3],[2.6,0.8,3],c.glow,{ mat:'Glass' }), P('box',[0,1.45,2.6],[3,0.3,1.6],c.e,{ mat:'Metal' }), P('box',[0,1.3,-3.3],[3.2,0.25,0.9],c.e,{ mat:'Metal' }),
      P('box',[1.2,2.0,-3.3],[0.15,1,0.15],c.a,{}), P('box',[-1.2,2.0,-3.3],[0.15,1,0.15],c.a,{}), P('box',[0,2.5,-3.3],[3.2,0.2,0.9],c.e,{ mat:'Metal' }), P('box',[0,0.95,3.55],[2.4,0.2,0.1],c.glow,{ mat:'Neon' }) ];
      [[-1.75,2.3],[1.75,2.3],[-1.75,-2.3],[1.75,-2.3]].forEach(w=>{ o.push(P('cyl',[w[0],0.8,w[1]],[1.6,0.7,1.6],c.a,{ rot:[0,0,90] })); o.push(P('cyl',[w[0]+(w[0]>0?0.36:-0.36),0.8,w[1]],[0.9,0.1,0.9],c.c,{ mat:'Metal', rot:[0,0,90] })); }); return o; } },
    robot: { name:'Robot', build(p) { const c=p.pal; return [ P('box',[0,3.2,0],[3,3.2,2],c.a,{ mat:'Metal' }), P('box',[0,5.6,0],[2.2,1.8,2],c.a,{ mat:'Metal' }), P('box',[0,5.7,1.01],[1.6,0.5,0.1],c.glow,{ mat:'Neon' }), P('cyl',[0,6.9,0],[0.15,1,0.15],c.c,{ mat:'Metal' }), P('ball',[0,7.5,0],[0.5,0.5,0.5],c.e,{ mat:'Neon' }),
      P('box',[-2.2,3.4,0],[0.9,2.8,0.9],c.b,{ mat:'Metal' }), P('box',[2.2,3.4,0],[0.9,2.8,0.9],c.b,{ mat:'Metal' }), P('box',[-0.8,0.9,0],[1,1.8,1],c.b,{ mat:'Metal' }), P('box',[0.8,0.9,0],[1,1.8,1],c.b,{ mat:'Metal' }),
      P('box',[0,3.6,1.01],[1.6,1.2,0.1],c.glow,{ mat:'Neon' }), P('box',[0,0.15,0],[3.2,0.3,2.4],c.b,{ mat:'Metal' }) ]; } },
    shield: { name:'Shield', build(p) { const c=p.pal; return [ P('cyl',[0,3,0],[5,0.5,5],c.a,{ mat:'Metal', rot:[90,0,0] }), P('cyl',[0,3,0.2],[4.2,0.5,4.2],c.e,{ mat:'Metal', rot:[90,0,0] }), P('cyl',[0,3,0.45],[1.6,0.5,1.6],c.c,{ mat:'Metal', rot:[90,0,0] }), P('ball',[0,3,0.7],[0.7,0.7,0.7],c.glow,{ mat:'Neon' }),
      P('box',[0,3,0.35],[0.5,4.6,0.2],c.c,{ mat:'Metal' }), P('box',[0,3,0.35],[4.6,0.5,0.2],c.c,{ mat:'Metal' }), P('box',[0,0.3,0],[1.6,0.6,0.8],c.b,{ mat:'Wood' }) ]; } },
    mushroom: { name:'Mushroom house', build(p) { const c=p.pal, o=[ P('cyl',[0,2,0],[3.4,4,3.4],c.a,{}), P('ball',[0,5,0],[8,5,8],c.e,{}), P('box',[0,1.1,1.65],[1.2,2.2,0.2],c.b,{ mat:'Wood' }), P('box',[1.2,2.6,1.6],[0.9,0.9,0.15],c.glow,{ mat:'Neon' }) ];
      [[-1.8,6.2,1.8],[2.4,6.4,-0.8],[0.2,7.2,2.4],[-2.4,5.8,-1.6]].forEach(s=>o.push(P('ball',[s[0],s[1],s[2]],[1.2,0.5,1.2],c.a,{}))); return o; } },
    pet: { name:'Pet', build(p) { const c=p.pal; return [ P('ball',[0,1.6,0],[3.2,3,3.6],c.b,{}), P('ball',[0,3.5,1.4],[2.6,2.4,2.4],c.b,{}), P('ball',[-0.7,3.7,2.5],[0.4,0.4,0.4],c.a,{ mat:'Neon' }), P('ball',[0.7,3.7,2.5],[0.4,0.4,0.4],c.a,{ mat:'Neon' }), P('ball',[0,3.2,2.65],[0.45,0.35,0.35],c.e,{}),
      P('ball',[-0.9,4.9,1.2],[0.8,1.3,0.5],c.b,{}), P('ball',[0.9,4.9,1.2],[0.8,1.3,0.5],c.b,{}), P('ball',[0,1.2,-1.9],[0.9,0.9,1.4],c.c,{}), P('ball',[-0.9,0.4,1],[0.9,0.8,1.2],c.b,{}), P('ball',[0.9,0.4,1],[0.9,0.8,1.2],c.b,{}) ]; } },
    coin: { name:'Coin', build(p) { const c=p.pal; return [ P('cyl',[0,1.6,0],[3,0.35,3],c.c,{ mat:'Metal', rot:[90,0,0] }), P('cyl',[0,1.6,0],[2.2,0.4,2.2],c.glow,{ mat:'Neon', rot:[90,0,0] }), P('box',[0,1.6,0.2],[0.4,1.4,0.1],c.c,{ mat:'Metal' }) ]; } }
  };
  function mix(a,b,k){ const x=hex2rgb(a), y=hex2rgb(b); return '#'+x.map((v,i)=>Math.round((v+(y[i]-v)*k)*255).toString(16).padStart(2,'0')).join(''); }
  function buildModel(opts) {
    opts = opts || {}; const m = MODELS[opts.model] || MODELS.sword;
    const pal = Object.assign({}, PALETTES[opts.palette] || PALETTES.fantasy);
    if (opts.accent && /^#[0-9a-fA-F]{6}$/.test(opts.accent)) pal.c = opts.accent;
    const scale = Math.min(4, Math.max(0.25, +opts.scale || 1));
    const prims = m.build({ pal, seed: opts.seed==null?7:+opts.seed|0 }).map(q => ({ t:q.t, pos:q.pos.map(v=>v*scale), size:q.size.map(v=>v*scale), rot:q.rot.slice(), color:q.color, mat:q.mat }));
    return { name:(m.name||'Model').replace(/[^A-Za-z0-9 ]/g,''), prims, spin: opts.spin !== false, bob: !!opts.bob };
  }

  // ---- math ----
  const D = Math.PI/180;
  function rotMat(rx,ry,rz) { // R = Rx * Ry * Rz (same order as CFrame.Angles), row-major 3x3
    const cx=Math.cos(rx*D), sx=Math.sin(rx*D), cy=Math.cos(ry*D), sy=Math.sin(ry*D), cz=Math.cos(rz*D), sz=Math.sin(rz*D);
    const Rx=[1,0,0, 0,cx,-sx, 0,sx,cx], Ry=[cy,0,sy, 0,1,0, -sy,0,cy], Rz=[cz,-sz,0, sz,cz,0, 0,0,1];
    return mul3(mul3(Rx,Ry),Rz);
  }
  function mul3(a,b){ const o=new Array(9); for(let i=0;i<3;i++)for(let j=0;j<3;j++){ o[i*3+j]=a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j]; } return o; }
  const apply = (m,v) => [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];

  // ---- geometry (local space, size applied) ----
  function geom(prim) {
    const [sx,sy,sz] = prim.size; let pos=[], nor=[], idx=[];
    const quad = (a,b,c,d,n) => { const o=pos.length/3; [a,b,c,d].forEach(v=>{ pos.push(v[0],v[1],v[2]); nor.push(n[0],n[1],n[2]); }); idx.push(o,o+1,o+2,o,o+2,o+3); };
    if (prim.t==='box') {
      const x=sx/2,y=sy/2,z=sz/2;
      quad([x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z],[1,0,0]); quad([-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z],[-1,0,0]);
      quad([-x,y,-z],[-x,y,z],[x,y,z],[x,y,-z],[0,1,0]); quad([-x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z],[0,-1,0]);
      quad([-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z],[0,0,1]); quad([x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z],[0,0,-1]);
    } else if (prim.t==='cyl') { // axis Y, diameter sx/sz, height sy
      const S=20, rx=sx/2, rz=sz/2, y=sy/2;
      for (let i=0;i<S;i++){ const a0=i/S*6.2832, a1=(i+1)/S*6.2832, am=(a0+a1)/2;
        const p0=[Math.cos(a0)*rx,0,Math.sin(a0)*rz], p1=[Math.cos(a1)*rx,0,Math.sin(a1)*rz];
        const o=pos.length/3; pos.push(p0[0],-y,p0[2], p1[0],-y,p1[2], p1[0],y,p1[2], p0[0],y,p0[2]);
        [a0,a1,a1,a0].forEach(a=>nor.push(Math.cos(a),0,Math.sin(a))); idx.push(o,o+2,o+1,o,o+3,o+2);
        const c=pos.length/3; pos.push(0,y,0,p0[0],y,p0[2],p1[0],y,p1[2]); nor.push(0,1,0,0,1,0,0,1,0); idx.push(c,c+2,c+1);
        const d=pos.length/3; pos.push(0,-y,0,p0[0],-y,p0[2],p1[0],-y,p1[2]); nor.push(0,-1,0,0,-1,0,0,-1,0); idx.push(d,d+1,d+2); }
    } else { // ball
      const LA=10, LO=16, rx=sx/2, ry=sy/2, rz=sz/2;
      for (let i=0;i<=LA;i++){ const th=i/LA*Math.PI; for (let j=0;j<=LO;j++){ const ph=j/LO*6.2832;
        const nx=Math.sin(th)*Math.cos(ph), ny=Math.cos(th), nz=Math.sin(th)*Math.sin(ph); pos.push(nx*rx,ny*ry,nz*rz); nor.push(nx,ny,nz); } }
      for (let i=0;i<LA;i++) for (let j=0;j<LO;j++){ const a=i*(LO+1)+j, b=a+LO+1; idx.push(a,a+1,b, a+1,b+1,b); }
    }
    // ensure outward winding (CCW) by checking against normals
    for (let t=0;t<idx.length;t+=3){ const a=idx[t],b=idx[t+1],c=idx[t+2];
      const u=[pos[b*3]-pos[a*3],pos[b*3+1]-pos[a*3+1],pos[b*3+2]-pos[a*3+2]], v=[pos[c*3]-pos[a*3],pos[c*3+1]-pos[a*3+1],pos[c*3+2]-pos[a*3+2]];
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if (n[0]*nor[a*3]+n[1]*nor[a*3+1]+n[2]*nor[a*3+2] < 0) { idx[t+1]=c; idx[t+2]=b; } }
    return { pos, nor, idx };
  }
  const primMat = p => rotMat(p.rot[0],p.rot[1],p.rot[2]);

  // ---- software renderer (canvas 2D painter's algorithm) ----
  function render(ctx, model, W, H, yawDeg, pitchDeg, bg, bobY) {
    ctx.clearRect(0,0,W,H);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0,0,W,H); }
    const cy=Math.cos(yawDeg*D), sy=Math.sin(yawDeg*D), cp=Math.cos(pitchDeg*D), sp=Math.sin(pitchDeg*D);
    // bounds for auto-fit
    let maxR = 1; model.prims.forEach(p=>{ const r=Math.hypot(p.pos[0],p.pos[1]-0,p.pos[2])+Math.max(...p.size)*0.7; if (r>maxR) maxR=r; });
    const cyc = model.prims.reduce((a,p)=>Math.max(a,p.pos[1]+p.size[1]/2),0)/2;
    const tris=[];
    const L=[0.45,0.8,0.4], ll=Math.hypot(...L); L[0]/=ll; L[1]/=ll; L[2]/=ll;
    model.__fit = model.__fit || (function(){ let h=0,w=0; model.prims.forEach(p=>{ h=Math.max(h,p.pos[1]+p.size[1]/2); w=Math.max(w,Math.hypot(p.pos[0],p.pos[2])+Math.max(p.size[0],p.size[2])/2); }); return Math.max(h/2, w*0.9, 1)*1.08; })();
    model.prims.forEach(p => {
      const g = geom(p), R = primMat(p), col = hex2rgb(p.color), neon = p.mat==='Neon', glass = p.mat==='Glass', metal = p.mat==='Metal';
      const tp = i => { let v=apply(R,[g.pos[i*3],g.pos[i*3+1],g.pos[i*3+2]]); v=[v[0]+p.pos[0], v[1]+p.pos[1]-cyc+(bobY||0), v[2]+p.pos[2]];
        const x=v[0]*cy - v[2]*sy, z0=v[0]*sy + v[2]*cy; const y=v[1]*cp - z0*sp, z=v[1]*sp + z0*cp; return [x,y,z]; };
      const nn = i => { const n=apply(R,[g.nor[i*3],g.nor[i*3+1],g.nor[i*3+2]]); const x=n[0]*cy-n[2]*sy, z0=n[0]*sy+n[2]*cy; return [x, n[1]*cp - z0*sp, n[1]*sp + z0*cp]; };
      for (let t=0;t<g.idx.length;t+=3) { const a=g.idx[t],b=g.idx[t+1],c=g.idx[t+2]; const A=tp(a),B=tp(b),C=tp(c);
        const n=nn(a); if (n[2] > 0.02 && !glass) continue; // back-face (camera looks -z... viewer at +z? we use z<0 front)
        const rl = n[0]*L[0]*0 ; // placeholder
        tris.push({ A, B, C, n, col, neon, glass, metal, z:(A[2]+B[2]+C[2])/3 }); }
    });
    
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; tris.forEach(t=>[t.A,t.B,t.C].forEach(v=>{ x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);y0=Math.min(y0,v[1]);y1=Math.max(y1,v[1]); }));
    if (!(x1>x0) || !(y1>y0)) return;
    let scale, ox, oy;
    if (model.spin || model.bob) { const fr=Math.max(1, model.__fit||1); scale=Math.min(W*0.78/(fr*2), H*0.8/(fr*2)); ox=0; oy=0; }
    else { scale=Math.min(W*0.84/(x1-x0), H*0.84/(y1-y0)); ox=(x0+x1)/2; oy=(y0+y1)/2; }
    // z-buffer rasterizer, 2x supersampled
    const SS = (W*H > 600000) ? 1.5 : 2, BW = Math.round(W*SS), BH = Math.round(H*SS), sc = scale*SS;
    const img = new Uint8ClampedArray(BW*BH*4), zb = new Float32Array(BW*BH).fill(1e9);
    const f = v => Math.max(0, Math.min(255, Math.round(v*255)));
    tris.forEach(t => {
      let d = t.n[0]*0.35 + t.n[1]*0.75 + (-t.n[2])*0.55; d = Math.max(0, d);
      let k = t.neon ? 1.1 : 0.45 + 0.6*d; if (t.metal) k = 0.32 + 0.85*Math.pow(d,1.3);
      let r=t.col[0]*k, g=t.col[1]*k, b=t.col[2]*k;
      if (t.glass) { r=r*0.65+0.35; g=g*0.65+0.35; b=b*0.65+0.35; }
      const R8=f(r), G8=f(g), B8=f(b);
      const ax=BW/2+(t.A[0]-ox)*sc, ay=BH/2-(t.A[1]-oy)*sc, bx=BW/2+(t.B[0]-ox)*sc, by=BH/2-(t.B[1]-oy)*sc, cx2=BW/2+(t.C[0]-ox)*sc, cy2=BH/2-(t.C[1]-oy)*sc;
      const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx2))), maxX=Math.min(BW-1,Math.ceil(Math.max(ax,bx,cx2)));
      const minY=Math.max(0,Math.floor(Math.min(ay,by,cy2))), maxY=Math.min(BH-1,Math.ceil(Math.max(ay,by,cy2)));
      const den=(by-cy2)*(ax-cx2)+(cx2-bx)*(ay-cy2); if (Math.abs(den)<1e-9) return;
      for (let y=minY;y<=maxY;y++) for (let x=minX;x<=maxX;x++) {
        const px=x+0.5, py=y+0.5;
        const w0=((by-cy2)*(px-cx2)+(cx2-bx)*(py-cy2))/den, w1=((cy2-ay)*(px-cx2)+(ax-cx2)*(py-cy2))/den, w2=1-w0-w1;
        if (w0<-0.001||w1<-0.001||w2<-0.001) continue;
        const z=w0*t.A[2]+w1*t.B[2]+w2*t.C[2], i=y*BW+x; if (z>=zb[i]) continue; zb[i]=z;
        img[i*4]=R8; img[i*4+1]=G8; img[i*4+2]=B8; img[i*4+3]=255;
      }
    });
    const off = (typeof OffscreenCanvas!=='undefined') ? new OffscreenCanvas(BW,BH) : Object.assign(document.createElement('canvas'),{ width:BW, height:BH });
    off.getContext('2d').putImageData(new ImageData(img,BW,BH),0,0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off,0,0,W,H);
  }

  // ---- GLB ----
  function toGlb(model, name) {
    const nodes=[], meshes=[], materials=[], matIdx={}, accessors=[], views=[]; const chunks=[]; let byteLen=0;
    const S = 0.28; // studs -> meters
    const addBuf = (typedArr, target) => { const buf=Buffer_from(typedArr); const pad=(4-(buf.length%4))%4; const off=byteLen; chunks.push(buf); if (pad){ chunks.push(new Uint8Array(pad)); } byteLen += buf.length+pad; views.push(Object.assign({ buffer:0, byteOffset:off, byteLength:buf.length }, target?{ target }:{})); return views.length-1; };
    const addAcc = (view, comp, count, type, min, max) => { const a={ bufferView:view, componentType:comp, count, type }; if (min) a.min=min; if (max) a.max=max; accessors.push(a); return accessors.length-1; };
    model.prims.forEach((p,i) => {
      const key = p.color+'|'+p.mat; if (matIdx[key]==null) { const c=hex2rgb(p.color); const m={ name:p.mat+'_'+p.color.slice(1), pbrMetallicRoughness:{ baseColorFactor:[c[0],c[1],c[2],p.mat==='Glass'?0.6:1], metallicFactor:p.mat==='Metal'?0.9:0, roughnessFactor:p.mat==='Metal'?0.35:p.mat==='Glass'?0.1:0.7 } };
        if (p.mat==='Neon') m.emissiveFactor=[c[0],c[1],c[2]]; if (p.mat==='Glass') m.alphaMode='BLEND'; materials.push(m); matIdx[key]=materials.length-1; }
      const g = geom(p); const pos=new Float32Array(g.pos.map(v=>v*S)), nor=new Float32Array(g.nor), idx=new Uint16Array(g.idx);
      const mn=[Infinity,Infinity,Infinity], mx=[-Infinity,-Infinity,-Infinity]; for (let k=0;k<pos.length;k+=3) for (let a=0;a<3;a++){ mn[a]=Math.min(mn[a],pos[k+a]); mx[a]=Math.max(mx[a],pos[k+a]); }
      const vp=addBuf(pos,34962), vn=addBuf(nor,34962), vi=addBuf(idx,34963);
      const ap=addAcc(vp,5126,pos.length/3,'VEC3',mn,mx), an=addAcc(vn,5126,nor.length/3,'VEC3'), ai=addAcc(vi,5123,idx.length,'SCALAR');
      meshes.push({ name:'Part'+(i+1), primitives:[{ attributes:{ POSITION:ap, NORMAL:an }, indices:ai, material:matIdx[key] }] });
      const R = primMat(p); // row-major -> glTF column-major
      const mat=[R[0],R[3],R[6],0, R[1],R[4],R[7],0, R[2],R[5],R[8],0, p.pos[0]*S,p.pos[1]*S,p.pos[2]*S,1];
      nodes.push({ name:'Part'+(i+1), mesh:i, matrix:mat });
    });
    const rootChildren = nodes.map((_,i)=>i+1); nodes.unshift({ name:'Root', children:rootChildren });
    const anims=[];
    if (model.spin || model.bob) {
      const times=[0,1,2,3,4].map(v=>v*1.0), q=[[0,0,0,1],[0,0.7071,0,0.7071],[0,1,0,0],[0,0.7071,0,-0.7071],[0,0,0,1]];
      const tv=addBuf(new Float32Array(times)), ta=addAcc(tv,5126,5,'SCALAR',[0],[4]);
      const channels=[], samplers=[];
      if (model.spin) { const rv=addBuf(new Float32Array([].concat.apply([],q))), ra=addAcc(rv,5126,5,'VEC4'); samplers.push({ input:ta, output:ra, interpolation:'LINEAR' }); channels.push({ sampler:samplers.length-1, target:{ node:0, path:'rotation' } }); }
      if (model.bob) { const tr=[0,0,0, 0,0.15,0, 0,0,0, 0,0.15,0, 0,0,0]; const bv=addBuf(new Float32Array(tr)), ba=addAcc(bv,5126,5,'VEC3'); samplers.push({ input:ta, output:ba, interpolation:'LINEAR' }); channels.push({ sampler:samplers.length-1, target:{ node:0, path:'translation' } }); }
      anims.push({ name:model.spin?'Spin':'Bob', samplers, channels });
    }
    const gltf = { asset:{ version:'2.0', generator:'FreeForge' }, scene:0, scenes:[{ name:name||model.name, nodes:[0] }], nodes, meshes, materials, accessors, bufferViews:views, buffers:[{ byteLength:byteLen }] };
    if (anims.length) gltf.animations = anims;
    let json = JSON.stringify(gltf); while (json.length%4) json+=' ';
    const jb = new TextEncoder().encode(json), total = 12+8+jb.length+8+byteLen, out=new Uint8Array(total), dv=new DataView(out.buffer);
    dv.setUint32(0,0x46546C67,true); dv.setUint32(4,2,true); dv.setUint32(8,total,true);
    dv.setUint32(12,jb.length,true); dv.setUint32(16,0x4E4F534A,true); out.set(jb,20);
    let o=20+jb.length; dv.setUint32(o,byteLen,true); dv.setUint32(o+4,0x004E4942,true); o+=8; chunks.forEach(c=>{ out.set(c,o); o+=c.length; });
    return out;
  }
  function Buffer_from(ta){ return new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength); }

  // ---- Roblox: Parts ----
  const MAT_TOKEN = { Plastic:256, Neon:288, Wood:512, Metal:1088, Glass:1568 };
  function partParams(p) {
    const R = primMat(p); let S = p.size.slice(), shape = 1, M = R;
    if (p.t==='ball') { shape=0; }
    else if (p.t==='cyl') { shape=2; S=[p.size[1], p.size[0], p.size[2]]; M = mul3(R, rotMat(0,0,90)); }
    return { S, shape, M };
  }
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  function toRbxmx(model, name) {
    let n=0; const items = model.prims.map((p,i)=>{ const q=partParams(p), c=hex2rgb(p.color), M=q.M;
      return `<Item class="Part" referent="RBX${++n+1}"><Properties><string name="Name">Part${i+1}</string><bool name="Anchored">true</bool>`+
      `<token name="shape">${q.shape}</token><token name="Material">${MAT_TOKEN[p.mat]||256}</token>`+
      `<Color3 name="Color3uint8">${(Math.round(c[0]*255)*65536+Math.round(c[1]*255)*256+Math.round(c[2]*255)+4278190080)>>>0}</Color3>`.replace(/<Color3 name="Color3uint8">(\d+)<\/Color3>/,'<Color3uint8 name="Color3uint8">$1</Color3uint8>')+
      `<Vector3 name="size"><X>${q.S[0]}</X><Y>${q.S[1]}</Y><Z>${q.S[2]}</Z></Vector3>`+
      `<CoordinateFrame name="CFrame"><X>${p.pos[0]}</X><Y>${p.pos[1]}</Y><Z>${p.pos[2]}</Z><R00>${M[0]}</R00><R01>${M[1]}</R01><R02>${M[2]}</R02><R10>${M[3]}</R10><R11>${M[4]}</R11><R12>${M[5]}</R12><R20>${M[6]}</R20><R21>${M[7]}</R21><R22>${M[8]}</R22></CoordinateFrame>`+
      `</Properties></Item>`; }).join('');
    return `<roblox version="4"><Item class="Model" referent="RBX1"><Properties><string name="Name">${esc(name||model.name)}</string></Properties>${items}</Item></roblox>`;
  }
  const f4 = v => +(+v).toFixed(4);
  function toLuau(model, name) {
    const L = ['-- Generated by FreeForge. Run in a Script (server) or the Studio command bar. Builds an anchored Model in Workspace.',
      'local model = Instance.new("Model")', 'model.Name = ' + JSON.stringify(name||model.name),
      'local function part(shape, mat, color, size, cf)', '\tlocal p = Instance.new("Part")', '\tp.Anchored = true; p.Shape = shape; p.Material = mat; p.Color = Color3.fromHex(color)', '\tp.Size = size; p.CFrame = cf; p.TopSurface = Enum.SurfaceType.Smooth; p.BottomSurface = Enum.SurfaceType.Smooth; p.Parent = model', '\treturn p', 'end'];
    model.prims.forEach(p => {
      const sh = p.t==='ball' ? 'Ball' : p.t==='cyl' ? 'Cylinder' : 'Block';
      const sz = p.t==='cyl' ? [p.size[1],p.size[0],p.size[2]] : p.size;
      const rot = `CFrame.Angles(math.rad(${f4(p.rot[0])}), math.rad(${f4(p.rot[1])}), math.rad(${f4(p.rot[2])}))` + (p.t==='cyl' ? ' * CFrame.Angles(0, 0, math.rad(90))' : '');
      L.push(`part(Enum.PartType.${sh}, Enum.Material.${MAT_TOKEN[p.mat]?p.mat:'Plastic'}, "${p.color}", Vector3.new(${sz.map(f4).join(', ')}), CFrame.new(${p.pos.map(f4).join(', ')}) * ${rot})`);
    });
    L.push('model.PrimaryPart = model:FindFirstChildOfClass("Part")');
    L.push('model:PivotTo(CFrame.new(0, 10, 0))');
    L.push('model.Parent = workspace');
    if (model.spin || model.bob) {
      L.push('', '-- Animation: ' + (model.spin?'spin':'') + (model.spin&&model.bob?' + ':'') + (model.bob?'bob':''), 'local RunService = game:GetService("RunService")', 'local base = model:GetPivot()', 'local t0 = os.clock()',
        'RunService.Heartbeat:Connect(function()', '\tlocal t = os.clock() - t0',
        '\tlocal y = ' + (model.bob ? 'math.sin(t * 2) * 0.6' : '0'), '\tmodel:PivotTo(base * CFrame.new(0, y, 0) * CFrame.Angles(0, ' + (model.spin ? 't * 1.2' : '0') + ', 0))', 'end)');
    }
    return L.join('\n') + '\n';
  }
  function validateGlb(u8) {
    const e=[], dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
    if (dv.getUint32(0,true)!==0x46546C67) e.push('magic'); if (dv.getUint32(4,true)!==2) e.push('version'); if (dv.getUint32(8,true)!==u8.length) e.push('length');
    const jl=dv.getUint32(12,true); let j; try { j=JSON.parse(new TextDecoder().decode(u8.subarray(20,20+jl))); } catch(x){ e.push('json'); return e; }
    const bl=dv.getUint32(20+jl,true); if (j.buffers[0].byteLength!==bl) e.push('bin length '+bl+' vs '+j.buffers[0].byteLength);
    j.accessors.forEach((a,i)=>{ const v=j.bufferViews[a.bufferView]; const sz={5126:4,5123:2}[a.componentType]*({SCALAR:1,VEC3:3,VEC4:4}[a.type]); if (a.count*sz>v.byteLength) e.push('acc '+i+' overflow'); if (v.byteOffset%4) e.push('align'); });
    j.meshes.forEach(m=>m.primitives.forEach(p=>{ const idxA=j.accessors[p.indices], posA=j.accessors[p.attributes.POSITION]; const v=j.bufferViews[idxA.bufferView]; const ia=new Uint16Array(u8.buffer, u8.byteOffset+20+jl+8+v.byteOffset, idxA.count); for (let k=0;k<ia.length;k++) if (ia[k]>=posA.count){ e.push('index oob'); break; } }));
    return e;
  }
  const api = { PALETTES, MODELS, buildModel, render, geom, toGlb, toRbxmx, toLuau, validateGlb };
  if (typeof module!=='undefined' && module.exports) module.exports=api; else root.FreeForge3D=api;
})(typeof window!=='undefined'?window:globalThis);
