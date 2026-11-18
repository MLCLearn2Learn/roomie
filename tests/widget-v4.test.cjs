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
 assert.ok(html.includes("word('brains','Brain break','#C9EBD8',true)"));
 assert.ok(html.includes("startBrain(b.dataset.t||undefined)"));
});
test('Roomie’s Full screen button shows where to tap',()=>{ assert.ok(html.includes('data-w="fshint"')); assert.ok(html.includes('in the bar above Roomie, then tap')); });
test('Roomie always opens small, not at the last size Chrome remembers',()=>{ assert.ok(html.includes('preferInitialWindowPlacement:true')); });
test('Full screen opens its own window; closing it returns to the lesson underneath',()=>{
 assert.ok(html.includes("w4Go('rest'); if(w4PopOpen()) return;"),'Roomie shrinks first (Chrome only allows that before the window opens)');
 assert.ok(html.includes("function w4PopClose(){"));
 assert.ok(html.includes('function w4MoveBack(){'));
 assert.ok(html.includes("Back to your work"));
});
test('Roomie starts in the bottom-right corner and grows from the corner it sits in',()=>{ assert.ok(html.includes('function w4Corner(){')); assert.ok(html.includes('if(ox+ow/2>L+W/2) nx=ox+ow-nw;')); });
