const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('app/index.html','utf8');
test('YouTube player stays outside the routinely replaced stage',()=>{
 assert.match(html,/<main class="stage" id="stage"[^>]*><\/main>\s*<aside id="ytDock"/);
 assert.equal((html.match(/id="ytCard"/g)||[]).length,1);
 assert.match(html,/#ytDock \.ytcard\{position:static/);
 assert.match(html,/min-height:200px/);
});
test('enlarging preserves the player and restores its compact state',()=>{
 const classes=new Set();const button={setAttribute(k,v){this[k]=v}};
 const space={classList:{toggle(k,v){v?classes.add(k):classes.delete(k)}}};
 const context={document:{getElementById(id){return id==='teachingSpace'?space:button}}};
 vm.createContext(context);
 vm.runInContext(html.match(/function expandYouTube\(expanded\)\{[\s\S]*?\n\}/)[0],context);
 context.expandYouTube(true);assert.ok(classes.has('video-expanded'));assert.equal(button['aria-pressed'],'true');assert.equal(button.textContent,'Smaller video');
 context.expandYouTube(false);assert.equal(classes.size,0);assert.equal(button['aria-pressed'],'false');assert.equal(button.textContent,'Enlarge video');
 assert.match(html,/if\(!show\)expandYouTube\(false\)/);
});
