import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// Browser plugin unavailable; use the repository Playwright fixtures under Node.
import {execFileSync} from 'node:child_process';import {readFileSync,mkdirSync} from 'node:fs';import {createServer} from 'node:http';
const THEME_PRESET_IDS:string[]=JSON.parse(execFileSync('bun',['-e','import {THEME_PRESET_IDS} from "./src/config.ts"; console.log(JSON.stringify(THEME_PRESET_IDS));'],{encoding:'utf8',windowsHide:true}));
mkdirSync('.cache/cast',{recursive:true});const bundles=new Map<string,string>();
for(const [name,path] of [['reading','scripts/reading-browser-fixture.ts'],['settings','scripts/settings-browser-fixture.ts']]){const output=`.cache/cast/${name}.js`;execFileSync('bun',['build',path!,'--target','browser','--outfile',output],{windowsHide:true});bundles.set(name!,readFileSync(output,'utf8'));}
const server=createServer((req,res)=>{const pathname=new URL(req.url??'/','http://localhost').pathname,name=pathname.includes('settings')?'settings':'reading',js=pathname.endsWith('.js');res.setHeader('Content-Type',js?'application/javascript':'text/html');res.end(js?bundles.get(name):`<html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><script type="module" src="/${name}.js"></script></body></html>`);});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;
const browser=await chromium.launch({headless:true});await mkdir('.cache/cast',{recursive:true});
try{
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1200,height:800}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${port}`);
  await page.evaluate(()=>{
   const f=(window as any).readingFixture;
   const image=(color:string)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="${color}"/><circle cx="200" cy="180" r="65" fill="#ddd"/><path d="M100 550V320Q200 250 300 320V550" fill="#bbb"/></svg>`);
   const asset=(name:string,p:number,role='portrait')=>({jobId:name,cueId:name,paragraphIndex:p,status:'generated',imageUrl:image(role==='background'?'#182a2d':name==='Mira'?'#514468':'#4d6051'),stageAsset:{role,sceneId:'s',...(role==='portrait'?{character:name}: {})}});
   f.castTurn={chatId:'c',messageId:'m',swipeId:0,sourceFingerprint:'fingerprint',revision:0,speaker:'Mira',paragraphSpeakers:['Mira','Rin','Sol'],paragraphs:['a','b','c'],choices:[],status:'ready',assets:[asset('Room',0,'background'),asset('Mira',0),asset('Rin',1),asset('Sol',1),asset('Future',2)]};
   f.stage.setCastTurn(f.castTurn,1);
  });
  assert.equal(await page.locator('[data-vn-cast]').isVisible(),false,'cast defaults off');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setCastMode(true);f.stage.setCastTurn(f.castTurn,1);});
  await page.locator('[data-vn-cast-card] img').first().waitFor();
  assert.equal(await page.locator('[data-vn-cast-card]').count(),2);
  assert.match(await page.locator('[data-vn-cast-card][data-active=true]').innerText(),/Rin/);
  assert.doesNotMatch(await page.locator('[data-vn-cast]').innerText(),/Future/);
  const progress=await page.locator('[data-vn-progress]').innerText();
  await page.getByRole('button',{name:'Show Sol',exact:true}).click();
  assert.match(await page.locator('[data-vn-cast-card]').last().innerText(),/Sol/);
  assert.equal(await page.locator('[data-vn-progress]').innerText(),progress,'cast tray never advances reading');
  const close=page.getByRole('button',{name:'Hide cast portraits',exact:true});
  await page.evaluate(()=>{(window as any).readingFixture.stage.restoreReplyDraft('Keep this unsent reply.');});
  const closeBounds=await close.boundingBox();assert.ok(closeBounds&&closeBounds.width>=44&&closeBounds.height>=44,'cast close has a usable touch target');
  await close.click();
  assert.equal(await page.locator('[data-vn-cast-card]').count(),0,'closing removes portrait overlays');
  const show=page.getByRole('button',{name:'Show cast portraits',exact:true});await show.waitFor();
  assert.equal(await show.evaluate(el=>el===(el.getRootNode() as ShadowRoot).activeElement),true,'focus moves to restore control');
  const dismissed=await page.evaluate(()=>{const f=(window as any).readingFixture;return {background:f.stage.setCastTurn({...f.castTurn,revision:1},1)?.jobId,draft:f.stage.getState().draft};});
  assert.equal(dismissed.background,'Room','dismissal keeps the same background projection');assert.equal(dismissed.draft,'Keep this unsent reply.');
  assert.equal(await page.locator('[data-vn-cast-card]').count(),0,'turn refresh does not reopen dismissed portraits');
  assert.equal(await show.evaluate(el=>el===(el.getRootNode() as ShadowRoot).activeElement),true,'refresh preserves focus on the restore control');
  assert.equal(await page.locator('[data-vn-progress]').innerText(),progress,'closing never advances reading');
  await show.press('Enter');await page.locator('[data-vn-cast-card] img').first().waitFor();
  assert.equal(await page.locator('[data-vn-cast-card]').count(),2,'restore is explicit');
  for(const preset of THEME_PRESET_IDS)for(const layout of ['overlay','image-first']){
   await page.evaluate(({preset,layout})=>{const f=(window as any).readingFixture;f.stage.setThemePreset(preset);f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout,sheetSize:'compact',backgroundOpacity:.8});},{preset,layout});
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   const cards=await page.locator('[data-vn-cast-card]').all();
   for(const card of cards){const b=await card.boundingBox();if(!b){assert.ok(viewport.height<500,'cast only collapses when a short viewport has no room');continue;}assert.ok(b.x>=0&&b.x+b.width<=viewport.width&&b.y>=0&&b.y+b.height<=viewport.height,'portraits fit viewport');const dialogue=await page.locator('[data-vn-dialogue]').boundingBox();assert.ok(!dialogue||b.y+b.height<=dialogue.y+.5,`portraits leave dialogue clear: ${JSON.stringify({viewport,preset,layout,b,dialogue})}`);}
  }
  await page.screenshot({path:`.cache/cast/${viewport.width}.png`});
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout:'overlay',sheetSize:'compact',backgroundOpacity:.8});f.stage.setCastTurn(f.castTurn,0);});
  assert.equal(await page.locator('[data-vn-cast-card]').count(),1,'backward reading hides later portraits');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.castStage.createImage=()=>({src:'',complete:true,naturalWidth:10,decode:()=>new Promise(resolve=>{f.decode=resolve;}),addEventListener(){},removeEventListener(){}});f.castTurn.assets[1].imageUrl='/delayed';f.stage.setCastTurn(f.castTurn,0);});
  await page.waitForFunction(() => typeof (window as any).readingFixture.decode === 'function');
  if(await page.locator('[data-vn-cast]').isVisible()){
   await page.getByRole('button',{name:'Hide cast portraits',exact:true}).click();
   await page.evaluate(()=>{(window as any).readingFixture.decode();});
   assert.equal(await page.locator('[data-vn-cast-card]').count(),0,'late decode cannot reopen dismissed portraits');
   await page.getByRole('button',{name:'Show cast portraits',exact:true}).click();
  }else assert.ok(viewport.height<500,'only cramped landscape layouts collapse the portrait area');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.reset();f.decode();});
  assert.equal(await page.locator('[data-vn-cast]').isVisible(),false,'late decoding after reset cannot restore prior cast');
  await page.close();
 }
 const settings=await browser.newPage({viewport:{width:390,height:844}});await settings.goto(`http://127.0.0.1:${port}/settings?setupDone&noSpeech`);
 await settings.evaluate(()=>(window as any).settingsFixture.panel.openPage('appearance'));
 assert.equal(await settings.locator('[name="castMode"]').isChecked(),false);
 assert.match(await settings.locator('[name="castMode"]').locator('..').innerText(),/within your existing picture budget/);
 await settings.locator('[name="castMode"]').check();
 assert.equal(await settings.evaluate(()=>(window as any).settingsFixture.config.castMode),true,'cast opt-in persists through existing settings route');
 await settings.close();console.log('cast browser checks passed');
}finally{await browser.close();server.close();}
