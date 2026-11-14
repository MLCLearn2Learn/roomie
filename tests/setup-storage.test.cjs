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
const production = [
  section('const $=s=>', 'const SONGS ='),
  section('const EXPECT={', '/* ================= Icons ================= */'),
  section('let clockOffset=0;', 'function blocksToday('),
  section('function fmtHHMM(', "document.addEventListener('input',e=>{ const el=e.target;"),
  section('function markMode(', "document.addEventListener('click',e=>{ const m=e.target.closest('[data-mode]')"),
  section('function opt(', 'function renderSetup('),
  section('const WZ={step:0};', 'function wizHTML('),
  section('function wizHTML(', 'function wizDraw('),
  section('function wizOpen(', "document.addEventListener('click',e=>{ const b=e.target.closest('[data-wz]')"),
  section('function validateWizardDay(', '/* first start: quick setup before the tour */'),
  section('function beginDemo(', "$('#demoTag').addEventListener"),
  section('let moveBusy=false;', 'function moveHTML('),
  section("document.addEventListener('click',e=>{ const b=e.target.closest('[data-wz]')", "document.addEventListener('input',e=>{\n  if(e.target.id==='wzNames')"),
  section("document.addEventListener('input',e=>{ const el=e.target; if(!el.closest('#sheetHost')) return;", "document.addEventListener('change',async e=>{ const el=e.target;"),
  section("document.addEventListener('click',e=>{ const t=e.target.closest('#sheetHost button');", 'function fmtHHMM('),
].join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
const validDay = () => ({ room: 'Year 4', teacher: 'Ms Test', previewNames: 'Ana María\n李', start: '08:40', recess: '10:40', recessLen: 20, lunch: '12:40', lunchLen: 50, end: '15:00' });

