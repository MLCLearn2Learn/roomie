const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)+a.length));
test('saved attention and reset choices resolve consistently with safe defaults',()=>{
 const S={},handlers={},c=vm.createContext({S,document:{addEventListener:(k,f)=>handlers[k]=f},esc:String,save(){c.saved=(c.saved||0)+1;}});
 vm.runInContext(cut('const ATTENTION_PRESETS=','function opt(v,l,cur)'),c);
 assert.equal(c.attentionPreset().id,'listen');assert.equal(c.resetPreset().id,'original');
 const change=(key,value)=>handlers.change({target:{matches:()=>true,dataset:{signal:key},value}});
 change('attentionPreset','waterfalls');assert.equal(c.attentionPreset().response,'Shhh…');
 change('resetPreset','space');assert.equal(c.resetPreset().steps.length,4);assert.equal(c.saved,2);
 change('attentionPreset','missing');assert.equal(S.attentionPreset,'waterfalls');
 S.attentionPreset='hand';assert.equal(c.attentionPreset().sound,false);
 S.resetPreset='missing';assert.equal(c.resetPreset().id,'original');
});
test('finishing wellbeing returns to its library and preserves the previous navigation trail',()=>{
 const A={overlay:'support',support:{returnView:{key:'wellbeing'},returnTrail:[{key:'finish'}]}},c=vm.createContext({A,MT:{total:1,remaining:()=>1,stop(){}},clearActivity(){},Music:{fadeStop(){}},markTools(){},markHero(){},tick(){}});
 vm.runInContext(cut('const NAV={','function markTools(')+';this.nav=NAV;',c);
 c.nav.owner='support';c.nav.origin={key:'finish'};c.navStopActivity();assert.equal(A.overlay,'wellbeing');assert.equal(c.nav.trail[0].key,'finish');assert.equal(A.support,null);c.navBack();assert.equal(A.overlay,'finish');
});
test('custom signals save teacher wording and reset steps, with bounded text and blank fallbacks',()=>{
 const S={attentionPreset:'custom',resetPreset:'custom'},handlers={},c=vm.createContext({S,document:{addEventListener:(k,f)=>handlers[k]=f},esc:String,save(){}});
 vm.runInContext(cut('const ATTENTION_PRESETS=','function opt(v,l,cur)'),c);
 const input=(attr,value,checked)=>handlers.input({target:{matches:s=>s===`[data-${attr}]`,dataset:attr==='custom-attention'?{customAttention:value[0]}:{customReset:value[0]},value:value[1],checked}});
 input('custom-attention',['call','Hocus pocus!']);input('custom-attention',['response','Everybody focus!']);input('custom-attention',['sound',''],true);
 assert.equal(c.attentionPreset().call,'Hocus pocus!');assert.equal(c.attentionPreset().response,'Everybody focus!');assert.equal(c.attentionPreset().sound,true);
 input('custom-reset',['1:0','Clear our desks']);input('custom-reset',['1:1','Keep your book and pencil ready.']);assert.equal(c.resetPreset().steps[1][0],'Clear our desks');assert.equal(c.resetPreset().steps[1][1],'Keep your book and pencil ready.');
 input('custom-reset',['0:0','']);assert.equal(c.resetPreset().steps[0][0],'Pause');input('custom-attention',['call','x'.repeat(200)]);assert.equal(c.attentionPreset().call.length,45);
 S.attentionPreset='waterfalls';S.attentionPreset='custom';assert.equal(c.attentionPreset().response,'Everybody focus!');
});
test('reset appears only in the fixed action buttons, not as a duplicate tool',()=>{
 assert.ok(!html.includes('data-tool="resets"'));
 assert.ok(!cut('const DOCK_NAMES=','function dockOrder(').includes('resets:'));
 assert.ok(!cut('function toolkitTiles(){','function toolkitOrder(').includes("['resets'"));
});
