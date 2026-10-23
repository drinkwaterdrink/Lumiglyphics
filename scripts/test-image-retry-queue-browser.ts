// Browser plugin not available; use the repository's Playwright fixtures under Node.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
mkdirSync('.cache/image-retry-queue',{recursive:true});
execFileSync('bun',['build','scripts/image-review-browser-fixture.ts','--target','browser','--outfile','.cache/image-retry-queue/fixture.js'],{windowsHide:true});
const bundle=readFileSync('.cache/image-retry-queue/fixture.js','utf8');
const server=createServer((req,res)=>{const js=(req.url??'').endsWith('.js');res.setHeader('Content-Type',js?'application/javascript':'text/html');res.end(js?bundle:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>');});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<500,hasTouch:true});page.setDefaultTimeout(5000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setConfig(f.config);const t=structuredClone(f.turn);t.assets=Array.from({length:6},(_,i)=>({jobId:`job-${i}`,cueId:`cue-${i}`,paragraphIndex:0,status:i<2?'generated':'cancelled',...(i<2?{imageUrl:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/> '}: {})}));t.imageRequests=t.assets.map((a:any,i:number)=>({...t.imageRequests[0],jobId:a.jobId,requestId:`request-${i}`,state:i<2?'approved':'cancelled'}));f.multi=t;f.studio.setTurn(t);f.studio.open();});
  const studio=page.locator('[data-image-studio]');
  const picker=studio.getByLabel('Picture',{exact:true});
  await picker.selectOption('job-2');
  await studio.getByRole('button',{name:'Retry picture',exact:true}).click();
  let actions=await page.evaluate(()=>(window as any).imageFixture.actions);
  assert.equal(actions.at(-1).type,'vn_queue_image_retries');assert.deepEqual(actions.at(-1).jobIds,['job-2']);
  assert.equal(await studio.getByRole('button',{name:'Retry queued',exact:true}).isDisabled(),true);
  await picker.selectOption('job-3');await studio.getByRole('button',{name:'Retry picture',exact:true}).click();
  actions=await page.evaluate(()=>(window as any).imageFixture.actions);assert.deepEqual(actions.at(-1).jobIds,['job-3'],'second picture queues without waiting for first');
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setRetryQueue({...f.multi,activeJobId:'job-2',jobIds:['job-3']});});
  assert.match(await studio.locator('[data-queue-status]').innerText(),/1 queued.*1 retry running/);
  await page.evaluate(()=>(window as any).imageFixture.studio.showError('A prompt rewrite failed; queued pictures stay queued.'));
  assert.match(await studio.locator('[data-queue-status]').innerText(),/1 queued.*1 retry running/,'prompt failures preserve the queue view');
  await studio.getByRole('button',{name:'Retry unfinished',exact:true}).click();actions=await page.evaluate(()=>(window as any).imageFixture.actions);assert.deepEqual(actions.at(-1).jobIds,['job-4','job-5']);
  await picker.selectOption('job-0');await studio.getByRole('button',{name:'Regenerate picture',exact:true}).click();actions=await page.evaluate(()=>(window as any).imageFixture.actions);assert.deepEqual(actions.at(-1).jobIds,['job-0']);
  assert.equal(actions.some((a:any)=>a.type==='vn_prepare_image'||a.type==='vn_image_review'),false,'quick actions never open a review');
  await studio.getByRole('button',{name:'Clear queued retries',exact:true}).click();actions=await page.evaluate(()=>(window as any).imageFixture.actions);assert.equal(actions.at(-1).action,'clear');
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setRetryQueue({...f.multi,activeJobId:'job-2',jobIds:[]});});
  await picker.selectOption('job-1');
  await page.screenshot({path:`.cache/image-retry-queue/${width}.png`});
  assert.equal(await studio.locator('section').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setTurn({...f.multi,messageId:'another-reply',sourceFingerprint:'another-fingerprint'});f.studio.setRetryQueue({...f.multi,activeJobId:'job-2',jobIds:['job-1']});});
  assert.equal(await studio.getByRole('button',{name:'Regenerate picture',exact:true}).isEnabled(),true,'old queue cannot lock another reply');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS retry queue mobile UI: multiple selections, bulk retry, completed regeneration, clear queue, scoped state and no review requests.');
}finally{await browser.close();server.close();}
