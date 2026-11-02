import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const build=await Bun.build({entrypoints:['scripts/reader-reference-workspace-browser-fixture.ts'],target:'browser'});
assert.ok(build.success,String(build.logs));const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'text/javascript'}}):new Response('<html><head><title>Compact references</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:960}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors:string[]=[],images:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('**/api/v1/images/**',route=>{images.push(route.request().url());return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#456"/></svg>'});});
  await page.goto(`http://127.0.0.1:${server.port}`);assert.equal(await page.title(),'Compact references');
  await page.evaluate(()=>{
   const f=(window as any).readingFixture,key={chatId:'compact',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0};
   const source={provider:'story',recordId:'message',chatId:'compact',messageId:'message',sourceFingerprint:'12345678',observedAt:'2026-11-01'};
   const fact=(id:string,value:string,p:number)=>({id,entityId:'m',field:id,value,visibility:'observed',source,revealedAt:{key,paragraphIndex:p}});
   const presentation={version:2,key,paragraphCount:3,availableThrough:2,entities:[{id:'m',kind:'npc',name:'Mira',aliases:[],firstParagraph:0,facts:[fact('role','Keeper of the harbor lamps.',0),fact('appearance','A silver braid.',2)]}],baseline:{m:{outfit:'A green coat.',presence:'present'}},changes:[{entityId:'m',paragraphIndex:2,changes:{outfit:'A blue uniform.'}}],beats:[0,1,2].map(paragraphIndex=>({paragraphIndex,locationId:null,drawableEntityId:'m',speakerEntityId:'m'}))};
   f.compact={mode:'standard',paragraphs:[0,1,2].map(i=>({id:`p${i}`,speaker:'Mira',text:`Mira waits at the harbor. Beat ${i}.`})),presentation};
   f.media={chatId:'compact',messageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0,speaker:'Mira',paragraphs:f.compact.paragraphs.map((p:any)=>p.text),choices:[],status:'ready',presentation,assets:[{jobId:'future',paragraphIndex:2,status:'generated',imageId:'future',imageUrl:'/api/v1/images/future',stageAsset:{role:'portrait',character:'Mira',sceneId:'scene'}}]};
   f.stage.setTooltipPreferences({enabled:true,categories:{npcs:true,locations:true,objects:true},detail:'expanded',linking:'all-known',maxLinksPerParagraph:3,overrides:[]});
   f.stage.loadTurn(f.compact);f.stage.setCastTurn(f.media,0);
  });
  const open=async()=>{await page.getByRole('button',{name:'About Mira',exact:true}).click();return page.getByRole('dialog',{name:'About Mira',exact:true});};
  let card=await open();
  assert.match(await card.innerText(),/green coat/);assert.doesNotMatch(await card.innerText(),/silver braid|blue uniform/);
  assert.equal(await card.locator('[data-dossier-media] img').count(),0,'a future-only portrait is not exposed at an earlier cursor');
  assert.equal(images.length,0,'no future image was fetched');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.workspace.close();f.stage.advance();f.stage.advance();f.stage.setCastTurn(f.media,2);});
  assert.equal(await page.evaluate(()=>(window as any).readingFixture.stage.getState().currentParagraphIndex),2);
  card=await open();assert.match(await card.innerText(),/blue uniform/);assert.match(await card.innerText(),/silver braid/);
  assert.equal(await card.locator('[data-dossier-media] img').count(),1);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const f=(window as any).readingFixture;f.stage.jumpToParagraph(0);f.stage.setCastTurn(f.media,0);});
  card=await open();assert.match(await card.innerText(),/green coat/);assert.doesNotMatch(await card.innerText(),/silver braid|blue uniform/);
  assert.equal(await card.locator('[data-dossier-media] img').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Compact presentation browser checks passed: mobile/desktop reveal order, backward seek, state changes and future-art exclusion.');
}finally{await browser.close();server.stop(true);}
