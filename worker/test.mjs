import w from './worker.js';
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} };
const kv=new Map(); const env={ AI:{ run:async(m,i)=> m.includes('flux')?{image:Buffer.from('JPEGDATA').toString('base64'),_p:i.prompt,_w:i.width}:{response:'{"ok":1}'} },
  RL:{ n:0, limit:async function(){ return { success: ++this.n<=3 }; } }, KV:{ get:async k=>kv.get(k)||null, put:async(k,v)=>kv.set(k,v) } };
const call=(path,body,origin='https://moasoh11.github.io',method='POST')=>w.fetch(new Request('https://x.workers.dev'+path,{ method, headers:{ origin,'content-type':'application/json','cf-connecting-ip':'1.2.3.4' }, body:method==='POST'?JSON.stringify(body):undefined }),env);
let r=await call('/image',{prompt:'glowing sword',style:'icon',width:99999,height:10}); ok(r.status===200&&r.headers.get('content-type')==='image/jpeg','image ok '+r.status);
r=await call('/image',{prompt:'x'}); ok(r.status===400,'short prompt');
r=await call('/image',{prompt:'sword'},'https://evil.example'); ok(r.status===403,'origin blocked');
r=await call('/llm',{system:'s',user:'build a house'}); ok(r.status===200&&(await r.json()).text,'llm ok');
r=await call('/llm',{user:'again'}); ok(r.status===429,'rate limit '+r.status);
env.RL.n=0; kv.set('d:'+new Date().toISOString().slice(0,10)+':image','120'); r=await call('/image',{prompt:'sword here'}); ok(r.status===503,'daily cap '+r.status);
r=await call('/health',null,'https://moasoh11.github.io','GET'); ok(r.status===200,'health');
r=await call('/nope',{}); ok(r.status===404,'404');
console.log(fail?fail+' FAIL':'WORKER TESTS PASS'); process.exit(fail?1:0);