// Only browser surfaces and external effects are faked. All parsing, persistence,
// demo transitions, reset logic and save/finish event handlers come from index.html.
function harness(options = {}) {
  const elements = new Map(), listeners = new Map(), events = [], writes = [];
  const stored = new Map(Object.entries(options.stored || {}));
  let writeFailure = !!options.writeFailure, readFailure = !!options.readFailure;
  function node(tag = 'div') {
    return {
      tagName: tag.toUpperCase(), id: '', value: '', innerHTML: '', textContent: '', hidden: false,
      style: {}, dataset: {}, attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener() {}, querySelector() { return null; },
      classList: { toggle() {}, add() {}, remove() {} },
      remove() { elements.delete(this.id); }, click() { events.push('download:' + this.download); },
      focus() {}, select() {},
    };
  }
  function element(id) { if (!elements.has(id)) { const n = node(); n.id = id; elements.set(id, n); } return elements.get(id); }
  const document = {
    body: { appendChild(n) { elements.set(n.id, n); }, classList: { toggle() {}, add() {}, remove() {} } },
    createElement: node, getElementById: id => elements.get(id) || null, querySelectorAll: () => [],
    querySelector: selector => elements.get(selector.replace(/^#/, '')) || null,
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
  };
  ['demoTag', 'splash', 'nameWarn', 'privMsg', 'fBackup', 'startBtn'].forEach(element);
  const context = {
    console, document, STUDENT: false,
    window: { confirm: () => true, RoomieTransferV2: { derive: async () => ({id:'A'.repeat(22)}), decrypt: async () => context.api.defaults() } },
    localStorage: {
      getItem(k) { if (readFailure) throw new Error('Storage denied'); return stored.get(k) ?? null; },
      setItem(k, v) { if (writeFailure) throw new Error('QuotaExceededError'); writes.push([k, v]); stored.set(k, v); },
      removeItem(k) { stored.delete(k); },
    },
    Blob, TextEncoder, TextDecoder, URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout(fn) { events.push('timeout:' + String(fn)); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    MT: { stop() { events.push('timerStop'); } }, Music: { fadeStop() { events.push('musicStop'); } },
    M: { on: false }, clearActivity() { events.push('clearActivity'); },
    resetTimetableSession() { events.push('resetSchedule'); },
    refreshLabels() {}, applyTheme() {}, redrawMascot() {},
    render() {}, tick() {}, renderSetup() {}, wizDraw() { events.push('wizardDraw'); }, startTour() { events.push('tourStart'); },
    toast(text) { events.push('toast:' + text); }, audio() {},
    editR: null, editDay: 'mon', tab: 'class', planOpen: -1,
    closeSetup() {}, idbClear: async () => { events.push('idbClear'); },
    mvKey: async () => ({}), unb64: () => new Uint8Array(), mvZip: async bytes => bytes,
    mvCode: () => 'ABCDEFGH', mvFmt: code => code, b64: () => 'encoded',
    rpc: async name => { events.push('rpc:' + name); return name === 'peek_transfer_v2' ? 'rencoded.encoded' : true; },
    crypto: { getRandomValues: bytes => bytes, subtle: {
      encrypt: async () => new Uint8Array([1]),
      decrypt: async () => new TextEncoder().encode(JSON.stringify(context.api.defaults())),
    } },
    location: { reload() { events.push('reload'); } },
  };
  vm.createContext(context);
  vm.runInContext(production + `
    this.api={parseNameImport,parseNames,cleanDisplayName,wizardNames,wizardMode,wizOpen,wizClose,wizHTML,markMode,validateWizardDay,buildDay,
      resetExampleClass,save,load,storageCaption,paintStorageState,beginDemo,endDemo,startDemo,jumpTo,moveTake,moveSend,
      defaults,routineById,WZ,A,STORAGE,DEMO,
      get S(){return S;},set S(v){S=v;},get firstRun(){return firstRun;},
      get clockOffset(){return clockOffset;},set clockOffset(v){clockOffset=v;}};
  `, context);
  function dispatch(type, scope, dataset = {}, fields = {}) {
    const target = Object.assign(node('button'), fields, { dataset });
    target.closest = selector => selector === scope ? target : null;
    for (const fn of listeners.get(type) || []) fn({ target });
    return target;
  }
  return { ...context.api, api: context.api, context, elements, element, events, writes, stored, dispatch,
    allowWrites() { writeFailure = false; }, allowReads() { readFailure = false; } };
}

test('all inline production JavaScript parses', () => {
  for (const [, source] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(source);
});

test('Unicode, compound given names, hyphens and apostrophes survive line import', () => {
  const h = harness();
  assert.deepEqual(plain(h.parseNames('Ana María\nMary Jane\nNguyễn\nوليد\n李\nJean-Luc\nO’Neill', 'lines')),
    ['Ana María', 'Mary Jane', 'Nguyễn', 'وليد', '李', 'Jean-Luc', 'O’Neill']);
  assert.equal(h.cleanDisplayName('  Jose\u0301\t  Luis\u0000 '), 'José Luis');
});

test('a single Smith,Ava row is one student in automatic surname mode', () => {
  const result = harness().parseNameImport('Smith,Ava');
  assert.deepEqual(plain(result.names), ['Ava']);
  assert.equal(result.sourceCount, 1);
  assert.match(result.warnings.join(' '), /Surname, given name/);
});

test('explicit comma-list format resolves two-name ambiguity', () => {
  assert.deepEqual(plain(harness().parseNames('Ava, Noah', 'list')), ['Ava', 'Noah']);
  assert.deepEqual(plain(harness().parseNames('Ana María;李;وليد', 'list')), ['Ana María', '李', 'وليد']);
});

test('CSV headings select preferred names and preserve quoted compound values', () => {
  const text = 'Student ID,Last Name,First Name,Preferred Name\n1,Smith,Ava,\n2,Nguyen,"Mai Linh","An, Nhi"';
  assert.deepEqual(plain(harness().parseNames(text, 'auto')), ['Ava', 'An, Nhi']);
});

test('duplicate given names get surname initials and unresolved collisions are visible', () => {
  const result = harness().parseNameImport('Surname,First name\nSmith,Ava\nStone,Ava\nBrown,Ava');
  assert.deepEqual(plain(result.names), ['Ava S.', 'Ava S.', 'Ava B.']);
  assert.match(result.warnings.join(' '), /display names are the same/);
});

test('line headings and numbered rows do not become student names', () => {
  assert.deepEqual(plain(harness().parseNames('Names\n1. Ana María\n2) 李\n\n', 'lines')), ['Ana María', '李']);
});

test('empty import is explicitly zero pupils and missing CSV name cells warn', () => {
  const h = harness();
  assert.deepEqual(plain(h.parseNameImport('\n \r\n')), { names: [], sourceCount: 0, warnings: [] });
  const result = h.parseNameImport('First name,Surname\n,Smith\nAva,\n,');
  assert.deepEqual(plain(result.names), ['Ava']);
  assert.equal(result.sourceCount, 3);
  assert.match(result.warnings.join(' '), /2 empty name row/);
});

test('empty leading spreadsheet cells keep their columns instead of turning surnames into names', () => {
  const result = harness().parseNameImport('First name\tSurname\n\tSmith\nAna María\tJones', 'table');
  assert.deepEqual(plain(result.names), ['Ana María']);
  assert.match(result.warnings.join(' '), /empty name row/);
});

test('a common Name column heading is detected without importing the heading', () => {
  assert.deepEqual(plain(harness().parseNames('Student ID,Name,Class\n101,Ana María,4A\n102,李,4A', 'table')), ['Ana María', '李']);
});

test('edited preview is the exact list consumed by final setup', () => {
  const h = harness(); h.WZ.d = { names: 'Smith,Ava', previewNames: 'Ana María\n李\n\n' };
  assert.deepEqual(plain(h.wizardNames()), ['Ana María', '李']);
});

test('toolkit setup captures the selected mode and completes from the class list without timetable fields', () => {
  const h = harness(); h.api.S = h.defaults('middle'); h.api.S.mode = 'tools';
  h.markMode(); assert.equal(h.element('startBtn').textContent, 'Open my toolkit');
  h.wizOpen();
  assert.equal(h.WZ.d.mode, 'tools'); assert.match(h.wizHTML(), /Two quick steps/);
  Object.assign(h.WZ.d, { room: 'Year 7 Blue', teacher: 'Ms Lee', previewNames: 'Ana María\n李' });
  h.dispatch('click', '[data-wz]', { wz: 'next' });
  assert.equal(h.WZ.step, 1);
  const roster = h.wizHTML();
  assert.match(roster, /data-wz="finish">Set up my toolkit/);
  assert.doesNotMatch(roster, /data-wz="next"|wzStart|wzRecess|wzLunch|Build my day/);
  // Deliberately invalid unused times must not block the toolkit route.
  Object.assign(h.WZ.d, { start: '', recess: '', lunch: '', end: '', recessLen: '' });
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.WZ.step, 3); assert.equal(h.api.S.mode, 'tools'); assert.equal(h.api.S.wizDone, true);
  assert.equal(h.api.S.studentsAreExample, false); assert.equal(h.api.S.goal.points, 0);
  assert.deepEqual(plain(h.api.S.students), ['Ana María', '李']);
  assert.ok(Object.values(h.api.S.days).every(day => day.length === 0));
  assert.ok(Object.values(h.api.S.reminders).every(reminder => reminder === ''));
  const done = h.wizHTML();
  assert.match(done, /Your toolkit is ready/); assert.match(done, /Open my toolkit/);
  assert.doesNotMatch(done, /same plan every weekday|Build my day/);
  assert.equal(h.events.includes('tourStart'), false);
  h.load();
  assert.equal(h.api.S.mode, 'tools'); assert.equal(h.api.S.room, 'Year 7 Blue');
  assert.deepEqual(plain(h.api.S.students), ['Ana María', '李']);
  assert.ok(Object.values(h.api.S.days).every(day => day.length === 0));
});

test('toolkit setup permits an empty roster and Back keeps its selected route', () => {
  const h = harness(); h.api.S.mode = 'tools'; h.wizOpen(); h.WZ.d.room = '7B';
  h.dispatch('click', '[data-wz]', { wz: 'next' });
  h.dispatch('click', '[data-wz]', { wz: 'back' });
  assert.equal(h.WZ.step, 0); assert.equal(h.wizardMode(), 'tools');
  h.dispatch('click', '[data-wz]', { wz: 'next' });
  assert.match(h.wizHTML(), /Set up my toolkit/);
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.WZ.step, 3); assert.equal(h.api.S.mode, 'tools');
  assert.deepEqual(plain(h.api.S.students), []);
});

test('toolkit setup preserves an established class timetable, one-off plan and reminders', () => {
  const h = harness(); h.api.S.studentsAreExample = false; h.api.S.mode = 'tools';
  h.api.S.days.d20261120 = [{ id: 'assembly', start: '10:00', end: '10:30', name: 'Assembly', kind: 'lesson' }];
  h.api.S.days.mon[0].name = 'My form class'; h.api.S.reminders.mon = 'Bring project work';
  const days = JSON.stringify(h.api.S.days), reminders = JSON.stringify(h.api.S.reminders);
  h.wizOpen(); h.WZ.d.previewNames = 'Ana María';
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.api.S.mode, 'tools'); assert.equal(JSON.stringify(h.api.S.days), days);
  assert.equal(JSON.stringify(h.api.S.reminders), reminders);
  assert.deepEqual(plain(h.api.S.students), ['Ana María']);
});

test('whole-day setup still visits the timetable, validates it, and builds separate weekday blocks', () => {
  const h = harness(); h.api.S.mode = 'day'; h.wizOpen();
  Object.assign(h.WZ.d, validDay());
  h.dispatch('click', '[data-wz]', { wz: 'next' });
  assert.equal(h.WZ.step, 1); assert.match(h.wizHTML(), /data-wz="next"/);
  h.dispatch('click', '[data-wz]', { wz: 'next' });
  assert.equal(h.WZ.step, 2); assert.match(h.wizHTML(), /wzStart/); assert.match(h.wizHTML(), /Build my day/);
  h.WZ.d.lunch = '09:00';
  const before = JSON.stringify(h.api.S), writes = h.writes.length;
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.WZ.step, 2); assert.equal(JSON.stringify(h.api.S), before); assert.equal(h.writes.length, writes);
  assert.ok(h.events.some(event => /toast:Check the order/.test(event)));
  Object.assign(h.WZ.d, validDay());
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.WZ.step, 3); assert.equal(h.api.S.mode, 'day');
  assert.equal(h.element('startBtn').textContent, 'Start my day');
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const allIds = weekdays.flatMap(day => h.api.S.days[day].map(block => block.id));
  assert.equal(new Set(allIds).size, allIds.length);
  for (const day of weekdays) {
    const blocks = h.api.S.days[day];
    assert.equal(blocks[0].start, '08:40'); assert.equal(blocks.at(-1).end, '15:00');
    assert.ok(blocks.some(block => block.name === 'Recess')); assert.ok(blocks.some(block => block.name === 'Lunch'));
    blocks.forEach((block, i) => { assert.ok(block.end > block.start); if (i) assert.ok(block.start >= blocks[i - 1].end); });
  }
  assert.match(h.wizHTML(), /same plan every weekday/);
  assert.equal(JSON.parse(h.stored.get('bellbird.v2')).mode, 'day');
});

