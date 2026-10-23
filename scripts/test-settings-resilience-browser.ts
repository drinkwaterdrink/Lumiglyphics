import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/settings-browser-fixture.ts');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(5000);await page.goto(`http://127.0.0.1:${server.port}/?setupDone`);
 const settings=page.locator('[data-vn-settings]');const openPage=async(id:string)=>page.evaluate(id=>(window as any).settingsFixture.panel.openPage(id),id);
 await openPage('css');await settings.locator('[name="customCss"]').fill('/* edited */');
 await page.evaluate(()=>(window as any).settingsFixture.ackMode='fail');await settings.locator('[data-apply]').tap();
 assert.match(await settings.locator('[data-status]').innerText(),/Could not save/);
 assert.equal(await settings.locator('[data-draft-bar]').isVisible(),true,'failed Apply keeps recoverable draft state');
 await page.evaluate(()=>{const f=(window as any).settingsFixture;f.panel.setConfig(f.config);});
 assert.equal(await settings.locator('[name="customCss"]').inputValue(),'/* edited */','an old host echo cannot erase a failed draft');
 assert.deepEqual(JSON.parse(await settings.locator('[name="imageParameters"]').inputValue()),{steps:28},'failed CSS save does not alter image parameters');
 await page.evaluate(()=>(window as any).settingsFixture.ackMode='hold');await settings.locator('[data-apply]').tap();
 const patch=await page.evaluate(()=>(window as any).settingsFixture.patches.at(-1));assert.deepEqual(Object.keys(patch).sort(),['customCss'],'Save sends only the edited page key');
 assert.equal(await settings.locator('[data-apply]').isDisabled(),true,'duplicate Apply is blocked while save is pending');
 await settings.locator('[name="customCss"]').fill('/* newer edit */');
 await page.evaluate(()=>{const f=(window as any).settingsFixture;f.config={...f.config,...f.patches.at(-1)};f.panel.setConfig(f.config,f.saveRequests.at(-1).requestId);f.panel.setSaveStatus({kind:'saved'},f.saveRequests.at(-1).requestId);});
 assert.equal(await settings.locator('[name="customCss"]').inputValue(),'/* newer edit */','late saved echo keeps a newer local edit');assert.match(await settings.locator('[data-draft-count]').innerText(),/^1 change/);
 await settings.locator('[data-discard]').tap();assert.equal(await settings.locator('[name="customCss"]').inputValue(),'/* edited */','Discard restores authoritative saved text');
 assert.equal(await settings.locator('[data-draft-bar]').isVisible(),false);
 await page.clock.install();
 await settings.locator('[name="customCss"]').fill('/* retry A */');await settings.locator('[data-apply]').tap();
 const requestA=await page.evaluate(()=>(window as any).settingsFixture.saveRequests.at(-1));await page.clock.fastForward(5100);
 await settings.locator('[name="customCss"]').fill('/* retry B */');await settings.locator('[data-apply]').tap();
 await page.evaluate(id=>(window as any).settingsFixture.panel.setSaveStatus({kind:'error',error:'Late A'},id),requestA.requestId);
 assert.equal(await settings.locator('[data-apply]').isDisabled(),true,'late failure cannot release newer save guard');
 await page.evaluate(()=>{const f=(window as any).settingsFixture,r=f.saveRequests.at(-1);f.config={...f.config,...r.patch};f.panel.setConfig(f.config,r.requestId);f.panel.setSaveStatus({kind:'saved'},r.requestId);});
 assert.equal(await settings.locator('[data-draft-bar]').isVisible(),false,'newer confirmed retry is reconciled');
 // An everyday image edit must use the submitted Advanced replacement as its base.
 await openPage('generation');
 await settings.locator('[name="imageParameters"]').fill('{"steps":32,"custom_key":"keep"}');await settings.locator('[data-apply]').tap();
 const advancedImage=await page.evaluate(()=>(window as any).settingsFixture.saveRequests.at(-1));
 await page.evaluate(()=>{const f=(window as any).settingsFixture;f.panel.setConnectionCatalog('image',{status:'ready',options:[{id:'nai',name:'NovelAI',provider:'novelai',model:'nai-diffusion-4-5-full',isDefault:true}]});f.config={...f.config,imageConnectionId:'nai',generateImages:true,useNativeCardImages:false};f.panel.setConfig(f.config,'unrelated-echo');});
 const steps=settings.locator('[name="novelAiSteps"]');await steps.fill('26');await steps.dispatchEvent('change');
 const everydayImage=await page.evaluate(()=>(window as any).settingsFixture.saveRequests.at(-1));assert.equal(everydayImage.patch.imageParameters.custom_key,'keep','everyday controls preserve submitted Advanced replacement');
 await page.evaluate(r=>{const f=(window as any).settingsFixture;f.config={...f.config,...r.patch};f.panel.setConfig(f.config,r.requestId);f.panel.setSaveStatus({kind:'saved'},r.requestId);},advancedImage);
 await page.evaluate(r=>{const f=(window as any).settingsFixture;f.config={...f.config,...r.patch};f.panel.setConfig(f.config,r.requestId);f.panel.setSaveStatus({kind:'saved'},r.requestId);},everydayImage);
 assert.equal(await settings.locator('[data-draft-bar]').isVisible(),false,'confirmed Advanced plus everyday edits do not leave phantom drafts');
 await settings.locator('[data-toggle-search]').tap();const search=settings.locator('[data-settings-search]');await search.fill('cast appearance');
 await settings.locator('[data-search-result]').filter({hasText:/[Cc]haracter|[Cc]ast/}).first().tap();
 assert.equal(await settings.locator('[data-cast-art]').isVisible(),true,'search opens the cast section');
 await search.fill('image dimensions');await settings.locator('[data-search-result]').filter({hasText:/shape|[Ii]mage|[Gg]eneration/}).first().tap();
 assert.equal(await settings.locator('[name="imageOutputAspectRatio"]').isVisible(),true,'search finds image shape through its section');
 console.log('Settings section search passed.');
 await page.evaluate(()=>Object.defineProperty(globalThis.crypto,'randomUUID',{value:undefined,configurable:true}));
 await openPage('characters');await settings.getByRole('button',{name:'Places',exact:true}).tap();
 const beforePlaces=await page.evaluate(()=>(window as any).settingsFixture.placeActions.length);
 await settings.locator('[data-location-art] summary').filter({hasText:'More list actions'}).tap();
 await settings.getByRole('button',{name:'Reload list',exact:true}).tap();
 assert.equal(await page.evaluate(()=>(window as any).settingsFixture.placeActions.length),beforePlaces+1,'saved places work without secure-context randomUUID');
 await page.evaluate(()=>(window as any).settingsFixture.holdPlaces=true);
 const loadPlaces=settings.getByRole('button',{name:'Reload list',exact:true});await loadPlaces.tap();
 const oldPlace=await page.evaluate(()=>(window as any).settingsFixture.placeRequests.at(-1));await page.clock.fastForward(16000);await loadPlaces.tap();
 await page.evaluate(old=>{(window as any).settingsFixture.panel.locationArtError('Late old failure',old.requestId);},oldPlace);
 assert.equal(await loadPlaces.isDisabled(),true,'an expired place error cannot cancel the replacement request');
 await page.evaluate(()=>{const f=(window as any).settingsFixture,r=f.placeRequests.at(-1);f.panel.setLocationArt(r.chatId,r.requestId,{version:1,locations:[]});});assert.equal(await loadPlaces.isDisabled(),false);
 await openPage('context');
 const refreshSources=settings.getByRole('button',{name:'Refresh source status',exact:true});await page.evaluate(()=>(window as any).settingsFixture.holdSources=true);await refreshSources.tap();
 const oldSource=await page.evaluate(()=>(window as any).settingsFixture.sourceRequests.at(-1));await page.clock.fastForward(5000);await refreshSources.tap();
 await page.evaluate(old=>{(window as any).settingsFixture.panel.contextSourceError(old.requestId);},oldSource);assert.equal(await refreshSources.isDisabled(),true,'an expired source error cannot cancel a newer read');
 await page.evaluate(()=>{const f=(window as any).settingsFixture,r=f.sourceRequests.at(-1);f.panel.setContextSourceReport({...r,sources:[]});});
 assert.equal(await refreshSources.isDisabled(),false);
 await page.evaluate(()=>{const f=(window as any).settingsFixture;f.holdSources=false;});await refreshSources.tap();assert.match(await settings.locator('[data-source-status]').innerText(),/3 reference records/);
 await page.evaluate(()=>{const f=(window as any).settingsFixture;f.chatId='another-chat';f.panel.clearContextSources();});assert.match(await settings.locator('[data-source-status]').innerText(),/not been checked/,'chat switches clear prior source status immediately');
 await settings.locator('[data-settings-search]').fill('');await openPage('images');
 for(const light of [false,true])for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});await page.evaluate(light=>{document.documentElement.style.cssText=light?'--lumiverse-text:#18212e;--lumiverse-text-muted:#46546b;--lumiverse-bg:#f6f7fa;--lumiverse-card-bg:#fff;--lumiverse-bg-elevated:#fff;--lumiverse-border:#9da7b6;--lumiverse-primary:#5044a0;':'--lumiverse-text:#eee;--lumiverse-text-muted:#bbc;--lumiverse-bg:#08090d;--lumiverse-bg-elevated:#181925;';},light);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`settings fit ${width}px`);
  if(width===390){const contrast=await settings.locator('[data-status]').evaluate((element,light)=>{
    const luminance=(rgb:number[])=>rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0);
    const bg=luminance((light?[246,247,250]:[8,9,13]).map(v=>v/255)),previous=(element as HTMLElement).dataset.kind;
    const result=['saved','dirty','saving','error'].map(kind=>{(element as HTMLElement).dataset.kind=kind;const color=getComputedStyle(element).color,numbers=(color.match(/[\d.]+/g)??[]).slice(0,3).map(Number),fg=luminance(color.startsWith('color(')?numbers:numbers.map(v=>v/255));return {kind,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};});
    if(previous)(element as HTMLElement).dataset.kind=previous;return result;
   },light);for(const state of contrast)assert.ok(state.ratio>=4.5,`${state.kind} status contrast on ${light?'light':'dark'} host: ${state.ratio}`);}
  const links=settings.locator('[data-pane="pictures"] [data-page-link]:visible');for(const link of await links.all()){const box=await link.boundingBox();assert.ok(box&&box.height>=44,'focused page links are touch-sized');}
 }
 await page.setViewportSize({width:390,height:844});await settings.locator('[data-pane="pictures"]').scrollIntoViewIfNeeded();await page.screenshot({path:'.cache/beta42-pictures-light.png',animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.cssText='--lumiverse-text:#eee;--lumiverse-text-muted:#bbc;--lumiverse-bg:#08090d;--lumiverse-bg-elevated:#181925;';});await page.screenshot({path:'.cache/beta42-pictures-dark.png',animations:'disabled'});
 console.log('Settings resilience: failed Apply, partial patches, pending guard and newer edits passed.');
}finally{await browser.close();await server.stop();}
