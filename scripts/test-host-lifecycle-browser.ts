import { chromium } from "playwright";
import assert from "node:assert/strict";
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/images/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="20" height="30" fill="blue"/></svg>'}));
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(()=>Boolean((window as any).hostFixture));
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.state(f.turn());f.open();f.state(f.turn());f.stage().advance();});
  // Advance through the actual stage controls; retain a local draft at a nonzero cursor.
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().restoreReplyDraft('Keep this unsent reply');});
  const revised=await page.evaluate(()=>{
    const f=(window as any).hostFixture,s=f.stage();
    f.receive({type:'vn_planning',chatId:'A'});
    f.receive({type:'vn_turn',turn:f.turn('A',1,{paragraphSpeakers:['Jo','Jo','Jo','Jo','Jo','Jo'],choices:[{id:'choice',label:'Ask Jo',value:'Ask Jo'}]})});
    return s.getState();
  });
  assert.equal(revised.currentParagraphIndex,1);assert.equal(revised.draft,'Keep this unsent reply');assert.notEqual(revised.phase,'planning');assert.equal(revised.paragraphs[1].speaker,'Jo');assert.equal(revised.choices[0].label,'Ask Jo');
  const stale=await page.evaluate(()=>{const f=(window as any).hostFixture;const old=f.sent.filter((m:any)=>m.type==='vn_get_state').at(-1).requestId;f.changeChat('B');f.state(f.turn('B'));const before=f.stage().getState();f.state(null,'A',old);return {before,after:f.stage().getState(),old};});
  assert.deepEqual(stale.after,stale.before,'late old-chat state cannot clear the active reader');
  const sameChat=await page.evaluate(()=>{const f=(window as any).hostFixture;const old=f.sent.filter((m:any)=>m.type==='vn_get_state').at(-1).requestId;f.changeChat('A');f.changeChat('B');f.state(f.turn('B'));const before=f.stage().getState();f.state(null,'B',old);return{before,after:f.stage().getState()};});
  assert.deepEqual(sameChat.after,sameChat.before,'A→B→A→B cannot revive an old state request');
  await page.evaluate(()=>{const f=(window as any).hostFixture;const view=f.turn('B');f.receive({type:'vn_turn',turn:{...view,assets:[{jobId:'job',cueId:'cue',paragraphIndex:0,status:'generated',imageId:'old',imageUrl:'/api/v1/images/old'}]}});});
  await page.waitForFunction(()=>(window as any).hostFixture.sent.some((m:any)=>m.type==='vn_asset_ready'&&m.imageId==='old'));
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_asset',chatId:'B',messageId:'m',sourceFingerprint:'abcdef12345678',revision:0,swipeId:0,asset:{jobId:'job',cueId:'cue',paragraphIndex:0,status:'generated',imageId:'new',imageUrl:'/api/v1/images/new'}});});
  await page.waitForFunction(()=>(window as any).hostFixture.sent.some((m:any)=>m.type==='vn_asset_ready'&&m.imageId==='new'));
  assert.equal(await page.evaluate(()=>(window as any).hostFixture.sent.filter((m:any)=>m.type==='vn_asset_ready').length),2,'each decoded replacement gets its own acknowledgement');
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().toggleSkip(true);});
  await page.getByRole('button',{name:'Back to chat',exact:true}).click();
  const closed=await page.evaluate(()=>(window as any).hostFixture.stage().getState().currentParagraphIndex);await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().currentParagraphIndex),closed,'closing stops Skip');
  // The external review uses the actual controller/window bridge with the reader closed.
  const preview={type:'vn_external_image_review',chatId:'B',requestId:'external-1',characterName:'Mira',record:{requestId:'review-1',jobId:'external-job',paragraphIndex:0,state:'review',prompt:'Mira in the cafe',negativePrompt:'blur',provider:'nanogpt',model:'test-model',connectionId:'images',parameters:{size:'1024x1024'},referenceSummary:'No image reference',createdAt:new Date().toISOString()}};
  await page.evaluate(preview=>{window.dispatchEvent(new CustomEvent('vn-scene-image-request-v1',{detail:{version:1,provider:'warp',chatId:'B',requestId:'external-1',characterName:'Mira',venue:'Cafe',timeOfDay:'evening',mood:'calm'}}));(window as any).hostFixture.receive(preview);},preview);
  const dialog=page.getByRole('dialog',{name:'Review picture · Mira'});assert.equal(await dialog.isVisible(),true,'review works while reader is closed');
  await dialog.getByLabel('Positive prompt',{exact:true}).fill('Edited Mira in the cafe');
  assert.equal(await dialog.getByLabel('Positive prompt',{exact:true}).evaluate(el=>(el.getRootNode() as ShadowRoot).activeElement===el),true,'prompt remains focusable for mobile editing');
  await page.evaluate(preview=>(window as any).hostFixture.receive(preview),preview);
  assert.equal(await dialog.getByLabel('Positive prompt',{exact:true}).inputValue(),'Edited Mira in the cafe','repeated preview preserves local edits');
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});const bounds=await dialog.boundingBox();assert.ok(bounds&&bounds.width<=width&&bounds.x>=0);}
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.cache/beta43-external-dark.png'});
  await page.evaluate(()=>{document.documentElement.style.cssText='--lumiverse-text:#18212e;--lumiverse-bg:#f6f7fa;--lumiverse-card-bg:#fff;--lumiverse-bg-elevated:#edf0f5;--lumiverse-border:#9da7b6;--lumiverse-primary:#5044a0;';});
  await page.screenshot({path:'.cache/beta43-external-light.png'});
  await dialog.getByRole('button',{name:'Generate this picture',exact:true}).click();
  const approval=await page.evaluate(()=>(window as any).hostFixture.sent.filter((m:any)=>m.type==='vn_external_image_review').at(-1));
  assert.equal(approval.edits.prompt,'Edited Mira in the cafe');assert.equal(approval.reviewRequestId,'review-1');
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_error',operation:'vn_external_image_review',chatId:'B',requestId:'external-1',error:'Unsupported size; edit parameters'});});
  assert.match(await dialog.locator('[data-status]').innerText(),/Unsupported size/);assert.equal(await dialog.getByRole('button',{name:'Generate this picture',exact:true}).isEnabled(),true);
  await dialog.getByRole('button',{name:'Cancel picture',exact:true}).click();assert.equal(await dialog.isVisible(),false);
  await page.evaluate(preview=>(window as any).hostFixture.receive(preview),preview);assert.equal(await dialog.isVisible(),false,'late cancelled previews cannot reopen');
  await page.evaluate(preview=>{window.dispatchEvent(new CustomEvent('vn-scene-image-request-v1',{detail:{version:1,provider:'warp',chatId:'B',requestId:'external-1',characterName:'Mira',venue:'Cafe',timeOfDay:'evening',mood:'calm'}}));(window as any).hostFixture.receive(preview);},preview);
  assert.equal(await dialog.isVisible(),true);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vn-scene-image-cancel-v1',{detail:{version:1,provider:'warp',chatId:'B',requestId:'external-1'}})));
  assert.equal(await dialog.isVisible(),false,'source-side cancellation closes the approval surface');
  assert.deepEqual(errors,[]);
  console.log('Real host controller: revised presentation/draft/cursor, stale chats/state attempts, replacement acknowledgements and close suspension passed.');
}finally{await browser.close();await server.stop();}
