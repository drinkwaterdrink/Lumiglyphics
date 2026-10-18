import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const build=await Bun.build({entrypoints:['scripts/reader-reference-workspace-browser-fixture.ts'],target:'browser'});
assert.ok(build.success,String(build.logs));const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:41983,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><title>Reader reference workspace</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});
try{
 await mkdir('.cache/reader-reference-workspace',{recursive:true});
 for(const viewport of [{width:360,height:800},{width:1200,height:900}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors:string[]=[];let external=0;page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:41983'))external++;});
  await page.goto('http://127.0.0.1:41983');assert.equal(await page.title(),'Reader reference workspace');
  await page.evaluate(()=>{
   const f=(window as any).readingFixture,key={chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0};
   const fact=(field:string,value:string)=>({id:field,entityId:'m',field,value,visibility:'observed',source:{provider:'story',recordId:'message',chatId:'chat',messageId:'message',sourceFingerprint:'12345678',observedAt:'2026-10-18'},revealedAt:{key,paragraphIndex:0}});
   const mira={id:'m',kind:'npc',name:'Mira',aliases:['Lamplighter'],firstParagraph:0,facts:[fact('role','Keeper of the harbor lamps.'),fact('appearance','Silver hair and a narrow scar.'),fact('relationships','Rowan is her brother.'),fact('statedGoals','Repair the eastern beacon.'),fact('history','Worked at the harbor for six years.')]};
   f.prefs={enabled:true,actionsEnabled:false,categories:{npcs:true,locations:true,objects:true},detail:'expanded',linking:'all-known',maxLinksPerParagraph:3,overrides:[]};
   f.dossierTurn={mode:'standard',paragraphs:[{id:'a',speaker:'Mira',text:'Mira watches the harbor.'}],presentation:{version:1,snapshots:[{at:{key,paragraphIndex:0},entities:[mira],stateByEntity:{m:{outfit:'A rain-soaked coat.',condition:'Favoring her left ankle.'}},presentEntityIds:['m'],locationId:null,speakerEntityId:'m',drawableEntityId:'m'}]}};
   f.stage.setTooltipPreferences(f.prefs);f.stage.loadTurn(f.dossierTurn);
  });
  await page.getByRole('button',{name:'About Mira',exact:true}).click();
  const card=page.getByRole('dialog',{name:'About Mira',exact:true});
  // Removing grouping or collapsing the identity summary must fail this reader-visible contract.
  assert.match(await card.locator('[data-reference-overview]').innerText(),/Keeper of the harbor lamps/);
  const relations=card.locator('[data-reference-section]').filter({hasText:'Rowan is her brother.'});
  assert.equal(await relations.count(),1,'known relationships have a populated section');
  assert.equal(await relations.getAttribute('open'),null,'supporting detail is initially collapsed');
  await relations.locator('summary').click();assert.ok(await relations.getByText('Rowan is her brother.',{exact:true}).isVisible());
  const current=card.locator('[data-reference-current]');assert.match(await current.innerText(),/rain-soaked coat/);assert.doesNotMatch(await current.innerText(),/six years/);
  const sources=card.locator('[data-reference-sources]');assert.equal(await sources.getAttribute('open'),null);
  await sources.locator('summary').click();assert.match(await sources.innerText(),/paragraph 1/i);assert.doesNotMatch(await card.innerText(),/secret|unrevealed|unknown biography/i);
  for(const button of await card.locator('header button').all()){const b=await button.boundingBox();assert.ok(b&&b.width>=44&&b.height>=44);}
  const bounds=await card.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=viewport.width+.5);
  await page.screenshot({path:`.cache/reader-reference-workspace/card-${viewport.width}.png`});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'About Mira',exact:true}).evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
  await page.evaluate(()=>{const f=(window as any).readingFixture,snapshot=f.dossierTurn.presentation.snapshots[0],entity=snapshot.entities[0];entity.facts.push({...entity.facts[0],id:'observed-outfit',field:'outfit',value:'A red silk coat.'});f.stage.loadTurn(f.dossierTurn);});
  await page.getByRole('button',{name:'About Mira',exact:true}).click();
  assert.match(await card.locator('[data-reference-observations]').innerText(),/red silk coat/,'supported outfit observations are not overwritten by a different tracked scene outfit');
  assert.match(await card.locator('[data-reference-current]').innerText(),/rain-soaked coat/,'tracked state stays available with a distinct label');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setTooltipPreferences({...f.prefs,fieldGroups:{relationships:false}});});
  await page.getByRole('button',{name:'About Mira',exact:true}).click();assert.doesNotMatch(await card.innerText(),/Rowan is her brother/,'disabled field groups remove their information locally');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Scene references',exact:true}).click();const sheet=page.getByRole('dialog',{name:'Scene references',exact:true});
  await sheet.getByLabel('Search references').fill('Lamplighter');await sheet.getByRole('button',{name:'Mira',exact:true}).click();
  await card.getByRole('button',{name:'Back to references',exact:true}).click();assert.equal(await sheet.getByLabel('Search references').inputValue(),'Lamplighter');assert.match(await sheet.innerText(),/In this scene/);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const f=(window as any).referenceSettings;f.settings.host.hidden=false;f.settings.setConfig({enabled:true});(document.querySelector('[data-app-root]') as HTMLElement).hidden=true;});
  await page.getByText('Information shown in reference cards',{exact:true}).click();
  const group=page.locator('[data-tooltip-group="relationships"]');assert.equal(await group.isChecked(),true);await group.uncheck();assert.equal(await page.evaluate(()=>(window as any).referenceSettings.saved.fieldGroups.relationships),false);
  assert.equal(external,0,'opening and filtering references uses no remote requests');assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Reader reference workspace: grouped known facts, current state, sources, field preferences, menu return and mobile controls passed');
}finally{await browser.close();server.stop(true);}
