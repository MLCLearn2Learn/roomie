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
