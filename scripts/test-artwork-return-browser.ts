import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');const browser=await chromium.launch({headless:true});
try{for(const width of [390,1280]){const p=await browser.newPage({viewport:{width,height:844}});await p.goto(`http://127.0.0.1:${server.port}/`);await p.evaluate(()=>{const f=(window as any).hostFixture;f.state(f.turn());f.open();f.state(f.turn());f.stage().dismissChapterCard();f.stage().advance();f.stage().restoreReplyDraft('Unsent reader reply');});
 await p.getByRole('button',{name:'Open Art Studio',exact:true}).click();await p.locator('[data-workspace-close]').click();
 let state=await p.evaluate(()=>(window as any).hostFixture.stage().getState());assert.equal(state.currentParagraphIndex,1);assert.equal(state.draft,'Unsent reader reply');
 for(const change of ['swipe','source','chat']){
 await p.getByRole('button',{name:'Open Art Studio',exact:true}).click();
 await p.evaluate(change=>{const f=(window as any).hostFixture;if(change==='chat'){f.changeChat('B');f.state(f.turn('B'));}else f.receive({type:'vn_turn',turn:f.turn('A',0,{...(change==='swipe'?{swipeId:1}:{sourceFingerprint:'edited-fingerprint'}),paragraphs:['Replacement opening','Replacement next']})});},change);
 const before=await p.evaluate(()=>(window as any).hostFixture.stage().getState());
 await p.evaluate(()=>(window as any).hostFixture.stage().workspace.close());
 const after=await p.evaluate(()=>(window as any).hostFixture.stage().getState());assert.equal(after.currentParagraphIndex,before.currentParagraphIndex);assert.equal(after.paragraphs[0].text,before.paragraphs[0].text);assert.equal(after.draft,before.draft,'close cannot restore another source draft');
 }await p.close();}console.log('Artwork return: same-passage/draft close and stale swipe/source/chat safety passed at390/1280.');}finally{await browser.close();await server.stop();}
