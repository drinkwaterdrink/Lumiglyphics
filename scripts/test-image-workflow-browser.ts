import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/image-review-browser-fixture.ts');
const browser=await chromium.launch();
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});
  page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setConfig(f.config);f.turn.assets[0].status='failed';f.turn.imageRequests[0].state='cancelled';f.studio.setTurn(f.turn);f.studio.open();});
  const studio=page.locator('[data-image-studio]');
  await studio.getByLabel('Positive prompt',{exact:true}).fill('x'.repeat(3001));
  assert.equal(await studio.locator('[data-status]').innerText(),'Prompt needs attention');
  await studio.getByLabel('Positive prompt',{exact:true}).fill('A carefully edited portrait in a quiet library.');
  assert.equal(await studio.locator('[data-status]').innerText(),'Edited prompt ready','correcting a draft exposes its preview state');
  assert.ok(await studio.locator('[data-studio-footer] [data-prepare]').isVisible(),'edited saved wording needs a visible preview action');
  assert.equal(await studio.locator('[data-queue-retry]').isVisible(),false,'quick retry must not invite silently ignoring edits');
  assert.equal(await studio.locator('section').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'editor remains within its panel');
  await page.screenshot({path:`.cache/browser-fixtures/image-workflow-${width}.png`});
  await studio.getByRole('button',{name:'Prepare edited preview',exact:true}).click();
  const request=await page.evaluate(()=>(window as any).imageFixture.actions.at(-1));
  assert.equal(request.type,'vn_prepare_image');assert.equal(request.edits.prompt,'A carefully edited portrait in a quiet library.');
  assert.equal(await studio.locator('section').getAttribute('data-state'),'preparing');
  assert.equal(await studio.locator('[data-queue-retry]').isVisible(),false,'preparing cannot offer a competing quick retry');
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.showError('Temporary preview failure');});
  assert.ok(await studio.getByRole('button',{name:'Prepare edited preview',exact:true}).isEnabled());
  await studio.locator('[data-prompt-actions] summary').click();
  await studio.getByRole('button',{name:'Reset edits',exact:true}).click();
  assert.ok(await studio.getByRole('button',{name:'Retry picture',exact:true}).isVisible());
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setRetryQueue({...f.turn,activeJobId:null,jobIds:['job']});});
  assert.equal(await studio.locator('section').getAttribute('data-state'),'retry-queued');
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setRetryQueue({...f.turn,activeJobId:'job',jobIds:[]});});
  assert.equal(await studio.locator('section').getAttribute('data-state'),'retry-running');
  await page.close();
 }
 console.log('Image workflow: edited-preview primary action, no competing retry, recovery and queue states passed at 320/390/1280px.');
}finally{await browser.close();await server.stop();}
