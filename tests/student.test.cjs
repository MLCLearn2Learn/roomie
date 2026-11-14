const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
const between = (start, end) => {
  const from = html.indexOf(start);
  assert.notEqual(from, -1, `Missing production section: ${start}`);
  const to = html.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `Missing production section end: ${end}`);
  return html.slice(from, to);
};
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const decodeHTML = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({amp:'&', lt:'<', gt:'>', quot:'"', '#39':"'"}[name]));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
const settle = () => new Promise(resolve => setImmediate(resolve));

// A small DOM adapter for the production event handlers and render cycle, not a second implementation of student behavior.
function fakeDOM() {
  const elements = new Map();
  const document = {activeElement: null, getElementById: id => elements.get(id) || null};
  function element(tag) {
    const result = {
      tagName: tag.toUpperCase(), id: '', parent: null, listeners: {}, classList: {add() {}},
      addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); },
      contains(other) { return other === this || other?.parent === this; },
      appendChild(child) { child.parent = this; if (child.id) elements.set(child.id, child); },
      focus() { document.activeElement = this; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      remove() { elements.delete(this.id); },
      querySelector(selector) {
        const action = selector.match(/^\[data-s="(.+)"\]$/)?.[1];
        return action ? {click: () => this.fire(action)} : null;
      },
      async fire(action, extra = {}) {
        const button = {dataset: {s: action, ...extra}};
        const event = {target: {closest(selector) { return selector === '[data-s]' || selector === `[data-s="${action}"]` ? button : null; }}};
        await Promise.all((this.listeners.click || []).map(fn => fn(event)));
      },
      async input(id, value) {
        const field = elements.get(id); assert.ok(field, `Missing input ${id}`); field.value = value;
        for (const fn of this.listeners.input || []) fn({target: field});
      }
    };
    let markup = '';
    Object.defineProperty(result, 'innerHTML', {
      get() { return markup; },
      set(value) {
        markup = value;
        for (const [id, child] of elements) if (child.parent === result) elements.delete(id);
        for (const match of value.matchAll(/<(input|textarea)\b([^>]*?)(?:>([\s\S]*?)<\/textarea>|>)/g)) {
          const tagName = match[1], attrs = match[2], id = attrs.match(/\bid="([^"]*)"/)?.[1];
          if (!id) continue;
          const field = element(tagName); field.id = id; field.parent = result;
          field.value = decodeHTML(tagName === 'textarea' ? match[3] || '' : attrs.match(/\bvalue="([^"]*)"/)?.[1] || '');
          field.disabled = /\bdisabled\b/.test(attrs); field.selectionStart = 0; field.selectionEnd = 0;
          elements.set(id, field);
        }
      }
    });
    return result;
  }
  document.createElement = element;
  document.body = element('body');
  return document;
}

function studentHarness({stored = {}, search = '?join=ABCD', activity = {kind:'ticket', act:'one', q:'First question', named:false}} = {}) {
  const document = fakeDOM(), storage = new Map([['roomie.student', JSON.stringify(stored)]]), calls = [];
  const controls = {activity, submit: async () => true, roomState: null};
  const context = vm.createContext({
    document, location: {search}, STUDENT:true, REMOTE:false, URLSearchParams,
    localStorage:{getItem:key => storage.get(key), setItem:(key, value) => storage.set(key, value)},
    esc:escapeHTML, birdSVG:() => '', feelFace:() => '', FEELS:[['good', 'Good', '#fff'], ['low', 'Low', '#ddd']],
    rpc:async (name, args) => { calls.push({name, args}); return name === 'submit' ? controls.submit(args) : controls.roomState ? controls.roomState(args) : controls.activity; }
  });
  const source = between('/* ===================== STUDENT SIDE ===================== */', '/* ===================== TEACHER SIDE ===================== */');
  assert.ok(source.includes('draw(); poll(); setInterval(poll,3000);'));
  vm.runInContext(source.replace('draw(); poll(); setInterval(poll,3000);', `
    globalThis.student = {ST, draw, poll, send, resetClass, drafts, draftMeta, sendErrors, pending,
      get state(){return state;}, get connectionIssue(){return connectionIssue;}};
    draw();`), context);
  return {context, document, storage, calls, controls, student:context.student, host:document.getElementById('stu')};
}

