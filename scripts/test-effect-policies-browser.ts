import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const build=await Bun.build({entrypoints:['scripts/host-lifecycle-fixture.ts'],target:'browser'});assert.ok(build.success,String(build.logs));const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.port}`);
 const initial=await page.evaluate(()=>{
  const f=(window as any).hostFixture,view=f.turn('A',0,{paragraphs:['*crash*','A quiet reply.','Next.','Fourth.','Fifth.','Sixth.'],effects:['shake_hard','flash_white',null,null,null,null],ambients:['rain','danger_pulse',null,null,null,null],effectLimits:['off','gentle',null,null,null,null]});
  f.state(view);f.open();f.state(view);const s=f.stage();s.triggerEffect('shake_hard');return {limit:s.getState().paragraphs[0].effectLimit,shake:s.root.dataset.vnShake,ambient:s.ambientOverride};
 });
 assert.equal(initial.limit,'off');assert.equal(initial.shake,undefined,'off blocks explicit effects and automatic crash shake');assert.equal(initial.ambient,'rain','off preserves weather');
 const gentle=await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.advance();s.triggerEffect('shake_hard');return {limit:s.getState().paragraphs[1].effectLimit,hard:s.root.classList.contains('vn-shake-hard'),mild:s.root.classList.contains('vn-shake'),ambient:s.ambientOverride};});
 assert.equal(gentle.limit,'gentle');assert.equal(gentle.hard,false);assert.equal(gentle.mild,true);assert.equal(gentle.ambient,'vignette_dark');
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.triggerEffect('shake');return getComputedStyle(s.root).animationName;});assert.equal(reduced,'none','OS reduced motion remains authoritative');
 const globalOff=await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.resetEffects();s.setEffectIntensity('off');s.triggerEffect('shake_hard');return s.root.dataset.vnShake;});assert.equal(globalOff,undefined,'paragraph cap cannot raise global off');
 assert.deepEqual(errors,[]);console.log('PASS effect policies: per-paragraph caps, explicit and heuristic effects, global/OS precedence, unchanged weather and softened danger pulse.');
}finally{await browser.close();server.stop(true);}
