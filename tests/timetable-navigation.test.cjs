const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
const editSource=html.split('/* TIMETABLE_EDIT_START */')[1].split('/* TIMETABLE_EDIT_END */')[0];
test('lesson editing selects the active one-off plan rather than changing the usual weekday',()=>{
 const c=vm.createContext({});vm.runInContext(editSource,c);const regular={id:'regular'},special={id:'special'},days={mon:[regular],d20261116:[special]};
 assert.deepEqual(JSON.parse(JSON.stringify(c.timetableEditTarget(days,'mon','d20261116',special))),{day:'d20261116',index:0});
 assert.equal(c.timetableEditTarget(days,'mon','d20261116',regular).index,-1);
 assert.deepEqual(JSON.parse(JSON.stringify(c.timetableEditTarget(days,'mon','d20261117',{id:'regular'}))),{day:'mon',index:0});
});
test('Edit expands and focuses the selected block before presenting its fields, without saving changes',()=>{
 let opened=false,focused=false,scrolled=false;const block={id:'maths'};const c=vm.createContext({S:{days:{mon:[{id:'arrival'},block]}},now:()=>new Date(2026,10,16),isWeekend:()=>false,dayKey:()=> 'mon',onceKey:()=> 'd20261116',editDay:null,planOpen:-1,tab:'look',toast(){throw new Error('unexpected warning');},openSetup:()=>{opened=true;assert.equal(c.planOpen,1);assert.equal(c.tab,'plan');},requestAnimationFrame:fn=>fn(),document:{querySelector:selector=>{assert.equal(selector,'.prow[data-i="1"]');return {scrollIntoView:()=>{scrolled=true;},querySelector:()=>({focus:()=>{focused=true;}})};}}});
 vm.runInContext(editSource,c);c.editTimetableBlock(block);assert.equal(opened,true);assert.equal(focused,true);assert.equal(scrolled,true);assert.equal(c.editDay,'mon');assert.equal(c.S.days.mon[1],block);
});
test('an unchanged timetable does not replace focused controls on every clock tick',()=>{
 let replacements=0;const document={activeElement:null,body:{classList:{contains:()=>false}}};const strip={_html:'',contains:el=>!!el.dataset?.seg,querySelector:selector=>({dataset:{seg:selector.match(/"(\d+)"/)[1]},focus(){document.activeElement=this;},closest(){return this;}})};
 Object.defineProperty(strip,'innerHTML',{get(){return this._html;},set(value){this._html=value;replacements++;}});
 const c=vm.createContext({document,$:()=>strip,now:()=>new Date(),fmtClock:x=>String(x),esc:x=>String(x)});
 vm.runInContext(html.slice(html.indexOf('function renderStrip(P){'),html.indexOf('function render(full){')),c);
 const P={mins:0,day:[{st:600,en:660,b:{name:'Maths',kind:'lesson'}}]};c.renderStrip(P);const node={dataset:{seg:'0'},closest(){return this;}};document.activeElement=node;
 c.renderStrip(P);assert.equal(replacements,1);assert.equal(document.activeElement,node);
 c.renderStrip({...P,mins:610});assert.equal(replacements,2);assert.equal(document.activeElement.dataset.seg,'0');assert.notEqual(document.activeElement,node);
});
test('class-switch labels do not promise End and switch when the activity must first be stopped',()=>{
 let blocked='Stop the current activity before changing classes.';
 const c=vm.createContext({profileHasActivity:()=>true,classProfileBlockReason:()=>blocked});vm.runInContext(html.slice(html.indexOf('function profileSwitchLabel('),html.indexOf('function profileManagerHTML(')),c);
 assert.equal(c.profileSwitchLabel(),'Switch class');blocked='';assert.equal(c.profileSwitchLabel(),'End activity and switch');
});
