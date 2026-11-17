const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('the Clean up song ships with Roomie and is the default for new classes',()=>{
 assert.ok(fs.existsSync('app/media/clean-up-song.mp4'));
 assert.ok(fs.statSync('app/media/clean-up-song.mp4').size<5*1024*1024,'kept small for school networks');
 assert.ok(html.includes("const BUILTIN_MEDIA=[{id:'b-cleanup',kind:'file',video:true,src:'media/clean-up-song.mp4',title:'Clean up song',builtin:true}];"));
 assert.ok(html.includes("name:'Clean up',minutes:4,song:'m:b-cleanup',auto:true,"));
});
test('built-in recordings are offered in both routine editors and play from the website, not browser storage',()=>{
 assert.ok(html.includes("lib=BUILTIN_MEDIA.concat(mediaList());"));
 assert.ok(html.includes("BUILTIN_MEDIA.map(m=>opt('m:'+m.id,m.title+' (Roomie video)',r.song))"));
 assert.ok(html.includes("const url=m.src||URL.createObjectURL(blob);"));
 assert.ok(fs.existsSync('app/media/CREDITS.md'));
});
