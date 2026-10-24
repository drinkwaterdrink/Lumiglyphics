import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/settings-browser-fixture.ts');
const browser=await chromium.launch();
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${server.port}/?setupDone`);
  await page.evaluate(()=>(window as any).settingsFixture.panel.openPage('filtering'));
  const panel=page.locator('[data-vn-settings]'),field=panel.locator('[name=displayRegexRules]'),feedback=panel.locator('[data-display-rules-feedback]');
  assert.equal(await panel.getByRole('heading',{name:'Text filtering',exact:true}).count(),1,'the page title should not be repeated as a section title');
  await field.fill('# note\n/foo/gg => bar\nvalid => replacement');
  assert.equal(await field.getAttribute('aria-invalid'),'true');assert.match(await feedback.innerText(),/Line 2:/);
  const before=await page.evaluate(()=>(window as any).settingsFixture.patches.length);
  await panel.locator('[data-apply]').click();
  assert.equal(await page.evaluate(()=>(window as any).settingsFixture.patches.length),before,'invalid draft cannot be saved');
  assert.match(await field.inputValue(),/\/foo\/gg/,'failed apply keeps the draft');
  assert.equal(await field.evaluate(el=>(el as HTMLTextAreaElement).value.slice((el as HTMLTextAreaElement).selectionStart,(el as HTMLTextAreaElement).selectionEnd)),'/foo/gg => bar','Apply selects the first invalid source row');
  await field.fill('# note\n/foo/gi => bar');
  assert.equal(await field.getAttribute('aria-invalid'),'false');assert.match(await feedback.innerText(),/1 rule ready/);
  await panel.locator('[data-apply]').click();
  assert.deepEqual(await page.evaluate(()=>(window as any).settingsFixture.patches.at(-1)),{displayRegexRules:'# note\n/foo/gi => bar'});
  await field.fill('/[/g => broken');
  await panel.locator('[data-discard]').click();
  assert.equal(await field.getAttribute('aria-invalid'),'false','discard refreshes diagnostics');
  assert.match(await field.inputValue(),/\/foo\/gi/);
  await field.fill('unapplied => edit');
  await page.evaluate(()=>{const f=(window as any).settingsFixture;f.panel.setConfig({...f.config,bgmVolume:0.2});});
  assert.equal(await field.inputValue(),'unapplied => edit','unrelated host settings preserve rule drafts');
  await page.screenshot({path:`.cache/browser-fixtures/display-rules-${width}.png`});
  await page.close();
 }
 console.log('Display rules: inline diagnostics, save prevention, valid save, discard and host-echo draft retention passed at 320/390/1280px.');
}finally{await browser.close();await server.stop();}
