import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {THEME_PRESET_IDS} from '../src/config.js';
const build=await Bun.build({entrypoints:['scripts/reading-browser-fixture.ts'],target:'browser'});
assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
await mkdir(".cache/dossiers",{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const mode of ['standard','cyoa'])for(const viewport of [{width:360,height:800},{width:844,height:390}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  await page.goto(`http://127.0.0.1:${server.port}/?mode=${mode}`);
  await page.evaluate((mode)=>{
   const f=(window as any).readingFixture;
   const key={chatId:'actions',assistantMessageId:'m1',swipeId:0,sourceFingerprint:'12345678',revision:0};
   const entity={id:'m',kind:'npc',name:'Mira',aliases:[],firstParagraph:0,facts:[]};
   f.actionTurn={mode,paragraphs:[{id:'p1',speaker:'Mira',text:'Mira waits by the door.'}],choices:mode==='cyoa'?[{id:'wait',label:'Wait quietly',value:'wait'}]:[],presentation:{version:1,snapshots:[{at:{key,paragraphIndex:0},entities:[entity],stateByEntity:{},presentEntityIds:['m'],locationId:null,speakerEntityId:'m',drawableEntityId:'m'}]}};
   f.actionPrefs={enabled:true,actionsEnabled:true,categories:{npcs:true,locations:true,objects:true},detail:'brief',linking:'all-known',maxLinksPerParagraph:3,overrides:[]};
   f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout:'overlay',sheetSize:'reading',backgroundOpacity:.8,heightRatio:.98});f.stage.setTooltipPreferences(f.actionPrefs);f.stage.loadTurn(f.actionTurn);
  },mode);
  const open=async()=>{await page.getByRole('button',{name:'Scene references',exact:true}).click();await page.getByRole('button',{name:'Mira',exact:true}).click();};
  await open();
  const card=page.getByRole('dialog',{name:'About Mira',exact:true});
  await card.locator('[data-vn-interaction-draft] summary').click();
  await card.getByRole('button',{name:'Ask',exact:true}).click();
  const editor=card.getByRole('textbox',{name:'Action draft',exact:true});
  assert.equal(await editor.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await editor.fill('I ask Mira about the locked door.');
  const savedInsert=await card.getByRole('button',{name:'Insert into reply',exact:true}).elementHandle();
  await card.getByRole('button',{name:'Insert into reply',exact:true}).click();
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.stage.getState().draft),'I ask Mira about the locked door.');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.counters.submits),0);
  assert.equal(await page.getByRole('textbox',{name:'Your reply',exact:true}).isVisible(),false,'reading never opens the send gate');
  await savedInsert!.evaluate(e=>(e as HTMLButtonElement).click());
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.stage.getState().draft),'I ask Mira about the locked door.','detached double tap does not insert twice');
  await page.locator('[data-vn-continue]').click();
  const reply=page.getByRole('textbox',{name:'Your reply',exact:true});
  const area=await page.locator('[data-vn-interaction]').boundingBox();assert.ok(area&&area.height>=120,'reply area stays usable at maximum sheet height');await reply.click();
  await reply.fill('');assert.equal(await reply.isVisible(),true,'clearing an action draft keeps the composer open');await reply.fill('Existing reply');
  await open();await card.locator('[data-vn-interaction-draft] summary').click();await card.getByRole('button',{name:'Approach',exact:true}).click();
  await card.getByRole('button',{name:'Insert into reply',exact:true}).click();
  assert.equal(await reply.inputValue(),'Existing reply\n\nI try to approach Mira.');
  assert.equal(await reply.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await open();await card.locator('[data-vn-interaction-draft] summary').click();await card.getByRole('button',{name:'Custom',exact:true}).click();
  await editor.fill('I knock softly.');await card.getByRole('button',{name:'Replace reply draft',exact:true}).click();assert.equal(await reply.inputValue(),'I knock softly.');
  // A detached old action must not cross turn revision or overwrite the new draft.
  await open();await card.locator('[data-vn-interaction-draft] summary').click();await card.getByRole('button',{name:'Ask',exact:true}).click();
  const stale=await card.getByRole('button',{name:'Insert into reply',exact:true}).elementHandle();
  await page.evaluate(()=>{const f=(window as any).readingFixture;const next=structuredClone(f.actionTurn);next.presentation.snapshots[0].at.key.revision++;f.stage.loadTurn(next);});
  await stale!.evaluate(e=>(e as HTMLButtonElement).click());assert.equal(await page.evaluate(()=>(window as any).readingFixture.stage.getState().draft),'');
  // Optional, and present NPC actions are not offered for an absent person.
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences({...f.actionPrefs,actionsEnabled:false});});await open();assert.equal(await card.locator('[data-vn-interaction-draft]').count(),0);await card.getByRole('button',{name:'Close information',exact:true}).click();
  await page.evaluate(()=>{const f=(window as any).readingFixture;const turn=structuredClone(f.actionTurn);turn.presentation.snapshots[0].stateByEntity={m:{presence:'absent'}};f.stage.loadTurn(turn);f.stage.setTooltipPreferences(f.actionPrefs);});
  await open();await card.locator('[data-vn-interaction-draft] summary').click();assert.equal(await card.getByRole('button',{name:'Approach',exact:true}).count(),0);assert.equal(await card.getByRole('button',{name:'Ask',exact:true}).count(),0);
  const bounds=await card.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=viewport.width&&bounds.y+bounds.height<=viewport.height);
  await page.screenshot({path:`.cache/dossiers/actions-${mode}-${viewport.width}.png`});
  await card.getByRole('button',{name:'Custom',exact:true}).click();await editor.fill('I wait by the door.');await card.getByRole('button',{name:'Insert into reply',exact:true}).click();
  await page.locator('[data-vn-continue]').click();
  await page.locator('[data-vn-submit]').click();
  await page.locator('[data-vn-submit]').evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.counters.submits),1,'normal Send gate rejects double taps');
  for(const preset of THEME_PRESET_IDS){
   await page.evaluate(preset=>{const f=(window as any).readingFixture;f.stage.setThemePreset(preset);f.stage.setError({source:'image',message:'Image could not be made',detail:'HTTP 400 '+preset,retryable:true});},preset);
   const close=page.getByRole('button',{name:'Dismiss image error',exact:true});const box=await close.boundingBox();assert.ok(box&&box.width>=43.99&&box.height>=43.99);
   await close.click();assert.equal(await page.locator('[data-vn-badge-kind="error"]').count(),0);
  }
  await page.close();
 }
 console.log('Scene actions, composer gates, stale guards and themed error dismissal passed.');
} finally {await browser.close();server.stop(true);}
