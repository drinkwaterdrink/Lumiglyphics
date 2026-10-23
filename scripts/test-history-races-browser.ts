import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/image-library-browser-fixture.ts');
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`http://127.0.0.1:${server.port}`);
 await page.clock.install();
 const library=page.locator('[data-image-library]');
 await library.getByRole('button',{name:'Open image library',exact:true}).click();
 await library.getByText('Filters',{exact:true}).click();
 const query=library.getByLabel('Template name contains');
 await query.fill('Manga');
 // The previous page returns during the debounce window.
 await page.evaluate(()=>{const f=(window as any).imageLibraryFixture;f.library.receive('chat',f.actions.at(-1).requestId,f.page);});
 await page.clock.runFor(310);
 assert.equal(await page.evaluate(()=>(window as any).imageLibraryFixture.actions.at(-1).templateQuery),'Manga','a response must not swallow the pending search');
 await query.fill('Portrait');
 await page.evaluate(()=>{const f=(window as any).imageLibraryFixture;f.library.error('chat',f.actions.at(-1).requestId,'Temporary failure');});
 await page.clock.runFor(310);
 assert.equal(await page.evaluate(()=>(window as any).imageLibraryFixture.actions.at(-1).templateQuery),'Portrait','a failed response must not swallow the pending search');
 await query.fill('Cancelled');
 const count=await page.evaluate(()=>(window as any).imageLibraryFixture.actions.length);
 await library.getByRole('button',{name:'Close image library',exact:true}).click();
 await page.clock.runFor(310);
 assert.equal(await page.evaluate(()=>(window as any).imageLibraryFixture.actions.length),count,'closing must cancel pending searches');
 console.log('History debounce response/error races and close cancellation passed.');
}finally{await browser.close();await server.stop();}
