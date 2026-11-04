import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');const browser=await chromium.launch({headless:true});
try{for(const width of [390,1280]){
 const p=await browser.newPage({viewport:{width,height:844}});const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/v1/images/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"/>'}));
 await p.goto(`http://127.0.0.1:${server.port}/`);
 await p.evaluate(()=>{const f=(window as any).hostFixture;f.state(f.turn());f.open();f.state(f.turn('A',0,{paragraphs:['Ann speaks.','Joanne arrives.'],subjectCandidates:['Ann','Joanne'],assets:[{jobId:'jo',cueId:'jo',paragraphIndex:1,status:'generated',imageId:'jo',stageAsset:{character:'Joanne',role:'portrait',sceneId:'s'}}]}));f.stage().dismissChapterCard();f.stage().workspace.open('character');});
 const names=p.locator('.folio-roster-name');assert.deepEqual(await names.allTextContents(),['Ann'],'initial Cast does not expose unread names');
 await p.evaluate(()=>{const s=(window as any).hostFixture.stage();s.workspace.close();s.advance();s.workspace.open('character');});
 assert.deepEqual(await names.allTextContents(),['Ann','Joanne']);
 await p.evaluate(()=>{const s=(window as any).hostFixture.stage();s.workspace.close();s.previous();s.workspace.open('character');});
 assert.deepEqual(await names.allTextContents(),['Ann'],'rewind removes derived later character and media');
 await p.evaluate(()=>{const f=(window as any).hostFixture;f.stage().workspace.close();f.changeChat('B');f.state(f.turn('B'));f.stage().workspace.open('character');});
 assert.equal(await names.count(),0,'chat switch clears derived Cast');assert.deepEqual(errors,[]);await p.close();
}console.log('Folio reveal: initial names, advance, rewind and chat isolation passed at390/1280.');}finally{await browser.close();await server.stop();}
