import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/image-review-browser-fixture.ts');
const browser=await chromium.launch();
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${server.port}`);await page.waitForFunction(()=>Boolean((window as any).imageFixture));
  await page.evaluate(()=>{
   const f=(window as any).imageFixture,t=structuredClone(f.turn);f.studio.setConfig(f.config);
   t.assets[0].status='failed';t.imageRequests[0].state='cancelled';
   t.imageRequests[0].imagePromptMetadata={...f.metadata,brief:{...f.metadata.brief,subjects:'Mira: silver hair; wearing red coat',conflicts:['Saved appearance differs from context; saved appearance used.'],subjectPreparation:{name:'Mira',identity:'silver hair',identitySource:'saved appearance',attire:'red coat',attireSource:'picture cue',direction:'smiling',shortened:false,subjectsInPositive:false,subjectsInNegative:false}}};
   f.current=t;f.studio.setTurn(t);f.studio.open();
  });
  const studio=page.locator('[data-image-studio]'),brief=studio.locator('[data-prepared-brief]'),cast=brief.locator('[data-cast-preparation]');
  await brief.locator(':scope > summary').click();await cast.locator('summary').click();
  assert.match(await cast.innerText(),/saved appearance/);assert.match(await cast.innerText(),/red coat/);
  assert.match(await cast.innerText(),/omits \{\{subjects\}\}/);
  assert.match(await cast.innerText(),/saved appearance used/);
  assert.deepEqual(await page.evaluate(()=>(window as any).imageFixture.actions),[]);
  await cast.scrollIntoViewIfNeeded();
  assert.equal(await studio.locator('section').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.screenshot({path:`.cache/browser-fixtures/cast-preparation-${width}.png`});
  await brief.getByRole('button',{name:'Correct subject',exact:true}).click();
  assert.match(await studio.locator('[data-correction-scope]').innerText(),/This picture only/);
  await studio.getByLabel('Character name',{exact:true}).fill('Mira');await studio.getByLabel('Appearance',{exact:true}).fill('black hair, green eyes');
  await studio.getByLabel('Save appearance for this character in this chat',{exact:true}).check();
  assert.match(await studio.locator('[data-correction-scope]').innerText(),/also saves/);
  await studio.getByRole('button',{name:'Prepare corrected preview',exact:true}).click();
  const action=await page.evaluate(()=>(window as any).imageFixture.actions.at(-1));
  assert.equal(action.type,'vn_correct_image_subject');assert.equal(action.subject.saveAppearance,true);assert.equal(action.subject.name,'Mira');
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.showError('Temporary failure');const t=structuredClone(f.current);delete t.imageRequests[0].imagePromptMetadata.brief.subjectPreparation;f.studio.setTurn(t);});
  assert.match(await cast.innerText(),/cannot be reconstructed/);
  await page.close();
 }
 console.log('Cast preparation: source/outfit/pose evidence, omitted placeholders, correction scope and legacy fallback passed at 320/390/1280px.');
}finally{await browser.close();await server.stop();}
