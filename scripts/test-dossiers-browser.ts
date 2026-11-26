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
 for(const viewport of [{width:360,height:800},{width:390,height:844},{width:844,height:390},{width:1200,height:800}]) {
  const page=await browser.newPage({viewport,hasTouch:true,reducedMotion:"reduce"});page.setDefaultTimeout(5000);const external:string[]=[];
  page.on('request',r=>{if(/^https?:/i.test(r.url())&&!r.url().startsWith(`http://127.0.0.1:${server.port}`))external.push(r.url());});
  // Local blob media is not a network request; reject actual external HTTP traffic.
  await page.route('**/*',route=>/^https?:/i.test(route.request().url())&&!route.request().url().startsWith(`http://127.0.0.1:${server.port}`)?route.abort():route.continue());
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.evaluate(()=>{
   const f=(window as any).readingFixture;
   const key={chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0};
   const entity=(id:string,kind:string,name:string,value:string,at:number)=>({id,kind,name,aliases:[],firstParagraph:at,facts:[{id:'f'+id,entityId:id,field:'description',value,visibility:'observed',source:{provider:'story',recordId:'message',chatId:'chat',messageId:'message',sourceFingerprint:'12345678',observedAt:'2026-10-11'},revealedAt:{key,paragraphIndex:at}}]});
   const mira=entity('m','npc','Mira','silver hair',0),place=entity('p','place','Lantern House','blue shutters',0),object=entity('o','object','the black key','black key',1);
   const snap=(i:number)=>({at:{key,paragraphIndex:i},entities:i===0?[mira,place]:[mira,place,object],stateByEntity:{m:{outfit:i===0?'coat':'uniform'}},presentEntityIds:['m'],locationId:'p',speakerEntityId:'m',drawableEntityId:'m'});
   f.prefs={enabled:true,categories:{npcs:true,locations:true,objects:true},detail:'expanded',linking:'all-known',maxLinksPerParagraph:3,overrides:[]};
   f.dossierTurn={mode:'standard',paragraphs:[{id:'a',speaker:'Mira',text:'Mira enters Lantern House.'},{id:'b',speaker:'Mira',text:'Mira carries the black key.'}],presentation:{version:1,snapshots:[snap(0),snap(1)]}};
   f.stage.dismissChapterCard();f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout:'overlay',sheetSize:'reading',backgroundOpacity:.8});f.stage.setTooltipPreferences(f.prefs);f.stage.loadTurn(f.dossierTurn);
  });
  const text=page.locator('[data-vn-dialogue-text]');
  assert.equal(await text.innerText(),'Mira enters Lantern House.');
  assert.equal(await text.locator('[data-entity-anchor]').count(),2);
  const referenceButton=page.getByRole('button',{name:'World Lens',exact:true});
  const assertLensHitArea=async()=>{
   const bounds=await referenceButton.boundingBox();
   assert.ok(bounds&&bounds.width>=43.99&&bounds.height>=43.99,'World Lens has a 44px touch target');
   const hit=await referenceButton.evaluate(button=>{
    const rect=button.getBoundingClientRect(),root=button.getRootNode() as ShadowRoot;
    return [[0,0],[-21.5,0],[21.5,0],[0,-21.5],[0,21.5]].every(([x,y])=>{
     const target=root.elementFromPoint(rect.x+rect.width/2+x,rect.y+rect.height/2+y);
     return target===button||button.contains(target);
    });
   });
   assert.ok(hit,'the World Lens touch target is unobstructed along both axes');
  };
  assert.ok(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches));
  await assertLensHitArea();
  assert.equal(await referenceButton.locator('svg').count(),1,'reference menu has a recognizable icon');
  const iconBox=await referenceButton.locator('svg').boundingBox();assert.ok(iconBox&&iconBox.width>=18&&iconBox.height>=18);
  assert.equal(await page.locator('[data-vn-controls]').innerText(),'','toolbar is icon only');
  assert.notEqual(await text.locator('[data-entity-anchor]').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','references have a visible highlight');

  await page.screenshot({path:`.cache/dossiers/header-${viewport.width}.png`});
  const openMira=async()=>{
   await text.getByRole('button',{name:'About Mira',exact:true}).click();
   await page.getByRole('dialog',{name:'Mira quick summary',exact:true}).getByRole('button',{name:/Open in Character Folio/}).click();
  };
  await openMira();
  const card=page.getByRole('dialog',{name:'About Mira',exact:true});
  assert.match(await card.innerText(),/silver hair/);assert.doesNotMatch(await card.innerText(),/uniform|black key/);
  await page.screenshot({path:`.cache/dossiers/${viewport.width}.png`});
  const back=page.getByRole('button',{name:'Go back to previous screen',exact:true});
  const close=page.locator('[data-workspace-close]');
  await back.focus();await page.keyboard.press('Tab');
  assert.equal(await close.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true,'keyboard navigation includes workspace Back and Close');
  await card.locator('summary').filter({hasText:'Local display note'}).focus();
  await page.keyboard.press('Enter');await page.keyboard.press('Tab');
  assert.equal(await card.locator('textarea').evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await card.locator('textarea').fill('Remember the silver hair');
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.counters.tooltipPreferences.overrides[0].note),'Remember the silver hair');
  assert.match(await card.locator('[data-reference-saved-note]').innerText(),/Remember the silver hair/);
  await back.click();
  await openMira();
  const progress=await page.locator('[data-vn-progress]').innerText();
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-vn-progress]').innerText(),progress);
  const bounds=await card.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=viewport.width&&bounds.y+bounds.height<=viewport.height);
  await page.keyboard.press('Escape');assert.equal(await card.count(),0);
  assert.equal(await text.getByRole('button',{name:'About Mira',exact:true}).evaluate(e=>e.getRootNode() instanceof ShadowRoot&&(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences({...f.prefs,categories:{...f.prefs.categories,npcs:false}});});
  assert.equal(await text.getByRole('button',{name:'About Mira',exact:true}).count(),0);
  assert.equal(await text.getByRole('button',{name:'About Lantern House',exact:true}).count(),1);
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences(f.prefs);});
  await page.locator('[data-vn-continue]').click();
  await text.getByRole('button',{name:'About the black key',exact:true}).click();
  await page.getByRole('dialog',{name:'the black key quick summary',exact:true}).getByRole('button',{name:/Inspect & Edit DNA/}).click();
  await page.getByRole('dialog',{name:'About the black key',exact:true}).getByRole('button',{name:'Hide from World Lens',exact:true}).click();
  assert.equal(await text.getByRole('button',{name:'About the black key',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.counters.tooltipPreferences.overrides[0].suppressed),true);
  await page.getByRole('button',{name:'Previous paragraph',exact:true}).click();
  await openMira();
  assert.match(await page.getByRole('dialog',{name:'About Mira',exact:true}).innerText(),/coat/);
  assert.doesNotMatch(await page.getByRole('dialog',{name:'About Mira',exact:true}).innerText(),/uniform/);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences({...f.prefs,linking:'menu-only'});});
  assert.equal(await text.locator('[data-entity-anchor]').count(),0,'menu-only leaves prose plain');
  await referenceButton.click();const sheet=page.getByRole('dialog',{name:'World Lens',exact:true});
  assert.ok(await sheet.getByLabel('Search references').isVisible());await sheet.getByLabel('Search references').fill('lantern');
  assert.equal(await sheet.locator('[data-reference-list] button').count(),1);await sheet.locator('[data-reference-list]').getByRole('button',{name:'Lantern House',exact:true}).click();
  await back.click();assert.equal(await sheet.getByLabel('Search references').inputValue(),'lantern','return preserves search');
  await sheet.getByLabel('Search references').fill('missing');assert.ok(await sheet.getByRole('heading',{name:'No matching references',exact:true}).isVisible());
  await sheet.getByLabel('Search references').fill('');const places=sheet.getByRole('button',{name:'Places',exact:true});await places.click();assert.equal(await sheet.locator('[data-reference-list] button').count(),1);
  await places.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await places.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true,'keyboard focus includes filter controls');
  const current=await page.locator('[data-vn-progress]').innerText();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-vn-progress]').innerText(),current);
  await page.screenshot({path:`.cache/dossiers/quiet-${viewport.width}.png`});
  await page.keyboard.press('Escape');assert.equal(await referenceButton.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await page.evaluate(()=>{const f=(window as any).readingFixture;const snapshots=f.dossierTurn.presentation.snapshots.map((s:any)=>({...s,stateByEntity:{},presentEntityIds:[],locationId:'long0',speakerEntityId:null,drawableEntityId:null,entities:Array.from({length:32},(_,i)=>({...s.entities[1],id:'long'+i,name:'A very long established location name '.repeat(4)+i,aliases:['Unique'+i],facts:[]}))}));f.stage.loadTurn({...f.dossierTurn,presentation:{version:1,snapshots}});});
  await referenceButton.click();const many=page.getByRole('dialog',{name:'World Lens',exact:true});
  assert.equal(await many.locator('[data-reference-list] button').count(),32,'long-name fixture has valid source/state identities');
  await many.evaluate(el=>el.style.fontSize='22px');
  await many.locator('[data-reference-list]').evaluate(el=>el.scrollTop=el.scrollHeight);
  assert.ok(await page.locator('[data-workspace-close]').isVisible(),'close stays visible while many references scroll');
  assert.equal(await many.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'long names stay inside the sheet');
  await many.getByLabel('Search references').fill('Unique31');assert.equal(await many.locator('[data-reference-list] button').count(),1,'aliases are searchable');
  await page.evaluate(()=>(window as any).readingFixture.stage.loadTurn((window as any).readingFixture.dossierTurn));assert.equal(await page.getByRole('dialog',{name:'World Lens',exact:true}).count(),0,'source replacement invalidates open sheet');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences({...f.prefs,enabled:false});});
  assert.equal(await text.locator('[data-entity-anchor]').count(),0);assert.equal(await text.innerText(),'Mira enters Lantern House.');
  await referenceButton.click();assert.match(await page.getByRole('dialog',{name:'World Lens',exact:true}).innerText(),/disabled/i);await page.locator('[data-workspace-close]').click();
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences(f.prefs);f.stage.setTextSpeed(5);f.stage.loadTurn({...f.dossierTurn,paragraphs:[{...f.dossierTurn.paragraphs[0],text:'`Mira` and **Mira** enter Lantern House.'},f.dossierTurn.paragraphs[1]]});});
  assert.equal(await text.locator('[data-entity-anchor]').count(),0,'typing text is not linked early');
  await page.waitForFunction(()=>!(window as any).readingFixture.stage.isTyping);
  assert.equal(await text.locator('code [data-entity-anchor]').count(),0);
  assert.equal(await text.getByRole('button',{name:'About Mira',exact:true}).count(),1,'plain mention remains linkable after a code mention');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setDisplayRegexRules('Mira => Someone');});
  await page.waitForFunction(()=>!(window as any).readingFixture.stage.isTyping);
  assert.equal(await text.getByRole('button',{name:'About Mira',exact:true}).count(),0,'renamed text never links to the original name');
  assert.equal(await text.getByRole('button',{name:'About Lantern House',exact:true}).count(),1,'unaffected names remain clickable with display rules');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setDisplayRegexRules('');f.stage.setTextSpeed(0);f.stage.loadTurn(f.dossierTurn);});
  for(const preset of THEME_PRESET_IDS) {
   await page.evaluate(preset=>(window as any).readingFixture.stage.setThemePreset(preset),preset);

   const panelBox=await page.locator('[data-vn-dialogue]').boundingBox();
   const speaker=await page.locator('[data-vn-speaker]').boundingBox();
   assert.ok(speaker&&speaker.width>0&&speaker.height>0&&panelBox&&speaker.x>=panelBox.x&&speaker.x+speaker.width<=panelBox.x+panelBox.width,`speaker name remains visible in ${preset}/${viewport.width}x${viewport.height}: ${JSON.stringify({speaker,panelBox})}`);
   assert.equal(await page.locator('[data-vn-speaker]').textContent(),'Mira','speaker label keeps its complete name');
   assert.equal(await page.locator('[data-vn-speaker]').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`speaker name is not clipped in ${preset}`);
   assert.ok(await referenceButton.locator('svg').isVisible(),`World Lens icon visible in ${preset}`);
   await assertLensHitArea();
   await referenceButton.click();
   await sheet.locator('[data-reference-list]').getByRole('button',{name:'Lantern House',exact:true}).click();
   const themed=await page.getByRole('dialog',{name:'About Lantern House',exact:true}).boundingBox();
   assert.ok(themed&&themed.x>=0&&themed.x+themed.width<=viewport.width&&themed.y+themed.height<=viewport.height,`card fits theme ${preset}`);
   await page.locator('[data-workspace-close]').click();
  }
  assert.deepEqual(external,[],'dossiers never contact models/providers');
  await page.close();
 }
 console.log('dossier browser checks passed');
} finally {await browser.close();server.stop(true);}
