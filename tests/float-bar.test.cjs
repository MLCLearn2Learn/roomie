const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('the float opens as a slim bar by default and remembers the size the teacher chose',()=>{
 assert.ok(html.includes("const PIP_SIZES={bar:[820,216],screen:[820,520],mini:[210,240]};"));
 assert.ok(html.includes("function pipViewPref(){ return ['bar','screen','mini'].includes(S.floatView)?S.floatView:'bar'; }"));
 assert.ok(html.includes("const sz=pipSizeFor(pipViewPref()); const w=await documentPictureInPicture.requestWindow({width:sz[0],height:sz[1]});"));
 assert.ok(html.includes("S.floatView=v; save();"));
});
test('the bar starts routines, timers, brain breaks and name picks without leaving the lesson',()=>{
 for(const a of ['run','time','brain','pick','attention','ready','mrNext','tpause','bigger','mini']) assert.ok(html.includes("v==='"+a+"'"),a);
 assert.ok(html.includes("const fresh=()=>{ if(navHasActivity()) navStopActivity(false); };"),'starting from the float never waits on a hidden confirm box');
});
test('changeovers change the bar colour and offer the right next button',()=>{
 assert.ok(html.includes("cls:'warn',k:'2 MINUTES',t:'Time to finish up'"));
 assert.ok(html.includes("<button data-pb=\"ready\" class=\"g\">We’re ready!</button>"));
 assert.ok(html.includes("<button data-pv=\"bar\" title=\"Back to your tools bar\">Back to tools</button>"));
});
test('the float shows the teacher’s own bottom bar and opens other tools inside the float',()=>{
 assert.ok(html.includes("function pbarTools(){ return uiDockKeys(dockOrder(),S.dockHide||[],dockPresetNow()).filter(k=>DOCK_NAMES[k]); }"));
 assert.ok(html.includes("pbarTools().filter(k=>k!=='routines').map(k=>"),'tools follow the board order and hidden tools');
 assert.ok(html.includes("db.click(); if(A.overlay){ A.pipAuto=true; pipSetView('screen');"),'tools open in the float');
 assert.ok(html.includes("if(A.pipDoc&&A.pipAuto&&A.pipView==='screen'&&!A.overlay){ A.pipAuto=false; pipSetView('bar'); return; }"),'and it shrinks back when the tool is finished');
});
