import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(5000);
 await page.goto(`http://127.0.0.1:${server.port}`);
 await page.evaluate(()=>{
  const f=(window as any).hostFixture,t=f.turn();
  t.assets=[{jobId:'job',cueId:'cue',paragraphIndex:0,status:'generating'}];
  t.imageRequests=[{requestId:'r',jobId:'job',paragraphIndex:0,state:'review',prompt:'portrait',negativePrompt:'',model:'model',provider:'provider',connectionId:'c',parameters:{},referenceSummary:'none',createdAt:'now'}];
  f.current=t;f.state(t);f.open();f.state(t);
 });
 const badge=page.locator('[data-vn-badge-kind=image]');
 assert.match(await badge.innerText(),/1 needs review/);
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().assetProgress.busy),false);
 assert.equal(await badge.locator('[data-vn-badge-icon]').getAttribute('data-vn-badge-icon'),'image','held review does not animate a generation spinner');
 const before=await page.evaluate(()=>(window as any).hostFixture.sent.length);
 await badge.click();
 assert.ok(await page.locator('[data-image-studio] section').isVisible(),'badge opens inspector');
 assert.equal(await page.evaluate(()=>(window as any).hostFixture.sent.length),before,'opening inspector sends no paid request');
 await page.locator('[data-image-studio] [data-close]').click();
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_image_requests',chatId:'A',messageId:'m',sourceFingerprint:f.current.sourceFingerprint,requests:f.current.imageRequests.map((r:any)=>({...r,state:'approved'}))});});
 assert.match(await badge.innerText(),/1 generating/,'review updates refresh reader status');
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_asset',chatId:'A',messageId:'m',asset:{...f.current.assets[0],status:'failed'}});f.receive({type:'vn_image_retry_queue',queue:{...f.current,activeJobId:null,jobIds:['job']}});});
 assert.match(await badge.innerText(),/1 retry queued/);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_image_retry_queue',queue:{...f.current,revision:99,activeJobId:'job',jobIds:[]}});});
 assert.match(await badge.innerText(),/1 retry queued/,'stale queue cannot override current reader');
 await page.screenshot({path:'.cache/browser-fixtures/reader-picture-status.png'});
 console.log('Reader picture status: held reviews, click-through, approval updates and scoped retry queues passed.');
}finally{await browser.close();await server.stop();}
