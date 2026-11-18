const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('the widget Roomie is its own mode at its own link and leaves the board alone',()=>{
 assert.ok(html.includes("const W4=/[?&]widget\\b/.test(location.search);"));
 assert.ok(fs.readFileSync('widget/index.html','utf8').includes('../app/?widget'));
 assert.ok(html.includes('html.w4 #app,html.w4 #overlayHost{display:none!important}'),'the board is hidden: the tab is a setup page');
});
test('version 1 tools all live inside the widget',()=>{
 for(const k of ["k:'routine'","k:'timer'","k:'attn'","k:'pick'","k:'brain'","k:'checkin'","k:'ticket'","k:'done'"]) assert.ok(html.includes(k),k);
 assert.ok(html.includes("if(w==='ready'){ weAreReadyKey();"),'We’re ready saves the time');
});
test('the Roomie tab shows the activity big with a Full screen button',()=>{
 assert.ok(html.includes("function w4FullStart(){"));
 assert.ok(html.includes("data-w=\"fsgo\">Full screen</button>"));
 assert.ok(html.includes('function w4BigSize(){'));
});
test('tapping Roomie shows one word per tool; words with › open their options',()=>{
 assert.ok(html.includes("word('routines','Routines','#FFD84D',true)"));
 assert.ok(html.includes("word('bpick','Brain break','#C9EBD8',false)"));
 assert.ok(html.includes("startBrain(b.dataset.t||undefined)"));
});
test('Roomie’s Full screen button shows where to tap',()=>{ assert.ok(html.includes('data-w="fshint"')); assert.ok(html.includes('in the bar above Roomie, then tap')); });
test('Chrome remembers where the teacher puts Roomie',()=>{ assert.ok(!html.includes('preferInitialWindowPlacement:true')); });
test('Full screen opens its own window; closing it returns to the lesson underneath',()=>{
 assert.ok(html.includes("A.w4FsReady=true; w4Go('rest'); return; }"),'first tap: Roomie tucks into its corner');
 assert.ok(html.includes("if(w==='fsgo2'){ A.w4FsReady=false; if(!w4PopOpen())"),'second tap: the full-screen window opens');
 assert.ok(html.includes("function w4PopClose(){"));
 assert.ok(html.includes('function w4MoveBack(){'));
 assert.ok(html.includes("Back to your work"));
});
test('Roomie starts in the bottom-right corner and grows from the corner it sits in',()=>{ assert.ok(html.includes('function w4Corner(){')); assert.ok(html.includes('if(ox+ow/2>L+W/2) nx=ox+ow-nw;')); });
test('activities go straight to full screen from the Roomie menu; the next tap on Roomie tucks it away',()=>{
 assert.ok(html.includes("if(w==='run'){ fresh(); runRoutine(b.dataset.id); return full(); }"));
 assert.ok(html.includes("if(A.w4v==='rest'&&A.pip&&(A.pip.innerWidth>360||A.pip.innerHeight>230)&&['menu','card'].includes(w))"));
});

test('full screen shows the original board screens, and the menu reaches every chooser', () => {
  const fs = require('fs'); const html = fs.readFileSync(require('path').join(__dirname, '..', 'app', 'index.html'), 'utf8');
  const assert = require('assert');
  assert.ok(html.includes('function fsMirror(w,close)'));
  assert.ok(html.includes("if(W4&&!MW){ w4PopRender=function(){"));
  assert.ok(html.includes("if(w==='bpick'){ fresh(); openOverlay('brainpick'); return full(); }"));
  assert.ok(html.includes("openTicketPicker(b.dataset.kind||'exit',false)"));
  assert.ok(html.includes("word('more','More','#fff',true)"));
});