test('closing or skipping setup does not start a tour; the completion tour button does', () => {
  for (const action of ['close', 'skip']) {
    const h = harness(); h.wizOpen(); h.element('wzHost');
    h.dispatch('click', '[data-wz]', { wz: action });
    assert.equal(h.elements.has('wzHost'), false); assert.equal(h.api.S.wizDone, true);
    assert.equal(h.events.includes('tourStart'), false);
    assert.ok(!h.events.some(event => event.startsWith('timeout:') && event.includes('startTour')));
  }
  const h = harness(); h.wizOpen(); Object.assign(h.WZ.d, validDay());
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.match(h.wizHTML(), /data-wz="tour">Show me around/);
  h.element('wzHost'); h.dispatch('click', '[data-wz]', { wz: 'tour' });
  assert.equal(h.elements.has('wzHost'), false);
  assert.equal(h.events.filter(event => event === 'tourStart').length, 1);
});

test('toolkit setup begun in demo retains its chosen mode when the real class is restored', () => {
  const h = harness(); h.api.S.mode = 'day'; h.beginDemo(); h.api.S.mode = 'tools';
  h.wizOpen(); Object.assign(h.WZ.d, { room: '7C', teacher: 'Ms Lee', previewNames: 'Ana María', start: '' });
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.DEMO.active, false); assert.equal(h.api.S.mode, 'tools');
  assert.equal(h.api.S.room, '7C'); assert.equal(JSON.parse(h.stored.get('bellbird.v2')).mode, 'tools');
});

