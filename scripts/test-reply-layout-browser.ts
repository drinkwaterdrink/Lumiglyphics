// Browser plugin unavailable; use the repository's localhost Playwright fixtures.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {browserFixtureServer} from './browser-fixture-server.ts';
const presets:string[]=JSON.parse(execFileSync('bun',['-e','import {THEME_PRESET_IDS} from "./src/config.ts";console.log(JSON.stringify(THEME_PRESET_IDS))'],{encoding:'utf8',windowsHide:true}));
const server=await browserFixtureServer('scripts/reading-browser-fixture.ts'),browser=await chromium.launch({headless:true});
try{
 await mkdir('.cache/reply-layout',{recursive:true});
 for(const viewport of [{width:360,height:640},{width:844,height:390},{width:844,height:390,scale:1.5},{width:1280,height:800}])for(const preset of presets){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(5000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}/?mode=cyoa&readerControls&preset=${preset}&uiScale=${viewport.scale??1}`);
  if(viewport.height>=640){
   await page.evaluate(()=>{const f=(window as any).readingFixture,url='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#526847"/></svg>');f.stage.setCastMode(true);f.stage.setCastTurn({chatId:'reply-cast',messageId:'m',swipeId:0,sourceFingerprint:'reply',revision:0,speaker:'Mira',paragraphs:['a','b','c'],choices:[],status:'ready',assets:[{jobId:'bg',cueId:'bg',paragraphIndex:0,status:'generated',imageUrl:url,stageAsset:{role:'background',sceneId:'s'}},{jobId:'mira',cueId:'mira',paragraphIndex:0,status:'generated',imageUrl:url,stageAsset:{role:'portrait',sceneId:'s',character:'Mira'}}]},0);});
   await page.locator('[data-vn-cast-card] img').waitFor();
  }
  await page.evaluate(()=>{const f=(window as any).readingFixture;while(f.stage.getState().phase!=='awaiting-input')f.stage.advance();});
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  if(viewport.height>=640)assert.equal(await page.locator('[data-vn-cast]').isVisible(),false,'cast portraits never cover the reply controls');
  const reply=page.locator('[data-vn-interaction]');
  await page.locator('[data-vn-interaction-title]').waitFor().catch(async error=>{throw new Error(`${preset}/${viewport.width}: ${await reply.evaluate(el=>JSON.stringify({hidden:el.hidden,rect:el.getBoundingClientRect().toJSON(),html:el.innerHTML.slice(0,400)}))}`,{cause:error});});
  const bounds=await reply.boundingBox(),header=await page.locator('[data-vn-reader-header]').boundingBox(),dialogue=await page.locator('[data-vn-dialogue]').boundingBox(),previous=await page.locator('[data-vn-control=previous]').boundingBox();
  assert.ok(bounds&&bounds.height>=44&&header&&previous&&bounds.y>=header.y+header.height&&bounds.y+bounds.height<=Math.min(dialogue?.y??Infinity,previous.y)+.5,`${preset}/${viewport.width}: reply controls fit between header and dialogue: ${JSON.stringify({bounds,header,dialogue})}`);
  assert.equal(await page.getByRole('region',{name:/your turn/i}).isVisible(),true,`${preset}/${viewport.width} accessibility: ${await reply.ariaSnapshot()}`);
  await reply.focus();await page.keyboard.press('Home');
  await page.waitForFunction(()=>{const f=(window as any).readingFixture;return f.stage.root.querySelector('[data-vn-interaction]').scrollTop<1;});
  const colors=await page.locator('[data-vn-interaction-heading]').evaluate(heading=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;
   const rgba=(color:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
   const luminance=(c:number[])=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0);
   const background=rgba(getComputedStyle(heading).backgroundColor),bg=luminance(background);
   return {alpha:background[3],ratios:[...heading.querySelectorAll('[data-vn-interaction-title],[data-vn-interaction-hint]')].map(el=>{const fg=luminance(rgba(getComputedStyle(el).color));return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);})};
  });
  assert.equal(colors.alpha,255,`${preset}: heading has a stable opaque backing over arbitrary art`);
  assert.ok(colors.ratios.every(ratio=>ratio>=4.5),`${preset}: title and hint meet AA contrast: ${colors.ratios}`);
  const index=await page.evaluate(()=>(window as any).readingFixture.stage.getState().currentParagraphIndex);
  await reply.dispatchEvent('wheel',{deltaY:-100});
  assert.equal(await page.getByRole('dialog',{name:'History',exact:true}).isVisible(),false,'reply scrolling never opens History');
  await reply.evaluate(el=>{const touch=(x:number)=>new Touch({identifier:1,target:el,clientX:x,clientY:160});el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(100)]}));el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[touch(220)],touches:[]}));});
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.stage.getState().currentParagraphIndex),index,'reply gestures never seek or advance the story');
  for(const choice of await page.locator('[data-vn-choice-list] button').all()){
   await choice.focus();await choice.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));const box=await choice.boundingBox(),area=await reply.boundingBox();
   assert.ok(box&&area&&box.y>=area.y-.5&&box.y+box.height<=area.y+area.height+.5,`${preset}/${viewport.width}@${viewport.scale??1}: each full choice target can be reached by scrolling: ${JSON.stringify({box,area})}`);
  }
  await page.locator('[data-vn-input]').fill('Keep this draft');await reply.focus();await page.keyboard.press('End');
  await page.waitForFunction(()=>{const el=(window as any).readingFixture.stage.root.querySelector('[data-vn-interaction]');return el.scrollTop+el.clientHeight>=el.scrollHeight-1;});
  assert.equal(await page.locator('[data-vn-input]').inputValue(),'Keep this draft');
  const send=await page.locator('[data-vn-submit]').boundingBox(),sendArea=await reply.boundingBox();
  assert.ok(send&&sendArea&&send.height>=44&&send.width>=44&&send.y>=sendArea.y-.5&&send.y+send.height<=sendArea.y+sendArea.height+.5,`${preset}/${viewport.width}: Send remains a full reachable touch target: ${JSON.stringify({send,sendArea})}`);
  assert.deepEqual(await page.evaluate(()=>{const c=(window as any).readingFixture.counters;return {submits:c.submits,choices:c.choices,rerolls:c.rerolls};}),{submits:0,choices:0,rerolls:0},'scrolling and focus never submit or regenerate');
  await reply.focus();await page.keyboard.press('Home');
  await page.waitForFunction(()=>{const el=(window as any).readingFixture.stage.root.querySelector('[data-vn-interaction]');return el.scrollTop<1;});
  if(preset==='paper-novel'||preset==='lumiverse')await page.screenshot({path:`.cache/reply-layout/${preset}-${viewport.width}.png`});
  await page.getByRole('button',{name:'Previous paragraph',exact:true}).click();
  assert.equal(await page.locator('[data-vn-dialogue]').isVisible(),true,'Previous restores the full reading panel');
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  if(viewport.height>=640)assert.equal(await page.locator('[data-vn-cast]').isVisible(),true,'cast portraits return when reading resumes');
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.stage.getState().draft),'Keep this draft','temporary reply layout preserves the draft');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Reply layout: all 10 themes at 360/844 landscape/1280, bounded scrolling, AA title/hint, full choice targets, drafts and isolated gestures passed');
}finally{await browser.close();await server.stop();}
