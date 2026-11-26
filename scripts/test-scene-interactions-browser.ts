import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {THEME_PRESET_IDS} from '../src/config.js';
const build=await Bun.build({entrypoints:['scripts/reader-first-browser-fixture.ts'],target:'browser'});
assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
await mkdir(".cache/dossiers",{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const mode of ['standard','cyoa'])for(const viewport of [{width:360,height:800},{width:844,height:390}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${server.port}/?mode=${mode}`);
  await page.evaluate((mode)=>{
   const f=(window as any).hostFixture;
   const key={chatId:'A',assistantMessageId:'m',swipeId:0,sourceFingerprint:'abcdef12345678',revision:1};
   const entity={id:'m',kind:'npc',name:'Mira',aliases:[],firstParagraph:0,facts:[]};
   f.actionPrefs={enabled:true,actionsEnabled:true,categories:{npcs:true,locations:true,objects:true},detail:'brief',linking:'all-known',maxLinksPerParagraph:3,overrides:[]};
   Object.assign(f.config,{mode,tooltips:f.actionPrefs,readerPreferences:{adjustableSheetEnabled:true,layout:'overlay',sheetSize:'reading',backgroundOpacity:.8,heightRatio:.98}});
   f.loadActionTurn=(revision:number,present=true)=>{
    f.state(f.turn('A',revision,{
     paragraphs:['Mira waits by the door.'],paragraphSpeakers:['Mira'],
     choices:mode==='cyoa'?[{id:'wait',label:'Wait quietly',value:'wait'}]:[],
     presentation:{version:1,snapshots:[{at:{key:{...key,revision},paragraphIndex:0},entities:[entity],stateByEntity:present?{}:{m:{presence:'absent'}},presentEntityIds:present?['m']:[],locationId:null,speakerEntityId:present?'m':null,drawableEntityId:present?'m':null}]},
    }));
    f.stage().dismissChapterCard();
   };
   f.loadActionTurn(1);
  },mode);
  const open=async()=>{
   await page.getByRole('button',{name:'Open Lumiglyphics APERTURE navigation',exact:true}).click();
   await page.locator('[data-aperture-route="character"]').click();
   await page.locator('[data-character-folio] .folio-roster-item').filter({hasText:'Mira'}).click();
  };
  await open();
  const card=page.locator('[data-character-folio]');
  const draft=()=>page.evaluate(()=>(window as any).hostFixture.stage().getState().draft);
  const submissions=()=>page.evaluate(()=>(window as any).hostFixture.sent.filter((request:any)=>request.type==='vn_submit').length);
  await card.locator('[data-vn-interaction-draft] summary').click();
  await card.getByRole('button',{name:'Ask',exact:true}).click();
  const editor=card.getByRole('textbox',{name:'Action draft',exact:true});
  assert.equal(await editor.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await editor.fill('I ask Mira about the locked door.');
  const savedInsert=await card.getByRole('button',{name:'Insert into reply',exact:true}).elementHandle();
  await card.getByRole('button',{name:'Insert into reply',exact:true}).click();
  assert.equal(await draft(),'I ask Mira about the locked door.');
  assert.equal(await submissions(),0);
  assert.equal(await page.getByRole('textbox',{name:'Your reply',exact:true}).isVisible(),false,'reading never opens the send gate');
  await savedInsert!.evaluate(e=>(e as HTMLButtonElement).click());
  assert.equal(await draft(),'I ask Mira about the locked door.','detached double tap does not insert twice');
  await page.locator('[data-vn-continue]').click();
  const reply=page.getByRole('textbox',{name:'Your reply',exact:true});
  await reply.click();
  const replyTarget=await reply.evaluate(input=>{
   const field=input.getBoundingClientRect(),panel=input.closest('[data-vn-interaction]')!.getBoundingClientRect();
   return {
    width:Math.min(field.right,panel.right,innerWidth)-Math.max(field.left,panel.left,0),
    height:Math.min(field.bottom,panel.bottom,innerHeight)-Math.max(field.top,panel.top,0),
   };
  });
  assert.ok(replyTarget.width>=44&&replyTarget.height>=44,`the reply field has a usable visible target at maximum sheet height: ${JSON.stringify(replyTarget)}`);
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
  await page.evaluate(()=>(window as any).hostFixture.loadActionTurn(2));
  assert.equal(await draft(),'I knock softly.','a replacement revision preserves the unsent reply');
  await stale!.evaluate(e=>(e as HTMLButtonElement).click());assert.equal(await draft(),'I knock softly.','the prior revision cannot insert another action');
  await page.locator('[data-workspace-close]').click();
  // Optional, and present NPC actions are not offered for an absent person.
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().setTooltipPreferences({...f.actionPrefs,actionsEnabled:false});});await open();assert.equal(await card.locator('[data-vn-interaction-draft]').count(),0);await page.locator('[data-workspace-close]').click();
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.loadActionTurn(3,false);f.stage().setTooltipPreferences(f.actionPrefs);});
  await open();assert.equal(await card.locator('[data-vn-interaction-draft]').count(),0,'an absent character has no in-scene actions');await page.locator('[data-workspace-close]').click();
  await page.evaluate(()=>(window as any).hostFixture.loadActionTurn(4));await open();
  const bounds=await card.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=viewport.width&&bounds.y+bounds.height<=viewport.height);
  await page.screenshot({path:`.cache/dossiers/actions-${mode}-${viewport.width}.png`});
  await card.locator('[data-vn-interaction-draft] summary').click();await card.getByRole('button',{name:'Custom',exact:true}).click();await editor.fill('I wait by the door.');await card.getByRole('button',{name:'Insert into reply',exact:true}).click();
  await page.locator('[data-vn-continue]').click();
  await page.locator('[data-vn-submit]').click();
  await page.locator('[data-vn-submit]').evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  assert.equal(await submissions(),1,'normal Send gate rejects double taps');
  for(const preset of THEME_PRESET_IDS){
   await page.evaluate(preset=>{const stage=(window as any).hostFixture.stage();stage.setThemePreset(preset);stage.setError({source:'image',message:'Image could not be made',detail:'HTTP 400 '+preset,retryable:true});},preset);
   const close=page.getByRole('button',{name:'Dismiss image error',exact:true});const box=await close.boundingBox();assert.ok(box&&box.width>=43.99&&box.height>=43.99);
   await close.click();assert.equal(await page.locator('[data-vn-badge-kind="error"]').count(),0);
  }
  await page.close();
 }
 console.log('Scene actions, composer gates, stale guards and themed error dismissal passed.');
} finally {await browser.close();server.stop(true);}
