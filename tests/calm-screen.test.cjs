const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('app/index.html','utf8');
const src=html.slice(html.indexOf('function calmScreen()'),html.indexOf('function uiTabDestination('));
const run=S=>{ const c=vm.createContext({S,STUDENT:false}); vm.runInContext(src+';this.calmScreen=calmScreen;this.dockPresetNow=dockPresetNow;this.uiDockKeys=uiDockKeys;',c); return c; };
test('calm screen is on by default and shows the four everyday tools',()=>{
 const c=run({});assert.equal(c.calmScreen(),true);assert.equal(c.dockPresetNow(),'simple');
 assert.deepEqual([...c.uiDockKeys(['quiz','timer','routines'],[],c.dockPresetNow())],['routines','timer','brain','pick']);
});
test('a custom bottom bar or Show every button keeps the teacher’s own setup',()=>{
 assert.equal(run({dockPreset:'custom'}).dockPresetNow(),'custom');
 const off=run({calmScreen:false,dockHide:['quiz']});assert.equal(off.calmScreen(),false);assert.equal(off.dockPresetNow(),undefined);
 assert.deepEqual([...off.uiDockKeys(['quiz','timer'],['quiz'],off.dockPresetNow())],['timer']);
});
test('the More menu reaches every hidden top-bar tool',()=>{
 for(const k of ['float','remote','live','voice','tour']) assert.ok(html.includes("['"+k+"',"));
 assert.ok(html.includes('id="calmMore"'));assert.ok(html.includes('data-calm-screen="off"'));
});
