// Browser plugin not available; use the project's Playwright fixture harness.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
console.log('Building browser fixtures');
const bundles=new Map<string,string>();
mkdirSync('.cache/model-prompt-research',{recursive:true});
for(const [name,path] of [['settings','scripts/settings-browser-fixture.ts'],['review','scripts/image-review-browser-fixture.ts']]){
 const output=`.cache/model-prompt-research/${name}-fixture.js`;
 execFileSync('bun',['build',path!,'--target','browser','--outfile',output],{windowsHide:true});bundles.set(name!,readFileSync(output,'utf8'));
}
const server=createServer((req,res)=>{
 const pathname=new URL(req.url??'/', 'http://localhost').pathname,name=pathname.includes('settings')?'settings':'review';
 res.setHeader('Content-Type',pathname.endsWith('.js')?'application/javascript':'text/html');
 res.end(pathname.endsWith('.js')?bundles.get(name):`<html><head><title>Model prompt QA</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/${name}.js"></script></body></html>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=(server.address() as {port:number}).port;
console.log('Launching Chromium');
const browser=await chromium.launch({headless:true,timeout:20000});
console.log('Chromium launched');
try{
 await mkdir('.cache/model-prompt-research',{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message);});
 console.log('Opening settings');
 await page.goto(`http://127.0.0.1:${port}/settings`);
 const settings=page.locator('[data-vn-settings]');
 await settings.locator('[data-home-categories] [data-page-link="pictures"]').click();
 assert.equal(await settings.locator('[name="automaticImagePromptSettings"]').isChecked(),true);
 assert.equal(await settings.locator('[name="imagePromptBudget"]').isVisible(),false);
 await settings.locator('[name="imagePromptBudgetOverride"]').check();
 await settings.locator('[name="imagePromptBudget"]').fill('8000');await settings.locator('[name="imagePromptBudget"]').press('Tab');
 assert.equal(await page.evaluate(()=>(window as any).settingsFixture.config.imagePromptBudget),8000);
 await page.evaluate(()=>{const f=(window as any).settingsFixture;f.config={...f.config,imageConnectionId:'nano'};f.panel.setConfig(f.config);f.panel.setConnectionCatalog('image',{status:'ready',options:[{id:'nano',name:'Nano',provider:'nanogpt',model:'z-image-turbo',isDefault:true}]});});
 assert.match(await settings.locator('[data-prompt-profile-status]').innerText(),/1,200.*capped by provider/);
 await page.screenshot({path:'.cache/model-prompt-research/settings-mobile.png',fullPage:true});
 await settings.locator('[name="imagePromptBudgetOverride"]').uncheck();
 assert.equal(await settings.locator('[name="imagePromptBudget"]').isVisible(),false);
 await page.goto(`http://127.0.0.1:${port}/review`);
 const studio=page.locator('[data-image-studio]');await studio.locator('[data-launch]').click();
 const profile={version:1,family:'generic',maxCharacters:6000,source:'manual',manualBudget:6000,format:'description',negativeMode:'supported-or-unknown',guidance:'Preserve evidence.'};
 await page.evaluate(profile=>{const f=(window as any).imageFixture;f.turn.imageRequests[0].promptProfile=profile;f.studio.setTurn(f.turn);},profile);
 await studio.getByLabel('Positive prompt',{exact:true}).fill('x'.repeat(5000));
 assert.match(await studio.locator('[data-combined-count]').innerText(),/5,006 \/ 6,000/);
 assert.equal(await studio.locator('[data-generate]').isDisabled(),false);
 await studio.getByLabel('Positive prompt',{exact:true}).fill('x'.repeat(6000));
 assert.equal(await studio.locator('[data-generate]').isDisabled(),true);
 assert.match(await studio.locator('[data-combined-count]').innerText(),/blocked draft/);
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});
  await studio.locator('[data-combined-count]').scrollIntoViewIfNeeded();
  const box=await studio.locator('section').boundingBox();assert.ok(box&&box.width<=width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'.cache/model-prompt-research/review-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Model prompt browser QA passed: budget persistence, provider cap, frozen review counts, blocked drafts and responsive layout.');
}finally{await browser.close();server.close();}