function teacherHarness() {
  const document = fakeDOM(), toasts = [], screen = {html:''};
  const context = vm.createContext({
    document, esc:escapeHTML,
    location:{origin:'https://example.test', pathname:'/roomie/app/'},
    S:{liveOn:true, live:{code:'ABCD', named:false}},
    A:{liveWall:true, liveHideNames:false, live:{res:[], kind:'ticket', named:false, q:'Question'}},
    navigator:{clipboard:{writeText:async () => {}}}, toast:message => toasts.push(message),
    setStage:(_, content) => {screen.html=content;}, backBtn:() => '', loadQR:async () => null
  });
  vm.runInContext(between('function studentWantsName(', 'if(STUDENT&&!REMOTE){'), context);
  vm.runInContext(between('function liveJoinURL(){', 'async function liveEnsure(){'), context);
  vm.runInContext(between('function drawWall(){', 'setInterval(()=>{ if(A.liveWall)'), context);
  vm.runInContext(between('function renderJoin(full){', '/* poll tool */'), context);
  return {context, document, toasts, screen};
}

test('manual join address, direct splash entry and QR/copied address all enter student mode', async () => {
  const {context, screen} = teacherHarness();
  assert.equal(context.liveJoinURL(), 'https://example.test/roomie/app/?join');
  assert.equal(context.liveURL(), 'https://example.test/roomie/app/?join=ABCD');
  context.renderJoin(true);
  assert.match(screen.html, /class="joinurl">example\.test\/roomie\/app\/\?join<\/div>/);
  assert.match(html, /href="\?join" id="studentJoinLink"/);
  assert.doesNotMatch(screen.html, /deleted after 24 hours/);
  const h = studentHarness({search:'?join', stored:{code:'OLD1', name:'Previous pupil'}});
  assert.equal(h.student.ST.code, '');
  assert.equal(h.student.ST.name, '');
  await h.host.input('stuCode', 'abcd'); await h.host.fire('join');
  assert.equal(h.student.ST.code, 'ABCD');
  assert.match(h.host.innerHTML, /First question/);
});

test('only explicit named tickets, walls and polls attach a name; feelings never do', async () => {
  for (const [kind, named, expected] of [['feel',true,null], ['feel',false,null], ['poll',false,null], ['ticket',false,null], ['wall',false,null], ['poll',true,'Sam'], ['ticket',true,'Sam'], ['wall',true,'Sam']]) {
    const activity={kind, named, act:'privacy', q:'Question', opts:['A','B']};
    const h=studentHarness({stored:{code:'ABCD', name:'Sam'}, activity});
    await h.student.poll();
    await h.student.send(kind, kind==='feel'?'good':kind==='poll'?'A':'Answer');
    assert.equal(h.calls.find(call => call.name==='submit').args.p_name, expected, `${kind}, named=${named}`);
    if (expected === null) assert.doesNotMatch(h.host.innerHTML, / · Sam/);
  }
});

test('draft and error survive a failed send and a poll redraw, then a confirmed retry clears them', async () => {
  const h=studentHarness(); await h.student.poll();
  await h.host.input('stuTxt', 'Plants need water & light.');
  const key=h.context.studentActivityKey('ABCD', h.controls.activity);
  h.controls.submit=async () => {throw new Error('offline');};
  await h.student.send('ticket', h.document.getElementById('stuTxt').value);
  assert.equal(h.student.drafts[key], 'Plants need water & light.');
  assert.equal(h.document.getElementById('stuTxt').value, 'Plants need water & light.');
  assert.match(h.host.innerHTML, /couldn’t confirm your answer was sent/);
  assert.equal(h.student.ST.done[key], undefined);
  assert.ok(!h.storage.get('roomie.student').includes('Plants need water'), 'Draft text is not written to persistent storage');
  h.controls.activity={...h.controls.activity, sub:'A new hint'}; await h.student.poll();
  assert.equal(h.document.getElementById('stuTxt').value, 'Plants need water & light.');
  assert.match(h.host.innerHTML, /couldn’t confirm your answer was sent/);
  h.controls.submit=async () => true; await h.host.fire('retry'); await settle();
  assert.equal(h.student.ST.done[key], true);
  assert.equal(h.student.drafts[key], undefined);
  assert.equal(h.student.sendErrors[key], undefined);
  assert.match(h.host.innerHTML, /<h1>Sent!<\/h1>/);
});

