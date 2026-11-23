import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { browserFixtureServer } from './browser-fixture-server.ts';

const server = await browserFixtureServer('scripts/reading-browser-fixture.ts');
try {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.LUMIGLYPHICS_CHROME_PATH ? { executablePath: process.env.LUMIGLYPHICS_CHROME_PATH } : {}),
  });
  try {
    for (const viewport of [{ width: 360, height: 740 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      const mobile = viewport.width === 360;
      const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.port}/?readerControls=1`);
      const track = page.getByRole('group', { name: 'Paragraph timeline' });
      const dots = track.locator('[data-vn-scrub-dot]');
      await track.waitFor();
      assert.equal(await dots.count(), 3, 'a short reply keeps all markers');
      await page.evaluate(() => {
        const { stage, turn } = (window as any).readingFixture;
        stage.loadTurn({
          ...turn,
          paragraphs: Array.from({ length: 100 }, (_, index) => ({
            id: `reader-${index}`,
            text: `The evening settles over the ridge. Passage ${index + 1}.`,
            ...(index === 63 ? { speaker: 'Professor Alexandra Montgomery of the Northern Observatory' } : {}),
          })),
        });
        stage.dismissChapterCard();
        for (let index = 0; index < 63; index++) stage.advance();
        stage.setParagraphArtStates({ 59: 'ready', 60: 'generating' });
        stage.restoreReplyDraft('Keep this unsent draft.');
      });

      const active = track.locator('[aria-current=step]');
      const position = () => active.getAttribute('data-vn-scrub-index');
      assert.equal(await position(), '63');
      assert.equal(await dots.count(), 40);
      const picker = page.getByLabel('Jump to a revealed paragraph');
      assert.equal(await picker.locator('option').count(), 64);
      assert.equal(await picker.inputValue(), '63');
      await picker.selectOption('2');
      assert.equal(await position(), '2');
      await picker.selectOption('63');
      assert.equal(await position(), '63');
      assert.equal(await page.evaluate(() => (window as any).readingFixture.stage.getState().draft), 'Keep this unsent draft.');
      const box = await track.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 0.5);
      let previousRight = box.x;
      for (const dot of await dots.all()) {
        const hit = await dot.boundingBox();
        assert.ok(hit && hit.width > 0 && hit.x >= previousRight - 0.5);
        assert.ok(hit.x + hit.width <= box.x + box.width + 0.5);
        previousRight = hit.x + hit.width;
      }
      assert.equal(await track.locator('[tabindex="0"]').count(), 1);

      const ready = track.getByRole('button', { name: /Paragraph 60 of 100.*Art ready/ });
      if (mobile) await ready.tap();
      else await ready.click();
      assert.equal(await position(), '59');

      await active.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await position(), '60');
      assert.equal(await active.evaluate(dot => (dot.getRootNode() as ShadowRoot).activeElement === dot), true);
      await page.keyboard.press('End');
      assert.equal(await position(), '63', 'End stops at the last revealed paragraph');
      await page.keyboard.press('ArrowRight');
      assert.equal(await position(), '63');
      await page.keyboard.press('Home');
      assert.equal(await position(), '0', 'Home reaches beyond the previous visible window');

      await page.keyboard.press('End');
      const generating = track.locator('[data-art-state=generating]');
      const animationName = () => generating.evaluate(el => getComputedStyle(el, '::before').animationName);
      assert.equal(await animationName(), 'vn-art-shimmer');
      const sceneImage = page.locator('[data-vn-scene-image][data-vn-layer=active]');
      const cameraAnimation = () => sceneImage.evaluate(el => getComputedStyle(el).animationName);
      assert.match(await cameraAnimation(), /^vn-kb-/);
      await page.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ cameraMotionIntensity: 'gentle' }));
      assert.equal(await cameraAnimation(), 'vn-kb-gentle');
      await page.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ cameraMotionIntensity: 'full' }));
      await page.evaluate(() => (window as any).readingFixture.stage.setEffectIntensity('gentle'));
      assert.equal(await cameraAnimation(), 'vn-kb-gentle');
      await page.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ virtualCameraEnabled: false }));
      assert.equal(await cameraAnimation(), 'none');
      await page.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ virtualCameraEnabled: true }));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await cameraAnimation(), 'none');
      assert.equal(await animationName(), 'none');
      if (process.env.LUMIGLYPHICS_QA_DIR) {
        await page.screenshot({ path: `${process.env.LUMIGLYPHICS_QA_DIR}/lumiglyphics-stage-${viewport.width}.png` });
      }
      const setAffinity = (affinity: number) => page.evaluate(value => {
        const { stage } = (window as any).readingFixture;
        stage.setCharacterDnaLibrary({
          jo: { id: 'jo', name: 'Jo', relationships: [{ targetName: 'Ada', affinity: value }] },
        });
      }, affinity);
      const advance = () => page.evaluate(() => (window as any).readingFixture.stage.advance());
      const banner = page.locator('[data-vn-bond-banner]');
      await page.evaluate(() => (window as any).readingFixture.stage.setBondBranch('reply-1/swipe-0'));
      await setAffinity(12);
      await setAffinity(16);
      assert.equal(await banner.count(), 0, 'late affinity update waits for a reading boundary');
      await advance();
      assert.match(await banner.innerText(), /Warming/);
      assert.equal(await banner.evaluate(el => getComputedStyle(el).animationName), 'none');
      await setAffinity(12);
      await setAffinity(16);
      await advance();
      assert.equal(await banner.count(), 0, 'the same celebration never replays within the branch');
      await setAffinity(40);
      await page.evaluate(() => (window as any).readingFixture.stage.setBondBranch('reply-1/swipe-1'));
      await advance();
      assert.equal(await banner.count(), 0, 'switching branches clears the queued celebration');
      await page.evaluate(() => {
        const { stage, turn } = (window as any).readingFixture;
        stage.loadTurn({ ...turn, paragraphs: Array.from({ length: 40 }, (_, index) => ({
          id: `medium-${index}`, text: `Passage ${index + 1}.`,
        })) });
        stage.dismissChapterCard();
        stage.setTextScale(1.6);
      });
      assert.equal(await dots.count(), 40);
      assert.equal(await dots.first().getAttribute('data-vn-scrub-index'), '0');
      assert.equal(await dots.last().getAttribute('data-vn-scrub-index'), '39');
      const scaledTrack = await track.boundingBox();
      assert.ok(scaledTrack && scaledTrack.x >= 0 && scaledTrack.x + scaledTrack.width <= viewport.width + 0.5);
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('Reader timeline (3, 40, and 100 passages), draft preservation, camera intensity, and branch-scoped bond banners passed at phone, tablet, and desktop widths.');
  } finally {
    await browser.close();
  }
} finally {
  await server.stop();
}
