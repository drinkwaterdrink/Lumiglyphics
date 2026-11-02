import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';

// Browser plugin not available; use the repository's offline Playwright fixture.
// Flow: Artwork -> enrich held/completed prompt -> restore saved image version.
const build=await Bun.build({entrypoints:['scripts/image-review-browser-fixture.ts'],target:'browser'});
assert.equal(build.success,true,String(build.logs));
const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:request=>new URL(request.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'text/javascript'}}):new Response('<!doctype html><html><head><title>Artwork contracts</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('**/api/v1/images/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="74"><rect width="64" height="74" fill="#456"/></svg>'}));
  await page.goto(`http://127.0.0.1:${server.port}`);
  assert.equal(await page.title(),'Artwork contracts');
  const studio=page.locator('[data-image-studio]');
  for(const state of ['review','approved']) {
    await page.evaluate(state=>{
      const f=(window as any).imageFixture;
      const turn=structuredClone(f.turn);turn.imageRequests[0].state=state;turn.imageRequests[0].canRegeneratePrompt=true;
      turn.imageRequests[0].prompt='Mira, silver hair, green coat, beside the rainy library window';
      turn.assets[0]={...turn.assets[0],status:'generated',imageId:'current',imageUrl:'/api/v1/images/current'};
      f.studio.setConfig({...f.config,generateImages:true});f.studio.setTurn(turn);f.studio.open();
    },state);
    await studio.getByRole('tab',{name:'Prompt',exact:true}).click();
    await studio.locator('[data-enrich-guidance]').fill('longer hair, warmer lighting');
    await studio.locator('[data-enrich-submit]').click();
    const action=await page.evaluate(()=>(window as any).imageFixture.actions.at(-1));
    assert.equal(action.type,state==='review'?'vn_enrich_image_prompt':'vn_prepare_image');
    assert.equal(action.guidance,'longer hair, warmer lighting');
    assert.match(action.edits.prompt,/green coat/);
    if(state==='approved')assert.equal(action.promptOperation,'enrich');
  }
  await page.evaluate(()=>{
    const f=(window as any).imageFixture,turn=structuredClone(f.turn);
    turn.assets[0]={...turn.assets[0],status:'generated',imageId:'current',imageUrl:'/api/v1/images/current',previousVersions:[{versionId:'saved',imageId:'saved-art',imageUrl:'x" onerror="window.injected=true',timestamp:'2026-11-01T00:00:00Z'}]};
    turn.imageRequests[0].state='approved';f.studio.setTurn(turn);f.studio.open();
  });
  await studio.getByRole('tab',{name:'Picture',exact:true}).click();
  const thumbnail=studio.locator('[data-versions-strip] img');
  assert.equal(await thumbnail.count(),1);
  assert.equal(await thumbnail.getAttribute('onerror'),null);
  assert.match(await thumbnail.getAttribute('src')??'',/\/api\/v1\/images\/saved-art$/);
  await thumbnail.click();
  const restore=await page.evaluate(()=>(window as any).imageFixture.actions.at(-1));
  assert.deepEqual(restore,{type:'vn_restore_previous_image',chatId:'chat',messageId:'message',sourceFingerprint:'fingerprint',jobId:'job',versionId:'saved',swipeId:0,revision:0});
  assert.equal(await page.evaluate(()=>(window as any).injected),undefined);
  assert.deepEqual(errors,[]);
  const evidence=process.env.LUMIGLYPHICS_QA_DIR;
  if(evidence) {
    await page.screenshot({path:join(evidence,'task1-artwork-mobile.png')});
    await page.setViewportSize({width:1440,height:960});
    await page.screenshot({path:join(evidence,'task1-artwork-desktop.png')});
  }
  console.log('Artwork contracts passed: held/completed enrichment, saved-version restore, safe thumbnail DOM, no console/page errors.');
} finally {await browser.close();server.stop(true);}