test('connection loss preserves draft, caret and persistent send error; recovery clears only the connection notice', async () => {
  const h=studentHarness(); await h.student.poll();
  await h.host.input('stuTxt', 'Still thinking');
  const field=h.document.getElementById('stuTxt'); field.focus(); field.setSelectionRange(6, 6);
  h.controls.roomState=async () => {throw new Error('offline');};
  await h.student.poll();
  assert.match(h.host.innerHTML, /Connection lost/);
  assert.equal(h.document.getElementById('stuTxt').value, 'Still thinking');
  assert.equal(h.document.activeElement.id, 'stuTxt');
  assert.equal(h.document.activeElement.selectionStart, 6);
  h.controls.roomState=null; await h.student.poll();
  assert.doesNotMatch(h.host.innerHTML, /Connection lost/);
  assert.equal(h.document.getElementById('stuTxt').value, 'Still thinking');
});

test('a name-policy change updates an active editor without losing its draft or sending the cached name', async () => {
  const h=studentHarness({stored:{code:'ABCD', name:'Sam'}, activity:{kind:'ticket', act:'one', q:'Question', named:true}});
  await h.student.poll(); await h.host.input('stuTxt', 'Keep my thought'); h.document.getElementById('stuTxt').focus();
  h.controls.activity={...h.controls.activity, named:false}; await h.student.poll();
  assert.equal(h.document.getElementById('stuTxt').value, 'Keep my thought');
  assert.match(h.host.innerHTML, /No name is attached to this answer/);
  assert.doesNotMatch(h.host.innerHTML, / · Sam/);
  await h.student.send('ticket', 'Keep my thought');
  assert.equal(h.calls.find(call => call.name==='submit').args.p_name, null);
});

test('a failed second wall post does not retain a misleading Posted confirmation', async () => {
  const h=studentHarness({activity:{kind:'wall', act:'one', q:'Question', named:false}}); await h.student.poll();
  await h.student.send('wall', 'First post'); assert.match(h.host.innerHTML, /Posted! You can add another/);
  h.controls.submit=async () => {throw new Error('offline');}; await h.student.send('wall', 'Second post');
  assert.doesNotMatch(h.host.innerHTML, /Posted! You can add another/);
  assert.equal(h.document.getElementById('stuTxt').value, 'Second post');
  assert.match(h.host.innerHTML, /couldn’t confirm your answer was sent/);
});

test('an in-flight failure stays with its original activity, and retry cannot send it to the next question', async () => {
  const h=studentHarness(); await h.student.poll();
  await h.host.input('stuTxt', 'Old question answer');
  const response=deferred(); h.controls.submit=() => response.promise;
  const attempt=h.student.send('ticket', 'Old question answer');
  assert.equal(h.document.getElementById('stuTxt').disabled, true);
  h.controls.activity={kind:'ticket', act:'two', q:'Next question', named:false}; await h.student.poll();
  assert.equal(h.document.getElementById('stuTxt').value, '');
  assert.match(h.host.innerHTML, /Old question answer/);
  await h.host.input('stuTxt', 'New answer');
  response.reject(new Error('Network failed')); await attempt;
  assert.equal(h.document.getElementById('stuTxt').value, 'New answer');
  await h.host.fire('retry'); await settle();
  assert.equal(h.calls.filter(call => call.name==='submit').length, 1);
  assert.equal(h.calls.find(call => call.name==='submit').args.p_act, 'one');
  assert.match(h.host.innerHTML, /These answers have not been confirmed as sent/);
});

test('a late success clears only the old activity draft, preserving the new answer', async () => {
  const h=studentHarness(); await h.student.poll();
  const response=deferred(); h.controls.submit=() => response.promise;
  const attempt=h.student.send('ticket', 'Earlier answer');
  h.controls.activity={kind:'ticket', act:'two', q:'Next question', named:false}; await h.student.poll();
  await h.host.input('stuTxt', 'New draft'); response.resolve(true); await attempt;
  assert.equal(h.document.getElementById('stuTxt').value, 'New draft');
  assert.doesNotMatch(h.host.innerHTML, /Earlier answer/);
  assert.equal(h.student.ST.done['["ABCD","one"]'], true);
  assert.equal(h.student.ST.done['["ABCD","two"]'], undefined);
});

