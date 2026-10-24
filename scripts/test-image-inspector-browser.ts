import {chromium} from 'playwright';
import assert from 'node:assert/strict';

// Browser plugin not available. Use the repository's Playwright fixture workflow.
// Flow: reader → inspector → select/edit/rewrite/recover a picture → approval remains explicit.
import {execFileSync} from 'node:child_process';import {readFileSync,mkdirSync} from 'node:fs';import {createServer} from 'node:http';
mkdirSync('.cache/image-retry-queue',{recursive:true});execFileSync('bun',['build','scripts/image-inspector-browser-fixture.ts','--target','browser','--outfile','.cache/image-retry-queue/inspector.js'],{windowsHide:true});
const bundle=readFileSync('.cache/image-retry-queue/inspector.js','utf8');
const server=createServer((req,res)=>{const js=(req.url??'').endsWith('.js');res.setHeader('Content-Type',js?'application/javascript':'text/html');res.end(js?bundle:'<html><head><title>Image inspector QA</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>');});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`http://127.0.0.1:${port}`);assert.equal(await page.title(),'Image inspector QA');
  const studio=page.locator('[data-image-studio]'),section=studio.locator('section');
  await page.locator('[data-vn-navigation] [data-reader-destination="artwork"]').click();
  assert.equal(await section.getAttribute('data-state'),'held');
  assert.equal(await studio.locator('[data-studio-footer] button:visible').count(),1);
  assert.equal(await studio.getByRole('button',{name:'Generate picture',exact:true}).isEnabled(),true);
  assert.match(await studio.locator('[data-scene]').innerText(),/quiet library/);
  assert.deepEqual(await page.evaluate(()=>(window as any).imageFixture.actions),[],'opening and browsing cause no paid calls');
  const positive=studio.getByLabel('Positive prompt',{exact:true});
  await positive.tap();assert.equal(await positive.evaluate(el=>(el.getRootNode() as ShadowRoot).activeElement===el),true);
  await positive.fill('x'.repeat(3001));assert.equal(await studio.locator('[data-generate]').isDisabled(),true);
  assert.equal(await studio.locator('[data-validation]').isVisible(),true);await positive.fill('A revised portrait');
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);for(let i=1;i<3;i++){t.paragraphs.push(`Scene ${i+1}`);t.assets.push({...t.assets[0],jobId:`job-${i}`,paragraphIndex:i});t.imageRequests.push({...t.imageRequests[0],requestId:`request-${i}`,jobId:`job-${i}`,paragraphIndex:i});}f.studio.setTurn(t);f.multi=t;});
  await studio.getByRole('button',{name:'Picture 2, paragraph 2',exact:true}).click();await positive.fill('Picture two draft');
  await studio.getByRole('button',{name:'Picture 1, paragraph 1',exact:true}).click();assert.equal(await positive.inputValue(),'A revised portrait');
  await studio.getByRole('button',{name:'Picture 2, paragraph 2',exact:true}).click();assert.equal(await positive.inputValue(),'Picture two draft');
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.multi);t.assets.push({...t.assets[0],jobId:'four',paragraphIndex:0});t.imageRequests.push({...t.imageRequests[0],requestId:'four',jobId:'four'});f.studio.setTurn(t);});
  assert.equal(await studio.getByLabel('Picture',{exact:true}).isVisible(),true,'four pictures use compact accessible selector');
  assert.equal(await studio.locator('[data-picture-strip]').isVisible(),false);
  await studio.locator('[data-prompt-actions] summary').click();
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.multi);t.imageRequests[1].imagePromptMetadata={...f.metadata,brief:{...f.metadata.brief,action:'Picture two draft'}};f.studio.setTurn(t);});
  await studio.getByRole('button',{name:'Rewrite prompt',exact:true}).click();
  assert.equal((await page.evaluate(()=>(window as any).imageFixture.actions.at(-1))).type,'vn_regenerate_image_prompt');
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.multi);t.imageRequests.push({...t.imageRequests[1],requestId:'rewritten',prompt:'New wording'});f.studio.setTurn(t);});
  assert.equal(await positive.inputValue(),'New wording');
  const revision=studio.locator('[data-rewrite-changed]');
  assert.equal(await revision.isVisible(),true);
  assert.match(await revision.locator('[data-revision-scene]').innerText(),/Review action.*may have been paraphrased/);
  assert.match(await revision.locator('[data-revision-fields]').innerText(),/Positive: 17 → 11/);
  const comparisonCount=await page.evaluate(()=>(window as any).imageFixture.actions.length);
  await revision.locator('summary').click();
  const previousPositive=studio.getByLabel('Previous positive prompt',{exact:true});
  assert.equal(await previousPositive.inputValue(),'Picture two draft');
  assert.match(await revision.locator('[data-previous-scene]').innerText(),/Previous action: Picture two draft/);
  assert.equal(await previousPositive.getAttribute('readonly'),'');
  await positive.fill('Local edit');
  assert.match(await revision.locator('[data-revision-fields]').innerText(),/Positive: 17 → 10/);
  assert.equal(await previousPositive.inputValue(),'Picture two draft','baseline stays fixed while editing');
  await positive.fill('Picture two draft with additional detail');
  assert.equal(await revision.locator('[data-revision-scene]').isVisible(),false,'exact wording comparison updates during local edits');
  await positive.fill('Local edit');
  for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});
    assert.equal(await previousPositive.evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true,'comparison stays within viewport');
  }
  assert.equal(await page.evaluate(()=>(window as any).imageFixture.actions.length),comparisonCount,'comparison and edits stay local');
  await studio.locator('[data-parameters]').evaluate((element:HTMLTextAreaElement)=>{element.value='{"seed":99}';element.dispatchEvent(new Event('input'));});
  await studio.getByRole('button',{name:'Restore previous wording',exact:true}).click();assert.equal(await positive.inputValue(),'Picture two draft');
  assert.equal(await studio.locator('[data-parameters]').inputValue(),'{"seed":99}','wording restore preserves current parameters');
  assert.equal(await revision.isVisible(),false);
  const count=await page.evaluate(()=>(window as any).imageFixture.actions.length);
  for(const [status,expected,primary] of [['failed','failed','Retry picture'],['cancelled','cancelled','Retry picture'],['generated','completed','Regenerate picture'],['generating','generating',null]] as const){
    await page.evaluate(status=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets[0].status=status;t.imageRequests[0].state='approved';f.studio.setTurn(t);},status);
    assert.equal(await section.getAttribute('data-state'),expected);
    assert.equal(await studio.locator('[data-studio-footer] button:visible').count(),primary?1:0);
    if(primary)assert.equal(await studio.getByRole('button',{name:primary,exact:true}).isVisible(),true);
  }
  assert.equal(await page.evaluate(()=>(window as any).imageFixture.actions.length),count,'state browsing starts no requests');
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets[0].status='failed';t.imageRequests[0].state='approved';f.studio.setTurn(t);});
  await positive.fill('x'.repeat(3001));assert.equal(await studio.locator('[data-retry-image]').isDisabled(),true);
  assert.equal((await positive.inputValue()).length,3001,'oversize paste remains intact');
  await positive.fill('An edited failed portrait');await studio.getByRole('button',{name:'Edit before retry',exact:true}).click();
  const editedRetry=await page.evaluate(()=>(window as any).imageFixture.actions.at(-1));
  assert.equal(editedRetry.type,'vn_prepare_image');assert.equal(editedRetry.edits.prompt,'An edited failed portrait');
  await page.evaluate(()=>(window as any).imageFixture.studio.showError('Fixture preparation complete'));
  const recoveryCount=await page.evaluate(()=>(window as any).imageFixture.actions.length);
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets[0].source='cache';t.assets[0].status='generated';t.imageRequests=[];f.studio.setTurn(t);});
  assert.equal(await section.getAttribute('data-state'),'reused');assert.equal(await studio.locator('[data-prompt-editor]').isVisible(),false);
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets[0].status='generated';t.imageRequests=[];f.studio.setTurn(t);});
  assert.equal(await section.getAttribute('data-state'),'historical');
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets=[];t.imageRequests=[];f.empty=t;f.studio.setTurn(t);});
  assert.equal(await section.getAttribute('data-state'),'empty');assert.doesNotMatch(await section.innerText(),/original request is unavailable/);
  assert.equal(await studio.locator('[data-studio-footer]').isVisible(),false);
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setConfig({...f.config,maxImagesPerTurn:0});});
  assert.equal(await section.getAttribute('data-state'),'zero-budget');
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setPlanning('chat',true);});
  assert.equal(await section.getAttribute('data-state'),'planning');assert.equal(await studio.locator('[data-prompt-editor]').isVisible(),false);
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setTurn(structuredClone(f.turn));});
  assert.equal(await section.getAttribute('data-state'),'planning','same-chat prior picture updates cannot finish current reply planning');
  assert.equal(await page.evaluate(()=>(window as any).imageFixture.actions.length),recoveryCount,'all state browsing and restore remain local');
  await page.screenshot({path:'.cache/image-inspector-planning-mobile.png'});
  await page.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setPlanning('chat',false);f.studio.setTurn(structuredClone(f.turn));});
  for(const viewport of [{width:320,height:720},{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    const exit=await page.getByRole('button',{name:'Back to chat',exact:true}).boundingBox(),close=await page.locator('[data-workspace-close]').boundingBox(),panel=await section.boundingBox();
    assert.ok(exit&&close&&(close.y>=exit.y+exit.height||close.x>=exit.x+exit.width),'workspace close clears Back to chat');assert.ok(panel&&panel.width<=viewport.width&&panel.x>=0,'panel stays in viewport');
    assert.equal(await page.locator('[data-workspace-close]').evaluate(el=>el.getBoundingClientRect().height>=44),true);
    await page.screenshot({path:`.cache/image-inspector-${viewport.width}.png`});
  }
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets=Array.from({length:4},(_,i)=>({...t.assets[0],jobId:`cast-${i}`,cueId:`cast-${i}`,paragraphIndex:0,stageAsset:{role:i===0?'background':'portrait',sceneId:'same',...(i>0?{character:i===1?'Mira':'Rin'}:{})}}));t.imageRequests=t.assets.map((a:any,i:number)=>({...t.imageRequests[0],jobId:a.jobId,requestId:`cast-request-${i}`}));f.studio.setTurn(t);});
  const options=await studio.getByLabel('Picture',{exact:true}).locator('option').allTextContents();
  assert.match(options[0]!,/Background/);assert.match(options[1]!,/Portrait.*Mira/);
  await studio.getByLabel('Picture',{exact:true}).selectOption('cast-1');assert.match(await studio.locator('[data-paragraph]').innerText(),/Portrait.*Paragraph 1/);
  await page.locator('[data-workspace-close]').click();
  await page.evaluate(()=>{const f=(window as any).imageFixture;const t=structuredClone(f.turn);t.assets[0].status='failed';t.assets[0].error='No usable appearance was resolved for "Made in Abyss RPG".';t.imageRequests=[];t.cardRoleAvailable=true;t.cardRole='auto';f.studio.setTurn(t);});
  const beforeRecovery=await page.evaluate(()=>(window as any).imageFixture.actions.length);
  await page.locator('[data-vn-navigation] [data-reader-destination="artwork"]').click();
  assert.equal(await studio.locator('[data-card-role]').getAttribute('open'),'');
  assert.equal(await studio.getByLabel('Card role',{exact:true}).isVisible(),true);
  assert.equal(await page.evaluate(()=>(window as any).imageFixture.actions.length),beforeRecovery,'opening subject recovery is local');
  assert.deepEqual(errors,[],'no runtime errors or framework overlays');
  console.log('Image inspector browser checks passed (planning, empty, budget, held, draft switching, rewrite restore, terminal states, mobile focus and responsive bounds).');
}finally{await browser.close();server.close();}
