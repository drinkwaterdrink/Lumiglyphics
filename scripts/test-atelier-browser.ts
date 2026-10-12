import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const build=await Bun.build({entrypoints:['scripts/reading-browser-fixture.ts'],target:'browser'});
assert.ok(build.success,String(build.logs));const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});await mkdir('.cache/atelier',{recursive:true});
try {
 for(const preset of ['astral-glass','neon-rain','obsidian-reliquary']) {
  for(const viewport of [{width:360,height:800},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]) {
   const page=await browser.newPage({viewport,reducedMotion:'reduce'});
   await page.goto(`http://127.0.0.1:${server.port}/?preset=${preset}`);
   await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout:'image-first',sheetSize:'reading',backgroundOpacity:.8});f.stage.setEffectIntensity('full');});
   const root=page.locator('[data-vn-root]');const panel=page.locator('[data-vn-dialogue]');
   assert.equal(await root.evaluate(e=>e.scrollWidth<=e.clientWidth),true,'no horizontal overflow');
   assert.equal(await page.locator(`[data-vn-ornament-group][data-vn-preset="${preset}"]`).evaluate(e=>getComputedStyle(e).display),'block');
   assert.equal(await panel.evaluate(e=>getComputedStyle(e,'::before').animationName),'none','reduced motion stops edge light');
   const grip=await page.getByRole('button',{name:'Resize text panel',exact:true}).boundingBox();
   assert.ok(grip&&grip.width>=40&&grip.height>=40,'touch target stays usable');
   const box=await panel.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=viewport.width+1);
   if(viewport.width===390||viewport.width===1280)await page.screenshot({path:`.cache/atelier/${preset}-${viewport.width}.png`});
   await page.emulateMedia({reducedMotion:'no-preference'});
   assert.match(await panel.evaluate(e=>getComputedStyle(e,'::before').animationName),new RegExp(preset));
   await page.evaluate(()=>(window as any).readingFixture.stage.setEffectIntensity('off'));
   assert.equal(await panel.evaluate(e=>getComputedStyle(e,'::before').animationName),'none','effects off stops decorative animation');
   await page.close();
  }
 }
 console.log('atelier browser checks passed: three themes, four viewports, reduced motion and effects off');
}finally{await browser.close();server.stop(true);}
