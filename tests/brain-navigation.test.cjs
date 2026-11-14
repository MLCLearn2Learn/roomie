const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)+a.length));
function prompts(){
 const fields=Object.fromEntries(['#call','#bstepn','[data-bstep="1"]','[data-bstep="-1"]'].map(k=>[k,{textContent:'',className:'',offsetWidth:1,classList:{remove(){},add(){}}}]));
 const context=vm.createContext({A:{brain:{calls:['First','Second','Last']},callIdx:0},$:k=>fields[k],brainSay(){},brainFreezeNow(){}});
 vm.runInContext(cut('function brainShow(i){','startBrain=function(type,id){'),context);
 vm.runInContext(cut('function brainNext(d){','/* BRAIN_CONTROLS_START */'),context);
 return {context,fields};
}
test('Previous stays at the first prompt; forward restart is explicit and updates button states',()=>{
 const {context:c,fields:f}=prompts();c.brainShow(0);assert.equal(f['[data-bstep="-1"]'].disabled,true);
 assert.equal(c.brainNext(-1),false);assert.equal(c.A.callIdx,0);
 c.brainNext(1);assert.equal(c.A.callIdx,1);assert.equal(f['[data-bstep="-1"]'].disabled,false);
 c.brainNext(1);assert.equal(c.A.callIdx,2);assert.equal(f['[data-bstep="1"]'].textContent,'Start again ↻');
 c.brainNext(1);assert.equal(c.A.callIdx,0);assert.equal(f['[data-bstep="-1"]'].disabled,true);assert.equal(f['[data-bstep="1"]'].textContent,'Next prompt ▶');
});
function controls(owner='brain'){
 const handlers={},calls=[];const S={brainPace:'tap',brainVoice:true,mascot:true,scenes:true};const A={overlay:'brain',callIdx:1,brain:{calls:['One','Two'],every:8}};
 const c=vm.createContext({A,S,NAV:{owner},document:{addEventListener:(type,fn)=>handlers[type]=fn},audio(){},save:()=>calls.push('save'),clearActivity:()=>calls.push('clear'),brainPaceTap:()=>S.brainPace!=='auto',brainVoiceOn:()=>S.brainVoice!==false,actH:[],setInterval:()=>{calls.push('interval');return 1;},freezeLoop(){},brainShow(){},brainNext:d=>{calls.push('next:'+d);return true;},brainFreezeNow(){},brainFinish:()=>calls.push('finish'),brainBrowse:category=>calls.push('browse:'+category),brainRefreshSettings:selector=>calls.push('refresh:'+selector),speechSynthesis:{cancel:()=>calls.push('cancel speech')}});
 vm.runInContext(html.split('/* BRAIN_CONTROLS_START */')[1].split('/* BRAIN_CONTROLS_END */')[0],c);
 const click=(selector,node)=>handlers.click({target:{closest:s=>s===selector?node:null}});
 return {c,A,S,handlers,calls,click};
}
test('Space and arrow keys on buttons, settings or dialogs retain their native behaviour',()=>{
 const h=controls();for(const key of [' ','ArrowRight','PageDown']){let prevented=false;h.handlers.keydown({key,target:{closest:()=>({})},preventDefault:()=>{prevented=true;}});assert.equal(prevented,false);}
 assert.deepEqual(h.calls,[]);let prevented=false;h.handlers.keydown({key:'ArrowRight',target:{closest:()=>null},preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);assert.deepEqual(h.calls,['next:1']);
});
test('category controls browse instead of starting a replacement, and Finish has one action',()=>{
 const h=controls();h.click('[data-browsebrain]',{dataset:{browsebrain:'calm'}});assert.deepEqual(h.calls,['browse:calm']);h.click('[data-bfinish]',{});assert.equal(h.calls.at(-1),'finish');
});
test('changing default pace in the chooser cannot clear an unrelated running activity',()=>{
 const h=controls('timer');h.A.overlay='brainpick';h.click('[data-bpace]',{dataset:{bpace:'auto'}});assert.equal(h.S.brainPace,'auto');assert.ok(h.calls.includes('save'));assert.ok(!h.calls.includes('clear'));assert.ok(!h.calls.includes('interval'));assert.equal(h.A.callIdx,1);assert.equal(h.S.mascot,true);assert.equal(h.S.scenes,true);
});
test('changing pace for the current background break preserves its prompt while rescheduling playback',()=>{
 const h=controls();h.A.overlay='brainpick';h.click('[data-bpace]',{dataset:{bpace:'auto'}});assert.equal(h.A.callIdx,1);assert.ok(h.calls.includes('clear'));assert.ok(h.calls.includes('interval'));
 h.click('[data-bvoice]',{});assert.equal(h.S.brainVoice,false);assert.ok(h.calls.includes('cancel speech'));
});
test('browsing preserves the existing break, while Finish stops it and returns to the chooser',()=>{
 const A={bcat:'game',overlay:'brain'},MT={left:75},calls=[];
 const c=vm.createContext({A,MT,openOverlay:key=>{A.overlay=key;calls.push(key);},navStopActivity:()=>{MT.left=0;calls.push('stop');},render(){},document:{querySelector:()=>null}});
 vm.runInContext(html.split('/* BRAIN_NAV_START */')[1].split('/* BRAIN_NAV_END */')[0],c);
 c.brainBrowse('calm');assert.equal(A.bcat,'calm');assert.equal(A.overlay,'brainpick');assert.equal(MT.left,75);
 c.brainFinish();assert.equal(MT.left,0);assert.equal(A.overlay,'brainpick');assert.deepEqual(calls,['brainpick','stop','brainpick']);
});

test('automatic freeze playback continues while browsing and cannot resume after its owner stops',()=>{
 const jobs=[],events=[],NAV={owner:'brain'},MT={running:true};
 const c=vm.createContext({NAV,MT,A:{overlay:'brainpick'},Music:{pause:()=>events.push('pause'),resume:()=>events.push('resume')},$:()=>null,actH:[],setTimeout:fn=>{jobs.push(fn);return jobs.length;},Math});
 vm.runInContext(cut('function freezeLoop(){','function renderBrain(full){'),c);
 c.freezeLoop();jobs.shift()();assert.deepEqual(events,['pause']);jobs.shift()();assert.deepEqual(events,['pause','resume']);
 NAV.owner=null;jobs.shift()();assert.deepEqual(events,['pause','resume']);
});
