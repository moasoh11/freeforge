const E=require('../engine.js'),F=require('../core.js'),G=require('../forge3d.js'),A=require('../anim.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m)}};
const cases={'spooky haunted house horror':'horror','space station robot':'scifi','cute pet bakery simulator':'cute','dragon kingdom rpg':'fantasy','pizza restaurant tycoon':'tycoon','speed obby parkour':'obby','something unclassified':'fantasy','pirate island treasure':'pirate','street racing drift':'racing','mech robot arena':'mech','pvp battle royale':'combat','cozy farm village':'nature'};
for(const p in cases){const b=E.plan(p);ok(b.genre===cases[p],p+' -> '+b.genre);const r=E.build(b,{core:F,g3d:G,anim:A});ok(Object.keys(r.files).length>=8,'files');
 ok(!/undefined|NaN/.test(r.files['ui/'+b.name+'_UI.lua']),'luau '+p);
 const z=E.zip(r.files);ok(z[0]===0x50&&z[1]===0x4b,'zip magic');
 // verify with unzip if available
 require('fs').writeFileSync('/tmp/_e.zip',z);const o=require('child_process').spawnSync('unzip',['-tq','/tmp/_e.zip']);ok(o.status===0,'unzip test '+p+' '+(o.stdout||'')+(o.stderr||''));}
{const c=E.applyAi(E.plan('x game'),{accent:'#1e90ff'});ok(c.thumbStyle==='ocean','hue ocean '+c.thumbStyle);const d=E.applyAi(E.plan('x game'),{accent:'#33dd44'});ok(d.thumbStyle==='forest','hue forest');const g=E.applyAi(E.plan('x game'),{accent:'#888888'});ok(g.aiPlanned,'gray ok')}
ok(E.plan('same').seed===E.plan('same').seed,'deterministic');
try{E.plan('');ok(0,'empty')}catch(e){}
console.log(bad?'FAILURES '+bad:'ALL PASS ENGINE');process.exit(bad?1:0);
