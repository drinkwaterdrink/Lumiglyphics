import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/host-lifecycle-fixture.ts');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/v1/images/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"/>'}));
 await page.goto(`http://127.0.0.1:${server.port}/`);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.state(f.turn());f.open();f.state(f.turn('A',0,{assets:[{jobId:'same',cueId:'same',paragraphIndex:1,status:'generated',imageId:'old'}]}));f.stage().cgGallery.open();});
 assert.equal(await page.locator('.cg-card').count(),0);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().cgGallery.close();f.stage().advance();f.stage().cgGallery.open();});
 assert.equal(await page.locator('.cg-card').count(),1);
 await page.locator('.cg-card').click();
 assert.match(await page.locator('[data-cg-lightbox-img]').getAttribute('src')??'',/images\/old$/);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.receive({type:'vn_asset',chatId:'A',messageId:'m',swipeId:0,revision:0,sourceFingerprint:'abcdef12345678',asset:{jobId:'same',cueId:'same',paragraphIndex:1,status:'generated',imageId:'new'}});});
 assert.equal(await page.locator('.cg-card').count(),1);
 assert.match(await page.locator('.cg-card img').getAttribute('src')??'',/images\/new$/);
 await page.evaluate(()=>{const f=(window as any).hostFixture;f.stage().cgGallery.close();f.changeChat('B');f.state(f.turn('B'));f.stage().cgGallery.open();});
 assert.equal(await page.locator('.cg-card').count(),0);
 console.log('CG Gallery: revealed-only cards, canonical ID-only images, replacement refresh and chat isolation passed.');
}finally{await browser.close();await server.stop();}
