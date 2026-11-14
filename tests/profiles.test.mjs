import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const model = script.slice(script.indexOf('function profileClone('), script.indexOf('/* PROFILE_MODEL_END */'));
const saveCode = script.slice(script.indexOf('function profileSaveState('), script.indexOf('/* PROFILE_SAVE_END */'));
const defaultsCode = script.slice(script.indexOf('function defaults('), script.indexOf('let S, firstRun='));
const plain = value => JSON.parse(JSON.stringify(value));

function harness() {
  const context = vm.createContext({
    DAYS: ['mon', 'tue', 'wed', 'thu', 'fri'], EXPECT: { own: { name: 'Independent work', items: [] } },
    dayFor: () => [{ id: 'old-block', start: '09:00', end: '10:00', name: 'Example lesson', kind: 'lesson' }],
    routinesFor: () => [{ id: 'arrival', name: 'Arrival', steps: 'Get ready', minutes: 3, best: 28 }],
  });
  vm.runInContext(defaultsCode + '\n' + model + '\n' + saveCode, context);
  return context;
}

function originalClass(api) {
  const data = plain(api.defaults('primary'));
  Object.assign(data, {
    room: 'Year 7 Blue', teacher: 'Ms Lee', students: ['Anna Maria', '王小明'], studentsAreExample: false,
    theme: 'mint', calmLook: false, dockOrder: ['poll', 'timer'], dockHide: ['brain'],
    goal: { name: 'Class picnic', points: 7, target: 20 },
    log: { d20261114: { pts: 4, feel: { arrival: { good: 2 } } } },
    mirrors: [{ id: 'lesson-a', words: ['Existing report'] }],
    seat: { tables: [{ id: 'table-a', seats: ['Anna Maria'] }] },
  });
  return data;
}

test('creating a class preserves the complete current class and starts a genuinely blank profile', () => {
  const api = harness(), original = originalClass(api), before = JSON.stringify(original);
  const next = api.profileCreateState(original, { room: 'Year 7 Green', teacher: 'Ms Lee', band: 'middle' }, 'class-green', 'class-blue');
  assert.equal(JSON.stringify(original), before);
  assert.equal(next.classProfileId, 'class-green');
  assert.equal(next.classProfiles.length, 1);
  assert.equal(next.classProfiles[0].id, 'class-blue');
  assert.deepEqual(plain(next.classProfiles[0].data), original);
  assert.deepEqual(plain(next.students), []);
  assert.equal(next.studentsAreExample, false);
  assert.equal(next.goal.points, 0);
  assert.equal(next.mode, 'tools');
  assert.equal(next.autoStart, false);
  assert.ok(Object.values(next.days).every(day => day.length === 0));
  assert.ok(Object.values(next.reminders).every(value => value === ''));
  assert.deepEqual(plain(next.log), {});
  assert.deepEqual(plain(next.mirrors), []);
  assert.equal(next.routines[0].best, undefined);
  assert.equal(next.calmLook, true);
  assert.equal(next.classFileNamespace, 'class-green');
});

test('switching isolates names, points, layout, custom tools and history in both directions', () => {
  const api = harness(), original = originalClass(api);
  let state = api.profileCreateState(original, { room: 'Green', band: 'middle' }, 'class-green', 'class-blue');
  state.students.push('Sam'); state.goal.points = 3; state.theme = 'grape'; state.room = 'Green renamed';
  state = api.profileSwitchState(state, 'class-blue');
  assert.deepEqual(plain(state.students), original.students);
  assert.equal(state.goal.points, 7);
  assert.equal(state.theme, 'mint');
  assert.deepEqual(plain(state.dockOrder), ['poll', 'timer']);
  assert.deepEqual(plain(state.dockHide), ['brain']);
  assert.deepEqual(plain(state.mirrors), original.mirrors);
  assert.deepEqual(plain(state.seat), original.seat);
  state.students.push('Ava'); state.room = 'Blue renamed';
  state = api.profileSwitchState(state, 'class-green');
  assert.deepEqual(plain(state.students), ['Sam']);
  assert.equal(state.goal.points, 3);
  assert.equal(state.theme, 'grape');
  assert.equal(state.room, 'Green renamed');
  assert.equal(state.classProfiles[0].data.room, 'Blue renamed');
  assert.deepEqual(plain(state.classProfiles[0].data.students), ['Anna Maria', '王小明', 'Ava']);
});

