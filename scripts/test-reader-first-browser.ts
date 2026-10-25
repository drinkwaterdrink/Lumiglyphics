import {chromium,type Page} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {THEME_PRESET_IDS,DEFAULT_CONFIG} from '../src/config.js';
import {SETTINGS_PAGES,SETTINGS_FIELD_PAGES} from '../src/frontend/settings/routes.js';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/reader-first-browser-fixture.ts');
const browser=await chromium.launch({headless:true});
await mkdir('.cache/reader-first',{recursive:true});
const settled=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
const close=(page:Page)=>page.locator('[data-workspace-close]').click();
async function enableAperture(page:Page){
 await page.evaluate(()=>{const host=(window as any).hostFixture;host.config.apertureMode=true;host.receive({type:'vn_config',config:host.config});});
 await page.waitForFunction(()=>(window as any).readerFirstFixture.stage().panelMount.dataset.vnAperture==='true');await settled(page);
}
async function go(page:Page,id:string,width:number){
 if(width<=760&&(id==='history'||id==='settings')){
  await page.locator('[data-vn-navigation] [data-reader-destination="more"]').click();
  await page.locator('[data-reader-more]').getByRole('button',{name:new RegExp(`^${id==='settings'?'Settings':'History'}`)}).click();
 }else await page.locator(`[data-vn-navigation] [data-reader-destination="${id}"]`).click();
}
const paid=(requests:any[])=>requests.filter(r=>/^(vn_submit|vn_choice|vn_reroll|vn_prepare_image|vn_image_review|vn_regenerate_image_prompt|vn_reprepare_image_template|vn_replan_turn|vn_queue_image_retries)$/.test(r.type));
try{
 for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:430,height:932},{width:390,height:844},{width:360,height:800},{width:320,height:720},{width:844,height:390}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(7000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/sample-art.jpg',route=>route.fulfill({path:'docs/design-concepts/reader-first/assets/observatory.jpg'}));
  await page.goto(`http://127.0.0.1:${server.port}/`);await page.waitForFunction(()=>Boolean((window as any).readerFirstFixture));
  const stage=()=>page.evaluate(()=>(window as any).readerFirstFixture.stage().getState());
  const original=await page.evaluate(()=>{const s=(window as any).readerFirstFixture.stage();s.restoreReplyDraft('Keep my unsent reply');s.toggleAutoPlay(true);s.toggleSkip(true);s.workspace.open('story');return s.getState().currentParagraphIndex;});
  await go(page,'story',viewport.width);
  assert.equal(await page.locator('[data-vn-theme-host]').evaluate(el=>(el as HTMLElement).inert),viewport.width<=760,'phone workspaces remove covered reading content from keyboard/accessibility navigation');
  assert.equal(await page.getByRole('button',{name:'folded note',exact:true}).count(),0,'unread document is not exposed');
  await page.getByRole('button',{name:'People',exact:true}).click();
  assert.equal(await page.locator('[data-reference-list] button').count(),1);
  await page.getByRole('button',{name:'Mira',exact:true}).click();
  const card=page.getByRole('dialog',{name:'About Mira',exact:true});
  await card.getByText('Local display note',{exact:true}).click();await card.locator('textarea').fill('Local unsaved reference note');
  await go(page,'artwork',viewport.width);
  const prompt=page.locator('[data-image-studio] [data-positive]');await prompt.fill('An unsent, locally edited picture prompt');
  if(viewport.width<=760){
   await page.evaluate(()=>{Object.defineProperty(visualViewport!,'height',{configurable:true,value:420});visualViewport!.dispatchEvent(new Event('resize'));});await settled(page);
   const footer=await page.locator('[data-image-studio] [data-studio-footer]').boundingBox(),nav=await page.locator('[data-vn-navigation]').boundingBox();assert.ok(footer&&nav&&footer.y+footer.height<=420.5&&nav.y+nav.height<=420.5,'workspace actions and navigation clear the simulated keyboard');
   await page.evaluate(()=>{delete (visualViewport as any).height;visualViewport!.dispatchEvent(new Event('resize'));});await settled(page);
  }
  await page.keyboard.press('Control+k');await page.getByRole('searchbox',{name:'Search menus and settings',exact:true}).fill('Custom CSS');await page.keyboard.press('Enter');
  const css=page.locator('[data-vn-settings] [name="customCss"]');await css.fill('[data-vn-dialogue] { border-style: dashed; }');
  await go(page,'artwork',viewport.width);assert.equal(await prompt.inputValue(),'An unsent, locally edited picture prompt','Artwork keeps its native request draft');
  await go(page,'settings',viewport.width);assert.equal(await css.inputValue(),'[data-vn-dialogue] { border-style: dashed; }','specialist settings retain unsaved drafts when docked elsewhere');
  await page.keyboard.press('Escape');const unsaved=page.getByRole('dialog',{name:'Unsaved changes',exact:true});assert.ok(await unsaved.isVisible());await page.keyboard.press('Escape');assert.ok(await css.isVisible(),'native confirmation Escape does not close the workspace or lose edits');
  await go(page,'story',viewport.width);await page.getByRole('button',{name:'Mira',exact:true}).click();assert.equal(await card.locator('textarea').inputValue(),'Local unsaved reference note');
  await close(page);assert.equal((await stage()).currentParagraphIndex,original);assert.equal((await stage()).draft,'Keep my unsent reply');
  await settled(page);
  assert.equal(await page.locator('[data-vn-theme-host]').evaluate(el=>(el as HTMLElement).inert),false);
  await page.locator('[data-vn-continue]').click();
  await go(page,'story',viewport.width);await page.getByRole('button',{name:'All',exact:true}).click();await page.getByRole('button',{name:'folded note',exact:true}).click();await page.getByRole('button',{name:'Read revealed text',exact:true}).click();
  const document=page.getByRole('dialog',{name:'Read folded note',exact:true});assert.match(await document.innerText(),/Keep the eastern lantern burning/);
  await page.keyboard.press('Escape');assert.ok(await page.getByRole('dialog',{name:'About folded note',exact:true}).isVisible());await page.keyboard.press('Escape');assert.ok(await page.getByRole('searchbox',{name:'Search references',exact:true}).isVisible());await close(page);
  await go(page,'history',viewport.width);await page.locator('[data-image-library] [data-library-status]').waitFor();
  assert.match(await page.locator('[data-image-library] section').innerText(),/UI fixture/);await close(page);
  await page.getByRole('button',{name:'Focus reading',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Back to chat',exact:true}).isVisible());assert.ok(await page.getByRole('button',{name:'Show navigation',exact:true}).isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('[data-vn-navigation]').isVisible());
  const handle=page.getByRole('button',{name:'Resize text panel',exact:true});await handle.focus();await page.keyboard.press('ArrowUp');
  assert.ok((await page.evaluate(()=>(window as any).readerFirstFixture.config.readerPreferences.heightRatio))>0,'keyboard resize saves the actual reading preference');
  await page.getByRole('button',{name:'Hide text',exact:true}).click();await page.getByRole('button',{name:'Show text',exact:true}).click();
  await settled(page);await page.screenshot({path:`.cache/reader-first/reader-${viewport.width}.png`});
  await go(page,'settings',viewport.width);await page.screenshot({path:`.cache/reader-first/settings-${viewport.width}.png`});await close(page);
  assert.equal(await page.locator('[data-vn-navigation] [aria-current="page"]').count(),1);
  assert.deepEqual(paid(await page.evaluate(()=>(window as any).readerFirstFixture.sent)),[],'navigation, draft editing and resize cause no prose/image generation');
  await page.getByRole('button',{name:'Back to chat',exact:true}).click();assert.equal(await page.locator('[data-vn-stage-host]').isVisible(),false);await page.getByRole('button',{name:'Reopen reader',exact:true}).click();assert.equal((await stage()).draft,'Keep my unsent reply');
  await page.getByRole('button',{name:'Find menus and settings',exact:true}).click();await page.evaluate(()=>(window as any).hostFixture.cleanup());assert.equal(await page.locator('[data-reader-command]').count(),0,'host cleanup closes native menu search before removing its owner');
  assert.deepEqual(errors,[]);await page.close();
 }
 // APERTURE v4 uses the production workspace/tools and keeps art full-bleed
 // across narrow portrait and landscape Android-sized viewports.
 for(const viewport of [{width:320,height:720},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(7000);
  await page.route('**/sample-art.jpg',route=>route.fulfill({path:'docs/design-concepts/reader-first/assets/observatory.jpg'}));
  await page.goto(`http://127.0.0.1:${server.port}/`);await page.waitForFunction(()=>Boolean((window as any).readerFirstFixture));
  await enableAperture(page);
  const scene=await page.locator('[data-vn-theme-host]').boundingBox(),dock=await page.locator('[data-aperture-dock]').boundingBox();
  assert.ok(scene&&scene.x<=.5&&scene.y<=.5&&scene.width>=viewport.width-.5&&scene.height>=viewport.height-.5,`${viewport.width}x${viewport.height}: artwork remains edge-to-edge`);
  assert.ok(dock&&dock.x>=0&&dock.y>=0&&dock.x+dock.width<=viewport.width+.5&&dock.y+dock.height<=viewport.height+.5,'bottom controls stay inside the viewport');
  const controls=await page.locator('[data-aperture-dock] button').all();assert.equal(controls.length,6);
  for(const control of controls){const b=await control.boundingBox();assert.ok(b&&b.width>=39&&b.height>=43&&b.x>=0&&b.x+b.width<=viewport.width+.5,'Aperture dock keeps reachable touch targets');}
  const labels=await page.locator('[data-aperture-dock] button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-aperture-action')));
  assert.deepEqual(labels,['previous','history','lens','cast','settings','next'],'Cast sits immediately beside Lens');
  assert.equal(await page.locator('[data-vn-navigation]').isVisible(),false,'legacy navigation is replaced only while APERTURE is enabled');
  assert.deepEqual(paid(await page.evaluate(()=>(window as any).readerFirstFixture.sent)),[],'APERTURE layout performs no paid operation');
  await page.close();
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(7000);
  await page.route('**/sample-art.jpg',route=>route.fulfill({path:'docs/design-concepts/reader-first/assets/observatory.jpg'}));
  await page.goto(`http://127.0.0.1:${server.port}/`);await page.waitForFunction(()=>Boolean((window as any).readerFirstFixture));
  await enableAperture(page);
  await page.locator('[data-aperture-iris]').click();assert.ok(await page.locator('[data-aperture-iris-dialog]').isVisible());
  await page.locator('[data-iris-action="artwork"]').click();assert.equal(await page.locator('[data-vn-shell]').getAttribute('data-vn-workspace'),'artwork');
  assert.ok(await page.locator('[data-image-studio]').isVisible(),'Iris opens the real Art Studio surface');await close(page);
  await page.locator('[data-reader-panels]').click();assert.equal(await page.locator('[data-vn-panel-layer] .launcher').getAttribute('aria-expanded'),'true','header Panels opens the real pinned-card dock');
  await page.locator('[data-vn-panel-layer] .drawer button').filter({hasText:'Close'}).click();
  await page.locator('[data-reader-voice]').click();assert.ok(await page.locator('[data-vn-settings]').isVisible(),'Voice opens real speech settings when TTS is off');
  await page.keyboard.press('Control+k');await page.getByRole('searchbox',{name:'Search menus and settings',exact:true}).fill('Appearance');await page.keyboard.press('Enter');
  await page.locator('[data-vn-settings] select[name="apertureAppearance"]').selectOption('dark');
  await page.waitForFunction(()=>(window as any).readerFirstFixture.stage().panelMount.dataset.vnApertureTheme==='dark');
  const opacity=page.locator('[data-vn-settings] input[name="readerBackgroundOpacity"]');
  await opacity.evaluate((el:HTMLInputElement)=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>{const stage=(window as any).readerFirstFixture.stage(),root=stage.panelMount.querySelector('[data-vn-theme-host]').shadowRoot;return (window as any).readerFirstFixture.config.readerPreferences.backgroundOpacity===0&&root.querySelector('[data-vn-root]').style.getPropertyValue('--vn-sheet-opacity')==='0';});
  const alpha=await page.evaluate(()=>{const root=(window as any).readerFirstFixture.stage().panelMount.querySelector('[data-vn-theme-host]').shadowRoot;
   const dialogue=root.querySelector('[data-vn-dialogue]'),text=root.querySelector('[data-vn-dialogue-text]');
   return {background:getComputedStyle(dialogue,'::before').opacity,text:getComputedStyle(text).opacity};});
  assert.equal(alpha.background,'0','zero opacity affects only the dialogue background layer');assert.equal(alpha.text,'1','dialogue text remains fully opaque');
  assert.deepEqual(paid(await page.evaluate(()=>(window as any).readerFirstFixture.sent)),[],'palette and opacity saves do not trigger generation');
  await page.getByRole('button',{name:'Back to chat',exact:true}).click();assert.equal(await page.locator('[data-vn-stage-host]').isVisible(),false,'Back to Chat uses host exit semantics');
  await page.close();
 }
 // Every actual preset, not a hand-maintained subset. Compare the shell and
 // docked tool tokens and ensure the reader/control bounds survive reduced space.
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(7000);
  await page.route('**/sample-art.jpg',route=>route.fulfill({path:'docs/design-concepts/reader-first/assets/observatory.jpg'}));
  await page.goto(`http://127.0.0.1:${server.port}/`);
  for(const theme of THEME_PRESET_IDS){
   await page.evaluate(theme=>(window as any).readerFirstFixture.stage().setThemePreset(theme),theme);
   await go(page,'settings',width);await page.keyboard.press('Control+k');await page.getByRole('searchbox',{name:'Search menus and settings',exact:true}).fill('Appearance');await page.keyboard.press('Enter');
   const themeOptions=page.locator('[data-vn-settings] input[name="themePreset"]');assert.equal(await themeOptions.count(),THEME_PRESET_IDS.length,'all theme settings remain present');
   const colors=await page.evaluate(()=>{const s=(window as any).readerFirstFixture.stage(),shell=getComputedStyle(s.panelMount),settings=s.panelMount.querySelector('[data-vn-settings]');const button=settings.shadowRoot.querySelector('[data-leave-save]'),primary=getComputedStyle(button);
     const luminance=(color:string)=>{const c=(color.match(/[\d.]+/g)??[]).slice(0,3).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*c[0]!+.7152*c[1]!+.0722*c[2]!;};
     const a=luminance(primary.color),b=luminance(primary.backgroundColor);
     return{shell:shell.getPropertyValue('--vn-shell-text').trim(),tool:getComputedStyle(settings).getPropertyValue('--set-text').trim(),voice:getComputedStyle(settings.shadowRoot.querySelector('.vn-speech-settings')).getPropertyValue('--set-text').trim(),contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});assert.equal(colors.tool,colors.shell,`${theme}: docked Settings follows the chosen theme`);assert.equal(colors.voice,colors.shell,`${theme}: nested Speech settings follows the same theme`);assert.ok(colors.contrast>=4.5,`${theme}: primary settings text contrast ${colors.contrast}`);
   const exit=page.getByRole('button',{name:'Back to chat',exact:true}),workspace=page.locator('aside[data-vn-workspace]');
   for(const control of [exit,page.locator('[data-workspace-close]')]){const b=await control.boundingBox();assert.ok(b&&b.width>=43.99&&b.height>=43.99);assert.ok(await control.evaluate(el=>{const r=el.getBoundingClientRect();return (el.getRootNode() as ShadowRoot).elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===el;}),`${theme}: controls are unobstructed`);}
   const b=await workspace.boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+.5&&b.y+b.height<=900+.5);
   await page.screenshot({path:`.cache/reader-first/${theme}-${width}.png`});await close(page);await settled(page);
   const box=await page.locator('[data-vn-dialogue]').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width+.5&&box.y+box.height<=900+.5,`${theme}: sheet fits the reduced reader`);
  }
  await page.evaluate(()=>(window as any).readerFirstFixture.stage().setUserCss('[data-vn-exit], [data-vn-navigation] {display:none!important} [data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue] {border-width:5px}'));
  assert.ok(await page.getByRole('button',{name:'Back to chat',exact:true}).isVisible());assert.ok(await page.locator('[data-vn-navigation]').isVisible());assert.equal(await page.locator('[data-vn-dialogue]').evaluate(el=>getComputedStyle(el).borderLeftWidth),'5px','custom CSS still reaches the reader as the final layer');
  await page.close();
 }
 // Full registry coverage remains the single source of truth for settings pages.
 assert.equal(SETTINGS_PAGES.length,22);assert.deepEqual(Object.keys(SETTINGS_FIELD_PAGES).sort(),Object.keys(DEFAULT_CONFIG).sort(),'every existing configuration key still has a settings route');
 console.log(`Reader-first: five screen sizes, real host/tools/draft recovery, reveal-safe documents, guarded settings, no paid navigation, resize/hide/show, focus/exit and all ${THEME_PRESET_IDS.length} themes on phone and desktop passed.`);
}finally{await browser.close();await server.stop();}
