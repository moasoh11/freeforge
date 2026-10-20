/* FreeForge thumbnails/icons: canvas compositor (browser). Uses FreeForge3D.render for the hero model. */
(function (root) {
  'use strict';
  const STYLES = {
    sunburst: { name:'Sunburst', bg:['#ffb347','#ff5e62'], ray:'rgba(255,255,255,0.16)', t0:'#fff6b0', t1:'#ffb300', stroke:'#2a1200' },
    neon:     { name:'Neon Night', bg:['#1a0b3b','#050b1f'], ray:'rgba(0,229,255,0.12)', t0:'#9dfcff', t1:'#00b7ff', stroke:'#04122a', grid:'#00e5ff' },
    candy:    { name:'Candy', bg:['#ffd1ec','#b79bff'], ray:'rgba(255,255,255,0.35)', t0:'#ffffff', t1:'#ff7ac6', stroke:'#5b1c66' },
    ocean:    { name:'Ocean', bg:['#0b4f8a','#031a33'], ray:'rgba(120,220,255,0.14)', t0:'#ffffff', t1:'#5ee0ff', stroke:'#021326' },
    forest:   { name:'Forest', bg:['#2f7a3a','#0b2a14'], ray:'rgba(200,255,150,0.14)', t0:'#fffbd0', t1:'#9be05a', stroke:'#0b2210' },
    dark:     { name:'Dark Fantasy', bg:['#2b1230','#07070c'], ray:'rgba(255,122,69,0.14)', t0:'#ffe2a8', t1:'#e0892f', stroke:'#120708', embers:true }
  };
  function rng(seed){ let s=seed>>>0||1; return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296); }
  function fitFont(ctx, text, maxW, size, font) { let s=size; ctx.font = `900 ${s}px ${font}`; while (ctx.measureText(text).width > maxW && s > 20) { s -= 4; ctx.font = `900 ${s}px ${font}`; } return s; }
  function draw(canvas, o) {
    const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d'), st = STYLES[o.style] || STYLES.sunburst, r = rng(o.seed||5), k = W/1280;
    // background
    const g = ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,st.bg[0]); g.addColorStop(1,st.bg[1]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    if (o.bgImage) { const iw=o.bgImage.naturalWidth||o.bgImage.width, ih=o.bgImage.naturalHeight||o.bgImage.height, sc=Math.max(W/iw,H/ih); ctx.drawImage(o.bgImage,(W-iw*sc)/2,(H-ih*sc)/2,iw*sc,ih*sc); ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,W,H); }
    // rays
    ctx.save(); ctx.translate(W*0.62,H*0.55); const n=18; for (let i=0;i<n;i++){ const a=i/n*Math.PI*2; ctx.fillStyle=st.ray; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,W,a,a+Math.PI/n*0.9); ctx.closePath(); ctx.fill(); } ctx.restore();
    if (st.grid) { ctx.strokeStyle='rgba(0,229,255,0.25)'; ctx.lineWidth=2*k; for(let i=0;i<14;i++){ const y=H*0.62+Math.pow(i/13,2)*H*0.38; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); } for(let i=-10;i<=10;i++){ ctx.beginPath(); ctx.moveTo(W*0.5+i*20*k,H*0.62); ctx.lineTo(W*0.5+i*160*k,H); ctx.stroke(); } }
    // glow behind hero
    const rg = ctx.createRadialGradient(W*0.7,H*0.5,0,W*0.7,H*0.5,H*0.6); rg.addColorStop(0,'rgba(255,255,255,0.55)'); rg.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    // sparkles / embers
    for (let i=0;i<46;i++){ const x=r()*W,y=r()*H,s=(1+r()*4)*k; ctx.fillStyle = st.embers ? `rgba(255,${120+Math.floor(r()*100)},60,${0.3+r()*0.6})` : `rgba(255,255,255,${0.25+r()*0.6})`; ctx.beginPath(); ctx.arc(x,y,s,0,7); ctx.fill(); }
    // hero model
    if (o.model) {
      const tmp = document.createElement('canvas'); tmp.width = Math.round(H*1.05); tmp.height = Math.round(H*1.05);
      root.FreeForge3D.render(tmp.getContext('2d'), o.model, tmp.width, tmp.height, o.yaw==null?32:o.yaw, -16, null, 0);
      const hs = H*0.8; ctx.save(); ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=30*k; ctx.shadowOffsetY=18*k; ctx.drawImage(tmp, W*0.72-hs/2, H*0.5-hs/2, hs, hs); ctx.restore();
      ctx.save(); ctx.globalAlpha=0.9; ctx.shadowColor=o.glow||'#ffffff'; ctx.shadowBlur=40*k; ctx.drawImage(tmp, W*0.72-hs/2, H*0.5-hs/2, hs, hs); ctx.restore();
    }
    // title
    const title = (o.title||'MY GAME').toUpperCase(), font = 'Impact, "Arial Black", sans-serif';
    ctx.save(); ctx.translate(W*0.06, H*0.5); ctx.rotate(-0.06);
    const maxW = W*0.56; const words = title.split(' '); let lines = words.length>1 && title.length>9 ? [words.slice(0,Math.ceil(words.length/2)).join(' '), words.slice(Math.ceil(words.length/2)).join(' ')] : [title];
    const fs = Math.min(...lines.map(l=>fitFont(ctx,l,maxW,200*k,font))); ctx.font=`900 ${fs}px ${font}`; ctx.textBaseline='middle'; ctx.lineJoin='round';
    lines.forEach((l,i)=>{ const y=(i-(lines.length-1)/2)*fs*1.0;
      ctx.strokeStyle=st.stroke; ctx.lineWidth=fs*0.28; ctx.strokeText(l,0,y+fs*0.06);
      const tg=ctx.createLinearGradient(0,y-fs/2,0,y+fs/2); tg.addColorStop(0,st.t0); tg.addColorStop(1,st.t1);
      ctx.lineWidth=fs*0.12; ctx.strokeStyle='#ffffff'; ctx.strokeText(l,0,y); ctx.fillStyle=tg; ctx.fillText(l,0,y); });
    ctx.restore();
    // subtitle ribbon
    if (o.subtitle) { ctx.save(); ctx.translate(W*0.06,H*0.84); ctx.rotate(-0.06); const sf=34*k; ctx.font=`900 ${sf}px ${font}`; const tw=ctx.measureText(o.subtitle.toUpperCase()).width+60*k;
      ctx.fillStyle=st.stroke; ctx.fillRect(0,-sf*0.8,tw,sf*1.6); ctx.fillStyle=st.t1; ctx.fillRect(0,-sf*0.8,10*k,sf*1.6); ctx.fillStyle='#fff'; ctx.textBaseline='middle'; ctx.fillText(o.subtitle.toUpperCase(),30*k,2*k); ctx.restore(); }
    // vignette
    const vg=ctx.createRadialGradient(W/2,H/2,H*0.5,W/2,H/2,W*0.75); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.38)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  }
  function drawIcon(canvas, o) {
    const S=canvas.width, ctx=canvas.getContext('2d'), rc = o.rarity||'#c084fc', k=S/512;
    const rr=(x,y,w,h,r)=>{ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };
    ctx.clearRect(0,0,S,S); rr(8*k,8*k,S-16*k,S-16*k,70*k); const g=ctx.createLinearGradient(0,0,0,S); g.addColorStop(0,'#3b3f63'); g.addColorStop(1,'#14162a'); ctx.fillStyle=g; ctx.fill();
    ctx.save(); rr(8*k,8*k,S-16*k,S-16*k,70*k); ctx.clip(); const rg=ctx.createRadialGradient(S/2,S*0.5,0,S/2,S*0.5,S*0.55); rg.addColorStop(0,rc+'cc'); rg.addColorStop(1,rc+'00'); ctx.fillStyle=rg; ctx.fillRect(0,0,S,S); ctx.restore();
    if (o.model) { const t=document.createElement('canvas'); t.width=t.height=S; root.FreeForge3D.render(t.getContext('2d'), o.model, S, S, o.yaw==null?35:o.yaw, -14, null, 0); ctx.save(); ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=18*k; ctx.shadowOffsetY=10*k; ctx.drawImage(t,S*0.06,S*0.04,S*0.88,S*0.88); ctx.restore(); }
    rr(8*k,8*k,S-16*k,S-16*k,70*k); ctx.lineWidth=14*k; ctx.strokeStyle=rc; ctx.stroke(); rr(20*k,20*k,S-40*k,S-40*k,58*k); ctx.lineWidth=3*k; ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.stroke();
  }
  root.FreeForgeThumb = { STYLES, draw, drawIcon };
})(typeof window!=='undefined'?window:globalThis);
