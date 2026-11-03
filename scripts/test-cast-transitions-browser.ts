import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {browserFixtureServer} from './browser-fixture-server.ts';

// Browser plugin not available; use the repository's local Playwright fixture.
// Flow: ready cast portrait -> compatible replacement -> bounded dissolve or immediate reduced-motion swap.
const server=await browserFixtureServer('scripts/reading-browser-fixture.ts');
const browser=await chromium.launch({headless:true});
try {
 await mkdir('.cache/cast-transitions',{recursive:true});
 for(const width of [390,1200]) {
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'no-preference'});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.evaluate(()=>{
   const f=(window as any).readingFixture;
   f.picture=(color:string)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="${color}"/><circle cx="200" cy="180" r="65" fill="#ddd"/></svg>`);
   f.transitionTurn={chatId:'transition',messageId:'m',swipeId:0,sourceFingerprint:'transition',revision:0,speaker:'Mira',paragraphs:['a'],choices:[],status:'ready',assets:[{jobId:'background',cueId:'background',paragraphIndex:0,status:'generated',imageUrl:f.picture('#182a2d'),stageAsset:{role:'background',sceneId:'s'}},{jobId:'mira',cueId:'mira',paragraphIndex:0,status:'generated',imageUrl:f.picture('#514468'),stageAsset:{role:'portrait',sceneId:'s',character:'Mira',attire:'coat'}}]};
   f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout:'overlay',sheetSize:'compact',backgroundOpacity:.8});
   f.stage.dismissChapterCard();f.stage.setCastMode(true);f.stage.setCastTurn(f.transitionTurn,0);
   // Pause genuine browser animations so assertions do not depend on wall-clock timing.
   f.castAnimations=[];f.pauseCastAnimations=true;const original=HTMLElement.prototype.animate;
   HTMLElement.prototype.animate=function(...args:any[]){const animation=original.apply(this,args as any);if(this.closest('[data-vn-cast-media]')){if(f.pauseCastAnimations)animation.pause();f.castAnimations.push(animation);}return animation;};
   f.replacePortrait=(color:string,attire='coat')=>{f.transitionTurn.assets[1].imageUrl=f.picture(color);f.transitionTurn.assets[1].stageAsset.attire=attire;f.stage.setCastTurn(f.transitionTurn,0);return f.transitionTurn.assets[1].imageUrl;};
  });
  await page.locator('[data-vn-cast-card] img').waitFor();
  const replace=async(color:string,attire='coat')=>{
   const url=await page.evaluate(({color,attire})=>(window as any).readingFixture.replacePortrait(color,attire),{color,attire});
   await page.waitForFunction(url=>[...(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img')].some((image:any)=>image.getAttribute('src')===url),url);
   return url;
  };
  await replace('#4d6051');
  assert.equal(await page.locator('[data-vn-cast-card] img').count(),2,'compatible portraits dissolve together instead of abruptly replacing');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.length),2,'only the old and incoming complete portraits animate');
  assert.equal(await page.locator('[data-vn-cast-current]').count(),1,'only the incoming portrait owns the current marker');
  assert.equal(await page.locator('[data-vn-cast-media] img[aria-hidden="true"]').count(),1,'outgoing duplicate is hidden from assistive technology');
  await page.evaluate(()=>{for(const animation of (window as any).readingFixture.castAnimations)animation.currentTime=90;});
  const geometry=await page.locator('[data-vn-cast-media]').evaluate(media=>{const images=[...media.querySelectorAll('img')];return {opacity:images.map(image=>Number(getComputedStyle(image).opacity)),rects:images.map(image=>image.getBoundingClientRect().toJSON()),dialogue:media.closest('[data-vn-root]')?.querySelector('[data-vn-dialogue]')?.getBoundingClientRect().toJSON()};});
  assert.ok(geometry.opacity.every(value=>value>0&&value<1),'both complete portraits participate in the dissolve');
  assert.equal(geometry.rects[0].x,geometry.rects[1].x);assert.equal(geometry.rects[0].y,geometry.rects[1].y);
  assert.ok(!geometry.dialogue||geometry.rects.every(rect=>rect.bottom<=geometry.dialogue!.top),'transition layers stay above the dialogue');
  await page.screenshot({path:`.cache/cast-transitions/dissolve-${width}.png`});
  await page.evaluate(()=>{for(const animation of (window as any).readingFixture.castAnimations)animation.finish();});
  await page.waitForFunction(()=>(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img').length===1);
  assert.match(await page.locator('[data-vn-cast-card] img').getAttribute('alt')??'',/Mira/);

  await page.evaluate(()=>(window as any).readingFixture.pauseCastAnimations=false);
  await replace('#5a6170');
  await page.waitForFunction(()=>(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img').length===1);
  await page.evaluate(()=>(window as any).readingFixture.pauseCastAnimations=true);

  // A new render during a dissolve must carry the incoming portrait, never a stale outgoing layer.
  await replace('#706141');
  const latest=await replace('#416070');
  assert.equal(await page.locator('[data-vn-cast-card] img').count(),2,'rapid changes keep at most two layers per portrait');
  assert.equal(await page.locator('[data-vn-cast-current]').getAttribute('src'),latest);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img').length===1);
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.every((a:Animation)=>a.playState==='idle'||a.playState==='finished')),true,'enabling reduced motion cancels active dissolves');
  let count=await page.evaluate(()=>(window as any).readingFixture.castAnimations.length);
  await replace('#714452');
  assert.equal(await page.locator('[data-vn-cast-card] img').count(),1,'reduced motion swaps immediately');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.length),count,'reduced motion starts no animations');

  await page.emulateMedia({reducedMotion:'no-preference'});
  await replace('#546a44');
  await page.evaluate(()=>(window as any).readingFixture.stage.setEffectIntensity('off'));
  await page.waitForFunction(()=>(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img').length===1);
  count=await page.evaluate(()=>(window as any).readingFixture.castAnimations.length);
  await replace('#474460');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.length),count,'Effects off starts no portrait animations');
  await page.evaluate(()=>(window as any).readingFixture.stage.setEffectIntensity('full'));
  await replace('#62533a','gown');
  assert.equal(await page.locator('[data-vn-cast-card] img').count(),1,'different outfits never crossfade');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.length),count);
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.savedAnimate=HTMLElement.prototype.animate;(HTMLElement.prototype as any).animate=undefined;});
  await replace('#7a6253','gown');
  assert.equal(await page.locator('[data-vn-cast-card] img').count(),1,'webviews without animation support swap immediately');
  await page.evaluate(()=>{const f=(window as any).readingFixture;let calls=0;HTMLElement.prototype.animate=function(...args:any[]){if(++calls===2)throw new Error('Unsupported effect');return f.savedAnimate.apply(this,args);};});
  await replace('#52637a','gown');
  await page.waitForFunction(()=>(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img').length===1);
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.every((a:Animation)=>a.playState==='idle'||a.playState==='finished')),true,'partial animation failure cancels its first effect and settles');
  await page.evaluate(()=>{const f=(window as any).readingFixture;HTMLElement.prototype.animate=f.savedAnimate;});
  await replace('#63547a','gown');
  await page.getByRole('button',{name:'Hide cast portraits',exact:true}).click();
  assert.equal(await page.locator('[data-vn-cast-card]').count(),0);
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.every((a:Animation)=>a.playState==='idle'||a.playState==='finished')),true,'dismissal cancels outgoing animations');
  await page.getByRole('button',{name:'Show cast portraits',exact:true}).click();
  await page.locator('[data-vn-cast-card] img').waitFor();
  await replace('#417465','gown');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.transitionTurn={...f.transitionTurn,swipeId:1};f.stage.setCastTurn(f.transitionTurn,0);});
  await page.waitForFunction(()=>(window as any).readingFixture.stage.root.querySelectorAll('[data-vn-cast-card] img').length===1);
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.every((a:Animation)=>a.playState==='idle'||a.playState==='finished')),true,'swipe changes cancel prior transitions without borrowing art');
  await replace('#676a41','gown');
  await page.evaluate(()=>(window as any).readingFixture.stage.reset());
  assert.equal(await page.locator('[data-vn-cast-card]').count(),0);
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.castAnimations.every((a:Animation)=>a.playState==='idle'||a.playState==='finished')),true,'reset cancels transitions');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Cast transitions: compatible full portraits, bounded rapid replacement, reduced motion, outfit/source isolation, dismissal and reset passed at 390/1200');
}finally{await browser.close();await server.stop();}
