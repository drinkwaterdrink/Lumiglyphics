import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { THEME_PRESET_IDS } from "../src/config.js";

const resizeGrip = (page: Page) => page.getByRole("separator", { name: "Drag to resize dialogue panel", exact: true });
const hideText = (page: Page) => page.getByRole("button", { name: "Hide text reader to view full artwork", exact: true });
const paragraphIndex = (page: Page) => page.evaluate(() => (window as any).readingFixture.stage.getState().currentParagraphIndex as number);

const build = await Bun.build({ entrypoints: ["scripts/reading-browser-fixture.ts"], target: "browser" });
assert.ok(build.success, String(build.logs));
const bundle = await build.outputs[0]!.text();
const settingsBuild = await Bun.build({ entrypoints: ["scripts/settings-browser-fixture.ts"], target: "browser" });
assert.ok(settingsBuild.success, String(settingsBuild.logs));
const settingsBundle = await settingsBuild.outputs[0]!.text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: request => new URL(request.url).pathname === "/fixture.js"
  ? new Response(bundle, { headers: { "Content-Type": "application/javascript" } })
  : new URL(request.url).pathname === "/settings.js" ? new Response(settingsBundle, { headers: { "Content-Type": "application/javascript" } })
  : new URL(request.url).pathname === "/settings" ? new Response('<html><body><script type="module" src="/settings.js"></script></body></html>', { headers: { "Content-Type": "text/html" } })
  : new Response('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>', { headers: { "Content-Type": "text/html" } }) });
