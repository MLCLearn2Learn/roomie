const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)+a.length));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function guide(S){
 const c=vm.createContext({S,esc,document:{addEventListener(){}},save(){},
  now:()=>new Date(2026,10,17,9,0),isWeekend:()=>false,dayKey:()=>'tue',DAYNAME:{mon:'Monday',tue:'Tuesday'},
  toMin:t=>{const [h,m]=t.split(':').map(Number);return h*60+m;},fmtClock:m=>Math.floor(m/60)+':'+String(m%60).padStart(2,'0'),
  routineById:id=>S.routines.find(r=>r.id===id),stepsOf:r=>r.steps.split('\n')});
 vm.runInContext(cut('const ATTENTION_PRESETS=','function opt(v,l,cur)'),c);
 vm.runInContext(cut('const HOME_TILES=','function toolkitPanelOn('),c);
 vm.runInContext(cut('function reliefHTML(){','function printRelief('),c);
 return c.reliefHTML();
}
const base=()=>({room:'Room 12',teacher:'Ms A',reliefNotes:'',expect:{},
 routines:[{id:'r1',name:'Morning jobs',minutes:5,steps:'Unpack\nRead the board'}],
 days:{tue:[{start:'09:00',end:'10:00',name:'Maths',startR:'r1'}]}});

test('whole day guide shows the day plan without claiming Roomie teaches the class',()=>{
 const out=guide({...base(),mode:'day'});
 assert.match(out,/Tuesday’s plan/);assert.match(out,/Maths/);assert.match(out,/Starts with Morning jobs/);
 assert.match(out,/Press <b>Start my day<\/b>/);assert.doesNotMatch(out,/runs the timetable/);
});

test('toolkit guide lists the toolkit and never mentions a timetable running by itself',()=>{
 const out=guide({...base(),mode:'tools',toolkitHide:['quiz'],toolkitOrder:['timer']});
 assert.match(out,/uses Roomie as a toolkit/);assert.match(out,/Nothing runs by itself/);
 assert.doesNotMatch(out,/timetable/i);assert.doesNotMatch(out,/Maths/);
 assert.match(out,/The class toolkit<\/h3><p[^>]*>Timer · /);assert.doesNotMatch(out,/Quiz games/);
});

test('guide writes out the saved attention call and response and the saved reset steps',()=>{
 const out=guide({...base(),mode:'day',attentionPreset:'holy-moly',resetPreset:'space'});
 assert.match(out,/<td style="width:90px">You<\/td><td>Holy moly!<\/td>/);assert.match(out,/<td>Class<\/td><td>Guacamole!<\/td>/);
 assert.match(out,/Clear space, fresh start/);assert.match(out,/<b>Clear your space:<\/b> Keep out what you need/);
});

test('custom signals are escaped and blank fields fall back to safe wording',()=>{
 const out=guide({...base(),mode:'tools',attentionPreset:'custom',customAttention:{call:'<b>Hocus</b>',response:'  '},resetPreset:'custom',customReset:[]});
 assert.match(out,/&lt;b&gt;Hocus&lt;\/b&gt;/);assert.match(out,/Pause · Ready to listen/);assert.match(out,/Our class reset/);
});

test('relief page offers a deliberate print option alongside copy',()=>{
 assert.ok(html.includes('data-sact="printRelief"'));assert.ok(html.includes("if(a==='printRelief'){ printRelief(); return; }"));
 assert.match(html,/@media print\{body\.printing-relief>\*:not\(#reliefPrint\)\{display:none!important\}/);
});
