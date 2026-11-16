const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('a YouTube link pasted into the routine editor is kept when the teacher presses Save',()=>{
 const save=html.slice(html.indexOf('function rmkSave(){'),html.indexOf('async function rmkAddMedia('));
 assert.match(save,/const ytBox=\$\('#rmkYt'\), ytu=ytBox\?ytBox\.value\.trim\(\):''/);
 assert.match(save,/if\(!YT_\.parse\(ytu\)\)\{ toast\('That YouTube link doesn’t look right/);
 assert.match(save,/r\.song=pasted\?'m:'\+pasted\.id:rmkSong\(\)/);
 assert.match(save,/if\(save\(\)===false\)\{ toast\(/);
});
test('the Save message names the music, so a teacher can see what was kept',()=>{
 assert.ok(html.includes("toast('Saved “'+r.name+'” with '+songLabel(r)+'.')"));
});
