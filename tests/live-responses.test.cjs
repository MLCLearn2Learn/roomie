const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
const start = html.indexOf('function liveResponseSignature(');
const end = html.indexOf('setInterval(liveSync,2000);', start);
assert.ok(start !== -1 && end > start, 'Production liveSync section exists');
const source = html.slice(start, end);
const deferred = () => { let resolve; const promise = new Promise(yes => {resolve=yes;}); return {promise, resolve}; };

function harness(kind='poll') {
  const state={kind, act:'activity-1', q:'Question', named:false};
  const controls={rows:[{body:'A',name:null}], renderCount:0, trayCount:0, pops:0, pending:null};
  const context=vm.createContext({
    STUDENT:false, S:{liveOn:true,live:{code:'ABCD',key:'key'}},
    A:{overlay:kind==='poll'?'poll':'checkin', poll:{act:state.act,shown:false,opts:['A','B']}, live:{act:state.act,kind,state:JSON.stringify(state),res:[{body:'A',name:null}]}},
    liveAct:()=>state, studentWantsName:()=>false,
    rpc:async name=>{assert.equal(name,'get_responses'); return controls.pending||controls.rows;},
    drawTray:()=>{controls.trayCount++;}, pop:()=>{controls.pops++;},
    render:()=>{controls.renderCount++; if(controls.form) controls.form.value='';}
  });
  vm.runInContext(source,context);
  return {context,controls};
}

test('same-count body and name changes replace the cached responses',async()=>{
  const {context,controls}=harness();
  controls.rows=[{body:'B',name:null}]; await context.liveSync();
  assert.equal(context.A.live.res[0].body,'B'); assert.equal(controls.renderCount,1);
  controls.rows=[{body:'B',name:'Sam'}]; await context.liveSync();
  assert.equal(context.A.live.res[0].name,'Sam'); assert.equal(controls.renderCount,2);
  assert.equal(controls.pops,0,'An edit does not masquerade as an additional answer');
});

test('irrelevant server metadata does not trigger another results redraw',async()=>{
  const {context,controls}=harness();
  controls.rows=[{body:'A',name:null,updated_at:'later',id:7}]; await context.liveSync();
  assert.equal(controls.renderCount,0); assert.equal(controls.trayCount,0);
});

test('a response refresh preserves hidden and revealed poll state',async()=>{
  for(const shown of [false,true]){
    const {context,controls}=harness(); context.A.poll.shown=shown;
    const poll=context.A.poll; controls.rows=[{body:'B',name:null}]; await context.liveSync();
    assert.equal(context.A.poll,poll); assert.equal(context.A.poll.shown,shown);
    assert.equal(controls.renderCount,1);
  }
});

test('a late response cannot redraw a newly opened poll form and erase its draft',async()=>{
  const {context,controls}=harness(), response=deferred(); controls.pending=response.promise;
  const sync=context.liveSync();
  context.A.poll={type:'abcd',q:''}; controls.form={value:'Unsubmitted next question'};
  response.resolve([{body:'B',name:null}]); await sync;
  assert.equal(controls.renderCount,0); assert.equal(controls.form.value,'Unsubmitted next question');
  assert.equal(context.A.poll.act,undefined);
});

test('a same-count feelings change refreshes teacher totals; unrelated views stay open',async()=>{
  const {context,controls}=harness('feel'); controls.rows=[{body:'good',name:null}];
  await context.liveSync(); assert.equal(controls.renderCount,1);
  context.A.overlay='think'; controls.rows=[{body:'low',name:null}]; await context.liveSync();
  assert.equal(context.A.live.res[0].body,'low'); assert.equal(controls.renderCount,1);
});