test('ordinary timetable validates and produces ordered, nonoverlapping blocks for every band', () => {
  const h = harness(), d = validDay();
  assert.equal(h.validateWizardDay(d), '');
  for (const band of ['early', 'primary', 'middle']) {
    const blocks = h.buildDay(d, band);
    assert.ok(blocks.length >= 7);
    blocks.forEach((b, i) => {
      assert.match(b.start, /^\d{2}:\d{2}$/); assert.match(b.end, /^\d{2}:\d{2}$/);
      assert.ok(b.end > b.start); if (i) assert.ok(b.start >= blocks[i - 1].end);
    });
  }
});

for (const [label, change] of [
  ['missing start', { start: '' }], ['invalid hour', { start: '24:00' }],
  ['invalid minute', { recess: '10:60' }], ['reverse order', { lunch: '09:00' }],
  ['overlapping recess and lunch', { lunch: '10:50' }], ['no arrival lesson gap', { recess: '08:55' }],
  ['no lesson after lunch', { end: '13:45' }], ['non-numeric recess', { recessLen: 'abc' }],
  ['negative break', { lunchLen: -1 }], ['excessive recess', { recessLen: 61 }],
]) test(`timetable rejects ${label}`, () => {
  const h = harness(); assert.notEqual(h.validateWizardDay({ ...validDay(), ...change }), '');
});