test('server rejection retains the answer without marking it sent or retrying a closed activity', async () => {
  const h=studentHarness(); await h.student.poll(); h.controls.submit=async () => false;
  await h.student.send('ticket', 'Keep this answer'); await settle();
  assert.match(h.host.innerHTML, /This answer wasn’t sent/);
  assert.equal(h.student.ST.done['["ABCD","one"]'], undefined);
  assert.equal(h.document.getElementById('stuTxt').value, 'Keep this answer');
  const count=h.calls.length; await h.host.fire('retry'); await settle();
  assert.equal(h.calls.length, count);
});

test('duplicate clicks do not submit twice while the first answer is pending', async () => {
  const h=studentHarness(); await h.student.poll(); const response=deferred(); h.controls.submit=() => response.promise;
  const first=h.student.send('ticket', 'Answer'); await h.student.send('ticket', 'Duplicate');
  assert.equal(h.calls.filter(call => call.name==='submit').length, 1);
  response.resolve(true); await first;
});

test('leaving or joining another class ignores old pending submissions and old room-state results', async () => {
  const h=studentHarness(); await h.student.poll(); const submission=deferred(); h.controls.submit=() => submission.promise;
  const sent=h.student.send('ticket', 'Old class answer');
  const oldPoll=deferred(); h.controls.roomState=() => oldPoll.promise; const polled=h.student.poll();
  h.student.resetClass('NEW2'); h.student.draw(false);
  h.controls.roomState=null; h.controls.activity={kind:'ticket', act:'one', q:'Other class question', named:false}; await h.student.poll();
  oldPoll.resolve({kind:'ticket', act:'old', q:'Stale old class'}); submission.resolve(true); await Promise.all([sent,polled]);
  assert.equal(h.student.ST.code, 'NEW2');
  assert.equal(h.student.state.q, 'Other class question');
  assert.equal(Object.keys(h.student.ST.done).length, 0);
  assert.doesNotMatch(h.host.innerHTML, /Old class answer|Stale old class/);
});

test('completion and draft keys are scoped to class and activity, including changes of feelings slot', async () => {
  const h=studentHarness({stored:{code:'ABCD', name:'Sam', done:{one:true}}}); await h.student.poll();
  assert.equal(h.student.ST.done['["ABCD","one"]'], true);
  h.student.resetClass('NEW2'); await h.student.poll();
  assert.match(h.host.innerHTML, /id="stuTxt"/);
  h.controls.activity={kind:'feel', act:'feel-today-arrival', q:'How do you feel?'}; await h.student.poll();
  const response=deferred(); h.controls.submit=() => response.promise; const send=h.student.send('feel', 'low');
  h.controls.activity={kind:'feel', act:'feel-today-lunch', q:'How do you feel now?'}; await h.student.poll();
  response.reject(new Error('offline')); await send;
  assert.match(h.host.innerHTML, /data-s="feel"/);
  assert.equal(h.student.ST.done['["NEW2","feel-today-lunch"]'], undefined);
  assert.equal(h.student.drafts['["NEW2","feel-today-arrival"]'], 'low');
  assert.equal(h.calls.find(call => call.name==='submit').args.p_act, 'feel-today-arrival');
});

test('clipboard success appears only after a successful write, and failure gives a usable fallback', async () => {
  const {context, toasts}=teacherHarness(); const write=deferred(); context.navigator.clipboard.writeText=() => write.promise;
  const copy=context.copyLiveLink(); assert.equal(toasts.length, 0); write.resolve(); await copy;
  assert.deepEqual(toasts, ['Link copied.']);
  context.navigator.clipboard.writeText=async () => {throw new Error('Permission denied');}; await context.copyLiveLink();
  assert.match(toasts[1], /Couldn’t copy/);
});

test('teacher response wall displays names only for a currently named activity', () => {
  const {context, document}=teacherHarness(); context.A.live.res=[{body:'Answer', name:'Cached name'}];
  context.drawWall(); assert.doesNotMatch(document.getElementById('livewall').innerHTML, /Cached name/);
  context.S.live.named=true; context.A.live.named=true; context.drawWall();
  assert.match(document.getElementById('livewall').innerHTML, /Cached name/);
  context.A.live.kind='feel'; context.drawWall(); assert.doesNotMatch(document.getElementById('livewall').innerHTML, /Cached name/);
  context.A.live.kind='ticket'; context.A.liveHideNames=true; context.drawWall();
  assert.doesNotMatch(document.getElementById('livewall').innerHTML, /Cached name/);
});
