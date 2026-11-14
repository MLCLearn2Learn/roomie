const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Production section found: ${start}`);
  return html.slice(a, b);
}
// Execute the actual deployed functions, not a second implementation of the scheduler.
const production = [
  section('let clockOffset=0;', 'function stepIndexFor('),
  section('const MT={', 'const T='),
  section('function openOverlay(', 'function markTools('),
  section('function render(full){', 'function renderOff('),
  section('function phaseSig(', '/* ================= Actions ================= */'),
  section('function act(a,el){', 'function runRoutine('),
  section('function runRoutine(', 'function startPractise('),
  section('function goHome(){', "document.addEventListener('click',e=>{ if(e.target.closest('#homeBtn'))"),
  section('function lessonBase(', 'function showNudge('),
  section('function rmState(){', 'async function rmPoll('),
  section('const RM_CMDS=', 'if(REMOTE){'),
].join('\n');

const at = (h, m, s = 0) => new Date(2026, 10, 13, h, m, s).getTime();

function harness(initial = at(8, 59, 55), options = {}) {
  let current = initial, nextId = 1;
  const jobs = new Map(), events = [], renders = [];
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [current])); }
    static now() { return current; }
  }
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, innerHTML: '', textContent: '', hidden: false, attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      classList: { toggle() {} },
      remove() { elements.delete(id); },
    });
    return elements.get(id);
  }
  ['clock', 'scheduleControls', 'scheduleToggle', 'scheduleStatus', 'scheduleSwitch', 'sheetHost'].forEach(element);
  const routine = { id: 'arrival', name: 'Arrival', minutes: 15, song: 'hello', steps: 'Bags away\nGet ready' };
  const lineup = { id: 'lineup', name: 'Line up', minutes: 2, song: 'march', steps: 'Stand up\nLine up' };
  const blocks = [
    { id: 'arrival-block', start: '08:40', end: '09:00', name: 'Arrival', kind: 'routine', startR: 'arrival' },
    { id: 'literacy', start: '09:00', end: '10:00', name: 'Literacy', kind: 'lesson', endR: 'lineup', exit: true, warn: true, bbAt: '25', bbId: 'coin' },
    { id: 'fitness', start: '10:00', end: '10:40', name: 'Fitness', kind: 'lesson' },
  ];
  const S = { mode: 'day', autoStart: options.autoStart ?? true, room: 'Test class', routines: [routine, lineup], days: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri'].map(d => [d, blocks])), goal: { name: 'Class goal', points: 1, target: 5 } };
  const context = {
    Date: ClockDate, console, S, STUDENT: false, EXIT_MIN: 3,
    confirm:message=>{events.push('confirm:'+message);return options.confirm===true;},
    pad: n => String(n).padStart(2, '0'),
    routineById: id => S.routines.find(r => r.id === id),
    stepsOf: r => r.steps.split('\n'),
    document: { getElementById: id => elements.get(id) || null, addEventListener() {}, body: { classList: { toggle() {} } } },
    $: selector => elements.get(selector.slice(1)),
    setTimeout(fn, delay) { const id = nextId++; jobs.set(id, { fn, due: current + delay }); return id; },
    clearTimeout(id) { jobs.delete(id); }, setInterval() { return nextId++; }, clearInterval() {},
    renderStrip() {},
    renderOverlay(full) { renders.push({ overlay: context.api.A.overlay, full }); },
    renderRoutine(P, full) { renders.push({ phase: P.phase, block: P.block.id, mins: P.mins, full }); },
    renderWarning(P, full) { renders.push({ phase: P.phase, block: P.block.id, full }); },
    renderExitPhase(P, full) { renders.push({ phase: P.phase, block: P.block.id, full }); },
    renderHeld(P, full) { renders.push({ phase: P.phase, block: P.block.id, full }); },
    renderLesson(P, full) { renders.push({ phase: P.phase, block: P.block.id, full }); },
    renderBreak(P, full) { renders.push({ phase: P.phase, full }); },
    renderHome(P, full) { renders.push({ phase: P.phase, full }); },
    renderOff(P, full) { renders.push({ phase: P.phase, full }); },
    lastStep: -1,
    markTools() {}, markHero() {}, clearActivity() { events.push('clearActivity'); },
    Music: { playing: false, play() { this.playing = true; events.push('music'); }, fadeStop() { this.playing = false; events.push('fadeStop'); } },
    Focus: { stop() { events.push('focusStop'); } },
    Bird: { update() {}, say(t) { events.push('bird:' + t); } },
    pipRender() {}, phaseLine(P) { events.push('phaseLine:' + P.phase); },
    chime(n) { events.push('chime:' + n); }, say(t) { events.push('say:' + t); },
    toast(t) { events.push('toast:' + t); }, audio() {},
    showNudge() { events.push('nudge'); }, hideNudge() { events.push('hideNudge'); },
    startBrain(type, id) { events.push('brain:' + id); context.api.A.overlay = 'brain'; },
    startThink() {}, startReflect() {},
  };
  vm.createContext(context);
  vm.runInContext(production + '\nthis.api={A,MT,SCHED,NAV,navBack,navBoard,navStopActivity,navStartTimer,navPrepareStart,tick,phaseAt,phaseSig,openOverlay,closeOverlay,runRoutine,pauseTimetable,resumeTimetable,switchToTimetable,resetTimetableSession,checkCues,act,rmState,RM_CMDS};', context);
  const api = context.api;
  function time(ms) {
    current = ms;
    for (const [id, job] of [...jobs]) if (job.due <= current) { jobs.delete(id); job.fn(); }
    api.MT.tick();
  }
  api.tick(true); events.length = 0; renders.length = 0;
  return { ...api, S, events, renders, element, elements, time, current: () => current, context };
}

test('a running timer survives Arrival → Literacy without forced redraw or announcement', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(300);
  h.events.length = 0; h.renders.length = 0;
  h.time(at(9, 0, 5)); h.tick(false);
  assert.equal(h.A.overlay, 'timer');
  assert.equal(h.MT.remaining(), 290);
  assert.equal(h.SCHED.pending.block.id, 'literacy');
  assert.equal(h.renders.at(-1).full, false);
  assert.deepEqual(h.events, []);
});

test('paused timers remain paused across a timetable boundary', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(300); h.MT.pause();
  h.time(at(9, 0, 15)); h.tick(false);
  assert.equal(h.A.overlay, 'timer'); assert.equal(h.MT.running, false); assert.equal(h.MT.remaining(), 300);
});

test('opening the name picker and returning keeps the original timer', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(300); h.openOverlay('pick');
  h.time(at(9, 0, 5)); h.tick(false); h.openOverlay('timer');
  assert.equal(h.MT.remaining(), 290); assert.equal(h.MT.running, true);
});

test('a manually run routine retains its step, music and timer', () => {
  const h = harness(); h.runRoutine('lineup'); h.A.mr.step = 1; h.events.length = 0;
  h.time(at(9, 0, 5)); h.tick(false);
  assert.equal(h.A.overlay, 'manualRoutine'); assert.equal(h.A.mr.step, 1); assert.equal(h.MT.remaining(), 110);
  assert.equal(h.context.Music.playing, true); assert.deepEqual(h.events, []);
});

for (const [position, before, after, routine] of [
  ['start', at(8, 39, 55), at(8, 40, 1), 'arrival'],
  ['end', at(9, 57, 55), at(9, 58, 1), 'lineup'],
]) {
  test(`autoStart off waits at a scheduled ${position} routine without starting sound or a timer`, () => {
    const h = harness(before, { autoStart: false }); h.time(after); h.tick(false);
    assert.equal(h.A.P.phase, 'held'); assert.equal(h.A.P.where, position); assert.equal(h.A.P.routine.id, routine);
    assert.equal(h.MT.running, false); assert.equal(h.context.Music.playing, false);
    assert.ok(!h.events.some(e => e === 'music' || e.startsWith('say:') || e.startsWith('chime:')));
    const state = h.rmState(); assert.match(state.now, /waiting for Start/); assert.equal(state.endAt, null);
  });

  test(`loading during a ${position} routine also respects autoStart off`, () => {
    const h = harness(after + 30000, { autoStart: false });
    assert.equal(h.A.P.phase, 'held'); assert.equal(h.A.P.routine.id, routine);
    assert.equal(h.context.Music.playing, false); assert.equal(h.MT.running, false);
  });

  test(`autoStart on still starts the scheduled ${position} routine normally`, () => {
    const h = harness(before); h.time(after); h.tick(false);
    assert.equal(h.A.P.phase, 'routine'); assert.equal(h.A.P.routine.id, routine);
    assert.ok(h.events.includes('music')); assert.ok(h.events.some(e => e.startsWith('say:')));
  });
}

test('a lesson start routine waits too, and skipping its window does not replay it', () => {
  const h = harness(at(9, 59, 55), { autoStart: false }); h.S.days.fri[2].startR = 'lineup';
  h.time(at(10, 0, 1)); h.tick(false);
  assert.equal(h.A.P.phase, 'held'); assert.equal(h.A.P.where, 'start');
  h.time(at(10, 3)); h.tick(false);
  assert.equal(h.A.P.phase, 'lesson'); assert.equal(h.A.P.block.id, 'fitness');
  assert.equal(h.MT.total, 0); assert.ok(!h.events.includes('music'));
});

test('Start on a held routine runs its full duration and stays safe through the next block', () => {
  const h = harness(at(9, 59), { autoStart: false }); h.RM_CMDS.startnow();
  assert.equal(h.A.overlay, 'manualRoutine'); assert.equal(h.A.mr.id, 'lineup');
  assert.equal(h.MT.remaining(), 120); assert.equal(h.context.Music.playing, true);
  h.time(at(10, 0, 20)); h.tick(false);
  assert.equal(h.A.overlay, 'manualRoutine'); assert.equal(h.MT.remaining(), 40);
  assert.equal(h.SCHED.pending.block.id, 'fitness');
});

test('manual Run starts immediately with autoStart off and leaves a global pause in force', () => {
  const h = harness(at(8, 59, 55), { autoStart: false }); h.pauseTimetable(); h.runRoutine('arrival');
  assert.equal(h.SCHED.paused, true); assert.equal(h.A.overlay, 'manualRoutine'); assert.equal(h.MT.remaining(), 900);
  assert.equal(h.context.Music.playing, true); h.time(at(9, 0, 5)); h.tick(false);
  assert.equal(h.SCHED.paused, true); assert.equal(h.A.overlay, 'manualRoutine'); assert.equal(h.MT.remaining(), 890);
  h.resumeTimetable(); assert.equal(h.A.overlay, 'manualRoutine'); assert.equal(h.MT.remaining(), 890);
});

test('waiting-screen Start targets the displayed routine even while the timetable is pinned', () => {
  let screen = '';
  const context = { esc: String, expHTML: () => '', setStage: (cls, html) => { screen = html; } };
  vm.runInNewContext(section('function renderHeld(', 'function renderBreak(') + '\nthis.draw=renderHeld;', context);
  const h = harness(at(8, 45), { autoStart: false }); h.pauseTimetable();
  h.time(at(9, 10)); h.tick(false); context.draw(h.A.P, true);
  assert.match(screen, /Ready for Arrival/); assert.match(screen, /data-run="arrival"/);
  assert.doesNotMatch(screen, /data-act="startNow"/);
});

for (const overlay of ['rotate', 'think', 'quiz', 'checkin', 'ticket', 'tpick', 'door']) {
  test(`${overlay} stays on screen at a schedule change`, () => {
    const h = harness(); h.openOverlay(overlay); h.time(at(9, 0, 5)); h.tick(false);
    assert.equal(h.A.overlay, overlay); assert.equal(h.SCHED.pending.block.id, 'literacy');
    assert.equal(h.renders.at(-1).full, false);
  });
}

test('ordinary automatic transitions still happen when no activity is protected', () => {
  const h = harness(at(9, 52, 55)); h.time(at(9, 53, 1)); h.tick(false);
  assert.equal(h.A.P.phase, 'warning'); assert.equal(h.SCHED.pending, null);
  assert.ok(h.events.includes('say:Two minutes to finish up.')); assert.equal(h.renders.at(-1).full, true);
});

test('global pause pins the schedule screen while the clock and manual timer continue', () => {
  const h = harness(); const pinned = h.A.P.mins;
  h.pauseTimetable(); h.openOverlay('timer'); h.MT.start(300);
  h.time(at(9, 0, 15)); h.tick(false);
  assert.equal(h.element('clock').textContent, '9:00'); assert.equal(h.MT.remaining(), 280);
  assert.equal(h.A.P.block.id, 'arrival-block'); assert.equal(h.A.P.mins, pinned);
  assert.equal(h.element('scheduleToggle').textContent, 'Resume timetable');
  h.resumeTimetable(); assert.equal(h.A.overlay, 'timer'); assert.equal(h.MT.remaining(), 280);
  assert.equal(h.A.P.block.id, 'literacy'); assert.equal(h.SCHED.pending.block.id, 'literacy');
});

test('pause and resume do not rebuild an active form', () => {
  const h = harness(at(9, 0)); h.openOverlay('tpick');
  h.pauseTimetable(); assert.equal(h.renders.at(-1).full, false);
  h.resumeTimetable(); assert.equal(h.renders.at(-1).full, false);
});

test('resume uses the current adjusted timetable and skips elapsed cues without replay', () => {
  const h = harness(at(9, 20)); h.pauseTimetable(); h.A.ext.literacy = 20;
  h.time(at(10, 5)); h.tick(false); h.events.length = 0; h.resumeTimetable(); h.checkCues();
  assert.equal(h.A.P.block.id, 'literacy'); assert.equal(h.A.P.phase, 'lesson');
  assert.equal(h.A.cueDone['literacy|bb'], true); assert.equal(h.SCHED.pending, null);
  assert.deepEqual(h.events, []);
});

test('a future cue still runs normally after resume', () => {
  const h = harness(at(9, 10)); h.pauseTimetable(); h.time(at(9, 15)); h.tick(false); h.resumeTimetable();
  assert.equal(h.A.cueDone['literacy|bb'], undefined);
  h.time(at(9, 25)); h.tick(false); h.checkCues(); assert.ok(h.events.includes('nudge'));
  h.time(at(9, 25, 16)); h.checkCues(); assert.ok(h.events.includes('brain:coin'));
});

test('an explicitly snoozed cue remains due at its future snooze time', () => {
  const h = harness(at(9, 20)); h.A.cueSnooze['literacy|bb'] = 9 * 60 + 40;
  h.pauseTimetable(); h.time(at(9, 30)); h.tick(false); h.resumeTimetable(); h.checkCues();
  assert.equal(h.A.cueDone['literacy|bb'], undefined); assert.equal(h.A.nudge, undefined);
  h.time(at(9, 40)); h.tick(false); h.checkCues(); assert.ok(h.events.includes('nudge'));
});

test('a pending automatic cue is dismissed when a teacher opens an activity', () => {
  const h = harness(at(9, 25)); h.checkCues(); assert.ok(h.A.nudge);
  h.openOverlay('pick'); h.time(at(9, 25, 20)); h.tick(false); h.checkCues();
  assert.equal(h.A.nudge, null); assert.equal(h.A.cueDone['literacy|bb'], true);
  assert.equal(h.A.overlay, 'pick'); assert.ok(!h.events.includes('brain:coin'));
});

test('delayed scheduled announcements cannot interrupt a newly opened activity', () => {
  const h = harness(at(9, 52, 55)); h.time(at(9, 53, 1)); h.tick(false);
  h.openOverlay('timer'); h.events.length = 0; h.time(at(9, 53, 2));
  assert.ok(!h.events.some(e => e.startsWith('phaseLine:')));
});

test('End activity and switch ends the timer and selects the latest block', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(9000);
  h.time(at(9, 0, 5)); h.tick(false); h.time(at(10, 5)); h.tick(false);
  h.switchToTimetable();
  assert.equal(h.A.overlay, null); assert.equal(h.MT.total, 0); assert.equal(h.A.P.block.id, 'fitness');
  assert.equal(h.SCHED.pending, null); assert.equal(h.SCHED.paused, false);
  assert.ok(!h.events.some(e => e.startsWith('phaseLine:')));
});

test('Wait for me remains paused beyond the old block end', () => {
  const h = harness(at(9, 53)); h.act('hold'); h.time(at(10, 5)); h.tick(false);
  assert.equal(h.SCHED.paused, true); assert.equal(h.A.P.block.id, 'literacy');
  h.resumeTimetable(); assert.equal(h.A.P.block.id, 'fitness');
});

test('remote Next now uses the explicit switch once a transition is deferred', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(300); h.time(at(9, 0, 5)); h.tick(false);
  assert.equal(h.rmState().schedulePending, true);
  h.RM_CMDS.startnow(); assert.equal(h.A.overlay, null); assert.equal(h.MT.total, 0);
});

test('remote state represents a paused manual timer without a moving deadline', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(300); h.MT.pause(); h.pauseTimetable();
  const state = h.rmState(); assert.equal(state.timerPaused, true); assert.equal(state.timerLeft, 300);
  assert.equal(state.endAt, null); assert.equal(state.schedulePaused, true);
});

test('session reset clears demo/profile pause and cues without changing manual timers', () => {
  const h = harness(); h.openOverlay('timer'); h.MT.start(300); h.pauseTimetable();
  h.time(at(9, 0, 5)); h.tick(false); h.resetTimetableSession();
  assert.equal(h.SCHED.paused, false); assert.equal(h.SCHED.pending, null); assert.equal(h.SCHED.pinned, null);
  assert.equal(h.A.phaseKey, ''); assert.equal(Object.keys(h.A.cueDone).length, 0); assert.equal(h.MT.remaining(), 290);
});

test('production inline JavaScript remains syntactically valid', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0);
  scripts.forEach(([, source]) => new vm.Script(source));
});


test('Back from the name picker returns to the running timer, then board without stopping it',()=>{
 const h=harness();h.openOverlay('timer');h.navStartTimer(300);h.openOverlay('pick');h.time(at(9,0,5));h.navBack();
 assert.equal(h.A.overlay,'timer');assert.equal(h.MT.running,true);assert.equal(h.MT.remaining(),290);
 h.navBack();assert.equal(h.A.overlay,null);assert.equal(h.MT.running,true);assert.equal(h.NAV.owner,'timer');
});
test('Home preserves a routine step, timer and music and clears only navigation history',()=>{
 const h=harness();h.runRoutine('lineup');h.A.mr.step=1;h.context.goHome();
 assert.equal(h.A.overlay,null);assert.equal(h.A.mr.step,1);assert.equal(h.MT.running,true);assert.equal(h.context.Music.playing,true);assert.equal(h.NAV.owner,'manualRoutine');assert.equal(h.NAV.trail.length,0);
});
test('Back preserves a paused countdown',()=>{
 const h=harness();h.openOverlay('timer');h.navStartTimer(300);h.MT.pause();h.openOverlay('pick');h.navBack();
 assert.equal(h.A.overlay,'timer');assert.equal(h.MT.running,false);assert.equal(h.MT.remaining(),300);
});
test('cancelled replacement cannot reset a countdown or start routine music',()=>{
 const h=harness();h.openOverlay('timer');h.navStartTimer(300);h.openOverlay('routines');const before=h.MT.onDone;h.events.length=0;
 h.runRoutine('lineup');assert.equal(h.NAV.owner,'timer');assert.equal(h.MT.remaining(),300);assert.equal(h.MT.onDone,before);assert.equal(h.A.overlay,'routines');assert.equal(h.A.mr,undefined);assert.ok(h.events.some(e=>e.startsWith('confirm:')));assert.ok(!h.events.includes('music'));
});
test('accepted replacement starts the requested activity and clears the old return path',()=>{
 const h=harness(undefined,{confirm:true});h.openOverlay('timer');h.navStartTimer(300);h.openOverlay('routines');h.runRoutine('lineup');
 assert.equal(h.NAV.owner,'manualRoutine');assert.equal(h.A.overlay,'manualRoutine');assert.equal(h.MT.remaining(),120);assert.equal(h.context.Music.playing,true);assert.ok(!h.NAV.trail.includes('timer'));
});
test('restarting an existing timer requires confirmation and cancellation preserves its callback',()=>{
 const h=harness();h.openOverlay('timer');h.navStartTimer(300);const callback=h.MT.onDone;assert.equal(h.navStartTimer(60),false);assert.equal(h.MT.remaining(),300);assert.equal(h.MT.onDone,callback);
});
test('explicit Stop ends the background activity and removes stale return paths',()=>{
 const h=harness();h.runRoutine('lineup');h.openOverlay('pick');h.navStopActivity();
 assert.equal(h.MT.remaining(),0);assert.equal(h.MT.running,false);assert.equal(h.context.Music.playing,false);assert.equal(h.NAV.owner,null);assert.equal(h.A.overlay,null);assert.equal(h.NAV.trail.length,0);
});
test('stopping an unrelated screen cannot silently stop the background timer',()=>{
 const h=harness();h.openOverlay('timer');h.navStartTimer(300);h.openOverlay('quiz');h.act('stopActivity',{dataset:{stopScreen:'1'}});
 assert.equal(h.A.overlay,'timer');assert.equal(h.MT.remaining(),300);assert.equal(h.MT.running,true);
});
