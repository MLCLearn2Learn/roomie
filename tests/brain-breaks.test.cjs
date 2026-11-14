const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
function between(start,end) {
  const a=html.indexOf(start), b=html.indexOf(end,a+start.length);
  assert.ok(a!==-1&&b>a,`Production section exists: ${start}`);
  return html.slice(a,b);
}
const escapeHTML=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function harness() {
  const controls={spoken:[],screen:'',saved:0,change:null}; let id=0;
  const context=vm.createContext({
    S:{keepEveryoneInGame:true}, A:{}, uid:()=>String(++id),
    esc:escapeHTML, backBtn:()=>'', setStage:(_,markup)=>{controls.screen=markup;},
    navPrepareStart:()=>true,clearActivity(){},markTools(){},render(){},Music:{play(){},stop(){},fadeStop(){}},
    speakLine:line=>controls.spoken.push(line), brainVoiceOn:()=>true, brainPaceTap:()=>true,
    MT:{start(){}},actH:[],setInterval:()=>1,setTimeout:()=>1,freezeLoop(){},chime(){},$(){return null;},
    save:()=>{controls.saved++;},editR:null,routineById:()=>null,
    document:{addEventListener:(type,fn)=>{if(type==='change')controls.change=fn;}}
  });
  vm.runInContext(between('const BREAKS = [','/* ================= Data ================= */'),context);
  vm.runInContext(between('const EXPECT={','let S, firstRun=false;'),context);
  vm.runInContext(between('startBrain=function(type,id){','renderBrain=function(full){'),context);
  vm.runInContext(between('const BCATS=','/* ---- Quick reflections'),context);
  vm.runInContext(between("document.addEventListener('change',async e=>{ const el=e.target; if(!el.closest('#sheetHost')) return; const r=routineById(editR);",'/* ================= Fun layer'),context);
  const breaks=vm.runInContext('BREAKS',context);
  return {context,controls,breaks};
}

test('new classes default to inclusive games; existing classes and explicit choices are preserved',()=>{
  const {context}=harness();
  assert.equal(context.defaults().keepEveryoneInGame,true);
  assert.equal(context.defaults('middle').keepEveryoneInGame,true);
  assert.equal(context.classWithDefaults({band:'primary'}).keepEveryoneInGame,false);
  for(const choice of [false,true]) {
    const routines=[{id:'custom',steps:'Our own routine'}], expect={custom:{items:[['chair','Our choice']]}};
    const saved={band:'primary',keepEveryoneInGame:choice,routines,expect};
    const loaded=context.classWithDefaults(saved);
    assert.equal(loaded.keepEveryoneInGame,choice);
    assert.equal(loaded.routines,routines); assert.equal(loaded.expect,expect);
    assert.deepEqual(saved,{band:'primary',keepEveryoneInGame:choice,routines,expect});
  }
});

test('coin, rhyme and champion variants keep all players in and offer participation choices',()=>{
  const {context,breaks}=harness();
  for(const id of ['coin','rhyme','champ']) {
    const base=breaks.find(b=>b.id===id), originalHow=base.how, originalCalls=JSON.stringify(base.calls);
    const variant=context.brainBreakVariant(base,true), calls=variant.gen?variant.gen():variant.calls;
    assert.match(variant.how,/seated or standing/);
    assert.match(variant.how,/comfortable movement or signal, or watch/);
    assert.doesNotMatch(variant.how+' '+calls.join(' '),/sit down|last ones standing|find another winner|down to the last few/i);
    assert.equal(base.how,originalHow); assert.equal(JSON.stringify(base.calls),originalCalls);
  }
});

test('switching the option off restores original instructions and generated elimination prompts',()=>{
  const {context,breaks}=harness();
  for(const id of ['coin','rhyme','champ']) {
    const base=breaks.find(b=>b.id===id);
    context.brainBreakVariant(base,true);
    const original=context.brainBreakVariant(base,false);
    assert.equal(original.how,base.how); assert.equal(original.gen,base.gen);
    assert.equal(JSON.stringify(original.calls),JSON.stringify(base.calls));
    if(base.calls) {assert.notEqual(original.calls,base.calls); original.calls[0]='Changed local copy'; assert.notEqual(base.calls[0],'Changed local copy');}
  }
  assert.match(context.brainBreakVariant(breaks.find(b=>b.id==='coin'),false).gen().join(' '),/sit down/);
});

test('the production start function uses the selected variant for screen and spoken instructions without mutating the catalogue',()=>{
  const {context,controls,breaks}=harness();
  const base=breaks.find(b=>b.id==='coin'), before=JSON.stringify(base);
  context.startBrain(null,'coin');
  assert.notEqual(context.A.brain,base);
  assert.equal(context.A.brain.calls.length,16);
  assert.match(controls.spoken.at(-1),/Everyone plays every round/);
  assert.doesNotMatch(context.A.brain.calls.join(' '),/sit down/);
  assert.equal(JSON.stringify(base),before);
  context.S.keepEveryoneInGame=false; context.startBrain(null,'coin');
  assert.match(context.A.brain.how,/Last ones standing win/);
  assert.match(context.A.brain.calls.join(' '),/sit down/);
  assert.equal(JSON.stringify(base),before);
});

test('the picker previews the chosen rules, and the Fun checkbox saves an explicit preference',async()=>{
  const {context,controls}=harness();
  context.renderBrainPicker(true); assert.match(controls.screen,/Everyone plays every round/);
  assert.doesNotMatch(controls.screen,/Stuck\? Sit down/);
  assert.match(context.brainBreakSettingsHTML(),/id="fKeepEveryoneInGame" checked/);
  await controls.change({target:{id:'fKeepEveryoneInGame',checked:false,dataset:{},closest:()=>true}});
  assert.equal(context.S.keepEveryoneInGame,false); assert.equal(controls.saved,1);
  context.renderBrainPicker(true); assert.match(controls.screen,/Stuck\? Sit down/);
  assert.doesNotMatch(context.brainBreakSettingsHTML(),/id="fKeepEveryoneInGame" checked/);
  assert.match(controls.screen,/Brain break settings/,'The option is available in the brain-break picker');
  assert.match(controls.screen,/id="fKeepEveryoneInGame"/);
});

test('movement and choice games offer seated participation without changing their stored originals',()=>{
  const {context,breaks}=harness();
  for(const id of ['statue','animals','weatherbody','shake','mirror','says','rather','thisthat']) {
    const base=breaks.find(b=>b.id===id), before=JSON.stringify(base), variant=context.brainBreakVariant(base,true);
    assert.match(variant.how,/seated or standing/);
    assert.equal(JSON.stringify(base),before);
  }
  assert.match(context.brainBreakVariant(breaks.find(b=>b.id==='rather'),true).how,/word, a card or a comfortable signal/);
  assert.match(context.brainBreakVariant(breaks.find(b=>b.id==='thisthat'),true).how,/move, point, or say your choice from your seat/);
});
