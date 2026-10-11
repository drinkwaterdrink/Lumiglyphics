import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { THEME_PRESET_IDS } from "../src/config.js";

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
    await page.goto(`http://127.0.0.1:${server.port}/`);
    await page.evaluate(() => {
      const f = (window as any).readingFixture;
      f.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "image-first", sheetSize: "reading", backgroundOpacity: .55 });
      f.stage.setTextScale(1.6);
      f.stage.loadTurn({ ...f.turn, paragraphs: f.turn.paragraphs.map((p: any) => ({ ...p, text: p.text.repeat(18) })) });
    });
    const panel = page.locator("[data-vn-dialogue]");
    const text = page.locator("[data-vn-dialogue-text]");
    await assert.doesNotReject(() => panel.waitFor());
    const originalProgress = await page.locator("[data-vn-progress]").textContent();
    await text.click();
    assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress, "selecting text does not advance");
    for (const size of ["compact", "expanded", "reading"]) {
      await page.getByLabel("Text panel size", { exact: true }).selectOption(size);
      const box = await panel.boundingBox();
      const metrics = await page.evaluate(() => ({ height: innerHeight, viewport: visualViewport?.height, scale: visualViewport?.scale, width: document.documentElement.scrollWidth, inset: getComputedStyle((window as any).readingFixture.stage.root).getPropertyValue("--vn-sheet-keyboard-inset") }));
      assert.ok(box && box.y >= 60 && box.y + box.height <= viewport.height + 1, `sheet stays on screen at ${viewport.width}/${size}: ${JSON.stringify({box,metrics})}`);
      assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress, "resize does not advance");
    }
    await text.evaluate(el => { el.scrollTop = 100; });
    assert.equal(await page.locator("[data-vn-progress]").textContent(), originalProgress);
    await page.getByRole("button", { name: "Auto play", exact: true }).click();
    await page.getByRole("button", { name: "Hide text", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Show text", exact: true }).isVisible(), true);
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.getByRole("button", { name: "Back to chat", exact: true }).isVisible(), true);
    await page.getByRole("button", { name: "Show text", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Auto play", exact: true }).getAttribute("aria-pressed"), "false");
    assert.equal(await panel.isVisible(), true);
    await page.getByRole("button", { name: "Resize text panel", exact: true }).press("ArrowUp");
    assert.equal(await page.getByLabel("Text panel size", { exact: true }).inputValue(), "expanded");
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
    await page.getByLabel("Text panel size", { exact: true }).selectOption("compact");
    assert.equal(await page.getByRole("button", { name: "Continue", exact: true }).isVisible(), true);
    await page.screenshot({ path: `.cache/mobile-reader/${viewport.width}.png` });
    await page.close();
  }
  const settings = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await settings.goto(`http://127.0.0.1:${server.port}/settings?setupDone&noSpeech`);
  await settings.getByLabel("Settings section", { exact: true }).selectOption("look");
  await settings.locator('[name="adjustableSheetEnabled"]').check();
  await settings.locator('[name="readerLayout"]').selectOption("image-first");
  await settings.locator('[name="readerSheetSize"]').selectOption("expanded");
  await settings.locator('[name="readerBackgroundOpacity"]').fill("0.55");
  await settings.locator('[name="readerBackgroundOpacity"]').dispatchEvent("change");
  assert.deepEqual(await settings.evaluate(() => (window as any).settingsFixture.config.readerPreferences), { adjustableSheetEnabled: true, layout: "image-first", sheetSize: "expanded", backgroundOpacity: .55 });
  await settings.close();
  for (const preset of THEME_PRESET_IDS) {
    const themed = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await themed.goto(`http://127.0.0.1:${server.port}/?preset=${preset}`);
    await themed.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "image-first", sheetSize: "reading", backgroundOpacity: .9 }));
    const handle = await themed.getByRole("button", { name: "Resize text panel", exact: true }).boundingBox();
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
    const scaled = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await scaled.goto(`http://127.0.0.1:${server.port}/?uiScale=${scale}&preset=paper-novel`);
    await scaled.evaluate(() => (window as any).readingFixture.stage.setReaderPreferences({ adjustableSheetEnabled: true, layout: "overlay", sheetSize: "expanded", backgroundOpacity: 1 }));
    const box = await scaled.locator("[data-vn-dialogue]").boundingBox();
    assert.ok(box && box.y >= 60 && box.height < 600, "zoomed sheet uses local CSS coordinates");
    const selectBox = await scaled.getByLabel("Text panel size", { exact: true }).boundingBox();
    assert.ok(selectBox && selectBox.width >= 43 && selectBox.height >= 35, `scaled size selector remains usable: ${JSON.stringify(selectBox)}`);
    const controls = await scaled.locator('[data-vn-control="previous"], [data-vn-control="log"], [data-vn-control="auto"], [data-vn-control="skip"]').all();
    let previousRight = 0;
    for (const control of controls) {
      const b = await control.boundingBox();
      assert.ok(b && b.x >= previousRight - 1 && b.x + b.width <= 390, "scaled reading controls do not overlap");
      previousRight = b.x + b.width;
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
  console.log("mobile reader browser checks passed");
} finally { await browser.close(); server.stop(true); }
