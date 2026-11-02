import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');
const browser=await chromium.launch({headless:true});
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.port}/`);await page.waitForFunction(()=>Boolean((window as any).hostFixture));
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.open();f.receive({type:'vn_state',chatId:'A',requestId:f.sent.filter((m:any)=>m.type==='vn_get_state').at(-1).requestId,config:f.config,turn:f.turn(),readingPosition:{version:1,key:{chatId:'A',assistantMessageId:'m',swipeId:0,sourceFingerprint:'abcdef12345678',revision:0},paragraphIndex:2}});});
 const card=page.locator('[data-vn-resume-card]');assert.equal(await card.isVisible(),true);assert.match(await card.innerText(),/Second paragraph/);assert.doesNotMatch(await card.innerText(),/Third paragraph/);
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().currentParagraphIndex),2);
 const box=await card.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width);
 await card.getByRole('button',{name:'Continue reading'}).click();assert.equal(await card.isVisible(),false);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_turn',turn:f.turn('A',1)});});assert.equal(await card.isVisible(),false,'asset-only updates do not reshow card');
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.changeChat('B');f.state(f.turn('B'));});assert.equal(await card.isVisible(),false,'no old chat excerpt');
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().currentParagraphIndex),0);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.changeChat('C');f.receive({type:'vn_state',chatId:'C',requestId:f.sent.filter((m:any)=>m.type==='vn_get_state').at(-1).requestId,config:f.config,turn:f.turn('C',0,{swipeId:1}),readingPosition:{version:1,key:{chatId:'C',assistantMessageId:'m',swipeId:0,sourceFingerprint:'abcdef12345678',revision:0},paragraphIndex:2}});});assert.equal(await card.isVisible(),false,'stale swipe rejected');
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.state(null,'C');});assert.equal(await card.isVisible(),false,'unavailable turn clears card');
 assert.deepEqual(errors,[]);await page.close();
}console.log('Resume card: exact host cursor, revealed excerpt, Continue, repeat-update suppression, stale swipe/chat/unavailable and responsive bounds passed');}
finally{await browser.close();await server.stop();}
