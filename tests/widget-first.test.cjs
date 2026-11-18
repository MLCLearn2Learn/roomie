const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('the widget rests as just Roomie and opens into bubbles when tapped',()=>{
 assert.ok(html.includes("pipViewPref=function(){ return 'roo'; };"));
 assert.ok(html.includes('const WREST=[200,250];'));
 assert.ok(html.includes('<button class="me" data-wr="open"'));
 assert.ok(html.includes("function wOpen(){"));
 assert.ok(html.includes('data-pb="wtab" data-t="routines"'),'routines and tools bubbles');
});
test('starting a routine grows the widget for the class, and We’re ready tucks it back',()=>{
 assert.ok(html.includes("runRoutine(b.dataset.id); if(A.overlay==='manualRoutine'){ wGrow(); return; }"));
 assert.ok(html.includes('const WIDGET_CLASS=[820,560];'));
 assert.ok(html.includes("A.wShrinkT=setTimeout(()=>{ if(A.pipView==='class') wShrink(); },3500)"));
 assert.ok(html.includes('wShrink=wRest;'));
});
test('the board leads with opening the widget',()=>{
 assert.ok(html.includes('Open the Roomie widget<small>'));
 assert.ok(html.includes('<i class="lbl">Widget</i>'));
});
