const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const html=fs.readFileSync('app/index.html','utf8');
function harness(){
 const elements={mvOut:{},mvSplash:{hidden:true},mvSplashIn:{}};
 const events=[],requests=[];
 const c=vm.createContext({TextEncoder,TextDecoder,Uint8Array,crypto:webcrypto,btoa,atob,URL,console,
  document:{getElementById:id=>elements[id],addEventListener:()=>{}},
  location:{href:'https://example.test/app/',hash:'',pathname:'/app/',search:'',reload:()=>events.push('reload')},
  history:{replaceState:()=>events.push('scrub')},setTimeout:()=>{},
  DEMO:{active:false},STUDENT:false,STORAGE:{original:null},S:{days:{},routines:[],students:['Original']},
  esc:s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),
  toast:m=>events.push(m),classWithDefaults:o=>({...o}),save:()=>{events.push('save');return true},
  classProfileBlockReason:()=>'',clearClassRuntime:()=>events.push('clear'),
  rpc:async(fn,args)=>{requests.push({fn,args});return true;},window:{confirm:()=>true}
 });
 vm.runInContext(fs.readFileSync('app/transfer-v2.js','utf8'),c);
 vm.runInContext(html.slice(html.indexOf('function isValidClassData('),html.indexOf('function load(){')),c);
 vm.runInContext(html.slice(html.indexOf('/* Secure transfer v2:'),html.indexOf('/* ---- v2.2: three-minute setup')),c);
 return {c,t:c.window.RoomieTransferV2,elements,events,requests,msg:{}};
}
const sample={days:{},routines:[],students:['Fictional A','Fictional B'],room:'Test',classProfileId:'one',classProfiles:[{id:'two',data:{days:{},routines:[],students:['Other']}}]};
test('256-bit canonical codes; independent stable lookup; authenticated Unicode round trip',async()=>{
 const {t}=harness(),codes=new Set();for(let i=0;i<100;i++)codes.add(t.createCode());assert.equal(codes.size,100);
 const code=t.createCode(),a=await t.encrypt({...sample,note:'é 🐨'},code),b=await t.encrypt({...sample,note:'é 🐨'},code);
 assert.match(code,/^[A-Za-z0-9_-]{43}$/);assert.match(a.id,/^[A-Za-z0-9_-]{22}$/);assert.notEqual(a.id,code.slice(0,22));assert.equal(a.id,b.id);assert.notEqual(a.blob,b.blob);
 assert.equal((await t.decrypt(a.blob,code)).note,'é 🐨');assert.equal(a.blob.includes('Fictional'),false);
 await assert.rejects(t.decrypt(a.blob,t.createCode()));
 const parts=a.blob.split('.');parts[3]=(parts[3][0]==='A'?'B':'A')+parts[3].slice(1);await assert.rejects(t.decrypt(parts.join('.'),code));
 for(const bad of ['',code.toUpperCase()+'A','A'.repeat(42)+'B','ABCD-2345'])await assert.rejects(t.derive(bad));
 for(const bad of [null,'v2.z.AAAA.AAAA','v2.r.!.!', 'v2.r.AA.AA','x'.repeat(4000001)])await assert.rejects(t.decrypt(bad,code));
 await assert.rejects(t.encrypt({x:'x'.repeat(3000000)},code),/too large/);
});
async function receive(overrides={}){
 const h=harness(),code=h.t.createCode(),encrypted=await h.t.encrypt(sample,code);
 h.c.rpc=async(fn,args)=>{h.requests.push({fn,args});h.events.push(fn);if(fn==='peek_transfer_v2')return encrypted.blob;return true;};
 Object.assign(h.c,overrides);return {...h,code,encrypted};
}
test('sender submits only derived lookup and encrypted package; private link uses fragment',async()=>{
 const h=harness(),code=await h.c.moveSend();assert.equal(h.requests.length,1);assert.equal(h.requests[0].fn,'put_transfer_v2');assert.equal(JSON.stringify(h.requests).includes(code),false);
 assert.ok(h.elements.mvOut.innerHTML.includes('#move='+code));assert.ok(!h.elements.mvOut.innerHTML.includes('?move='+code));
});
test('receiver validates and saves all profiles before acknowledgement',async()=>{
 const h=await receive();assert.equal(await h.c.moveTake(h.code,h.msg),true);
 assert.deepEqual(h.events,['peek_transfer_v2','save','finish_transfer_v2','clear']);assert.equal(h.c.S.classProfiles[0].data.students[0],'Other');
});
test('failed persistence preserves exact previous state and does not consume package',async()=>{
 const h=await receive({save:()=>false}),before=h.c.S;
 assert.equal(await h.c.moveTake(h.code,h.msg),false);assert.equal(h.c.S,before);assert.deepEqual(h.requests.map(x=>x.fn),['peek_transfer_v2']);
});
test('cancel, old code, demo, student, damaged storage and live session do not call server',async()=>{
 for(const setup of [h=>h.c.window.confirm=()=>false,h=>h.c.DEMO.active=true,h=>h.c.STUDENT=true,h=>h.c.STORAGE.original='bad',h=>h.c.classProfileBlockReason=()=> 'Stop session']){
 const h=await receive();setup(h);assert.equal(await h.c.moveTake(h.code,h.msg),false);assert.equal(h.requests.length,0);}
 const h=await receive();assert.equal(await h.c.moveTake('ABCD-2345',h.msg),false);assert.equal(h.requests.length,0);
});
test('corruption, invalid schema and server failures never replace local classes',async()=>{
 for(const mode of ['schema','corrupt','network','missing']){
 const h=await receive(),before=h.c.S;
 const blob=mode==='schema'?(await h.t.encrypt({students:'bad'},h.code)).blob:mode==='missing'?null:'v2.r.AA.AA';
 h.c.rpc=async()=>{if(mode==='network')throw Error('offline');return blob;};
 assert.equal(await h.c.moveTake(h.code,h.msg),false);assert.equal(h.c.S,before);assert.equal(h.events.includes('save'),false);
 }
});
test('acknowledgement outage still reports successful local save with honest retention message',async()=>{
 const h=await receive();h.c.rpc=async fn=>{if(fn==='peek_transfer_v2')return h.encrypted.blob;throw Error('offline');};
 assert.equal(await h.c.moveTake(h.code,h.msg),true);assert.match(h.msg.innerHTML,/Deletion could not be confirmed/);
});
test('session starting during retrieval prevents replacement',async()=>{
 const h=await receive(),before=h.c.S;h.c.rpc=async()=>{h.c.classProfileBlockReason=()=> 'Stop session';return h.encrypted.blob;};
 assert.equal(await h.c.moveTake(h.code,h.msg),false);assert.equal(h.c.S,before);
});
test('double receive is serialized',async()=>{
 const h=await receive();const first=h.c.moveTake(h.code,h.msg);assert.equal(await h.c.moveTake(h.code,h.msg),false);assert.equal(await first,true);assert.equal(h.requests.filter(x=>x.fn==='peek_transfer_v2').length,1);
});
test('fragment capture scrubs URL without auto-import or network calls',()=>{
 const h=harness(),code=h.t.createCode();h.c.location.hash='#move='+code;h.c.captureMoveLink();assert.equal(h.elements.mvSplashIn.value,code);assert.equal(h.elements.mvSplash.hidden,false);assert.deepEqual(h.events,['scrub']);assert.equal(h.requests.length,0);
});
test('every inline application script parses and external crypto precedes it',()=>{
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 assert.ok(html.indexOf('src="./transfer-v2.js"')<html.indexOf('<script>'));assert.equal(html.includes("rpc('take_transfer'"),false);
});

test('unexpected persistence exception also restores the previous state',async()=>{const h=await receive({save:()=>{throw Error('storage failure');}}),before=h.c.S;assert.equal(await h.c.moveTake(h.code,h.msg),false);assert.equal(h.c.S,before);assert.deepEqual(h.requests.map(x=>x.fn),['peek_transfer_v2']);});
