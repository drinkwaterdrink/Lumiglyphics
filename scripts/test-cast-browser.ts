import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {THEME_PRESET_IDS} from '../src/config.js';
const build=await Bun.build({entrypoints:['scripts/reading-browser-fixture.ts'],target:'browser'});
assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const settingsBuild=await Bun.build({entrypoints:['scripts/settings-browser-fixture.ts'],target:'browser'});assert.ok(settingsBuild.success);const settingsBundle=await settingsBuild.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new URL(r.url).pathname==='/settings.js'?new Response(settingsBundle,{headers:{'Content-Type':'application/javascript'}}):new Response(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="${new URL(r.url).pathname==='/settings'?'/settings.js':'/fixture.js'}"></script></body></html>`,{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});await mkdir('.cache/cast',{recursive:true});
try{
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1200,height:800}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  await page.goto(`http://127.0.0.1:${server.port}`);
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
  for(const preset of THEME_PRESET_IDS)for(const layout of ['overlay','image-first']){
   await page.evaluate(({preset,layout})=>{const f=(window as any).readingFixture;f.stage.setThemePreset(preset);f.stage.setReaderPreferences({adjustableSheetEnabled:true,layout,sheetSize:'compact',backgroundOpacity:.8});},{preset,layout});
   const cards=await page.locator('[data-vn-cast-card]').all();
   for(const card of cards){const b=await card.boundingBox();if(!b){assert.ok(viewport.height<500,'cast only collapses when a short viewport has no room');continue;}assert.ok(b.x>=0&&b.x+b.width<=viewport.width&&b.y>=0&&b.y+b.height<=viewport.height,'portraits fit viewport');const dialogue=await page.locator('[data-vn-dialogue]').boundingBox();assert.ok(!dialogue||b.y+b.height<=dialogue.y+.5,'portraits leave dialogue clear');}
  }
  await page.screenshot({path:`.cache/cast/${viewport.width}.png`});
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.setCastTurn(f.castTurn,0);});
  assert.equal(await page.locator('[data-vn-cast-card]').count(),1,'backward reading hides later portraits');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.castStage.createImage=()=>({src:'',complete:true,naturalWidth:10,decode:()=>new Promise(resolve=>{f.decode=resolve;}),addEventListener(){},removeEventListener(){}});f.castTurn.assets[1].imageUrl='/delayed';f.stage.setCastTurn(f.castTurn,0);});
  await page.waitForFunction(() => typeof (window as any).readingFixture.decode === 'function');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.reset();f.decode();});
  assert.equal(await page.locator('[data-vn-cast]').isVisible(),false,'late decoding after reset cannot restore prior cast');
  await page.close();
 }
 const settings=await browser.newPage({viewport:{width:390,height:844}});await settings.goto(`http://127.0.0.1:${server.port}/settings?setupDone&noSpeech`);
 await settings.evaluate(()=>(window as any).settingsFixture.panel.openPage('appearance'));
 assert.equal(await settings.locator('[name="castMode"]').isChecked(),false);
 await settings.locator('[name="castMode"]').check();
 assert.equal(await settings.evaluate(()=>(window as any).settingsFixture.config.castMode),true,'cast opt-in persists through existing settings route');
 await settings.close();console.log('cast browser checks passed');
}finally{await browser.close();server.stop(true);}
