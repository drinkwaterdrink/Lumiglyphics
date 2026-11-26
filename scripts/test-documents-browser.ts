import {THEME_PRESET_IDS} from '../src/config.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const build=await Bun.build({entrypoints:['scripts/documents-browser-fixture.ts'],target:'browser'});assert.ok(build.success);const bundle=await build.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:r=>new URL(r.url).pathname==='/fixture.js'?new Response(bundle,{headers:{'Content-Type':'application/javascript'}}):new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})});
await mkdir('.cache/documents',{recursive:true});const browser=await chromium.launch({headless:true});
try{for(const viewport of [{width:360,height:800},{width:844,height:390}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(5000);let external=0;page.on('request',r=>{if(!r.url().startsWith(`http://127.0.0.1:${server.port}`))external++;});
 await page.goto(`http://127.0.0.1:${server.port}/`);
 const anchor=()=>page.getByRole('button',{name:'About sealed letter',exact:true});
 const openLetter=async()=>{
  await anchor().click();
  await page.getByRole('dialog',{name:'sealed letter quick summary',exact:true}).getByRole('button',{name:/Inspect \/ Read Document/}).click();
 };
 const card=page.getByRole('dialog',{name:'About sealed letter',exact:true});
 const reader=()=>page.getByRole('dialog',{name:'Read Sealed Letter',exact:true});
 const readFromItem=card.getByRole('button',{name:/Read revealed text/});
 const back=page.getByRole('button',{name:'Go back to previous screen',exact:true});
 const openDocumentDirectory=async()=>{
  await page.getByRole('button',{name:'World Lens',exact:true}).click();
  const lens=page.getByRole('dialog',{name:'World Lens',exact:true});
  await lens.getByRole('button',{name:/Documents/}).click();
  return lens;
 };
 await openLetter();
 assert.match(await reader().innerText(),/No verbatim text transcribed yet/);
 assert.doesNotMatch(await reader().innerText(),/Meet me at dawn|blue key/);
 assert.equal(await reader().getByRole('button',{name:'Copy revealed text',exact:true}).count(),0);
 await page.locator('[data-workspace-close]').click();await page.locator('[data-vn-continue]').click();
 await openLetter();
 assert.match(await reader().innerText(),/Meet me at dawn/);assert.doesNotMatch(await reader().innerText(),/blue key/);
 assert.equal(await reader().locator('[data-document-body]').evaluate(e=>getComputedStyle(e).userSelect),'text');
 const progress=await page.locator('[data-vn-progress]').innerText();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-vn-progress]').innerText(),progress);
 await back.click();assert.equal(await card.isVisible(),true);
 await page.locator('[data-workspace-close]').click();assert.equal(await anchor().evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true);
 await page.locator('[data-vn-continue]').click();await openLetter();
 assert.match(await reader().innerText(),/blue key/);assert.equal(await reader().locator('img,script').count(),0);assert.equal(await page.evaluate(()=>(window as any).hacked),undefined);
 await page.locator('[data-workspace-close]').click();await page.getByRole('button',{name:'Previous paragraph',exact:true}).click();
 const lens=await openDocumentDirectory();
 await lens.getByLabel('Search references').fill('letter');await lens.getByRole('button',{name:'Sealed Letter',exact:true}).click();
 assert.doesNotMatch(await reader().innerText(),/blue key/);await back.click();assert.equal(await lens.getByLabel('Search references').inputValue(),'letter');await page.keyboard.press('Escape');
 for(const theme of THEME_PRESET_IDS){
  await page.evaluate(theme=>(window as any).documentsFixture.stage.setThemePreset(theme),theme);
  await openLetter();
  const contrast=await reader().locator('[data-document-transcript] p').first().evaluate(passage=>{
   const canvas=document.createElement('canvas');
   canvas.width=canvas.height=1;
   const context=canvas.getContext('2d')!;
   const luminance=(color:string)=>{
    // Chrome serializes color-mix() gradient stops as color(srgb …).
    // Let the browser normalize both those stops and rgb() to sRGB bytes.
    context.clearRect(0,0,1,1);
    context.fillStyle=color;
    context.fillRect(0,0,1,1);
    const [r,g,b,a]=context.getImageData(0,0,1,1).data;
    if(a!==255)throw new Error(`Expected opaque letter palette color, received ${color}`);
    const linear=(channel:number)=>{const x=channel/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
    return .2126*linear(r!)+.7152*linear(g!)+.0722*linear(b!);
   };
   const body=getComputedStyle(passage.closest('[data-document-body]')!);
   const stops=body.backgroundImage.match(/(?:color|rgba?)\([^)]*\)/g)??[body.backgroundColor];
   const text=luminance(getComputedStyle(passage).color);
   return Math.min(...stops.map(stop=>{const bg=luminance(stop);return (Math.max(text,bg)+.05)/(Math.min(text,bg)+.05);}));
  });assert.ok(contrast>=4.5,`${theme} document text contrast ${contrast}`);
  const bounds=await reader().boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1);
  for(const button of [back,page.locator('[data-workspace-close]'),reader().getByRole('button',{name:'Copy revealed text',exact:true})]){
   await button.scrollIntoViewIfNeeded();
   const name=await button.getAttribute('aria-label'),box=await button.boundingBox();
   assert.ok(box&&box.width>=43.99&&box.height>=43.99,`${name} has a 44px target`);
   assert.equal(await button.evaluate(e=>{const r=e.getBoundingClientRect();return (e.getRootNode() as ShadowRoot).elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;}),true,`${name} unobstructed`);
  }
  await page.screenshot({path:`.cache/documents/${theme}-${viewport.width}.png`});await page.locator('[data-workspace-close]').click();
 }
 await openLetter();await back.click();await readFromItem.evaluate(e=>(window as any).oldDocumentButton=e);await readFromItem.click();await page.evaluate(()=>{const f=(window as any).documentsFixture;f.stage.loadTurn({...f.turn,paragraphs:f.turn.paragraphs.map((p:any)=>({...p,text:'Nothing remains.'}))});});assert.equal(await reader().count(),0);await page.evaluate(()=>(window as any).oldDocumentButton.click());assert.equal(await page.evaluate(()=>(window as any).documentsFixture.stage.panelMount.dataset.vnDocumentOpen),undefined,'detached document actions cannot reopen a stale scope');
 await page.evaluate(()=>(window as any).documentsFixture.loadLong());await page.locator('[data-vn-continue]').click();await openDocumentDirectory();await lens.getByLabel('Search references').fill('');await lens.getByRole('button',{name:'Journal',exact:true}).click();
 const long=page.getByRole('dialog',{name:'Read Journal',exact:true}),body=long.locator('[data-document-body]');
 assert.equal(await body.evaluate(e=>e.scrollHeight>e.clientHeight),true,'long documents scroll inside the viewer');await body.evaluate(e=>e.scrollTop=e.scrollHeight);
 const closeLong=page.locator('[data-workspace-close]');assert.equal(await closeLong.isVisible(),true);
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await long.getByRole('button',{name:'Copy revealed text',exact:true}).click();
 await page.waitForFunction(()=>navigator.clipboard.readText().then(t=>t.startsWith('Entry 1:')));assert.equal(await long.locator('[role=status]').innerText(),'Copied.');
 const last=long.locator('footer button:visible').last();
 await last.focus();await page.keyboard.press('Tab');const first=viewport.width<=760?back:page.locator('[data-vn-root]');assert.equal(await first.evaluate(e=>(e.getRootNode() as ShadowRoot).activeElement===e),true,'focus wraps within the full accessible reader workspace');
 await page.evaluate(()=>{const f=(window as any).documentsFixture;f.stage.setTooltipPreferences({...f.prefs,categories:{...f.prefs.categories,objects:false}});});assert.equal(await long.count(),0);assert.equal(await page.evaluate(()=>(window as any).documentsFixture.stage.panelMount.dataset.vnDocumentOpen),undefined);
 assert.equal(await page.evaluate(()=>(window as any).documentsFixture.submissions),0);assert.equal(external,0);await page.close();
}console.log('Document literal text, reveal gates, navigation, source invalidation and themed mobile checks passed.');}finally{await browser.close();server.stop(true);}
