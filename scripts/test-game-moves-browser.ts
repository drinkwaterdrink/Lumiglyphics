import {THEME_PRESET_IDS} from '../src/config.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const build=await Bun.build({entrypoints:['scripts/game-moves-browser-fixture.ts'],target:'browser'});assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
await mkdir('.cache/game-moves',{recursive:true});const browser=await chromium.launch({headless:true});
try{
 for(const mode of ['standard','cyoa'])for(const viewport of [{width:360,height:800},{width:844,height:390}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});let external=0;page.on('request',r=>{if(!r.url().startsWith(`http://127.0.0.1:${server.port}`))external++;});
  await page.goto(`http://127.0.0.1:${server.port}/?mode=${mode}`);
  const summary=page.locator('[data-vn-game-moves] > summary');assert.equal(await summary.isVisible(),false);
  await page.locator('[data-vn-continue]').click();await summary.click();
  const warp=page.locator('[data-vn-game-choice]').filter({has:page.locator('[data-vn-game-provider]',{hasText:'warp'})});
  const other=page.locator('[data-vn-game-choice]').filter({has:page.locator('[data-vn-game-provider]',{hasText:'other'})});
  assert.equal(await warp.isVisible(),true);assert.equal(await other.isVisible(),true);
  const edit=page.getByRole('button',{name:'Edit Ask Mira about the door as message',exact:true});await edit.click();
  const editor=page.locator('[data-vn-move-draft]'),input=editor.getByRole('textbox',{name:'Action draft',exact:true});
  assert.equal(await page.getByRole('button',{name:/^Image prompts/}).isVisible(),false,'move editor keeps the floating prompt launcher out of the way');
  assert.equal(await input.inputValue(),'Ask Mira about the door');assert.equal(await editor.locator('[data-vn-game-odds]').count(),0);
  assert.match(await editor.innerText(),/odds and automatic checks do not apply/);
  await page.screenshot({path:`.cache/game-moves/editor-${mode}-${viewport.width}.png`});
  await input.fill('I ask Mira whether she has a key.');await editor.getByRole('button',{name:'Insert into reply',exact:true}).click();
  const reply=page.getByRole('textbox',{name:'Your reply',exact:true});assert.equal(await reply.inputValue(),'I ask Mira whether she has a key.');
  assert.equal(await page.getByRole('button',{name:/^Image prompts/}).isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>(window as any).gameFixture.picks),[]);assert.deepEqual(await page.evaluate(()=>(window as any).gameFixture.submissions),[]);
  await reply.fill('Existing reply');await edit.click();await input.fill('I listen carefully.');await editor.getByRole('button',{name:'Insert into reply',exact:true}).click();assert.equal(await reply.inputValue(),'Existing reply\n\nI listen carefully.');
  await edit.click();await input.fill('I knock once.');await editor.getByRole('button',{name:'Replace reply draft',exact:true}).click();assert.equal(await reply.inputValue(),'I knock once.');
  // A changed provider snapshot invalidates the open editor without losing its text.
  await edit.click();await input.fill('Old move edit');await page.evaluate(()=>(window as any).gameFixture.publish('warp','Leave the room',.1));
  await editor.getByRole('button',{name:'Insert into reply',exact:true}).click();assert.equal(await reply.inputValue(),'I knock once.');assert.match(await editor.innerText(),/changed/);assert.equal(await input.inputValue(),'Old move edit');
  await editor.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.evaluate(()=>(window as any).gameFixture.setFailure(true));await page.locator('[data-vn-submit]').click();assert.equal(await reply.inputValue(),'I knock once.');assert.equal(await reply.isEnabled(),true);
  await page.evaluate(()=>(window as any).gameFixture.setFailure(false));await page.locator('[data-vn-submit]').click();await page.locator('[data-vn-submit]').evaluate(e=>(e as HTMLButtonElement).click());
  assert.deepEqual(await page.evaluate(()=>(window as any).gameFixture.submissions),['I knock once.']);assert.deepEqual(await page.evaluate(()=>(window as any).gameFixture.picks),[]);
  await page.evaluate(()=>{const f=(window as any).gameFixture;f.reset();f.publish('warp','Ask Mira about the door');f.publish('other','Look through the window',.8);});await page.locator('[data-vn-continue]').click();
  if(!await page.locator('[data-vn-game-moves]').evaluate(e=>(e as HTMLDetailsElement).open))await summary.click();
  await page.evaluate(()=>{const f=(window as any).gameFixture;f.stage.setTooltipPreferences({...f.prefs,actionsEnabled:false});});assert.equal(await page.locator('[data-vn-edit-game-move]').count(),0);assert.equal(await other.isVisible(),true);
  await other.click();await page.evaluate(()=>{const f=(window as any).gameFixture;const c={id:'shared-id',provider:'other',label:'Look through the window',group:'Story moves',detail:'A provider-owned move',odds:.8};f.bridge.pick('moves-chat',c);});
  assert.deepEqual(await page.evaluate(()=>(window as any).gameFixture.picks),[{version:1,provider:'other',chatId:'moves-chat',id:'shared-id'}]);
  await page.evaluate(()=>{const f=(window as any).gameFixture;f.reset();f.stage.setTooltipPreferences(f.prefs);f.publish('warp','Ask Mira about the door',.62,true);});await page.locator('[data-vn-continue]').click();
  assert.equal(await page.locator('[data-vn-game-choice]').first().isDisabled(),true);
  await page.evaluate(()=>{const f=(window as any).gameFixture;f.bridge.request('moves-chat');f.publish('warp','Ask Mira about the door',.62,false);});
  for(const preset of THEME_PRESET_IDS){
   await page.evaluate(preset=>(window as any).gameFixture.stage.setThemePreset(preset),preset);
   const moveBox=await page.locator('[data-vn-game-choice]').first().boundingBox();const editBox=await page.locator('[data-vn-edit-game-move]').first().boundingBox();
   assert.ok(moveBox&&moveBox.width>=44&&moveBox.height>=43.99,`native move touch target ${preset}`);assert.ok(editBox&&editBox.width>=43.99&&editBox.height>=43.99,`edit touch target ${preset}`);
  }
  await page.screenshot({path:`.cache/game-moves/${mode}-${viewport.width}.png`});
  assert.equal(external,0);await page.close();
 }
 console.log('Provider move ownership, stale edits, normal Send, optional controls and mobile layouts passed.');
}finally{await browser.close();server.stop(true);}
