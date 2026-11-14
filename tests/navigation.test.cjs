const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('app/index.html','utf8');
const source=html.slice(html.indexOf('const UI_TOOL_GROUPS='),html.indexOf('/* TOOL_FINDER_END */'));
const ctx=vm.createContext({}); vm.runInContext(source,ctx);
const find=q=>JSON.parse(JSON.stringify(ctx.uiFindTools(q)));
const keys=q=>find(q).flatMap(([,tools])=>tools.map(t=>t[0]));
test('tool finder lists teaching tools without duplicating the Students menu',()=>{
 const result=keys('');assert.equal(result.length,13);assert.equal(new Set(result).size,13);
 for(const key of ['routines','timer','brain','checkin','exit','reflect','think','quiz','poll','finish','packup','reteach','calm']) assert.ok(result.includes(key));
 for(const key of ['seats','pick','groups','rotate','jobs','hero']) assert.ok(!result.includes(key));
 const classSource=html.slice(html.indexOf('const CLASS_TOOLS='),html.indexOf('function closeClassPop('));
 const classes=vm.createContext({});vm.runInContext(classSource+';this.tools=CLASS_TOOLS;',classes);
 for(const key of ['seats','pick','groups','rotate','jobs','hero']) assert.ok(classes.tools.some(t=>t[0]===key));
});
test('teacher phrases, punctuation and case find the intended tools',()=>{
 for(const [query,key] of [['EXIT ticket','exit'],['check-in','checkin'],['early finishers','finish'],['breathing','calm']]) assert.deepEqual(keys(query),[key]);
 assert.deepEqual(keys('  '),keys(''));assert.deepEqual(keys('zzzxxy'),[]);
});
test('filtering never mutates the catalogue and text is not treated as code',()=>{
 const before=find('');find('timer');find('<script>alert(1)</script>');assert.deepEqual(find(''),before);assert.deepEqual(keys('<script>'),[]);
});
const keySource=html.slice(html.indexOf('function uiToolFinderKey('),html.indexOf("document.addEventListener('input',e=>{ if(e.target.id==='toolSearch')"));
function harness(){
 const document={activeElement:null};const items=[0,1].map(i=>({focus(){document.activeElement=this;},click(){this.clicked=true;}}));
 const context=vm.createContext({document});vm.runInContext(keySource,context);
 const menu={querySelectorAll:()=>items};
 const event=(key,id='toolSearch')=>({key,target:{id},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
 return {document,items,context,menu,event};
}
test('search arrows reach results and wrap; typing cannot trigger classroom hotkeys',()=>{
 const h=harness();let e=h.event('ArrowDown');h.context.uiToolFinderKey(e,h.menu);assert.equal(h.document.activeElement,h.items[0]);assert.ok(e.prevented);
 h.context.uiToolFinderKey(h.event('ArrowUp'),h.menu);assert.equal(h.document.activeElement,h.items[1]);
 e=h.event('a');h.context.uiToolFinderKey(e,h.menu);assert.ok(e.stopped);assert.equal(e.prevented,undefined);
 e=h.event('Home');h.context.uiToolFinderKey(e,h.menu);assert.equal(e.prevented,undefined);
 e=h.event('Tab');h.context.uiToolFinderKey(e,h.menu);assert.equal(e.stopped,undefined);
});
test('Enter opens a single match, focuses first of several, and tolerates no results',()=>{
 const h=harness();h.context.uiToolFinderKey(h.event('Enter'),h.menu);assert.equal(h.document.activeElement,h.items[0]);assert.equal(h.items[0].clicked,undefined);
 h.menu.querySelectorAll=()=>[h.items[0]];h.context.uiToolFinderKey(h.event('Enter'),h.menu);assert.equal(h.items[0].clicked,true);
 h.menu.querySelectorAll=()=>[];assert.doesNotThrow(()=>h.context.uiToolFinderKey(h.event('Enter'),h.menu));
});

const navEvents=html.split('/* NAVIGATION_EVENTS_START */')[1].split('/* NAVIGATION_EVENTS_END */')[0];
test('Escape dismisses the nearest popup before navigating and ignores editable controls',()=>{
 const handlers={},calls=[];let popup='classpop',editing=false;
 const context=vm.createContext({A:{overlay:'pick'},NAV:{owner:'timer'},TOUR:null,navBack:()=>calls.push('back'),navRemember(){},navShow(){},closeDMenu:()=>calls.push('tools'),closeClassPop:()=>calls.push('class'),closeSegPop:()=>calls.push('segment'),document:{addEventListener:(name,fn)=>handlers[name]=fn,getElementById:id=>id==='sheetHost'?{innerHTML:''}:id===popup?{}:null}});
 vm.runInContext(navEvents,context);
 const event=()=>({key:'Escape',target:{closest:()=>editing},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
 let e=event();handlers.keydown(e);assert.deepEqual(calls,['class']);assert.ok(e.stopped);
 popup='dmenu';handlers.keydown(event());assert.deepEqual(calls,['class','tools']);
 popup=null;editing=true;handlers.keydown(event());assert.equal(calls.length,2);
 editing=false;handlers.keydown(event());assert.equal(calls.at(-1),'back');
});