test('fractional break lengths are rejected before they produce invalid clock strings', () => {
  const h = harness(), d = { ...validDay(), recessLen: 20.5 };
  assert.notEqual(h.validateWizardDay(d), '');
});

function seedExampleUse(h) {
  Object.assign(h.api.S, {
    life: 9, goalsDone: 1, resetBest: 12,
    log: { sample: { points: 14 } }, ticketUsed: { sample: true }, ticketNo: 3,
    seat: { layout: 'pairs', tables: [{ id: 'table', n: 2 }], seats: { 'table-0': 'Ava', 'table-1': 'Noah' } },
    jobs: { list: ['Door'], off: 0, fixed: { 0: 'Ava' }, auto: false },
  });
  h.api.S.routines[0].best = 10;
  Object.assign(h.A, { picked: 'Ava', pipPicked: 'Noah', hero: 'Mia', heroPool: ['Ava'], pickPool: ['Noah'], groups: [['Ava']], goalShown: 14 });
  h.A.feel.chat = 2; h.A.feelDay = { arrival: { chat: 2 } };
}

test('creating a real class clears example points, counts, routine records and zero pupils stay zero', () => {
  const h = harness(); seedExampleUse(h); h.WZ.d = { ...validDay(), previewNames: '' };
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.api.S.studentsAreExample, false); assert.deepEqual(plain(h.api.S.students), []);
  assert.equal(h.api.S.goal.points, 0); assert.deepEqual(plain(h.api.S.log), {});
  assert.deepEqual(plain(h.api.S.ticketUsed), {}); assert.equal(h.api.S.ticketNo, 0);
  assert.equal(h.api.S.routines[0].best, undefined); assert.equal(h.A.feel.chat, 0);
  assert.equal(h.WZ.step, 3); assert.equal(JSON.parse(h.stored.get('bellbird.v2')).students.length, 0);
});

test('real-class setup also clears example seating, fixed helpers, growth and picker results', () => {
  const h = harness(); seedExampleUse(h); h.WZ.d = { ...validDay(), previewNames: '' };
  h.dispatch('click', '[data-wz]', { wz: 'finish' });
  const retained = {
    seats: h.api.S.seat?.seats || {}, fixedJobs: h.api.S.jobs?.fixed || {},
    life: h.api.S.life || 0, goalsDone: h.api.S.goalsDone || 0, resetBest: h.api.S.resetBest || 0,
    picked: h.A.picked || null, pipPicked: h.A.pipPicked || null, hero: h.A.hero || null, heroPool: h.A.heroPool || [],
  };
  assert.deepEqual(plain(retained), { seats: {}, fixedJobs: {}, life: 0, goalsDone: 0, resetBest: 0, picked: null, pipPicked: null, hero: null, heroPool: [] });
});

