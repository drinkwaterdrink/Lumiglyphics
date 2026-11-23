import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { browserFixtureServer } from './browser-fixture-server.ts';

const server = await browserFixtureServer('scripts/settings-browser-fixture.ts');
try {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.LUMIGLYPHICS_CHROME_PATH ? { executablePath: process.env.LUMIGLYPHICS_CHROME_PATH } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.port}/`);
    const settings = page.locator('[data-vn-settings]');
    const picker = settings.locator('[data-category-picker]');
    const categories = settings.locator('[data-category-dialog]');
    const rail = settings.locator('[data-nav]');
    await settings.waitFor();
    await page.evaluate(() => (window as any).settingsFixture.panel.openPage('appearance'));
    await settings.evaluate(el => el.setAttribute('data-vn-workspace-tool', 'settings'));
    for (const viewport of [{ width: 360, height: 740 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      assert.equal(await rail.isVisible(), false);
      assert.notEqual(await picker.evaluate(el => getComputedStyle(el).pointerEvents), 'none',
        `embedded picker accepts pointer input at ${viewport.width}px`);
      await picker.click();
      assert.equal(await categories.isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await categories.isVisible(), false);
      assert.equal(await picker.evaluate(el => (el.getRootNode() as ShadowRoot).activeElement === el), true);
    }
    await page.evaluate(() => (window as any).settingsFixture.panel.openPage('reading'));
    await settings.getByText('Presentation presets', { exact: true }).click();
    const presets = settings.locator('[data-presentation-preset]');
    await presets.selectOption({ label: 'Quiet' });
    assert.match(await settings.locator('[data-presentation-description]').innerText(), /Camera: Off/);
    assert.equal(await page.evaluate(() => (window as any).settingsFixture.patches.length), 0,
      'previewing a preset does not save or generate');
    await settings.getByRole('button', { name: 'Apply preset' }).click();
    assert.equal(await settings.locator('[name="virtualCameraEnabled"]').isChecked(), false);
    assert.equal(await settings.locator('[name="cameraMotionIntensity"]').isDisabled(), true);
    await page.evaluate(() => (window as any).settingsFixture.panel.openPage('appearance'));
    await settings.locator('[name="atmosphericLighting"]').check();
    await page.evaluate(() => (window as any).settingsFixture.panel.openPage('reading'));
    await settings.getByRole('button', { name: 'Undo preset' }).click();
    assert.equal(await settings.locator('[name="virtualCameraEnabled"]').isChecked(), true);
    assert.equal(await settings.locator('[name="cameraMotionIntensity"]').inputValue(), 'full');
    assert.equal(await settings.locator('[name="atmosphericLighting"]').isChecked(), true);
    const { patches, previews } = await page.evaluate(() => {
      const fixture = (window as any).settingsFixture;
      return { patches: fixture.patches as Record<string, unknown>[], previews: fixture.previews };
    });
    assert.equal(patches.length, 3);
    assert.ok(patches.every(patch => Object.keys(patch).join() === 'readerPreferences'));
    assert.equal(previews, 0);
    await page.evaluate(() => (window as any).settingsFixture.panel.openPage('connections'));
    await settings.getByText('Background collection profile', { exact: true }).click();
    const collection = settings.getByLabel('Collection profile');
    const autofill = settings.locator('[name="sidecarUseForAutofill"]');
    const priorAutofill = await autofill.isChecked();
    assert.equal(await collection.inputValue(), 'worldbuilding');
    await collection.selectOption('essentials');
    assert.match(await settings.locator('[data-sidecar-profile-summary]').innerText(), /Story references, Readable documents/);
    assert.equal(await settings.locator('[data-sidecar-channels]').isVisible(), false);
    await collection.selectOption('custom');
    const channels = settings.locator('[name="sidecar-channel"]:checked');
    assert.equal(await channels.count(), 2);
    while (await channels.count()) await channels.first().uncheck();
    assert.match(await settings.locator('[data-sidecar-profile-summary]').innerText(), /Background model off/);
    assert.equal(await autofill.isChecked(), priorAutofill);
    assert.deepEqual(await page.evaluate(() => (window as any).settingsFixture.patches.at(-1)), {
      sidecarCollection: { profile: 'custom', selected: [] },
    });
    await settings.evaluate(el => el.removeAttribute('data-vn-workspace-tool'));
    assert.equal(await rail.isVisible(), true, 'standalone desktop keeps the section rail');
    console.log('Embedded Settings picker and focus restoration passed at 360×740, 768×1024, and 1440×900.');
  } finally {
    await browser.close();
  }
} finally {
  await server.stop();
}