test('repeated switches and a JSON backup keep one active class and non-recursive inactive snapshots', () => {
  const api = harness();
  let state = api.profileCreateState(originalClass(api), { room: 'Green' }, 'class-green', 'class-blue');
  state = api.profileCreateState(state, { room: 'Gold', band: 'early' }, 'class-gold');
  for (const id of ['class-blue', 'class-green', 'class-gold', 'class-blue', 'class-gold']) state = api.profileSwitchState(state, id);
  const backup = JSON.stringify(state), restored = JSON.parse(backup);
  assert.equal((backup.match(/"classProfiles":/g) || []).length, 1);
  assert.equal((backup.match(/"classProfileId":/g) || []).length, 1);
  assert.equal(restored.classProfiles.length, 2);
  assert.equal(new Set([restored.classProfileId, ...restored.classProfiles.map(profile => profile.id)]).size, 3);
  for (const profile of restored.classProfiles) {
    assert.equal(profile.id === restored.classProfileId, false);
    assert.equal(Object.hasOwn(profile.data, 'classProfiles'), false);
    assert.equal(Object.hasOwn(profile.data, 'classProfileId'), false);
  }
  assert.equal(api.profileSwitchState(restored, 'class-blue').room, 'Year 7 Blue');
});

test('failed or thrown saves roll back the active state without mutating its class data', () => {
  const api = harness(), previous = originalClass(api), before = JSON.stringify(previous);
  const next = api.profileCreateState(previous, { room: 'Green' }, 'class-green', 'class-blue');
  api.S = previous; api.paintStorageState = () => {};
  api.save = () => false;
  assert.equal(api.profileSaveState(next), false);
  assert.equal(api.S, previous);
  assert.equal(JSON.stringify(previous), before);
  api.save = () => { throw new Error('Quota exceeded'); };
  assert.equal(api.profileSaveState(next), false);
  assert.equal(api.S, previous);
  let written;
  api.save = () => { written = JSON.stringify(api.S); return true; };
  assert.equal(api.profileSaveState(next), true);
  assert.equal(api.S, next);
  assert.equal(JSON.parse(written).classProfiles[0].data.room, previous.room);
});

test('invalid profile collections and blank class names cannot change the active class', () => {
  const api = harness(), original = originalClass(api);
  assert.throws(() => api.profileCreateState(original, { room: ' ' }, 'new', 'old'), /name/);
  assert.throws(() => api.profileCreateState(original, { room: 'New' }, 'same', 'same'), /unique ID/);
  assert.throws(() => api.profileSwitchState(original, 'missing', 'old'), /no longer/);
  const recursive = { ...original, classProfileId: 'a', classProfiles: [{ id: 'b', data: { ...original, classProfiles: [] } }] };
  assert.throws(() => api.profileRecords(recursive), /not valid/);
  const duplicate = { ...original, classProfileId: 'a', classProfiles: [{ id: 'a', data: original }] };
  assert.throws(() => api.profileRecords(duplicate), /not valid/);
});

test('session guards identify the work that must stop before a class change', () => {
  const api = harness();
  assert.equal(api.profileGuardMessage({}), '');
  assert.match(api.profileGuardMessage({ demo: true }), /Exit the demo/);
  assert.match(api.profileGuardMessage({ live: true }), /Student devices/);
  assert.match(api.profileGuardMessage({ remote: true }), /Phone remote/);
  assert.match(api.profileGuardMessage({ coach: true }), /coaching/);
  assert.match(api.profileGuardMessage({ voice: true }), /Voice/);
  assert.match(api.profileGuardMessage({ media: true }), /audio file/);
});

