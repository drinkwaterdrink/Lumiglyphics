import assert from "node:assert/strict";
import { chromium, type Browser } from "playwright";

// Browser plugin not available. Exercise the actual formatter and browser CSS
// parser with Playwright; intercept every request so no external traffic leaves.
// Run: bun run ./scripts/test-story-css-browser.ts
const build = await Bun.build({ entrypoints: ["src/frontend/stage/rich-text.ts"], target: "browser" });
if (!build.success) throw new Error(String(build.logs));
const bundle = await build.outputs[0]!.text();
const html = `<!doctype html><html><head><title>Story CSS security regression</title>
<style>
@font-face { font-family: AuditRemote; src: url(https://audit.invalid/font.woff2); }
.remote { background-image: url(https://audit.invalid/class-pixel); }
.vn-transmission { font-style: italic; }
</style></head><body><main id="story"></main></body></html>`;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: (request) => {
  const path = new URL(request.url).pathname;
  return path === "/fixture.js"
    ? new Response(bundle, { headers: { "Content-Type": "application/javascript" } })
    : new Response(html, { headers: { "Content-Type": "text/html" } });
} });
let browser: Browser | undefined;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const unexpected: string[] = [];
  const origin = `http://127.0.0.1:${server.port}`;
  await context.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl === `${origin}/` || requestUrl === `${origin}/fixture.js`) return route.continue();
    unexpected.push(requestUrl);
    return route.abort();
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.title(), "Story CSS security regression");
  await page.evaluate(async (moduleUrl) => {
    const module = await import(moduleUrl);
    (window as any).formatStory = module.formatDialogueText;
  }, `${origin}/fixture.js`);

  // Positive control: prove this browser attempts the original escaped fetch.
  await page.evaluate(() => {
    document.querySelector("#story")!.innerHTML = String.raw`<span style="background-image:u\72l(https://audit.invalid/control)">control</span>`;
  });
  await page.waitForTimeout(250);
  assert.ok(unexpected.some((url) => url.endsWith("/control")), "interceptor observes raw escaped CSS fetch");
  unexpected.length = 0;

  const styles = [
    String.raw`background-image:u\72l(https://audit.invalid/escaped)`,
    String.raw`background-image:\75\72\6c(https://audit.invalid/escaped-all)`,
    'background-image:u/**/rl(https://audit.invalid/comment)',
    'background-image:image-set("https://audit.invalid/image-set" 1x)',
    'background-image:-webkit-image-set("https://audit.invalid/webkit-image-set" 1x)',
    '--asset:url(https://audit.invalid/custom);background-image:var(--asset)',
    'background-image:&#117;rl(https://audit.invalid/entity)',
    'font-family:AuditRemote',
    'font:16px AuditRemote',
    'list-style-image:url(https://audit.invalid/list)',
    'cursor:url(https://audit.invalid/cursor),auto',
  ];
  const attacks = styles.map((style) => `<span style='${style}'>attack</span>`).join("")
    + '<span class="remote">class</span><font face="AuditRemote">font</font>';
  const safe = '<span style="color:#D98AE8;font-weight:bold;font-style:italic;letter-spacing:0.03em">safe</span>'
    + '<ruby>漢<rt>kan</rt></ruby><wave>effect</wave><em class="vn-transmission">radio</em><font face="monospace" color="red">font</font>';
  const rendered = await page.evaluate(({ attacks, safe }) => {
    const story = document.querySelector("#story")!;
    story.innerHTML = (window as any).formatStory(attacks + safe);
    const span = [...story.querySelectorAll("span")].find((el) => el.textContent === "safe")!;
    const computed = getComputedStyle(span);
    return {
      text: story.textContent,
      color: computed.color,
      weight: computed.fontWeight,
      italic: computed.fontStyle,
      ruby: story.querySelector("ruby rt")?.textContent,
      effect: story.querySelector("[data-vn-text-fx]")?.getAttribute("data-vn-text-fx"),
      transmission: story.querySelector(".vn-transmission")?.textContent,
      unsafeClasses: story.querySelectorAll(".remote").length,
      font: story.querySelector("font")?.getAttribute("face"),
    };
  }, { attacks, safe });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  assert.deepEqual(unexpected, [], "sanitized story insertion makes zero unintended requests");
  assert.deepEqual(errors, [], "no browser runtime errors");
  assert.ok(rendered.text?.includes("safe漢kaneffectradiofont"));
  assert.equal(rendered.color, "rgb(217, 138, 232)");
  assert.equal(rendered.weight, "700");
  assert.equal(rendered.italic, "italic");
  assert.equal(rendered.ruby, "kan");
  assert.equal(rendered.effect, "wave");
  assert.equal(rendered.transmission, "radio");
  assert.equal(rendered.unsafeClasses, 0);
  assert.equal(rendered.font, null);
  console.log("PASS story CSS: raw escaped fetch control intercepted; 11 CSS attack variants plus class/font attacks made zero sanitized requests; safe formatting preserved.");
} finally {
  await browser?.close();
  server.stop(true);
}
