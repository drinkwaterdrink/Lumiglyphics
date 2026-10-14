import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const build=await Bun.build({entrypoints:['scripts/image-library-browser-fixture.ts'],target:'browser'});assert.ok(build.success,String(build.logs));
const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module" src="/fixture.js"></script></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.route('**/api/v1/images/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect width="400" height="700" fill="#273f58"/></svg>'}));
 await page.goto(`http://127.0.0.1:${server.port}`);
 const library=page.locator('[data-image-library]');await library.getByRole('button',{name:'Open image library',exact:true}).tap();
 assert.equal(await page.evaluate(()=>(window as any).imageLibraryFixture.held),true);
 const deliver=()=>page.evaluate(()=>{const f=(window as any).imageLibraryFixture;f.library.receive('chat',f.actions.at(-1).requestId,f.page);});await deliver();
 assert.equal(await library.locator('[data-image-card]').count(),2);
 await page.screenshot({path:'.cache/image-library-mobile.png'});
 await library.getByRole('button',{name:'View Manga page, message m1, paragraph 1',exact:true}).tap();
 await library.getByRole('button',{name:'Zoom in',exact:true}).tap();assert.equal(await library.locator('[data-full-image]').getAttribute('data-zoom'),'1.25');
 assert.ok(await library.getByText('A quiet reading room.',{exact:true}).isVisible());
 await library.getByText('Prompt details',{exact:true}).click();assert.equal(await library.getByLabel('Saved positive prompt').inputValue(),'<script>not executable</script> A detailed page.');
 assert.equal(await page.locator('script').count(),1,'prompt markup stays inert text');
 await library.getByRole('button',{name:'Back to library',exact:true}).tap();
 await library.getByLabel('Include replaced pictures').check();const request=await page.evaluate(()=>(window as any).imageLibraryFixture.actions.at(-1));assert.equal(request.includeReplaced,true);assert.equal(request.cursor,undefined);
 await deliver();await library.getByRole('button',{name:'Next page',exact:true}).tap();assert.equal(await page.evaluate(()=>(window as any).imageLibraryFixture.actions.at(-1).cursor),'1:0');
 await page.evaluate(()=>{const f=(window as any).imageLibraryFixture;f.library.receive('chat','obsolete',f.page);});assert.equal(await library.locator('[data-image-card]').count(),0,'stale page cannot replace pending page');
 await deliver();const bounds=await library.locator('section').boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=60);
 await library.getByRole('button',{name:'Close image library',exact:true}).tap();assert.equal(await page.evaluate(()=>(window as any).imageLibraryFixture.held),false);
 await library.getByRole('button',{name:'Open image library',exact:true}).tap();await page.evaluate(()=>(window as any).imageLibraryFixture.library.setContext(null,0));assert.equal(await library.locator('section').isVisible(),false,'chat reset closes library');
 console.log('Mobile image library, prompt safety, filters, zoom and stale-page checks passed.');
}finally{await browser.close();server.stop(true);}
