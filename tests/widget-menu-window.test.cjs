const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/index.html','utf8');
test('test version /widget2/: Roomie never resizes; its menu opens in its own window that goes full screen',()=>{
 assert.ok(fs.readFileSync('widget2/index.html','utf8').includes('../app/?widget&mw'));
 assert.ok(html.includes("const MW=W4&&/[?&]mw\\b/.test(location.search);"));
 assert.ok(html.includes("w4SizeKey=function(){ return 'rest'; };"));
 assert.ok(html.includes("function mwBig(){"));
});
