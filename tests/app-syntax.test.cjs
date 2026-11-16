const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('the whole app script compiles',()=>{
 const html=fs.readFileSync('app/index.html','utf8'),a=html.indexOf('<script>')+8,b=html.indexOf('</script>',a);
 assert.doesNotThrow(()=>new vm.Script(html.slice(a,b),{filename:'app/index.html'}));
});
