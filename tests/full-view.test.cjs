const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('Full screen hides the top bar, timetable and tools so the board or activity fills the screen',()=>{
 assert.ok(html.includes('body.full-view .top,body.full-view .strip,body.full-view .dock{display:none!important}'));
 assert.ok(html.includes("$('#fsBtn').addEventListener('click',()=>{ setFullView(!document.body.classList.contains('full-view')); });"));
 assert.ok(html.includes('data-fv="attention">Attention</button><button type="button" data-fv="exit">Exit full screen</button>'));
});
test('F toggles, Escape leaves, and leaving browser full screen leaves Roomie full screen',()=>{
 assert.ok(html.includes("if(e.key==='f'||e.key==='F'){ e.preventDefault(); setFullView(!document.body.classList.contains('full-view')); }"));
 assert.ok(html.includes("if(!document.fullscreenElement&&document.body.classList.contains('full-view')) setFullView(false,{browser:false});"));
});
test('optional setting opens activities full screen and returns to the board afterwards',()=>{
 assert.ok(html.includes('id="fullActs"'));assert.ok(html.includes("if(el.id==='fullActs'){ S.fullActivities=el.checked; save(); return; }"));
 assert.ok(html.includes("if(name&&!was&&S.fullActivities!==false&&!document.body.classList.contains('full-view')) setFullView(true,{auto:true});"));
 assert.ok(html.includes("if(FV.auto&&!A.overlay&&document.body.classList.contains('full-view')) setFullView(false);"));
});
