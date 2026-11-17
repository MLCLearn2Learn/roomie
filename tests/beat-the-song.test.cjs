const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('video songs play once so the class can beat them',()=>{
 assert.ok(html.includes("el.loop=!m.video;"));
 assert.ok(html.includes("function songSpare(){"));
});
test('being ready saves the time but lets the song play to the end',()=>{
 assert.ok(html.includes("const spare=songSpare(); if(spare) A.songKeep=true; Music.fadeStop();"),'timetable We’re ready');
 assert.ok(html.includes("A.pr.spare=songSpare(); if(A.pr.spare) A.songKeep=true;"),'practise');
 assert.ok(html.includes("if(A.songKeep&&el&&!el.loop&&!el.ended&&!el.paused) return;"));
 assert.ok(html.includes("if(a==='music'){ A.songKeep=false;"),'the music button still stops it');
});
test('running a routine from the list saves its time too',()=>{
 assert.ok(html.includes("A.mr={id,step:0,t0:Date.now()}"));
 assert.ok(html.includes("recordRoutineTime(R.id,(Date.now()-A.mr.t0)/1000,'run')"));
 assert.ok(html.includes("of the song to spare."));
});