test('editing class list to empty also exits example mode and preserves Unicode on later input', () => {
  const h = harness(); seedExampleUse(h);
  h.dispatch('input', '#sheetHost', {}, { id: 'fStudents', value: '' });
  assert.equal(h.api.S.studentsAreExample, false); assert.deepEqual(plain(h.api.S.students), []);
  assert.equal(h.api.S.goal.points, 0);
  h.dispatch('input', '#sheetHost', {}, { id: 'fStudents', value: 'Ana María\n李' });
  assert.deepEqual(plain(h.api.S.students), ['Ana María', '李']);
});

test('resetting examples never clears an established class history', () => {
  const h = harness(); seedExampleUse(h); h.api.S.studentsAreExample = false;
  const before = JSON.stringify(h.api.S); h.resetExampleClass(); assert.equal(JSON.stringify(h.api.S), before);
});

test('save returns false and exposes a persistent alert when quota is exceeded', () => {
  const h = harness({ writeFailure: true });
  assert.equal(h.save(), false); assert.equal(h.writes.length, 0);
  const alert = h.elements.get('storageWarning');
  assert.equal(alert.attributes.role, 'alert'); assert.match(alert.innerHTML, /could not be saved/);
  assert.match(alert.innerHTML, /Download current backup/); assert.match(h.storageCaption(), /have not been saved/);
  h.allowWrites(); assert.equal(h.save(), true); assert.equal(h.STORAGE.error, '');
  assert.equal(h.elements.has('storageWarning'), false);
});

test('invalid JSON is retained verbatim and cannot be overwritten by normal save', () => {
  const raw = '{broken class'; const h = harness({ stored: { 'bellbird.v2': raw } });
  assert.equal(h.STORAGE.original, raw); assert.match(h.STORAGE.error, /could not be opened/);
  assert.equal(h.save(), false); assert.equal(h.stored.get('bellbird.v2'), raw); assert.equal(h.writes.length, 0);
  assert.match(h.elements.get('storageWarning').innerHTML, /Download original saved data/);
});

for (const [label, change] of [
  ['nonobject timetable', { days: 42 }], ['nonarray day', { days: { mon: 42 } }],
  ['null routine', { routines: [null] }], ['nonstring pupil', { students: [{ name: 'Ava' }] }],
]) test(`structurally corrupt saved class is protected: ${label}`, () => {
  const seed = harness().defaults(); const raw = JSON.stringify({ ...seed, ...change });
  const h = harness({ stored: { 'bellbird.v2': raw } });
  assert.equal(h.STORAGE.original, raw); assert.equal(h.save(), false);
  assert.equal(h.stored.get('bellbird.v2'), raw);
});

test('read-denied storage surfaces an alert and can recover through a successful write', () => {
  const h = harness({ readFailure: true, writeFailure: true });
  assert.match(h.STORAGE.error, /could not read/); assert.equal(h.save(), false);
  h.allowReads(); h.allowWrites(); assert.equal(h.save(), true); assert.equal(h.elements.has('storageWarning'), false);
});

test('restore does not claim persistent success when writing the restored class fails', () => {
  const h = harness({ writeFailure: true }); h.element('fBackup').value = JSON.stringify(h.defaults());
  h.dispatch('click', '#sheetHost button', { sact: 'restore' });
  assert.equal(h.writes.length, 0);
  assert.doesNotMatch(h.element('privMsg').innerHTML, /class="okbox">Restored\./);
  assert.match(h.element('privMsg').innerHTML, /not.*saved|could not.*save|open.*page|backup/i);
});

test('demo mutations never reach saved data and exit restores the same original class object', () => {
  const h = harness(); h.api.S.studentsAreExample = false; h.save(); h.writes.length = 0;
  const original = h.api.S, stored = h.stored.get('bellbird.v2');
  h.A.feel.chat = 3; h.A.ext = { block: 5 }; h.A.hold = { block: true };
  assert.equal(h.beginDemo(), true); assert.notEqual(h.api.S, original); assert.equal(h.DEMO.active, true);
  h.api.S.room = 'Demo room'; h.api.S.students.push('Demo pupil'); h.api.S.goal.points = 99;
  h.A.feel.chat = 20; h.A.ext = { demo: 99 }; h.api.clockOffset = 3600000;
  assert.equal(h.save(), true); assert.equal(h.writes.length, 0); assert.equal(h.stored.get('bellbird.v2'), stored);
  assert.match(h.storageCaption(), /Demo changes stay/);
  h.endDemo(false);
  assert.equal(h.api.S, original); assert.equal(h.api.S.room, 'Room 7');
  assert.equal(h.A.feel.chat, 3); assert.deepEqual(plain(h.A.ext), { block: 5 });
  assert.equal(h.api.clockOffset, 0); assert.equal(h.DEMO.active, false); assert.equal(h.elements.get('demoTag').hidden, true);
  assert.equal(h.events.filter(x => x === 'resetSchedule').length, 2);
});

