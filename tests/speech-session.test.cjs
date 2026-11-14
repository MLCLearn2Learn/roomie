const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function between(start, end) {
  const a = script.indexOf(start), b = script.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Production section: ${start}`);
  return script.slice(a, b);
}
const initialState = script.match(/^const V=.+$/m)[0] + '\n' + script.match(/^const M=.+$/m)[0];
const voice = between('function vMark()', 'function renderVoiceHelp(');
const preference = between('function speechModeStatus()', '/* ---- v1.8: Coaching.');
const mirrorStart = between('async function mirStart()', 'function mirTick()');
const mirrorSpeech = between('function mirSpeechStop()', 'function mirFeed(');
const mirrorStop = between('function mirStop()', 'function mirDone()');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const result = text => {
  const line = [{ transcript: text }]; line.isFinal = true;
  return { resultIndex: 0, results: [line] };
};

function harness(options = {}) {
  const instances = [], events = {}, timers = new Map(), messages = [], commands = [], words = [], channels = [];
  let timerId = 0, availableCalls = 0, installCalls = 0, saves = 0, nextId = 0;
  class Recognition {
    constructor() { if (options.localProperty !== false) this.processLocally = false; this.starts = 0; this.aborts = 0; instances.push(this); }
    start(track) { this.starts++; this.track = track; if (options.startThrows) throw new Error('Cannot start'); }
    abort() { this.aborts++; }
    static available() { availableCalls++; return options.available ? options.available() : Promise.resolve('available'); }
    static install() { installCalls++; return options.install ? options.install() : Promise.resolve(true); }
  }
  function channel() {
    const track = { stops: 0, stop() { this.stops++; } };
    const ch = { track, st: { getTracks: () => [track], getAudioTracks: () => [track] } };
    channels.push(ch); return ch;
  }
  const mic = { classList: { toggle() {} }, title: '' };
  const api = vm.createContext({
    S: { voiceCloud: !!options.cloud, voice: !!options.savedVoice, voiceHelped: true, coach: {}, mirrors: [{ id: 'earlier', words: [{ t: 'Earlier lesson' }] }] },
    A: { overlay: null, P: { block: { name: 'Maths' } } }, DEMO: { active: false }, SL: { on: false }, STUDENT: false, SR: options.noRecognition ? null : Recognition,
    document: {
      getElementById: id => id === 'micBtn' ? mic : null,
      addEventListener(type, listener) { (events[type] ||= []).push(listener); },
    },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval() { return ++timerId; }, clearInterval() {},
    toast: text => messages.push(text), save: () => { saves++; return true; }, render() {}, audio() {},
    openOverlay: name => { api.A.overlay = name; }, vShow: text => messages.push(text), wakeIn: text => text,
    vHandle: text => commands.push(text), mirFeed: text => words.push(text),
    mirOpen: (...args) => options.open ? options.open(...args) : Promise.resolve(channel()),
    mGoal: () => null, mirTick() {}, mirMark() {}, mirDone() {}, slidesLink() {}, slidesStop() {},
    Bird: { say() {} }, uid: () => `lesson-${++nextId}`, now: () => new Date(),
  });
  vm.runInContext([initialState, voice, preference, mirrorStart, mirrorSpeech, mirrorStop, 'globalThis.V = V; globalThis.M = M;'].join('\n'), api);
  const change = value => {
    const target = { id: 'vCloud', checked: value };
    for (const listener of events.change || []) listener({ target });
    return target.checked;
  };
  return { api, instances, events, timers, messages, commands, words, channels, channel, change,
    get availableCalls() { return availableCalls; }, get installCalls() { return installCalls; }, get saves() { return saves; } };
}

test('idle preference changes never start speech, and idle text does not claim local listening', () => {
  const h = harness();
  assert.match(h.api.vPrivacyHTML(), /On-device speech selected · not listening/);
  assert.equal(h.change(true), true);
  assert.equal(h.api.S.voiceCloud, true);
  assert.equal(h.api.S.voice, false);
  assert.match(h.api.vPrivacyHTML(), /Cloud speech selected · not listening/);
  assert.equal(h.instances.length, 0);
  assert.equal(h.availableCalls, 0);
});

test('active cloud voice blocks a mode change, restores the checkbox and retains the accurate mode', async () => {
  const h = harness({ cloud: true });
  await h.api.vStart(); const r = h.instances[0]; r.onstart();
  assert.equal(h.change(false), true);
  assert.equal(h.api.S.voiceCloud, true);
  assert.equal(h.api.V.rec, r);
  assert.equal(r.aborts, 0);
  assert.match(h.api.vPrivacyHTML(), /Cloud speech recognition is listening/);
  assert.match(h.messages.at(-1), /Stop voice commands/);
});

test('active lesson coaching blocks a mode change without losing measurements or history', async () => {
  const h = harness({ cloud: true });
  await h.api.mirStart(); await flush(); h.instances[0].onstart();
  h.api.M.teacher = 23; h.api.M.words.push({ at: 2, t: 'What do you notice?' });
  const history = JSON.stringify(h.api.S.mirrors);
  assert.equal(h.change(false), true);
  assert.equal(h.api.M.on, true);
  assert.equal(h.api.M.teacher, 23);
  assert.equal(h.api.M.words.length, 1);
  assert.equal(JSON.stringify(h.api.S.mirrors), history);
  assert.match(h.messages.at(-1), /Stop lesson coaching/);
});

test('a pending local voice start blocks preference changes; cancellation prevents a late start', async () => {
  const pack = deferred(), h = harness({ available: () => pack.promise });
  const start = h.api.vStart();
  assert.equal(h.api.V.starting, true);
  assert.equal(h.change(true), false);
  h.api.vStop();
  assert.equal(h.change(true), true);
  pack.resolve('available'); await start;
  assert.equal(h.instances.length, 0);
  assert.equal(h.api.V.on, false);
  assert.equal(h.api.V.starting, false);
  await h.api.vStart();
  assert.equal(h.instances.length, 1);
  assert.equal(h.instances[0].processLocally, false);
});

test('repeated start clicks share the pending operation instead of opening multiple recognizers', async () => {
  const pack = deferred(), h = harness({ available: () => pack.promise });
  const first = h.api.vStart(), second = h.api.vStart();
  assert.equal(h.availableCalls, 1);
  pack.resolve('available'); await Promise.all([first, second]);
  assert.equal(h.instances.length, 1);
  assert.equal(h.instances[0].starts, 1);
});

test('cancelled availability and language-pack downloads cannot start recognition later', async () => {
  const available = deferred(), first = harness({ available: () => available.promise });
  const a = first.api.vStart(); first.api.vStop(); available.resolve('downloadable'); await a;
  assert.equal(first.installCalls, 0);
  assert.equal(first.instances.length, 0);
  const install = deferred(), second = harness({ available: () => Promise.resolve('downloadable'), install: () => install.promise });
  const b = second.api.vStart(); await flush(); assert.equal(second.installCalls, 1);
  second.api.vStop(); install.resolve(true); await b;
  assert.equal(second.instances.length, 0);
  assert.equal(second.api.V.starting, false);
});

test('local voice needs both supported availability and the actual processLocally property', async () => {
  const unavailable = harness({ available: () => Promise.resolve('unavailable') });
  await unavailable.api.vStart();
  assert.equal(unavailable.instances.length, 0);
  assert.match(unavailable.api.vPrivacyHTML(), /On-device speech recognition is unavailable/);
  const unsupported = harness({ localProperty: false });
  await unsupported.api.vStart();
  assert.equal(unsupported.instances[0].starts, 0);
  assert.equal(unsupported.api.V.on, false);
  assert.equal(unsupported.api.V.starting, false);
  assert.match(unsupported.api.vPrivacyHTML(), /On-device speech recognition is unavailable/);
});

test('a local-listening label requires a supported local request and the native start event', async () => {
  const h = harness(); await h.api.vStart(); const r = h.instances[0];
  assert.equal(r.processLocally, true); assert.equal(r.lang, 'en-US');
  assert.match(h.api.vPrivacyHTML(), /Speech recognition is starting/);
  assert.doesNotMatch(h.api.vPrivacyHTML(), /<b>Listening on this computer/);
  r.onstart();
  assert.match(h.api.vPrivacyHTML(), /<b>Listening on this computer/);
  r.onerror({ error: 'not-allowed' });
  assert.equal(h.api.V.on, false);
  assert.doesNotMatch(h.api.vPrivacyHTML(), /<b>Listening on this computer/);
});

test('late callbacks from an ended voice session cannot command or stop its replacement', async () => {
  const h = harness({ cloud: true }); await h.api.vStart(); const old = h.instances[0];
  const late = { start: old.onstart, result: old.onresult, error: old.onerror, end: old.onend };
  old.onstart(); h.api.vStop(); await h.api.vStart(); const current = h.instances[1]; current.onstart();
  late.start(); late.result(result('timer 5 minutes')); late.error({ error: 'not-allowed' }); late.end();
  assert.equal(h.commands.length, 0); assert.equal(h.words.length, 0);
  assert.equal(h.api.V.rec, current); assert.equal(h.api.V.listening, true);
  assert.equal(current.aborts, 0); assert.equal(old.starts, 1);
});

test('a queued voice restart rechecks the session after Stop, even if its callback is already queued', async () => {
  const h = harness({ cloud: true }); await h.api.vStart(); const r = h.instances[0]; r.onstart(); r.onend();
  const restart = [...h.timers.values()].find(item => item.delay === 300).fn;
  h.api.vStop(); restart();
  assert.equal(r.starts, 1); assert.equal(h.api.V.on, false); assert.equal(h.api.V.restart, 0);
});

test('native voice startup failure clears the session and requires a new explicit start', async () => {
  const h = harness({ cloud: true, startThrows: true }); await h.api.vStart();
  assert.equal(h.api.V.rec, null); assert.equal(h.api.V.on, false); assert.equal(h.api.V.starting, false);
  assert.equal(h.api.S.voice, false);
  assert.match(h.messages.at(-1), /could not start/);
});

test('cancelling pending lesson microphone access closes late tracks and preserves old reports', async () => {
  const permission = deferred(), h = harness({ cloud: true, open: () => permission.promise });
  const history = JSON.stringify(h.api.S.mirrors), start = h.api.mirStart();
  assert.equal(h.api.M.starting, true); assert.equal(h.change(false), true);
  h.api.mirStop(); const ch = h.channel(); permission.resolve(ch); await start;
  assert.equal(ch.track.stops, 1); assert.equal(h.api.M.on, false); assert.equal(h.api.M.starting, false);
  assert.equal(h.instances.length, 0); assert.equal(JSON.stringify(h.api.S.mirrors), history);
});

test('unsupported on-device coaching keeps measurements but never falls back to cloud speech', async () => {
  const h = harness({ localProperty: false }); await h.api.mirStart(); await flush();
  assert.equal(h.api.M.on, true); assert.equal(h.api.M.sr, null);
  assert.equal(h.instances[0].starts, 0); assert.equal(h.api.M.speechStarting, false);
  assert.match(h.messages.at(-1), /without a transcript/);
  assert.match(h.api.vPrivacyHTML(), /On-device speech recognition is unavailable/);
});

test('stopping a lesson during speech preparation saves its measurements and cancels the late start', async () => {
  const pack = deferred(), h = harness({ available: () => pack.promise });
  await h.api.mirStart();
  h.api.M.teacher = 12; h.api.M.students = 6; h.api.M.quiet = 2;
  h.api.M.cur = { t: 12, s: 6, q: 2 }; h.api.M.words.push({ at: 1, t: 'Preserve this line' });
  h.api.mirStop(); pack.resolve('available'); await flush();
  assert.equal(h.instances.length, 0); assert.equal(h.api.M.on, false); assert.equal(h.api.M.speechStarting, false);
  assert.equal(h.api.S.mirrors.length, 2);
  assert.equal(h.api.S.mirrors[0].teacher, 0.6);
  assert.equal(h.api.S.mirrors[0].words[0].t, 'Preserve this line');
  assert.equal(h.api.S.mirrors[1].id, 'earlier');
  assert.equal(h.channels[0].track.stops, 1);
});

test('old coaching results and restart timers cannot enter a new lesson', async () => {
  const h = harness({ cloud: true }); await h.api.mirStart(); await flush(); const old = h.instances[0]; old.onstart();
  const lateResult = old.onresult, lateStart = old.onstart, lateError = old.onerror;
  old.onend(); const restart = [...h.timers.values()].find(item => item.delay === 300).fn;
  h.api.mirStop(); await h.api.mirStart(); await flush(); const current = h.instances[1]; current.onstart();
  lateStart(); lateResult(result('Old lesson words')); lateError({ error: 'not-allowed' }); restart();
  assert.equal(h.words.length, 0); assert.equal(old.starts, 1); assert.equal(h.api.M.sr, current);
  assert.equal(h.api.M.on, true); assert.equal(h.api.M.speechListening, true); assert.equal(current.aborts, 0);
});

test('coaching speech errors leave sound measurements and the report intact', async () => {
  const h = harness({ cloud: true }); await h.api.mirStart(); await flush(); const r = h.instances[0]; r.onstart();
  h.api.M.teacher = 9; r.onerror({ error: 'network' });
  assert.equal(h.api.M.on, true); assert.equal(h.api.M.teacher, 9); assert.equal(h.api.M.sr, null);
  assert.equal(h.api.M.speechStarting, false); assert.match(h.messages.at(-1), /Sound-level measurements continue/);
  assert.match(h.api.vPrivacyHTML(), /not listening/);
});

test('reload and unrelated clicks do not restart a saved microphone preference', () => {
  const h = harness({ cloud: true, savedVoice: true });
  for (const timer of [...h.timers.values()]) timer.fn();
  for (const listener of h.events.click || []) listener({ target: { closest: () => null } });
  assert.equal(h.instances.length, 0); assert.equal(h.api.V.on, false);
  assert.match(h.api.vPrivacyHTML(), /not listening/);
});
