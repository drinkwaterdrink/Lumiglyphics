import {THEME_PRESET_IDS} from '../src/config.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const build=await Bun.build({entrypoints:['scripts/reading-browser-fixture.ts'],target:'browser'});assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
await mkdir('.cache/error-notices',{recursive:true});const browser=await chromium.launch({headless:true});
try{for(const viewport of [{width:360,height:800},{width:844,height:390}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:${server.port}/`);
 for(const theme of THEME_PRESET_IDS){
  await page.evaluate(theme=>{const f=(window as any).readingFixture;f.stage.loadTurn(f.turn);f.stage.setThemePreset(theme);f.stage.setError({source:'other',message:'A reader operation failed.',detail:"Operation: vn_get_state\nundefined is not an object (evaluating 'key of value.allKeys')",retryable:false});},theme);
  const card=page.locator('[data-vn-badge-kind="error"]');await card.locator('summary').click();assert.match(await card.innerText(),/allKeys/);
  const close=card.getByRole('button',{name:'Dismiss error',exact:true}),bounds=await close.boundingBox();assert.ok(bounds&&bounds.width>=43.99&&bounds.height>=43.99);
  assert.equal(await close.evaluate(e=>{const b=e.getBoundingClientRect();return (e.getRootNode() as ShadowRoot).elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e;}),true,'dismiss is unobstructed');
  const before=await page.evaluate(()=>{const f=(window as any).readingFixture;return {state:f.stage.getState(),counts:JSON.stringify(f.counters)};});
  await page.screenshot({path:`.cache/error-notices/${theme}-${viewport.width}.png`});await close.click();assert.equal(await card.count(),0);
  const after=await page.evaluate(()=>{const f=(window as any).readingFixture;return {state:f.stage.getState(),counts:JSON.stringify(f.counters)};});
  assert.equal(after.state.error,before.state.error);assert.equal(after.state.phase,before.state.phase);assert.equal(after.state.currentParagraphIndex,before.state.currentParagraphIndex);assert.equal(after.counts,before.counts);
  await page.evaluate(()=>(window as any).readingFixture.stage.setError({source:'other',message:'New failure',detail:'Different operation',retryable:false}));assert.equal(await card.count(),1);
 }
 await page.close();
}console.log('General error dismissal, retained failure state and all-theme mobile touch controls passed.');}finally{await browser.close();server.stop(true);}
