const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a !== -1 && b > a, `Production section exists: ${start}`);
  return html.slice(a, b);
}
const source = [
  section('function save(){', "document.addEventListener('click',e=>{ const b=e.target.closest('[data-storage]');"),
  section('async function picImportFile(', "document.addEventListener('change'"),
].join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
const original = 'data:image/webp;base64,ORIGINAL';
const replacement = 'data:image/webp;base64,LARGER_REPLACEMENT';

// Both save() and the importer come from production. Only storage and browser
// surfaces are substituted; no real localStorage or image files are modified.
function harness(state = {room:'Blue',pics:{crest:original,timer:'other picture'}}) {
  let stored = JSON.stringify(state), api;
  const sheet = {}, controls = {
    failWrite:false, failRead:false, readValue:null, beforeWrite:null,
    writeAttempts:0, readAttempts:0, saveCalls:0, refreshes:0, sceneUpdates:0, crestUpdates:0,
    warnings:[], messages:[],
  };
  api = vm.createContext({
    S:plain(state), STUDENT:false, DEMO:{active:false}, STORAGE:{error:'',original:null},
    PIC_TOTAL:1600000, picResize:async () => replacement,
    picsTotal:() => Object.values(api.S.pics || {}).reduce((sum, value) => sum + value.length, 0),
    document:{querySelector:() => sheet},
    renderSetup:() => {controls.refreshes++;},
    scRefresh:() => {controls.sceneUpdates++;}, picTop:() => {controls.crestUpdates++;},
    toast:message => controls.messages.push(message),
    paintStorageState:() => controls.warnings.push(api.STORAGE.error),
    localStorage:{
      setItem(key, value) {
        assert.equal(key, 'bellbird.v2'); controls.writeAttempts++;
        if (controls.beforeWrite) controls.beforeWrite();
        if (controls.failWrite) throw new Error('QuotaExceededError');
        stored = value;
      },
      getItem(key) {
        assert.equal(key, 'bellbird.v2'); controls.readAttempts++;
        if (controls.failRead) throw new Error('Storage read denied');
        return controls.readValue === null ? stored : controls.readValue;
      },
    },
  });
  vm.runInContext(source, api);
  const productionSave = api.save;
  api.save = () => {controls.saveCalls++; return productionSave();};
  return {api,controls,persisted:() => JSON.parse(stored)};
}

test('failed replacement preserves the original picture, other settings and the recovery warning', async () => {
  const h = harness(), before = plain(h.api.S); h.controls.failWrite = true;
  await h.api.picImportFile('crest', {});
  assert.deepEqual(plain(h.api.S), before);
  assert.deepEqual(h.persisted(), before);
  assert.equal(h.controls.saveCalls, 1, 'No cleanup save can erase the original picture or recovery warning');
  assert.equal(h.controls.writeAttempts, 1);
  assert.match(h.api.STORAGE.error, /could not be saved/);
  assert.match(h.controls.warnings.at(-1), /could not be saved/);
  assert.match(h.controls.messages.at(-1), /couldn’t save that picture/);
  assert.equal(h.controls.refreshes, 1);
  assert.equal(h.controls.sceneUpdates, 0);
  assert.equal(h.controls.crestUpdates, 0);
});

test('a failed addition removes only the attempted slot, including when no picture map existed', async () => {
  for (const state of [{room:'Blue'}, {room:'Blue',pics:{}}, {room:'Blue',pics:{timer:'existing'}}]) {
    const h = harness(state); h.controls.failWrite = true;
    await h.api.picImportFile('crest', {});
    assert.deepEqual(plain(h.api.S), state);
    assert.deepEqual(h.persisted(), state);
    assert.equal(h.controls.saveCalls, 1);
    assert.match(h.api.STORAGE.error, /could not be saved/);
  }
});

test('a successful replacement persists the new picture and preserves unrelated settings', async () => {
  const h = harness();
  await h.api.picImportFile('crest', {});
  assert.equal(h.api.S.pics.crest, replacement);
  assert.equal(h.api.S.pics.timer, 'other picture');
  assert.equal(h.api.S.room, 'Blue');
  assert.deepEqual(h.persisted(), plain(h.api.S));
  assert.equal(h.controls.saveCalls, 1);
  assert.equal(h.api.STORAGE.error, '');
  assert.equal(h.controls.messages.at(-1), 'Picture added.');
  assert.equal(h.controls.refreshes, 1);
  assert.equal(h.controls.sceneUpdates, 1);
  assert.equal(h.controls.crestUpdates, 1);
});

