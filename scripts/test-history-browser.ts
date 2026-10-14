import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const build=await Bun.build({entrypoints:['scripts/reading-browser-fixture.ts'],target:'browser'});assert.ok(build.success,String(build.logs));const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:360,height:640},{width:390,height:844},{width:844,height:390}])for(const preset of ['lumiverse','paper-novel','boxed-console','midnight-noir','literature-club']){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:${server.port}/?preset=${preset}`);
  await page.evaluate(()=>{
   const f=(window as any).readingFixture;f.stage.loadTurn({...f.turn,paragraphs:Array.from({length:20},(_,i)=>({id:`p${i}`,text:`Earlier paragraph ${i}. `.repeat(30),speaker:'Dana'}))});
   for(let i=0;i<19;i++)f.stage.advance();
   const mount=f.stage.panelMount,host=document.createElement('div');host.dataset.imageStudio='';host.style.cssText='position:absolute;inset:0;z-index:9;pointer-events:none';const shadow=host.attachShadow({mode:'open'});shadow.innerHTML='<button style="position:absolute;top:70px;right:12px;min-height:44px;pointer-events:auto">Image prompts</button>';mount.append(host);
  });
  const progress=await page.locator('[data-vn-progress]').textContent();await page.evaluate(()=>(window as any).readingFixture.stage.openBacklog());
  const close=page.getByRole('button',{name:'Close history',exact:true});const box=await close.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44&&box.y>=70,'History has a mobile-sized close below navigation');
  await page.locator('[data-vn-backlog-content]').evaluate(el=>{el.scrollTop=0;});await close.tap();assert.equal(await page.getByRole('dialog',{name:'History',exact:true}).isVisible(),false,'header close receives the tap');
  assert.equal(await page.locator('[data-vn-progress]').textContent(),progress,'closing does not advance');
  await page.evaluate(()=>(window as any).readingFixture.stage.openBacklog());await page.locator('[data-vn-backlog-content]').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const back=page.getByRole('button',{name:'Back to reader',exact:true}),footer=await back.boundingBox();assert.ok(footer&&footer.y+footer.height<=viewport.height-8,'bottom exit remains in view after scrolling');
  if(preset==='literature-club')assert.equal(await back.evaluate(el=>getComputedStyle(el).color),'rgb(196, 56, 104)','light theme uses readable dark pink return text');
  if(viewport.width===390&&(preset==='lumiverse'||preset==='literature-club'))await page.screenshot({path:`.cache/history-${preset}.png`});
  await back.tap();
  assert.equal(await page.getByRole('dialog',{name:'History',exact:true}).isVisible(),false);assert.equal(await page.locator('[data-vn-progress]').textContent(),progress);
  assert.equal(await page.locator('[data-image-studio]').isVisible(),true,'floating controls return');
  await page.close();
 }
 const unified=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await unified.goto(`http://127.0.0.1:${server.port}/?unified=1`);
 const before=await unified.locator('[data-vn-progress]').textContent();await unified.getByRole('button',{name:'Open history',exact:true}).tap();
 assert.equal(await unified.locator('[data-image-library] section').isVisible(),true,'real reader History opens unified window');
 assert.equal(await unified.locator('[data-vn-backlog]').isVisible(),false,'legacy backlog does not open underneath');
 await unified.getByText('Read reply',{exact:true}).tap();assert.ok(await unified.locator('[data-image-library]').getByText('Speaker 0',{exact:true}).isVisible());
 await unified.getByRole('button',{name:'Back to reader',exact:true}).tap();
 assert.equal(await unified.locator('[data-vn-progress]').textContent(),before);assert.equal(await unified.locator('[data-vn-control="log"]').getAttribute('aria-expanded'),'false');await unified.close();
 console.log('History exits remain visible and tappable across mobile sizes and themes.');
}finally{await browser.close();server.stop(true);}
