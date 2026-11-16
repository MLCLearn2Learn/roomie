const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('app/index.html','utf8');
const src=html.slice(html.indexOf('const UI_SIMPLE_DOCK='),html.indexOf('function uiTabDestination('));
const run=S=>{ const c=vm.createContext({S,STUDENT:false}); vm.runInContext(src+';this.calmScreen=calmScreen;this.dockPresetNow=dockPresetNow;this.uiDockKeys=uiDockKeys;',c); return c; };
test('calm screen is on by default and keeps every bottom bar tool unless the teacher picks Simple',()=>{
 const c=run({});assert.equal(c.calmScreen(),true);assert.equal(c.dockPresetNow(),undefined);
 assert.deepEqual([...c.uiDockKeys(['quiz','timer','routines'],[],c.dockPresetNow())],['quiz','timer','routines']);
 const simple=run({dockPreset:'simple'});assert.deepEqual([...simple.uiDockKeys(['quiz'],[],simple.dockPresetNow())],['routines','timer','brain','pick']);
 const off=run({calmScreen:false,dockHide:['quiz']});assert.equal(off.calmScreen(),false);
 assert.deepEqual([...off.uiDockKeys(['quiz','timer'],['quiz'],off.dockPresetNow())],['timer']);
});
test('the More menu reaches every hidden top-bar tool',()=>{
 for(const k of ['float','remote','live','voice','tour']) assert.ok(html.includes("['"+k+"',"));
 assert.ok(html.includes('id="calmMore"'));assert.ok(html.includes('data-calm-screen="off"'));
});
test('choosing a custom bottom bar for the first time starts from the four everyday tools',()=>{
 
 assert.ok(html.includes("function meterCard(){ if(calmScreen()&&!N.on) return '';"));
 assert.ok(html.includes("if(k==='meter'){ act('noise'); return; }"));
});
