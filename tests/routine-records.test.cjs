const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
const block=html.slice(html.indexOf('/* ROUTINE_RECORDS_START */'),html.indexOf('/* ROUTINE_RECORDS_END */'));
const pad=n=>String(n).padStart(2,'0');

function make(S,clock){
 const c=vm.createContext({S,clock,saves:0});
 c.esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
 c.save=()=>{c.saves++;};
 c.now=()=>new Date(c.clock.getTime());
 c.onceKey=d=>'d'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
 c.isWeekend=d=>d.getDay()===0||d.getDay()===6;
 c.routineById=id=>S.routines.find(r=>r.id===id);
 c.fmtLeft=sec=>{sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+pad(sec%60);};
 vm.runInContext(block,c);
 return c;
}
const cls=()=>({routines:[{id:'pack',name:'Pack up',minutes:4,steps:'a\nb'},{id:'line',name:'Line up',minutes:2,steps:'a'},{id:'settle',name:'Settle',minutes:3,steps:'a'}],
 days:{mon:[{id:'b1',name:'Maths',start:'09:00',end:'10:00',endR:'line'},{id:'b2',name:'Art',start:'14:00',end:'15:00',endR:'line',startR:'settle'}]}});

test('recording a time sets the first best, flags real records and ignores accidental taps',()=>{
 const S=cls(),c=make(S,new Date(2026,10,16,10));
 assert.equal(c.recordRoutineTime('pack',2,'day'),null);
 assert.equal(c.recordRoutineTime('missing',60,'day'),null);
 let r=c.recordRoutineTime('pack',150.4,'day');assert.equal(r.first,true);assert.equal(r.record,false);assert.equal(S.routines[0].best,150);
 r=c.recordRoutineTime('pack',170,'practise');assert.equal(r.record,false);assert.equal(S.routines[0].best,150);
 r=c.recordRoutineTime('pack',120,'day');assert.equal(r.record,true);assert.equal(r.prev,150);assert.equal(S.routines[0].best,120);
 assert.equal(S.routineLog.length,3);assert.equal(S.routineLog[2].rec,true);assert.equal(S.routineLog[1].src,'practise');
 assert.ok(S.routineLog.every(x=>Object.keys(x).every(k=>['id','d','s','src','rec'].includes(k))));
});

test('log is capped and bad saved entries are ignored',()=>{
 const S=cls(),c=make(S,new Date(2026,10,16,10));
 S.routineLog=[{id:'pack',d:'oops',s:10},null,{id:'pack',d:'d20261116',s:'x'}];
 assert.equal(c.rrLog().length,0);
 for(let i=0;i<450;i++) c.recordRoutineTime('pack',100+i%5,'day');
 assert.equal(S.routineLog.length,400);
});

test('time back compares this week with the middle of the first three tries',()=>{
 const S=cls(),c=make(S,new Date(2026,10,9,10)); // Monday of an earlier week
 [180,200,160].forEach(t=>c.recordRoutineTime('pack',t,'day')); // baseline = 180
 c.clock=new Date(2026,10,16,9);c.recordRoutineTime('pack',120,'day'); // Monday this week: 60 s back, a record
 c.clock=new Date(2026,10,18,9);c.recordRoutineTime('pack',150,'day'); // 30 s back
 c.clock=new Date(2026,10,20,15);
 const T=c.timeBack();
 assert.equal(T.saved,90);assert.equal(T.counted,2);assert.equal(T.runs,2);assert.equal(T.records,1);
 const html=c.timeBackHTML('today');assert.match(html,/90 seconds back this week/);assert.match(html,/Pack up<\/span><b>2:00<\/b><small>was 3:00/);
 c.clock=new Date(2026,10,23,9);assert.equal(c.timeBack().runs,0); // a new week starts on Monday
});

test('time back is honest when there is too little data or no improvement',()=>{
 const S=cls(),c=make(S,new Date(2026,10,16,9));
 assert.equal(c.timeBackHTML('today'),'');assert.match(c.timeBackHTML('routines'),/We’re ready!/);
 c.recordRoutineTime('line',60,'day');assert.match(c.timeBackHTML('today'),/After three tries/);
 [60,60,70].forEach(t=>c.recordRoutineTime('line',t,'day'));
 assert.match(c.timeBackHTML('today'),/About the same as your first tries/);
 [20,20,20,20,20].forEach(t=>c.recordRoutineTime('line',t,'day'));
 assert.match(c.timeBackHTML('today'),/3 minutes back this week/);
});

