import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const uiHelpers = script.slice(script.indexOf('const UI_FOCUSABLE='), script.indexOf('function uiFocusables('));
const ui = vm.createContext({});
vm.runInContext(uiHelpers, ui);

test('the complete application script parses', () => {
  assert.doesNotThrow(() => new vm.Script(script));
});

test('Simple dock never changes the saved custom order or hidden tools', () => {
  const order = ['poll', 'timer', 'think', 'routines', 'brain', 'pick'];
  const hidden = ['think', 'brain'];
  const saved = JSON.stringify({ order, hidden });
  assert.deepEqual([...ui.uiDockKeys(order, hidden, 'simple')], ['routines', 'timer', 'brain', 'pick']);
  assert.equal(JSON.stringify({ order, hidden }), saved);
  assert.deepEqual([...ui.uiDockKeys(order, hidden, 'custom')], ['poll', 'timer', 'routines', 'pick']);
  assert.deepEqual([...ui.uiDockKeys(order, hidden, undefined)], ['poll', 'timer', 'routines', 'pick']);
});

test('modal Tab wraps at both ends and recovers focus from outside', () => {
  const first = { name: 'first' }, middle = { name: 'middle' }, last = { name: 'last' };
  const items = [first, middle, last];
  assert.equal(ui.uiTabDestination(items, last, false), first);
  assert.equal(ui.uiTabDestination(items, first, true), last);
  assert.equal(ui.uiTabDestination(items, middle, false), null);
  assert.equal(ui.uiTabDestination(items, middle, true), null);
  assert.equal(ui.uiTabDestination(items, {}, false), first);
  assert.equal(ui.uiTabDestination(items, {}, true), last);
  assert.equal(ui.uiTabDestination([first], first, false), first);
  assert.equal(ui.uiTabDestination([], {}, false), null);
});

test('new middle-band classes get calm defaults while saved choices survive loading', () => {
  const source = script.slice(script.indexOf('function defaults('), script.indexOf('let S, firstRun='));
  const context = vm.createContext({ DAYS: ['mon'], dayFor: () => [], routinesFor: () => [], EXPECT: {} });
  vm.runInContext(source, context);
  const middle = context.defaults('middle');
  assert.equal(middle.calmLook, true);
  assert.equal(middle.fun, 'calm');
  assert.equal(middle.mascot, false);
  assert.equal(middle.scenes, false);
  assert.equal(context.defaults('primary').calmLook, false);
  const existing = { band: 'middle', fun: 'party', mascot: true, theme: 'mint', scenes: true, dockOrder: ['poll', 'timer'], dockHide: ['brain'] };
  const loaded = Object.assign(context.defaults(), existing);
  assert.equal(loaded.fun, 'party');
  assert.equal(loaded.theme, 'mint');
  assert.equal(loaded.mascot, true);
  assert.equal(loaded.calmLook, false);
  assert.equal(loaded.dockOrder, existing.dockOrder);
  assert.equal(loaded.dockHide, existing.dockHide);
});

function luminance(hex) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

test('primary pastel buttons and selected Scrapbook controls meet 4.5:1 text contrast', () => {
  const ink = html.match(/--ui-control-ink:(#[0-9A-Fa-f]{6})/)[1];
  const pastels = ['#E77FA8', '#5AA9E6', '#4DB487', '#F08A5D', '#9B7FE0', '#7FB8E6'];
  for (const fill of pastels) assert.ok(contrast(ink, fill) >= 4.5, `${ink} on ${fill}`);
  const selected = [...html.matchAll(/--ui-accent:(#[0-9A-Fa-f]{6})/g)].map(m => m[1]);
  assert.equal(selected.length, 5);
  for (const fill of selected) assert.ok(contrast('#FFFFFF', fill) >= 4.5, `white on ${fill}`);
});

// Focus movement, inert handling, rendered tablet layouts, and keyboard menu actions
// still require the live-browser acceptance pass. These are regression checks, not
// a claim of a completed assistive-technology or WCAG audit.
