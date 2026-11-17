const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('home screens offer one-tap routines with the record to beat',()=>{
 assert.ok(html.includes('function quickRoutinesHTML(){'));
 assert.ok(html.includes("'Record '+fmtLeft(r.best)+' · beat it!'"));
 assert.ok(html.includes("quickRoutinesHTML()+'<div class=\"row\" style=\"margin-top:auto\">'"),'school-day home');
 assert.ok(html.includes("'+quickRoutinesHTML()+'<p class=\"lead\" style=\"margin:0\">What do you need?</p>"),'toolkit home');
});
test('a lesson can be wrapped up early in one tap',()=>{ assert.ok(html.includes('data-act="startNow" style="margin-top:6px"')); });
test('the student join link sits below the teacher choices',()=>{ assert.ok(html.includes('id="studentJoinLink">Student? Join a class</a>')); });
