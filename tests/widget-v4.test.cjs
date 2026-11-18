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
