const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('attention asks for a plain Roomie without changing class progress',()=>{
 const S={life:400,goalsDone:10,growOff:false};let options;
 const c=vm.createContext({S,monsterShapes(o){options=o;return '<g class="m-eyes-open">old eyes</g><path id="body"/>';}});
 vm.runInContext(html.slice(html.indexOf('function attentionRoomieSVG(){'),html.indexOf('/* attention: full-screen design */')),c);
 const svg=c.attentionRoomieSVG();assert.equal(options.plain,true);assert.match(svg,/m-attention-eyes/);assert.ok(!svg.includes('old eyes'));assert.equal(S.life,400);assert.equal(S.goalsDone,10);assert.equal(S.growOff,false);
});
test('plain rendering bypasses every outfit while normal rendering keeps earned accessories',()=>{
 let calls=0;const c=vm.createContext({S:{growOff:false},monsterShapes(){return '<g class="bodyg">body</g>';},growLevel(){return {items:['cape','crown','glasses']};},growSVG(items){calls++;return items.join(',');}});
 const start=html.indexOf('{ const f=monsterShapes; monsterShapes=function()');const end=html.indexOf('if(!STUDENT)',start);
 // The wrapping block ends before point and goal reward hooks.
 const block=html.slice(start,html.indexOf('\nif(!STUDENT)',start));
 vm.runInContext(block,c);assert.equal(c.monsterShapes({plain:true}),'<g class="bodyg">body</g>');assert.equal(calls,0);assert.match(c.monsterShapes(),/crown/);assert.ok(calls>0);
});
