const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
const source=html.split('/* FEATURE_SETTINGS_START */')[1].split('/* FEATURE_SETTINGS_END */')[0];
function harness(){
 const listeners={},summary={};let saved=0,rendered=0;
 const S={stations:'Reading\nWriting',rotMin:12,keepEveryoneInGame:false,mascot:true,scenes:true,accent:'pink',pics:{welcome:'existing-picture'}};
 const A={overlay:'rotationSetup',groups:[['A'],['B']]};
 const context=vm.createContext({S,A,stationsList:()=>S.stations.split('\n').filter(Boolean).slice(0,8),save:()=>{saved++;},render:()=>{rendered++;},document:{addEventListener:(type,fn)=>listeners[type]=fn,querySelector:selector=>selector==='[data-rotation-summary]'?summary:null}});
 vm.runInContext(source,context);
 return {S,A,listeners,summary,get saved(){return saved;},get rendered(){return rendered;}};
}
test('rotation edits keep saved appearance intact and invalidate groups only when stations change',()=>{
 const h=harness(),before=JSON.stringify({mascot:h.S.mascot,scenes:h.S.scenes,accent:h.S.accent,pics:h.S.pics});
 h.listeners.input({target:{id:'fRotMin',value:'18',closest:()=>true}});assert.equal(h.S.rotMin,18);assert.equal(h.A.groups.length,2);assert.match(h.summary.textContent,/18 minutes/);
 h.listeners.input({target:{id:'fStations',value:'One\nTwo\nThree',closest:()=>true}});assert.equal(h.S.stations,'One\nTwo\nThree');assert.equal(h.A.groups.length,0);assert.match(h.summary.textContent,/3 stations/);
 assert.equal(JSON.stringify({mascot:h.S.mascot,scenes:h.S.scenes,accent:h.S.accent,pics:h.S.pics}),before);assert.equal(h.saved,2);
});
test('rotation edits are restricted to the rotation setup screen and keep duration limits',()=>{
 const h=harness();h.A.overlay='rotate';h.listeners.input({target:{id:'fRotMin',value:'25',closest:()=>true}});assert.equal(h.S.rotMin,12);assert.equal(h.saved,0);
 h.A.overlay='rotationSetup';for(const [value,expected] of [['100',40],['1',2],['',12]]){h.listeners.input({target:{id:'fRotMin',value,closest:()=>true}});assert.equal(h.S.rotMin,expected);}
});
test('brain-break choice saves from its own screen without changing appearance or rotation setup',()=>{
 const h=harness();h.A.overlay='brainpick';h.listeners.change({target:{id:'fKeepEveryoneInGame',checked:true,closest:()=>true}});assert.equal(h.S.keepEveryoneInGame,true);assert.equal(h.saved,1);assert.equal(h.rendered,1);assert.equal(h.S.mascot,true);assert.equal(h.S.scenes,true);assert.equal(h.S.rotMin,12);
});