test('demo cannot begin with student devices, remote or coaching active', () => {
  for (const feature of ['liveOn', 'remote', 'coaching']) {
    const h = harness(); if (feature === 'coaching') h.context.M.on = true; else h.api.S[feature] = true;
    const original = h.api.S;
    assert.equal(h.beginDemo(), false); assert.equal(h.DEMO.active, false); assert.equal(h.api.S, original);
    assert.ok(h.events.some(x => x.startsWith('toast:')));
  }
});

test('reentering demo preserves its original snapshot rather than replacing it with the demo', () => {
  const h = harness(), original = h.api.S; h.beginDemo(); h.api.S.room = 'Demo edit'; h.beginDemo(); h.endDemo(false);
  assert.equal(h.api.S, original); assert.equal(h.api.S.room, 'Room 7');
});

test('finishing setup from demo first restores original state, then saves the real class', () => {
  const h = harness(); h.beginDemo(); h.api.S.goal.points = 99;
  h.WZ.d = validDay(); h.dispatch('click', '[data-wz]', { wz: 'finish' });
  assert.equal(h.DEMO.active, false); assert.equal(h.api.S.room, 'Year 4');
  assert.deepEqual(plain(h.api.S.students), ['Ana María', '李']); assert.equal(h.api.S.goal.points, 0);
  assert.equal(JSON.parse(h.stored.get('bellbird.v2')).room, 'Year 4');
});

test('demo restores or clears demo-only picker and hero state before returning to a real class', () => {
  const h = harness(); h.api.S.studentsAreExample = false;
  h.A.picked = 'Ana'; h.A.hero = '李'; h.A.heroPool = ['Ana']; h.A.pickPool = ['李'];
  h.beginDemo(); h.A.picked = 'Demo pupil'; h.A.pipPicked = 'Demo pupil'; h.A.hero = 'Demo pupil'; h.A.heroPool = ['Demo pupil']; h.A.pickPool = ['Demo pupil'];
  h.endDemo(false);
  assert.doesNotMatch(JSON.stringify({ picked: h.A.picked, pipPicked: h.A.pipPicked, hero: h.A.hero, heroPool: h.A.heroPool, pickPool: h.A.pickPool }), /Demo pupil/);
});

test('a received move stays open for recovery instead of reloading after failed persistence', async () => {
  const h = harness({ writeFailure: true }), message = h.element('mvMsg');
  await h.moveTake('A'.repeat(43), message);
  assert.equal(h.writes.length, 0);
  assert.ok(!h.events.some(x => x.startsWith('timeout:') && x.includes('location.reload')), 'Must not schedule reload of an unsaved transferred class');
  assert.match(message.innerHTML, /not.*saved|could not.*save|open.*page|backup/i);
});

test('demo prevents moving a class in or out through the network', async () => {
  const h = harness(); h.beginDemo(); h.events.length = 0;
  await h.moveTake('A'.repeat(43), h.element('mvMsg')); await h.moveSend();
  assert.deepEqual(h.events.filter(x => x.startsWith('rpc:')), []);
  assert.ok(!h.events.some(x => x.startsWith('timeout:') && x.includes('location.reload')));
});

test('erase in demo cannot remove the real saved class or its shared media store', () => {
  const h = harness(); h.save(); const original = h.stored.get('bellbird.v2');
  h.beginDemo(); h.events.length = 0; h.dispatch('click', '#sheetHost button', { sact: 'eraseYes' });
  assert.ok(h.stored.get('bellbird.v2') === original, 'Demo erase must preserve the original saved class');
  assert.equal(h.events.includes('idbClear'), false);
});
