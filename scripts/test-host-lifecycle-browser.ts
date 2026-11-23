import { chromium } from "playwright";
import assert from "node:assert/strict";
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');
const browser=await chromium.launch({
  headless:true,
  ...(process.env.LUMIGLYPHICS_CHROME_PATH ? { executablePath: process.env.LUMIGLYPHICS_CHROME_PATH } : {}),
});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/images/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="20" height="30" fill="blue"/></svg>'}));
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(()=>Boolean((window as any).hostFixture));
  await page.evaluate(() => (window as any).hostFixture.mountNestedLightboxTrigger());
  const nestedArtwork = page.getByRole('button', { name: 'Open nested artwork' });
  await nestedArtwork.focus();
  await nestedArtwork.press('Enter');
  await page.keyboard.press('Escape');
  assert.equal(await nestedArtwork.evaluate(el => (el.getRootNode() as ShadowRoot).activeElement === el), true,
    'the body-mounted lightbox restores focus to the opener inside both shadow roots');
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.state(f.turn());f.open();f.state(f.turn());f.stage().advance();});
  // Advance through the actual stage controls; retain a local draft at a nonzero cursor.
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().restoreReplyDraft('Keep this unsent reply');});
  const revised=await page.evaluate(()=>{
    const f=(window as any).hostFixture,s=f.stage();
    f.receive({type:'vn_planning',chatId:'A'});
    f.receive({type:'vn_turn',turn:f.turn('A',1,{paragraphSpeakers:['Jo','Jo','Jo','Jo','Jo','Jo'],choices:[{id:'choice',label:'Ask Jo',value:'Ask Jo'}]})});
    return s.getState();
  });
  assert.equal(revised.currentParagraphIndex,1);assert.equal(revised.draft,'Keep this unsent reply');assert.notEqual(revised.phase,'planning');assert.equal(revised.paragraphs[1].speaker,'Jo');assert.equal(revised.choices[0].label,'Ask Jo');
  const staleLore = await page.evaluate(() => {
    const f=(window as any).hostFixture;
    const latest=f.sent.filter((m:any)=>m.type==='vn_story_dna'&&m.action==='list').at(-1);
    f.stage().previous();
    f.receive({type:'vn_story_dna',chatId:'A',requestId:latest.requestId,storyDna:{revision:99,locations:{},items:{}}});
    return {scope:latest.readingPosition, applied:f.loreApplications.some((v:any)=>v.revision===99)};
  });
  assert.equal(staleLore.scope.key.revision,1);
  assert.equal(staleLore.scope.paragraphIndex,1);
  assert.equal(staleLore.applied,false,'a delayed lore reply cannot restore a newer reveal after rewinding');
  await page.evaluate(()=>(window as any).hostFixture.stage().advance());
  const afterOptionalRevoke = await page.evaluate(()=>{
    const f=(window as any).hostFixture;
    const start=f.sent.length;
    f.revoke('image_gen');
    return {draft:f.stage().getState().draft,closed:f.sent.slice(start).some((m:any)=>m.type==='vn_view'&&m.open===false)};
  });
  assert.equal(afterOptionalRevoke.draft,'Keep this unsent reply');
  assert.equal(afterOptionalRevoke.closed,false,'revoking optional image access keeps the reader open');
  const stale=await page.evaluate(()=>{const f=(window as any).hostFixture;const old=f.sent.filter((m:any)=>m.type==='vn_get_state').at(-1).requestId;f.changeChat('B');f.state(f.turn('B'));const before=f.stage().getState();f.state(null,'A',old);return {before,after:f.stage().getState(),old};});
  assert.deepEqual(stale.after,stale.before,'late old-chat state cannot clear the active reader');
  const sameChat=await page.evaluate(()=>{const f=(window as any).hostFixture;const old=f.sent.filter((m:any)=>m.type==='vn_get_state').at(-1).requestId;f.changeChat('A');f.changeChat('B');f.state(f.turn('B'));const before=f.stage().getState();f.state(null,'B',old);return{before,after:f.stage().getState()};});
  assert.deepEqual(sameChat.after,sameChat.before,'A→B→A→B cannot revive an old state request');
  await page.evaluate(()=>{const f=(window as any).hostFixture;const view=f.turn('B');f.receive({type:'vn_turn',turn:{...view,assets:[{jobId:'job',cueId:'cue',paragraphIndex:0,status:'generated',imageId:'old',imageUrl:'/api/v1/images/old'}]}});});
  await page.waitForFunction(()=>(window as any).hostFixture.sent.some((m:any)=>m.type==='vn_asset_ready'&&m.imageId==='old'));
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_asset',chatId:'B',messageId:'m',sourceFingerprint:'abcdef12345678',revision:0,swipeId:0,asset:{jobId:'job',cueId:'cue',paragraphIndex:0,status:'generated',imageId:'new',imageUrl:'/api/v1/images/new'}});});
  await page.waitForFunction(()=>(window as any).hostFixture.sent.some((m:any)=>m.type==='vn_asset_ready'&&m.imageId==='new'));
  assert.equal(await page.evaluate(()=>(window as any).hostFixture.sent.filter((m:any)=>m.type==='vn_asset_ready').length),2,'each decoded replacement gets its own acknowledgement');
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().toggleSkip(true);});
  await page.getByRole('button',{name:'Back to Lumiverse chat',exact:true}).click();
  const closed=await page.evaluate(()=>(window as any).hostFixture.stage().getState().currentParagraphIndex);await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>(window as any).hostFixture.stage().getState().currentParagraphIndex),closed,'closing stops Skip');
  // The external review uses the actual controller/window bridge with the reader closed.
  const preview={type:'vn_external_image_review',chatId:'B',requestId:'external-1',characterName:'Mira',record:{requestId:'review-1',jobId:'external-job',paragraphIndex:0,state:'review',prompt:'Mira in the cafe',negativePrompt:'blur',provider:'nanogpt',model:'test-model',connectionId:'images',parameters:{size:'1024x1024'},referenceSummary:'No image reference',createdAt:new Date().toISOString()}};
  await page.evaluate(preview=>{window.dispatchEvent(new CustomEvent('vn-scene-image-request-v1',{detail:{version:1,provider:'warp',chatId:'B',requestId:'external-1',characterName:'Mira',venue:'Cafe',timeOfDay:'evening',mood:'calm'}}));(window as any).hostFixture.receive(preview);},preview);
  const dialog=page.getByRole('dialog',{name:'Review picture · Mira'});assert.equal(await dialog.isVisible(),true,'review works while reader is closed');
  await dialog.getByLabel('Positive prompt',{exact:true}).fill('Edited Mira in the cafe');
  assert.equal(await dialog.getByLabel('Positive prompt',{exact:true}).evaluate(el=>(el.getRootNode() as ShadowRoot).activeElement===el),true,'prompt remains focusable for mobile editing');
  await page.evaluate(preview=>(window as any).hostFixture.receive(preview),preview);
  assert.equal(await dialog.getByLabel('Positive prompt',{exact:true}).inputValue(),'Edited Mira in the cafe','repeated preview preserves local edits');
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});const bounds=await dialog.boundingBox();assert.ok(bounds&&bounds.width<=width&&bounds.x>=0);}
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.cache/beta43-external-dark.png'});
  await page.evaluate(()=>{document.documentElement.style.cssText='--lumiverse-text:#18212e;--lumiverse-bg:#f6f7fa;--lumiverse-card-bg:#fff;--lumiverse-bg-elevated:#edf0f5;--lumiverse-border:#9da7b6;--lumiverse-primary:#5044a0;';});
  await page.screenshot({path:'.cache/beta43-external-light.png'});
  await dialog.getByRole('button',{name:'Generate this picture',exact:true}).click();
  const approval=await page.evaluate(()=>(window as any).hostFixture.sent.filter((m:any)=>m.type==='vn_external_image_review').at(-1));
  assert.equal(approval.edits.prompt,'Edited Mira in the cafe');assert.equal(approval.reviewRequestId,'review-1');
  await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_error',operation:'vn_external_image_review',chatId:'B',requestId:'external-1',error:'Unsupported size; edit parameters'});});
  assert.match(await dialog.locator('[data-status]').innerText(),/Unsupported size/);assert.equal(await dialog.getByRole('button',{name:'Generate this picture',exact:true}).isEnabled(),true);
  await dialog.getByRole('button',{name:'Cancel picture',exact:true}).click();assert.equal(await dialog.isVisible(),false);
  await page.evaluate(preview=>(window as any).hostFixture.receive(preview),preview);assert.equal(await dialog.isVisible(),false,'late cancelled previews cannot reopen');
  await page.evaluate(preview=>{window.dispatchEvent(new CustomEvent('vn-scene-image-request-v1',{detail:{version:1,provider:'warp',chatId:'B',requestId:'external-1',characterName:'Mira',venue:'Cafe',timeOfDay:'evening',mood:'calm'}}));(window as any).hostFixture.receive(preview);},preview);
  assert.equal(await dialog.isVisible(),true);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vn-scene-image-cancel-v1',{detail:{version:1,provider:'warp',chatId:'B',requestId:'external-1'}})));
  assert.equal(await dialog.isVisible(),false,'source-side cancellation closes the approval surface');
  await page.reload();
  await page.waitForFunction(()=>Boolean((window as any).hostFixture));
  const permissionEnd=await page.evaluate(()=>{
    const f=(window as any).hostFixture;
    f.state(f.turn());f.open();f.state(f.turn());
    const start=f.sent.length;
    f.revoke('chats');f.revoke('chats');
    const closures=f.sent.slice(start).filter((m:any)=>m.type==='vn_view'&&m.open===false).length;
    f.cleanup();
    return {closures,listeners:f.permissionListeners()};
  });
  assert.deepEqual(permissionEnd,{closures:1,listeners:0});
  assert.deepEqual(errors,[]);
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).hostFixture));
  const setPictures = (pictures: string[], draft = false) => page.evaluate(({ pictures, draft }) => {
    const f = (window as any).hostFixture;
    const view = f.turn('A', 0, {
      assets: pictures.map(id => ({ jobId: id, cueId: id, imageId: id, paragraphIndex: 0, status: 'browser_ready' })),
      ...(draft ? { imageRequests: [{
        requestId: 'draft-1', jobId: 'saved', state: 'review', paragraphIndex: 0, provider: 'nanogpt',
        prompt: 'Keep this accepted picture draft', negativePrompt: '', model: 'test-model',
        connectionId: 'images', parameters: {}, referenceSummary: '', createdAt: '2026-11-22',
        imagePromptMetadata: f.directorPromptMetadata(),
      }] } : {}),
    });
    if (!f.stage()) { f.state(view); f.open(); f.state(view); }
    else f.receive({ type: 'vn_turn', turn: view });
  }, { pictures, draft });
  const openDirector = async () => {
    await page.locator('[data-aperture-open]').click();
    await page.locator('[data-action="quick-director"]').click();
  };
  const director = page.getByRole('dialog', { name: 'Quick Director' });
  const preparations = () => page.evaluate(() => (window as any).hostFixture.sent.filter((m: any) => m.type === 'vn_prepare_image'));
  await setPictures([]);
  await openDirector();
  assert.match(await director.innerText(), /no saved picture/);
  assert.equal(await director.getByRole('button', { name: 'Open Artwork Studio' }).isVisible(), true);
  await page.keyboard.press('Escape');

  await setPictures(['saved', 'other']);
  await openDirector();
  assert.match(await director.innerText(), /more than one picture/);
  assert.equal(await director.getByRole('button', { name: 'Prepare revised prompt' }).isVisible(), false);
  await page.keyboard.press('Escape');

  await setPictures(['saved'], true);
  await openDirector();
  assert.equal(await director.getByRole('button', { name: 'Review existing draft' }).isVisible(), true);
  assert.equal((await preparations()).length, 0);
  await director.getByRole('button', { name: 'Review existing draft' }).click();
  const prompt = page.getByRole('textbox', { name: 'Positive prompt', exact: true });
  const disclosure = page.locator('[data-dialect-preview]');
  if (!await disclosure.isVisible()) await page.getByRole('tab', { name: /Words/ }).click();
  await disclosure.locator('summary').click();
  const format = disclosure.getByLabel('Prompt preview format');
  const previewText = disclosure.locator('[data-preview-format-text]');
  await previewText.evaluate((field: HTMLTextAreaElement) => new Promise<void>((resolve, reject) => {
    const deadline = performance.now() + 1500;
    const wait = () => {
      if (field.value.includes('Keep this accepted picture draft')) resolve();
      else if (performance.now() >= deadline) reject(new Error('Current prompt preview was not rendered'));
      else requestAnimationFrame(wait);
    };
    wait();
  }));
  await format.selectOption('ideogram-json');
  assert.equal(JSON.parse(await previewText.inputValue()).compositional_deconstruction.elements[0]?.text, 'OPEN');
  assert.equal(await prompt.inputValue(), 'Keep this accepted picture draft');
  assert.equal((await preparations()).length, 0);
  await page.getByRole('button', { name: 'Close workspace and return to reader' }).click();

  await setPictures(['saved']);
  await openDirector();
  await director.getByRole('button', { name: 'Close-up', exact: true }).click();
  assert.match(await director.getByRole('status').innerText(), /intimate close-up/);
  assert.equal((await preparations()).length, 0, 'selecting a direction is local');
  await setPictures(['replaced']);
  await director.getByRole('button', { name: 'Prepare revised prompt', exact: true }).click();
  assert.equal((await preparations()).length, 0, 'stale selection makes no prepare request');

  await openDirector();
  await director.getByRole('button', { name: 'Moonlit', exact: true }).click();
  await director.getByRole('button', { name: 'Prepare revised prompt', exact: true }).click();
  const [prepared] = await preparations();
  assert.equal(prepared?.jobId, 'replaced');
  assert.deepEqual(prepared.directorScope, { swipeId: 0, revision: 0, paragraphIndex: 0, imageId: 'replaced' });
  assert.equal(prepared.lockContinuity, true);
  assert.equal(prepared.quickGenerate, undefined);
  assert.equal(prepared.relight, true);
  const previewButton = page.getByRole('button', { name: 'View selected artwork fullscreen' });
  if (!await previewButton.isVisible()) await page.getByRole('tab', { name: /Hub/ }).click();
  await previewButton.press('Enter');
  await page.keyboard.press('Escape');
  assert.equal(await previewButton.evaluate(el => (el.getRootNode() as ShadowRoot).activeElement === el), true);

  assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Close workspace and return to reader' }).click();
  await page.evaluate(() => {
    const stage = (window as any).hostFixture.stage();
    stage.setStoryDna({
      version: 1, items: {},
      locations: Object.fromEntries(Array.from({ length: 31 }, (_, index) => {
        const id = 'place-' + index;
        return [id, { id, name: 'Place ' + index + ' with an unusually long location name',
          aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: index,
          ...(index % 2 ? { environmentDescription: 'Previously visited' } : { autoDiscovered: true }) }];
      })),
    });
  });
  await page.locator('[data-aperture-open]').click();
  await page.locator('[data-aperture-route="world"]').click();
  await page.locator('[data-world-hub-tab="atlas"]').click();
  const places = page.locator('[data-world-atlas-view] .map-node-pill');
  assert.equal(await places.count(), 31);
  const sizes = await places.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { y: rect.top, bottom: rect.bottom, height: rect.height, style: getComputedStyle(node).position };
  }));
  assert.ok(sizes.every((size, index) => size.style === 'static' && size.height >= 40
    && (!index || size.y >= sizes[index - 1]!.bottom)));
  await places.filter({ hasText: 'Place 1 with an unusually long location name' }).click();
  await page.getByRole('button', { name: /Inspect location/ }).click();
  await page.locator('[data-story-dna-drawer] summary').click();
  const editableNote = page.locator('[data-story-dna-studio] [data-dna-field="notes"]');
  await editableNote.fill('Keep this unsaved editor note');
  await page.getByRole('button', { name: 'Review autofill suggestions' }).click();
  const reviewRequest = await page.evaluate(() => (window as any).hostFixture.sent.filter((message: any) => message.action === 'review_autofill').at(-1));
  assert.equal(reviewRequest.readingPosition.paragraphIndex, 0);
  assert.equal(reviewRequest.targetId, 'place-1');
  await page.evaluate(request => (window as any).hostFixture.receive({
    type: 'vn_story_autofill', chatId: 'A', requestId: request.requestId, result: { proposal: {
      id: request.requestId, name: request.name, paragraphIndex: 0, evidence: ['Cedar chairs face the window.'],
      changes: [
        { field: 'environmentDescription', before: 'Previously visited', after: 'Cedar chairs face the window.' },
        { field: 'lighting', before: null, after: 'Warm lamp light' },
      ],
    } },
  }), reviewRequest);
  const review = page.locator('[data-story-autofill-review]');
  const applyFields = review.getByRole('button', { name: 'Apply selected fields' });
  assert.equal(await applyFields.isDisabled(), true);
  await review.locator('[data-autofill-field="lighting"]').check();
  await applyFields.click();
  const selection = await page.evaluate(() => (window as any).hostFixture.sent.filter((message: any) => message.action === 'apply_autofill').at(-1));
  assert.deepEqual(selection.fields, ['lighting']);
  await page.evaluate(request => (window as any).hostFixture.receive({
    type: 'vn_error', operation: 'vn_story_dna', chatId: 'A', requestId: request.requestId,
    error: 'A selected field changed since autofill ran.',
  }), selection);
  assert.match(await review.getByRole('status').innerText(), /A selected field changed/);
  assert.equal(await review.locator('[data-autofill-field="lighting"]').isChecked(), true);
  await applyFields.click();
  await page.evaluate(() => {
    const f = (window as any).hostFixture;
    const request = f.sent.filter((message: any) => message.action === 'apply_autofill').at(-1);
    f.receive({ type: 'vn_story_autofill', chatId: 'A', requestId: request.requestId, result: { saved: true } });
  });
  assert.equal(await review.isVisible(), false);
  assert.equal(await editableNote.inputValue(), 'Keep this unsaved editor note');
  assert.equal(await page.locator('[data-story-dna-studio] [data-dna-field="lighting"]').inputValue(), 'Warm lamp light');
  assert.deepEqual(errors, []);
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).hostFixture));
  await page.evaluate(() => {
    const f = (window as any).hostFixture;
    const view = f.turn('A', 0, { choices: [
      { id: 'take', label: 'Walk carefully to the end of the long moonlit hallway and examine the door', value: 'I examine the door.', source: 'authored' },
      { id: 'generated', label: 'Open the window', value: 'I open the window.', source: 'generated' },
      { id: 'locked', label: 'Unlock the cabinet', value: 'I unlock the cabinet.', source: 'authored', disabled: true },
    ] });
    f.state(view); f.open(); f.state(view);
    const stage = f.stage();
    stage.dismissChapterCard();
    for (let index = 0; index < 8 && stage.getState().phase !== 'awaiting-input'; index++) stage.advance();
  });
  const choices = page.locator('[data-vn-choice]');
  assert.equal(await choices.count(), 0, 'default Standard does not render CYOA controls');
  const setMode = (mode: string, generateChoices: boolean) => page.evaluate(({ mode, generateChoices }) => {
    const f = (window as any).hostFixture;
    f.receive({ type: 'vn_config', config: { ...f.config, mode, generateChoices } });
  }, { mode, generateChoices });
  await setMode('cyoa', false);
  assert.equal(await choices.count(), 2, 'generation off retains authored choices only');
  const locked = choices.filter({ hasText: 'Unlock the cabinet' });
  assert.equal(await locked.isDisabled(), true);
  assert.match(await locked.innerText(), /Requirements are unmet/);
  await setMode('cyoa', true);
  assert.equal(await choices.count(), 3);
  await setMode('standard', true);
  assert.equal(await choices.count(), 0);
  await setMode('cyoa', false);

  const take = choices.filter({ hasText: 'Walk carefully' });
  await take.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  assert.equal(await page.locator('[data-vn-interaction-hint]').isVisible(), true);
  assert.match(await page.locator('[data-vn-interaction-hint]').innerText(), /Saving your choice/);
  const outgoingChoices = () => page.evaluate(() => (window as any).hostFixture.sent.filter((message: any) => message.choiceScope));
  const [firstChoice] = await outgoingChoices();
  assert.equal((await outgoingChoices()).length, 1);
  assert.equal(firstChoice.choiceScope.choiceId, 'take');
  await page.evaluate(requestId => (window as any).hostFixture.receive({
    type: 'vn_error', chatId: 'A', requestId, operation: 'vn_choice_submit', error: 'Could not append. Try again.',
  }), firstChoice.requestId);
  assert.equal(await take.isEnabled(), true);
  await take.click();
  const [, retry] = await outgoingChoices();
  assert.ok(retry && retry.requestId !== firstChoice.requestId);
  const switched = await page.evaluate(() => {
    const f = (window as any).hostFixture;
    f.receive({ type: 'vn_turn', turn: f.turn('A', 1, { swipeId: 1, sourceFingerprint: 'swiperchanged' }) });
    return f.stage().getState().isUserTurn;
  });
  assert.equal(switched, false);
  await page.evaluate(requestId => (window as any).hostFixture.receive({ type: 'vn_choice_saved', chatId: 'A', requestId }), retry.requestId);
  assert.equal(await page.evaluate(() => (window as any).hostFixture.stage().getState().isUserTurn), false, 'stale acknowledgement cannot append a local paragraph');
  assert.deepEqual(errors, []);
  console.log('Real host controller: revised presentation/draft/cursor, stale chats/state attempts, replacement acknowledgements, close suspension, Director picture ownership, the 31-place Atlas, selected-field autofill, and opt-in CYOA passed.');
}finally{await browser.close();await server.stop();}
