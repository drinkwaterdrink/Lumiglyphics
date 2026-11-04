import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:true});
 let releaseSlow:()=>void=()=>{};let slow=Promise.resolve();
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/v1/images/**',async route=>{if(route.request().url().includes('/slow'))await slow;await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="20" height="30" fill="blue"/></svg>'});});
 await page.goto(`http://127.0.0.1:${server.port}/`);
 await page.waitForFunction(()=>Boolean((window as any).hostFixture));
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.state(f.turn());f.open();f.state(f.turn('A',0,{assets:[{jobId:'future',cueId:'future',paragraphIndex:2,status:'generated',imageId:'future',imageUrl:'/api/v1/images/future'}]}));});
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().displayedImage),null,'opening before the first illustrated passage must not reveal future artwork');
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().pendingImage),null,'unread artwork must not be requested as the reader scene');
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.sent.some((m:any)=>m.type==='vn_asset_ready'&&m.imageId==='future')),false,'unread artwork must not receive a reader-ready acknowledgement');
 await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.advance();s.advance();});
 await page.waitForFunction(()=>(window as any).hostFixture.stage().getState().displayedImage?.url.includes('/future'));
 await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.previous();s.previous();});
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().displayedImage),null,'rewinding before the first picture clears later artwork');
 assert.equal(await page.locator('[data-vn-scene-image][src]').count(),0,'cleared images also leave the rendered layers');
 for(const navigation of ['previous','jump']){
 slow=new Promise<void>(resolve=>{releaseSlow=resolve;});
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_asset',chatId:'A',messageId:'m',sourceFingerprint:'abcdef12345678',revision:0,swipeId:0,asset:{jobId:'future',cueId:'future',paragraphIndex:2,status:'generated',imageId:'future',imageUrl:'/api/v1/images/future'}});});
 await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.advance();s.advance();});
 await page.waitForFunction(()=>(window as any).hostFixture.stage().getState().displayedImage?.url.includes('/future'));
 await page.evaluate(navigation=>{const f=(window as any).hostFixture;f.receive({type:'vn_asset',chatId:'A',messageId:'m',sourceFingerprint:'abcdef12345678',revision:0,swipeId:0,asset:{jobId:'future',cueId:'future',paragraphIndex:2,status:'generated',imageId:'slow-'+navigation,imageUrl:'/api/v1/images/slow-'+navigation}});},navigation);
 await page.waitForFunction(()=>(window as any).hostFixture.stage().getState().pendingImage?.url.includes('/slow'));
 await page.evaluate(navigation=>{const s=(window as any).hostFixture.stage();if(navigation==='jump')s.jumpToParagraph(0);else{s.previous();s.previous();}},navigation);
 releaseSlow();await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().displayedImage),null,'late decode cannot resurrect artwork after a rewind');
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.sent.some((m:any)=>m.type==='vn_asset_ready'&&m.imageId?.startsWith('slow-'))),false,'cancelled unread decode sends no ready acknowledgement');
 }
 // A different reply still intentionally holds the previous reply's art while waiting.
 await page.evaluate(()=>{const s=(window as any).hostFixture.stage();s.advance();s.advance();});
 await page.waitForFunction(()=>(window as any).hostFixture.stage().getState().displayedImage?.url.includes('/slow-jump'));
 const previousImage=await page.evaluate(()=>(window as any).hostFixture.stage().getState().displayedImage.url);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_turn',turn:f.turn('A',0,{messageId:'next',assets:[{jobId:'next-art',cueId:'next-art',paragraphIndex:3,status:'generated',imageId:'next-art',imageUrl:'/api/v1/images/next-art'}]})});});
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().displayedImage?.url),previousImage,'waiting for a new reply preserves the previous revealed background');
 assert.deepEqual(errors,[]);
 await page.close();
 }
 console.log('Host artwork reveal (390/1280): future-only opening, reader acknowledgements, rewind clearing and cancelled late decode passed.');
}finally{await browser.close();await server.stop();}
