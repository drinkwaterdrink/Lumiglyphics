import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {browserFixtureServer} from './browser-fixture-server.ts';
const server=await browserFixtureServer('scripts/image-review-browser-fixture.ts');const browser=await chromium.launch({headless:true});
try{for(const width of [320,390,1280]){const p=await browser.newPage({viewport:{width,height:844}});await p.goto(`http://127.0.0.1:${server.port}/`);await p.evaluate(()=>{const f=(window as any).imageFixture;f.studio.setConfig(f.config);f.stage.dismissChapterCard();f.stage.restoreReplyDraft('My unsent story reply');f.stage.workspace.open('artwork');});
 const studio=p.locator('[data-image-studio]');const count=await p.evaluate(()=>(window as any).imageFixture.actions.length);
 const goals=studio.locator('[data-correction-goal]');for(const goal of await goals.all()){const b=(await goal.boundingBox())!;assert.ok(b.height>=44&&b.x>=0&&b.x+b.width<=width,'correction targets fit viewport and remain44px');}
 await studio.getByRole('button',{name:'Person or outfit',exact:true}).click();
 assert.equal(await studio.getByRole('tab',{name:'Prompt',exact:true}).getAttribute('aria-selected'),'true','held prompt opens editable wording rather than hidden correction fields');assert.equal(await studio.locator('[data-correction-help]').isVisible(),true,'navigation explanation stays visible in destination tab');
 await studio.getByLabel('Positive prompt',{exact:true}).fill('Keep this local corrected wording');
 await studio.getByRole('tab',{name:'Picture',exact:true}).click();await studio.getByRole('button',{name:'Camera or framing',exact:true}).click();
 assert.equal(await studio.getByRole('tab',{name:'Camera',exact:true}).getAttribute('aria-selected'),'true');
 await studio.getByRole('tab',{name:'Picture',exact:true}).click();await studio.getByRole('button',{name:'Edit wording',exact:true}).click();assert.equal(await studio.getByLabel('Positive prompt',{exact:true}).inputValue(),'Keep this local corrected wording');
 await studio.getByRole('tab',{name:'Picture',exact:true}).click();await studio.getByRole('button',{name:'Another image',exact:true}).click();
 assert.equal(await p.evaluate(()=>(window as any).imageFixture.actions.length),count,'correction navigation never dispatches text or image generation');
 await p.locator('[data-workspace-close]').click();assert.equal(await p.evaluate(()=>(window as any).imageFixture.stage.getState().draft),'My unsent story reply');
 await p.getByRole('button',{name:'Open Art Studio',exact:true}).click();await studio.getByRole('tab',{name:'Prompt',exact:true}).click();assert.equal(await studio.getByLabel('Positive prompt',{exact:true}).inputValue(),'Keep this local corrected wording');await studio.getByRole('tab',{name:'Picture',exact:true}).click();
 await p.evaluate(()=>{const f=(window as any).imageFixture,t=structuredClone(f.turn);t.assets[0].status='generated';t.imageRequests[0].state='approved';f.studio.setTurn(t);});
 assert.equal(await studio.getByRole('button',{name:'Another image',exact:true}).isEnabled(),true,'completed image replacement shortcut follows the final primary action state');await studio.getByRole('button',{name:'Person or outfit',exact:true}).click();assert.equal(await studio.getByLabel('Picture subject',{exact:true}).isVisible(),true,'completed picture opens existing correction fields');
 assert.equal(await p.evaluate(()=>(window as any).imageFixture.actions.length),count);await p.screenshot({path:`.cache/corrections-${width}.png`});await p.close();}
 console.log('Artwork corrections: four local entry points, held prompt fallback, drafts and reader return passed at320/390/1280.');
}finally{await browser.close();await server.stop();}