const browser = await chromium.launch({ headless: true, timeout: 30000 });
await mkdir(".cache/mobile-reader", { recursive: true });
try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    page.setDefaultTimeout(7000);
    await page.goto(`http://127.0.0.1:${server.port}/`);
    await page.evaluate(() => {
      const f = (window as any).readingFixture;
      f.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "image-first", sheetSize: "reading", backgroundOpacity: .55 });
      f.stage.setTextScale(1.6);
      f.stage.loadTurn({ ...f.turn, paragraphs: f.turn.paragraphs.map((p: any) => ({ ...p, text: p.text.repeat(18) })) });
    });
    assert.equal(await page.getByLabel("Text panel size", { exact: true }).count(), 0, "sizes only live in settings");
    assert.equal(await page.locator("[data-vn-sheet-tools]").innerText(), "", "reader chrome is icon-only without a title");
    const panel = page.locator("[data-vn-dialogue]");
    const header = page.locator("[data-vn-sheet-header]");
    const grip = resizeGrip(page);
    const headerBox = await header.boundingBox();
    const gripBox = await grip.boundingBox();
    const panelBox = await panel.boundingBox();
    assert.ok(headerBox && gripBox && panelBox && headerBox.height < 60, "single compact header with a resize grip");
    const gripCenter = gripBox.x + gripBox.width / 2;
    assert.ok(Math.abs(gripCenter - (panelBox.x + panelBox.width / 2)) < 2, "resize grip is centered along the top edge");
    const initialHeight = panelBox.height;
    const gripMiddle = gripBox.y + gripBox.height / 2;
    const gripHit = await grip.evaluate((el, { x, y }) => {
      const target = (el.getRootNode() as ShadowRoot).elementFromPoint(x, y);
      return target === el || el.contains(target);
    }, { x: gripCenter, y: gripMiddle });
    assert.ok(gripHit, `resize grip receives pointer input: ${JSON.stringify({ viewport, gripBox })}`);
    const beforeDrag = await paragraphIndex(page);
    await page.mouse.move(gripCenter, gripMiddle);
    await page.mouse.down();
    await page.mouse.move(gripCenter, gripMiddle - 57, { steps: 4 });
    const duringHeight = (await panel.boundingBox())!.height;
    await page.mouse.up();
    const savedHeight = (await panel.boundingBox())!.height;
    assert.equal(await paragraphIndex(page), beforeDrag, `dragging the resize grip leaves the paragraph unchanged at ${viewport.width}×${viewport.height}`);
    assert.ok(Math.abs(savedHeight - duringHeight) < 2, "release keeps intermediate height without snapping");
    if (viewport.height > 500) assert.ok(savedHeight > initialHeight + 40, `drag adjusts height continuously: ${JSON.stringify({ viewport, initialHeight, duringHeight, savedHeight })}`);
    await page.evaluate(() => { const f = (window as any).readingFixture; f.stage.setReaderPreferences(f.counters.readerPreferences); });
    assert.ok(Math.abs((await panel.boundingBox())!.height - savedHeight) < 2, "saved preference echo retains dragged height");

    const text = page.locator("[data-vn-dialogue-text]");
    const readerState = await page.locator("[data-vn-root]").evaluate(root => ({
      phase: (root as HTMLElement).dataset.vnPhase,
      hudHidden: (root as HTMLElement).dataset.vnHudHidden,
      textHidden: (root as HTMLElement).dataset.vnTextHidden,
      cleanView: (root as HTMLElement).dataset.vnCleanView,
    }));
    assert.equal(await panel.isVisible(), true, `resizing leaves the sheet visible at ${viewport.width}×${viewport.height}: ${JSON.stringify(readerState)}`);
    const beforeTap = await paragraphIndex(page);
    // A long paragraph extends below the scroll window, so target its visible first line.
    await text.tap({ position: { x: 12, y: 10 } });
    assert.equal(await paragraphIndex(page), beforeTap + 1, "tapping prose advances exactly once");
    await page.getByRole("button", { name: "Previous paragraph", exact: true }).tap();
    assert.equal(await paragraphIndex(page), beforeTap, "previous button returns to the preceding paragraph");
    await panel.tap({ position: { x: 3, y: (await panel.boundingBox())!.height / 2 } });
    assert.equal(await paragraphIndex(page), beforeTap + 1, "tapping empty panel space advances exactly once");
    const originalProgress = await page.locator("[data-vn-progress]").textContent();
    await text.dispatchEvent("pointerdown", { pointerId: 1, clientX: 100, clientY: 200 });
    await text.dispatchEvent("pointermove", { pointerId: 1, clientX: 100, clientY: 250 });
    await text.dispatchEvent("pointerup", { pointerId: 1, clientX: 100, clientY: 250 });
    await text.dispatchEvent("click");
    assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress, "scroll gestures do not advance");
    await text.evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    });
    await text.dispatchEvent("click");
    assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress, "selected prose does not advance");
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    for (const size of ["compact", "expanded", "reading"]) {
      await page.evaluate(size => (window as any).readingFixture.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "image-first", sheetSize: size, backgroundOpacity: .55, heightRatio: undefined }), size);
      const box = await panel.boundingBox();
      const metrics = await page.evaluate(() => ({ height: innerHeight, viewport: visualViewport?.height, scale: visualViewport?.scale, width: document.documentElement.scrollWidth, inset: getComputedStyle((window as any).readingFixture.stage.root).getPropertyValue("--vn-sheet-keyboard-inset") }));
      assert.ok(box && box.y >= 60 && box.y + box.height <= viewport.height + 1, `sheet stays on screen at ${viewport.width}/${size}: ${JSON.stringify({box,metrics})}`);
      assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress, "resize does not advance");
    }
    const scrollTop = await panel.locator(".scroll-copy").evaluate(el => {
      el.scrollTop = 100;
      return el.scrollTop;
    });
    assert.ok(scrollTop > 0, "long prose scrolls within the dialogue sheet");
    assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress, "scrolling the prose does not advance");
    await page.getByRole("button", { name: "Start auto-read and speech", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Pause auto-read and speech", exact: true }).getAttribute("aria-pressed"), "true");
    await hideText(page).click();
    const showText = page.getByRole("button", { name: "Show text reader", exact: true });
    assert.equal(await showText.isVisible(), true);
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.getByRole("button", { name: "Back to Lumiverse chat", exact: true }).isVisible(), true);
    await showText.click();
    assert.equal(await page.getByRole("button", { name: "Start auto-read and speech", exact: true }).getAttribute("aria-pressed"), "false");
    assert.equal(await panel.isVisible(), true);
    const beforeArrow = (await panel.boundingBox())!.height;
    await grip.press("ArrowUp");
    assert.ok((await panel.boundingBox())!.height > beforeArrow, "ArrowUp on the resize grip increases the visible panel height");
    if (viewport.height > 500) {
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 420 });
        window.visualViewport!.dispatchEvent(new Event("resize"));
      });
      const keyboardBox = await panel.boundingBox();
      assert.ok(keyboardBox && keyboardBox.y + keyboardBox.height <= 420, "simulated visual viewport keyboard does not cover the panel");
      await page.evaluate(() => {
        delete (window.visualViewport as any).height;
        window.visualViewport!.dispatchEvent(new Event("resize"));
      });
    }
    await page.setViewportSize({ width: viewport.width, height: Math.min(viewport.height, 480) });
    await page.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "image-first", sheetSize: "compact", backgroundOpacity: .55, heightRatio: undefined }));
    assert.equal(await page.getByRole("button", { name: "Continue", exact: true }).isVisible(), true);
    await page.screenshot({ path: `.cache/mobile-reader/${viewport.width}.png` });
    await page.close();
  }
  const settings = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await settings.goto(`http://127.0.0.1:${server.port}/settings?setupDone&noSpeech`);
  await settings.evaluate(() => (window as any).settingsFixture.panel.openPage("look"));
  await settings.locator('[name="adjustableSheetEnabled"]').check();
  await settings.locator('[name="readerLayout"]').selectOption("image-first");
  await settings.locator('[name="readerSheetSize"]').selectOption("expanded");
  await settings.locator('[name="readerBackgroundOpacity"]').fill("0.55");
  await settings.locator('[name="readerBackgroundOpacity"]').dispatchEvent("change");
  assert.deepEqual(await settings.evaluate(() => {
    const { adjustableSheetEnabled, layout, sheetSize, backgroundOpacity, heightRatio } = (window as any).settingsFixture.config.readerPreferences;
    return { adjustableSheetEnabled, layout, sheetSize, backgroundOpacity, heightRatio };
  }), { adjustableSheetEnabled: true, layout: "image-first", sheetSize: "expanded", backgroundOpacity: .55, heightRatio: undefined });
  await settings.close();
  for (const preset of THEME_PRESET_IDS) {
    const themed = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await themed.goto(`http://127.0.0.1:${server.port}/?preset=${preset}`);
    await themed.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "image-first", sheetSize: "reading", backgroundOpacity: .9 }));
    const handle = await resizeGrip(themed).boundingBox();
    assert.ok(handle && handle.height >= 43.9 && handle.y > 60, `${preset} handle bounds ${JSON.stringify(handle)}`);
    const progress = await themed.locator("[data-vn-progress]").textContent();
    await themed.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await themed.mouse.down();
    await themed.mouse.move(handle.x + handle.width / 2, handle.y - 140, { steps: 6 });
    await themed.mouse.up();
    assert.equal(await themed.locator("[data-vn-progress]").textContent(), progress, "dragging the handle never advances");
    const textColor = await themed.locator("[data-vn-dialogue-text]").evaluate(el => getComputedStyle(el).opacity);
    assert.equal(textColor, "1", "background opacity leaves text fully opaque");
    await themed.screenshot({ path: `.cache/mobile-reader/theme-${preset}.png` });
    await themed.close();
  }
  const resume = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await resume.goto(`http://127.0.0.1:${server.port}/`);
  await resume.evaluate(() => {
    const f = (window as any).readingFixture;
    f.stage.setTextSpeed(30);
    f.stage.loadTurn({ ...f.turn, initialParagraphIndex: 1 });
    f.stage.advance();
  });
  assert.ok(await resume.locator("[data-vn-typing-rest]").count() > 0, "resuming does not permanently suppress future typing/effects");
  await resume.close();
  for (const scale of [1.5, .8]) {
    const scaled = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
    scaled.setDefaultTimeout(7000);
    await scaled.goto(`http://127.0.0.1:${server.port}/?uiScale=${scale}&preset=paper-novel`);
    await scaled.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "overlay", sheetSize: "expanded", backgroundOpacity: 1 }));
    await scaled.waitForFunction(scale => {
      const root = (window as any).readingFixture.stage.root as HTMLElement;
      const panel = root.querySelector<HTMLElement>("[data-vn-dialogue]")!;
      const box = panel.getBoundingClientRect();
      const expectedHeight = Number.parseFloat(panel.style.height) * scale;
      return box.y >= 60 && box.bottom <= innerHeight && Math.abs(box.height - expectedHeight) < 2;
    }, scale);
    const selectBox = await hideText(scaled).boundingBox();
    assert.ok(selectBox && selectBox.width >= 35 && selectBox.height >= 35, `scaled icon remains usable: ${JSON.stringify(selectBox)}`);
    const controls = await scaled.locator('[data-vn-continue], [data-vn-control="log"], [data-action="caption-auto"], [data-vn-hide-text]').all();
    assert.equal(controls.length, 4, "scaled reader exposes navigation, history, auto-read, and hide-text controls");
    const controlBounds: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (const control of controls) {
      const b = await control.boundingBox();
      assert.ok(b && b.x >= 0 && b.x + b.width <= 391 && b.y >= 0 && b.y + b.height <= 845, `scaled reading control stays on screen: ${JSON.stringify(b)}`);
      assert.ok(controlBounds.every(other => b.x + b.width <= other.x + 1 || other.x + other.width <= b.x + 1 || b.y + b.height <= other.y + 1 || other.y + other.height <= b.y + 1), "scaled reading controls do not overlap");
      controlBounds.push(b);
    }
    const background = await scaled.locator("[data-vn-dialogue]").evaluate(el => {
      const style = getComputedStyle(el, "::before");
      return { opacity: style.opacity, background: style.backgroundImage + style.backgroundColor, height: parseFloat(style.height), panelHeight: el.clientHeight };
    });
    assert.ok(background.background.includes("rgb(239, 230, 211)"), "Paper retains its light theme background");
    assert.ok(Math.abs(background.height - background.panelHeight) < 4, "background layer covers the full text panel");
    await scaled.screenshot({ path: `.cache/mobile-reader/paper-${scale}.png` });
    await scaled.close();
  }
  const manga = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await manga.goto(`http://127.0.0.1:${server.port}/?preset=yamaku-classic`);
  const loadedPage = await manga.evaluate(async () => {
    const stage = (window as any).readingFixture.stage;
    stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "overlay", sheetSize: "reading", backgroundOpacity: .7 });
    stage.setSceneImageFit("cover");
    const canvas = document.createElement("canvas"); canvas.width = 864; canvas.height = 1536;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ded7cd"; ctx.fillRect(0, 0, 864, 1536);
    ctx.strokeStyle = "#183c47"; ctx.lineWidth = 12;
    for (let i = 0; i < 6; i++) { const x = (i % 2) * 420 + 18, y = Math.floor(i / 2) * 490 + 18; ctx.strokeRect(x, y, 400, 470); ctx.fillStyle = "#183c47"; ctx.font = "60px serif"; ctx.fillText(`Panel ${i + 1}`, x + 35, y + 200); }
    return stage.setSceneImage({ url: canvas.toDataURL(), alt: "Six-panel page", requestId: "manga", presentation: "page" });
  });
  assert.equal(loadedPage, true, "the local six-panel page loads");
  const viewPage = manga.getByRole('button', { name: 'View whole page', exact: true });
  await viewPage.waitFor({ timeout: 7000 });
  const pageImage = manga.locator('[data-vn-scene-image][data-vn-layer="active"]');
  assert.equal(await pageImage.evaluate(el => getComputedStyle(el).objectFit), "contain", "whole page survives fill-stage preference");
  await manga.waitForFunction(() => {
    const root = (window as any).readingFixture.stage.root as HTMLElement;
    const art = root.querySelector('[data-vn-scene]')!.getBoundingClientRect();
    const sheet = root.querySelector('[data-vn-dialogue]')!.getBoundingClientRect();
    return art.height > 0 && sheet.height > 0 && art.bottom <= sheet.top + 1;
  }, undefined, { timeout: 7000 });
  assert.equal(await manga.locator('[data-vn-page-backdrop]').isVisible(), true);
  await manga.screenshot({ path: ".cache/mobile-reader/manga-page.png" });
  const progressBefore = await manga.locator('[data-vn-progress]').textContent();
  await viewPage.click();
  assert.equal(await manga.getByRole('button', { name: 'Return to reading', exact: true }).getAttribute('aria-pressed'), 'true');
  await manga.locator('[data-vn-dialogue]').waitFor({ state: 'hidden', timeout: 7000 });
  await manga.locator('[data-vn-scene]').click();
  assert.equal(await manga.locator('[data-vn-progress]').textContent(), progressBefore, "page inspection does not advance");
  await manga.getByRole('button', { name: 'Return to reading', exact: true }).press('Escape');
  await manga.locator('[data-vn-dialogue]').waitFor({ timeout: 7000 });
  await manga.evaluate(async () => (window as any).readingFixture.stage.setSceneImage({ url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', alt: 'Ordinary scene', requestId: 'normal' }));
  await manga.waitForTimeout(350);
  assert.equal(await manga.getByRole('button', { name: 'View whole page', exact: true }).count(), 0);
  assert.equal(await manga.locator('[data-vn-scene-image][data-vn-layer="active"]').evaluate(el => getComputedStyle(el).objectFit), "cover", "ordinary scene fit returns");
  await manga.close();
  console.log("mobile reader browser checks passed");
} finally { await browser.close(); server.stop(true); }
