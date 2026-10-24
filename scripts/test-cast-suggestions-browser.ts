import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/cast-workspace-browser-fixture.ts');
const browser=await chromium.launch();
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${server.port}`);
  const cast=page.locator('[data-cast-art]');await cast.getByRole('button',{name:/Open Dana Kessler/}).click();
  await cast.getByRole('button',{name:'Find a description from context',exact:true}).click();await cast.getByRole('button',{name:'Find descriptions',exact:true}).click();
  assert.match(await cast.locator('[data-cast-saved-guidance]').innerText(),/dark angled bob/);
  assert.match(await cast.getByLabel('Scanned character preview').inputValue(),/silver hair/);
  await cast.getByText('Choose individual fields',{exact:true}).click();
  await cast.getByRole('button',{name:'Use appearance only',exact:true}).click();
  assert.equal(await cast.getByLabel('Cast base appearance').inputValue(),'Human woman with silver hair.');
  assert.equal(await cast.getByLabel('Cast aliases').inputValue(),'DK');
  const sources=()=>page.evaluate(()=>(window as any).castWorkspace.cast.navigate('sources'));
  await sources();assert.match(await cast.locator('[data-cast-saved-guidance]').innerText(),/dark angled bob/,'saved guidance stays distinct from draft');
  await cast.getByRole('button',{name:'Add suggested aliases',exact:true}).click();
  assert.equal(await cast.getByLabel('Cast aliases').inputValue(),'DK\nD');
  await sources();await cast.getByRole('button',{name:'Add suggested outfits',exact:true}).click();
  assert.equal(await cast.getByLabel('Default cast outfit').inputValue(),'coat');
  assert.equal(await cast.locator('[data-cast-outfit-row]').count(),2);
  await cast.getByRole('button',{name:'Edit Everyday coat',exact:true}).click();
  assert.equal(await cast.getByLabel('Cast clothing description').inputValue(),'Blue wool coat.','same-name source cannot overwrite an outfit');
  assert.match(await cast.locator('[data-cast-art-status]').innerText(),/Kept your Everyday coat/);
  assert.equal(await page.evaluate(()=>(window as any).castWorkspace.state.actions.some((entry:any)=>entry.action.action==='setup')),false,'field selection is not a save');
  await sources();await cast.getByLabel('Scanned character',{exact:true}).selectOption('mira');
  assert.equal(await cast.getByRole('button',{name:'Use appearance only',exact:true}).isDisabled(),true,'another character cannot overwrite this draft');
  await cast.getByLabel('Scanned character',{exact:true}).selectOption('dana kessler');
  await page.screenshot({path:`.cache/browser-fixtures/cast-suggestions-${width}.png`,fullPage:true});
  await cast.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.waitForFunction(()=>(window as any).castWorkspace.state.library.characters[0].setup.appearance.includes('silver'));
  const saved=await page.evaluate(()=>(window as any).castWorkspace.state.library.characters[0].setup);
  assert.equal(saved.defaultOutfitId,'coat');assert.deepEqual(saved.aliases,['DK','D']);assert.equal(saved.outfits[0].description,'Blue wool coat.');
  await page.evaluate(()=>(window as any).castWorkspace.cast.navigate('roster'));
  await cast.getByRole('button',{name:'Find characters from context',exact:true}).click();
  await cast.getByRole('button',{name:'Use appearance only',exact:true}).click();
  assert.equal(await cast.getByLabel('Cast character name').getAttribute('readonly'),'','all-cast scanning reopens an existing canonical record rather than drafting a duplicate');
  assert.equal(await page.evaluate(()=>(window as any).castWorkspace.state.library.characters.length),2);
  await page.close();
 }
 console.log('Cast field suggestions: saved/draft distinction, isolated imports, outfit conflict/default protection, identity guard and explicit save passed at 320/390/1280px.');
}finally{await browser.close();await server.stop();}