test('own audio for identical template routine IDs is separated without moving legacy files', () => {
  const api = harness();
  assert.equal(api.profileFileKey('song-arrival', {}), 'song-arrival');
  assert.equal(api.profileFileKey('song-arrival', { classFileNamespace: 'green' }), 'class:green:song-arrival');
  assert.equal(api.profileFileKey('song-arrival', { classFileNamespace: 'blue' }), 'class:blue:song-arrival');
  assert.equal(api.profileFileKey('media-unique', { classFileNamespace: 'green' }), 'media-unique');
});

test('clearClassRuntime removes outgoing class state and does not alter or save S', () => {
  const cleanup = script.slice(script.indexOf('function clearClassRuntime('), script.indexOf('function profileSourceWithLatestCounts('));
  const voiceCleanup = script.slice(script.indexOf('function speechAbort('), script.indexOf('async function vLocalReady('));
  const calls = [], spy = name => () => calls.push(name), overlay = { innerHTML: 'old overlay' };
  const previous = originalClass(harness()), before = JSON.stringify(previous);
  const context = vm.createContext({
    S: previous, PROFILE_EPOCH: 1,
    A: { picked: 'Anna Maria', groups: [['Anna Maria']], hero: '王小明', feelDay: { arrival: { good: 2 } }, live: { res: [{ name: 'Anna Maria' }] }, pip: { close: spy('float') } },
    MT: { stop: spy('timer') }, clearActivity: spy('activity'), RS: {}, RZ: {}, Music: { stop: spy('music') }, YT_: { stop: spy('youtube') }, Focus: { stop: spy('focus') },
    speechSynthesis: { cancel: spy('speech') }, clearInterval: () => {}, clearTimeout: () => {}, cancelAnimationFrame: () => {},
    N: { stream: { getTracks: () => [{ stop: spy('noise') }] } }, V: { rec: { stop: spy('voice') } },
    document: { getElementById: id => id === 'overlayHost' ? overlay : null },
    closeClassPop: spy('class pop'), closeDMenu: spy('dock menu'), closeSegPop: spy('timetable pop'),
    Bird: { bub: { hidden: false, textContent: 'Anna Maria!' } }, pickSpinning: true, seatDrag: {}, RM: { after: 8 }, VIS: { page: { rvis: 4 } }, AIX: { report: { copied: true } },
    clockOffset: 20, editDay: 'fri', editR: 'old-routine', planOpen: 2, RMK: { id: 'old' }, WZ: { step: 2, d: { room: 'Old' } },
    isWeekend: () => false, now: () => new Date(), dayKey: () => 'mon', resetTimetableSession: spy('timetable'),
    markTools: () => {}, markHero: () => {}, markLive: () => {}, markFloat: () => {}, vMark: () => {}, save: spy('save'),
  });
  vm.runInContext(voiceCleanup + '\n' + cleanup, context); context.clearClassRuntime();
  assert.equal(context.S, previous); assert.equal(JSON.stringify(previous), before); assert.equal(calls.includes('save'), false);
  assert.equal(context.PROFILE_EPOCH, 2); assert.equal(context.A.picked, null); assert.equal(context.A.hero, null);
  assert.deepEqual(plain(context.A.groups), []); assert.deepEqual(plain(context.A.feelDay), {}); assert.deepEqual(plain(context.A.live.res), []);
  assert.equal(context.clockOffset, 0); assert.equal(context.planOpen, -1); assert.equal(context.editDay, 'mon');
  assert.equal(context.Bird.bub.hidden, true); assert.equal(context.Bird.bub.textContent, ''); assert.equal(overlay.innerHTML, '');
  for (const name of ['timer', 'activity', 'music', 'youtube', 'focus', 'speech', 'noise', 'voice', 'float', 'timetable']) assert.ok(calls.includes(name), name);
});