test('launch plan teaches the most-used routines first over ten school days',()=>{
 const S=cls(),c=make(S,new Date(2026,10,16,9)); // Monday
 assert.deepEqual([...c.launchOrder()],['line','settle','pack']);
 assert.equal(c.launchState(),null);assert.equal(c.launchHTML(),'');assert.match(c.launchOfferHTML('top'),/Start the two-week plan/);assert.equal(c.launchOfferHTML('bottom'),'');S.launchOfferLater=true;assert.equal(c.launchOfferHTML('top'),'');assert.match(c.launchOfferHTML('bottom'),/Start the two-week plan/);delete S.launchOfferLater;
 S.launch={start:'d20261116',ids:c.launchOrder()};
 let L=c.launchState();assert.equal(L.day,1);assert.equal(L.total,10);assert.equal(L.focus,'line');assert.equal(L.kind,'teach');
 assert.match(c.launchHTML(),/Today we learn: Line up/);assert.match(c.launchHTML(),/data-practise="line"/);
 c.recordRoutineTime('line',70,'practise');assert.equal(c.launchState().doneToday,true);
 c.clock=new Date(2026,10,17,9);assert.equal(c.launchState().focus,'settle');
 c.clock=new Date(2026,10,21,9);assert.equal(c.launchState().day,6); // Saturday counts as Monday's plan day
 c.clock=new Date(2026,10,19,9);L=c.launchState();assert.equal(L.day,4);assert.equal(L.kind,'beat');assert.ok(['settle','pack'].includes(L.focus));
 c.clock=new Date(2026,10,30,9);L=c.launchState();assert.equal(L.finished,true);assert.match(c.launchHTML(),/Routines launched!/);
});

test('launch plan survives deleted routines and bad saved data',()=>{
 const S=cls(),c=make(S,new Date(2026,10,16,9));
 S.launch={start:'d20261116',ids:['gone']};assert.equal(c.launchState(),null);
 S.launch={start:'bad',ids:['pack']};assert.equal(c.launchState(),null);
 S.launch={start:'d20261116',ids:['gone','pack']};assert.equal(c.launchState().focus,'pack');
});

test('app wires records into changeovers, practice, the routines screen and Today in Roomie',()=>{
 assert.ok(html.includes("rec=recordRoutineTime(R.id,(P.mins-P.from)*60,'day')"));
 assert.ok(html.includes("rec=recordRoutineTime(R.id,t,'practise')"));
 assert.ok(html.includes("'+launchHTML()+launchOfferHTML('top')+S.routines.map("));assert.ok(html.includes(".join('')+timeBackHTML('routines')+timekeeperHTML()+"));
 assert.ok(html.includes("timeBackHTML('today')"));
 assert.ok(html.includes('npHTML()+raceHTML(R)'));
 assert.ok(html.includes("delete S.routineLog; delete S.launch;"));
});

const jobsBlock=html.slice(html.indexOf('const JOB_DEF='),html.indexOf('function renderJobs('));
function withJobs(S,clock){ const c=make(S,clock); c.names=()=>(S.students||[]).filter(Boolean); vm.runInContext(jobsBlock,c); return c; }

test('new classes get a Timekeeper helper and the guide names this week’s student',()=>{
 const S={...cls(),students:['Ava','Ben','Cy','Di','Eli','Fay','Gus','Hal','Ivy']},c=withJobs(S,new Date(2026,10,16,9));
 assert.equal(vm.runInContext('JOB_DEF[1]',c),'Timekeeper');
 const T=c.timekeeper();assert.equal(T.has,true);assert.equal(T.who,'Ben');
 assert.match(c.timekeeperHTML(),/Timekeeper: Ben/);
});

test('existing classes without the job are offered it, and empty classes do not crash',()=>{
 const S={...cls(),students:['Ava','Ben'],jobs:{list:['Line leader','Lights'],off:0,fixed:{},auto:false,week:'x'}},c=withJobs(S,new Date(2026,10,16,9));
 assert.equal(c.timekeeper().has,false);assert.match(c.timekeeperHTML(),/data-act="addTimekeeper"/);
 const E=withJobs({...cls(),students:[]},new Date(2026,10,16,9));assert.equal(E.timekeeper().has,false);
});

test('W only acts while a routine race or practice is running',()=>{
 const S=cls(),c=make(S,new Date(2026,10,16,9)),calls=[];c.act=a=>calls.push(a);c.weAreReady=()=>calls.push('ready');
 c.A={overlay:null,P:{phase:'lesson'}};assert.equal(c.weAreReadyKey(),false);
 c.A={overlay:null,P:{phase:'routine'}};assert.equal(c.weAreReadyKey(),true);
 c.A={overlay:'practise',pr:{done:0}};assert.equal(c.weAreReadyKey(),true);
 c.A={overlay:'practise',pr:{done:40}};assert.equal(c.weAreReadyKey(),false);
 c.A={overlay:'timer'};assert.equal(c.weAreReadyKey(),false);
 assert.deepEqual(calls,['ready','prDone']);
});

test('term totals add up every run since the term start',()=>{
 const S=cls(),c=make(S,new Date(2026,9,12,9));
 [180,200,160].forEach(t=>c.recordRoutineTime('pack',t,'day'));
 c.clock=new Date(2026,9,20,9);c.recordRoutineTime('pack',120,'day');
 c.clock=new Date(2026,10,16,9);c.recordRoutineTime('pack',100,'day');
 let T=c.termBack();assert.equal(T.saved,140);assert.equal(T.runs,5);assert.equal(T.records,3);assert.equal(T.best[0].name,'Pack up');assert.equal(T.best[0].base,180);
 S.termStart='d20261101';T=c.termBack();assert.equal(T.runs,1);assert.equal(T.saved,80);
 assert.equal(make(cls(),new Date()).termBack(),null);
});

test('phone remote and keyboard are wired to the same ready action',()=>{
 assert.ok(html.includes("ready:()=>weAreReadyKey(),"));
 assert.ok(html.includes("if(k==='w'&&weAreReadyKey())"));
 assert.ok(html.includes("st.racing?'<div class=\"rmgrid\">'+B('ready'"));
});