test('a successful addition creates the missing slot without changing other pictures', async () => {
  for (const state of [{room:'Blue'}, {room:'Blue',pics:{timer:'existing'}}]) {
    const h = harness(state);
    await h.api.picImportFile('crest', {});
    assert.deepEqual(plain(h.api.S), {...state,pics:{...state.pics,crest:replacement}});
    assert.deepEqual(h.persisted(), plain(h.api.S));
    assert.equal(h.controls.messages.at(-1), 'Picture added.');
    assert.equal(h.controls.saveCalls, 1);
  }
});

test('an acknowledged successful save is not undone by unavailable or malformed read-back storage', async () => {
  for (const fault of ['denied', 'malformed']) {
    const h = harness();
    if (fault === 'denied') h.controls.failRead = true;
    else h.controls.readValue = '{not valid JSON';
    await h.api.picImportFile('crest', {});
    assert.equal(h.controls.readAttempts, 0, 'The importer trusts the canonical synchronous save result');
    assert.equal(h.api.S.pics.crest, replacement);
    assert.equal(h.persisted().pics.crest, replacement);
    assert.equal(h.controls.messages.at(-1), 'Picture added.');
    assert.equal(h.controls.saveCalls, 1);
  }
});

test('a protected unreadable save keeps the original-data recovery state and the prior picture', async () => {
  const h = harness(), before = plain(h.api.S);
  h.api.STORAGE.original = '{unreadable original';
  h.api.STORAGE.error = 'Your saved class could not be opened. It has not been replaced.';
  await h.api.picImportFile('crest', {});
  assert.deepEqual(plain(h.api.S), before);
  assert.equal(h.api.STORAGE.original, '{unreadable original');
  assert.equal(h.api.STORAGE.error, 'Your saved class could not be opened. It has not been replaced.');
  assert.equal(h.controls.writeAttempts, 0);
  assert.equal(h.controls.saveCalls, 1);
});

test('an unexpected save exception rolls back the slot without another write or clearing an existing warning', async () => {
  const h = harness(), before = plain(h.api.S); let calls = 0;
  h.api.STORAGE.error = 'Keep the recovery warning.';
  h.api.save = () => {calls++; throw new Error('Unexpected save failure');};
  await h.api.picImportFile('crest', {});
  assert.deepEqual(plain(h.api.S), before);
  assert.deepEqual(h.persisted(), before);
  assert.equal(h.api.STORAGE.error, 'Keep the recovery warning.');
  assert.equal(calls, 1);
  assert.match(h.controls.messages.at(-1), /couldn’t save that picture/);
});

test('rollback preserves unrelated concurrent edits, and a later ordinary retry saves them with the original image', async () => {
  const h = harness(); h.controls.failWrite = true;
  h.controls.beforeWrite = () => {
    h.api.S.room = 'Edited class name';
    h.api.S.pics = {...h.api.S.pics, timer:'New timer picture'};
  };
  await h.api.picImportFile('crest', {});
  assert.equal(h.api.S.pics.crest, original);
  assert.equal(h.api.S.pics.timer, 'New timer picture');
  assert.equal(h.api.S.room, 'Edited class name');
  assert.equal(h.controls.saveCalls, 1);
  h.controls.failWrite = false; h.controls.beforeWrite = null;
  assert.equal(h.api.save(), true);
  assert.deepEqual(h.persisted(), plain(h.api.S));
  assert.equal(h.persisted().pics.crest, original);
  assert.equal(h.api.STORAGE.error, '');
});

test('rollback does not replace a newer concurrent value in the same picture slot', async () => {
  const h = harness(); h.controls.failWrite = true;
  h.controls.beforeWrite = () => {h.api.S.pics.crest = 'Newer picture from another operation';};
  await h.api.picImportFile('crest', {});
  assert.equal(h.api.S.pics.crest, 'Newer picture from another operation');
  assert.equal(h.api.S.pics.timer, 'other picture');
  assert.equal(h.controls.saveCalls, 1);
  assert.match(h.api.STORAGE.error, /could not be saved/);
});
