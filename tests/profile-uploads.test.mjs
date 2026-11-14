import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const between = (start, end) => script.slice(script.indexOf(start), script.indexOf(end, script.indexOf(start)));
const imports = [
  between('async function visImportFile(', "document.addEventListener('change'"),
  between('async function picImportFile(', "document.addEventListener('change'"),
  between('async function rmkAddMedia(', "document.addEventListener('click'"),
].join('\n');
const model = between('function profileClone(', '/* PROFILE_MODEL_END */');
const tracking = between('const PROFILE_PENDING=', '/* PROFILE_SAVE_START');
const idb = between('const profileIdbGetBase=', '/* Call after a successful guarded data swap');
const switching = between('function profileSwitch(', 'function profileHasActivity(');

function harness() {
  let resolve, reject, stored = '', api;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const commits = [], messages = [], keys = [];
  const noop = () => {};
  api = vm.createContext({
    S: { room: 'Blue', classProfileId: 'blue', classFileNamespace: 'blue', pics: {}, media: [] },
    STUDENT: false, DEMO: { active: false }, A: { live: {} }, RM: {}, M: {}, SL: {}, V: {}, AIX: {},
    rmPair: noop, mirStart: noop, mirCalibrate: noop, vStart: noop, Music: { play: noop },
    document: { querySelector: () => null }, $: () => null, RMK: {},
    idbGet: noop, idbPut: key => { keys.push(key); return pending; },
    picResize: () => pending, visSaveFile: () => pending,
    PIC_TOTAL: 1600000, picsTotal: () => Object.values(api.S.pics).reduce((sum, pic) => sum + pic.length, 0),
    localStorage: { getItem: () => stored },
    save: () => { commits.push(api.classProfileBlockReason()); stored = JSON.stringify(api.S); return true; },
    visSet: (scope, value) => { assert.equal(scope, 'think'); api.S.thinkVis = value; api.save(); },
    mediaList: () => api.S.media,
    toast: message => messages.push(message), profileStatus: message => messages.push(message),
    renderSetup: () => { throw new Error('A closed editor must not reopen'); },
    rmkDraw: () => { throw new Error('A closed builder must not reopen'); },
    rmkSetSong: noop, scRefresh: noop, picTop: noop,
  });
  vm.runInContext(model + '\n' + imports + '\n' + tracking + '\n' + idb + '\n' + switching, api);
  return { api, resolve, reject, commits, messages, keys };
}

const cases = [
  { name: 'picture decoding', start: api => api.picImportFile('crest', {}), value: 'data:image/webp;test', check: api => assert.equal(api.S.pics.crest, 'data:image/webp;test') },
  { name: 'visual import', start: api => api.visImportFile('think', {}), value: { kind: 'img', key: 'vis-upload', name: 'Diagram' }, check: api => assert.equal(api.S.thinkVis.key, 'vis-upload') },
  { name: 'routine media upload', start: api => api.rmkAddMedia({ id: 'upload', title: 'My music' }, {}), check: api => assert.equal(api.S.media[0].id, 'upload') },
];

for (const scenario of cases) {
  test(`${scenario.name} blocks a class switch through its metadata commit, even after the editor closes`, async () => {
    const h = harness(), previous = h.api.S, operation = scenario.start(h.api);
    assert.match(h.api.classProfileBlockReason(), /file to finish saving/);
    assert.equal(h.api.profileSwitch('green'), false);
    assert.equal(h.api.S, previous);
    assert.match(h.messages.at(-1), /file to finish saving/);
    h.resolve(scenario.value);
    await operation;
    assert.equal(h.api.S, previous);
    scenario.check(h.api);
    assert.ok(h.commits.length > 0);
    for (const guard of h.commits) assert.match(guard, /file to finish saving/);
    assert.equal(h.api.classProfileBlockReason(), '');
  });

  test(`${scenario.name} releases the class guard when the file operation fails`, async () => {
    const h = harness(), before = JSON.stringify(h.api.S), operation = scenario.start(h.api);
    assert.match(h.api.classProfileBlockReason(), /file to finish saving/);
    h.reject(new Error('Storage unavailable'));
    await operation;
    assert.equal(h.api.classProfileBlockReason(), '');
    assert.equal(JSON.stringify(h.api.S), before);
    assert.equal(h.commits.length, 0);
    assert.ok(h.messages.length > 0);
  });
}

test('own-audio writes also block switching and use the class key captured before the write', async () => {
  const h = harness(), operation = h.api.idbPut('song-arrival', {});
  assert.deepEqual(h.keys, ['class:blue:song-arrival']);
  assert.match(h.api.classProfileBlockReason(), /file to finish saving/);
  assert.equal(h.api.profileSwitch('green'), false);
  h.resolve(); await operation;
  assert.equal(h.api.classProfileBlockReason(), '');
});
