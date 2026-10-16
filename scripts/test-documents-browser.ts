import {THEME_PRESET_IDS} from '../src/config.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const build=await Bun.build({entrypoints:['scripts/documents-browser-fixture.ts'],target:'browser'});assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
await mkdir('.cache/documents',{recursive:true});const browser=await chromium.launch({headless:true});
try{for(const viewport of [{width:360,height:800},{width:844,height:390}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});let external=0;page.on('request',r=>{if(!r.url().startsWith(`http://127.0.0.1:${server.port}`))external++;});
 await page.goto(`http://127.0.0.1:${server.port}/`);
 const anchor=()=>page.getByRole('button',{name:'About sealed letter',exact:true});
 await anchor().click();let card=page.getByRole('dialog',{name:'About sealed letter',exact:true});
 assert.match(await card.innerText(),/No document text has been revealed/);
 assert.equal(await card.getByRole('button',{name:'Read revealed text',exact:true}).count(),0);
 await card.getByRole('button',{name:'Close information',exact:true}).click();await page.locator('[data-vn-continue]').click();
 await anchor().click();card=page.getByRole('dialog',{name:'About sealed letter',exact:true});await card.getByRole('button',{name:'Read revealed text',exact:true}).click();
 const reader=()=>page.getByRole('dialog',{name:'Read sealed letter',exact:true});
 assert.match(await reader().innerText(),/Meet me at dawn/);assert.doesNotMatch(await reader().innerText(),/blue key/);
 assert.equal(await reader().locator('[data-document-body]').evaluate(e=>getComputedStyle(e).userSelect),'text');
 const progress=await page.locator('[data-vn-progress]').innerText();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-vn-progress]').innerText(),progress);
 await reader().getByRole('button',{name:'Back to item',exact:true}).click();assert.equal(await card.isVisible(),true);
 await card.getByRole('button',{name:'Close information',exact:true}).click();assert.equal(await anchor().evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
 await page.locator('[data-vn-continue]').click();await anchor().click();await card.getByRole('button',{name:'Read revealed text',exact:true}).click();
 assert.match(await reader().innerText(),/blue key/);assert.equal(await reader().locator('img,script').count(),0);assert.equal(await page.evaluate(()=>(window as any).hacked),undefined);
 await reader().getByRole('button',{name:'Close document',exact:true}).click();await page.getByRole('button',{name:'Previous paragraph',exact:true}).click();
 await page.getByRole('button',{name:'Scene references',exact:true}).click();await page.getByLabel('Search references').fill('letter');await page.getByRole('button',{name:'sealed letter',exact:true}).click();await card.getByRole('button',{name:'Read revealed text',exact:true}).click();
 assert.doesNotMatch(await reader().innerText(),/blue key/);await reader().getByRole('button',{name:'Back to item',exact:true}).click();await card.getByRole('button',{name:'Back to references',exact:true}).click();assert.equal(await page.getByLabel('Search references').inputValue(),'letter');await page.keyboard.press('Escape');
 for(const theme of THEME_PRESET_IDS){
  await page.evaluate(theme=>(window as any).documentsFixture.stage.setThemePreset(theme),theme);
  await anchor().click();await card.getByRole('button',{name:'Read revealed text',exact:true}).click();
  const contrast=await reader().evaluate(e=>{
   const luminance=(v:string)=>{const c=(v.match(/[\d.]+/g)??[]).slice(0,3).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*c[0]!+.7152*c[1]!+.0722*c[2]!;};
   const style=getComputedStyle(e),a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });assert.ok(contrast>=4.5,`${theme} document text contrast ${contrast}`);
  const bounds=await reader().boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1);
  for(const name of ['Back to item','Close document','Copy revealed text']){const b=reader().getByRole('button',{name,exact:true}),box=await b.boundingBox();assert.ok(box&&box.width>=43.99&&box.height>=43.99);await b.evaluate(e=>e.scrollIntoView({block:'nearest'}));assert.equal(await b.evaluate(e=>{const r=e.getBoundingClientRect();return (e.getRootNode() as ShadowRoot).elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;}),true,`${name} unobstructed`);}
  await page.screenshot({path:`.cache/documents/${theme}-${viewport.width}.png`});await page.keyboard.press('Escape');
 }
 await anchor().click();await card.getByRole('button',{name:'Read revealed text',exact:true}).evaluate(e=>(window as any).oldDocumentButton=e);await card.getByRole('button',{name:'Read revealed text',exact:true}).click();await page.evaluate(()=>{const f=(window as any).documentsFixture;f.stage.loadTurn({...f.turn,paragraphs:f.turn.paragraphs.map((p:any)=>({...p,text:'Nothing remains.'}))});});assert.equal(await reader().count(),0);await page.evaluate(()=>(window as any).oldDocumentButton.click());assert.equal(await page.evaluate(()=>(window as any).documentsFixture.stage.panelMount.dataset.vnDocumentOpen),undefined,'detached document actions cannot reopen a stale scope');
 await page.evaluate(()=>(window as any).documentsFixture.loadLong());await page.locator('[data-vn-continue]').click();await page.getByRole('button',{name:'Scene references',exact:true}).click();await page.getByRole('button',{name:'journal',exact:true}).click();await page.getByRole('button',{name:'Read revealed text',exact:true}).click();
 const long=page.getByRole('dialog',{name:'Read journal',exact:true}),body=long.locator('[data-document-body]');
 assert.equal(await body.evaluate(e=>e.scrollHeight>e.clientHeight),true,'long documents scroll inside the viewer');await body.evaluate(e=>e.scrollTop=e.scrollHeight);
 const closeLong=long.getByRole('button',{name:'Close document',exact:true});assert.equal(await closeLong.isVisible(),true);
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await long.getByRole('button',{name:'Copy revealed text',exact:true}).click();
 await page.waitForFunction(()=>navigator.clipboard.readText().then(t=>t.startsWith('Entry 1:')));assert.equal(await long.locator('[role=status]').innerText(),'Copied.');
 await page.keyboard.press('Tab');assert.equal(await long.getByRole('button',{name:'Back to item',exact:true}).evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true,'focus wraps within the document');
 await page.evaluate(()=>{const f=(window as any).documentsFixture;f.stage.setTooltipPreferences({...f.prefs,categories:{...f.prefs.categories,objects:false}});});assert.equal(await long.count(),0);assert.equal(await page.evaluate(()=>(window as any).documentsFixture.stage.panelMount.dataset.vnDocumentOpen),undefined);
 assert.equal(await page.evaluate(()=>(window as any).documentsFixture.submissions),0);assert.equal(external,0);await page.close();
}console.log('Document literal text, reveal gates, navigation, source invalidation and themed mobile checks passed.');}finally{await browser.close();server.stop(true);}
