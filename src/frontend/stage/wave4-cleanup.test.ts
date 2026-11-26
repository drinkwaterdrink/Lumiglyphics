import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FakeEvent, FakeNode, installFakeDocument } from "./stage-test-dom.js";
import { APERTURE_SETTINGS_CSS, APERTURE_STAGE_CSS } from "../theme/aperture-theme.js";
import { DOCKED_LIBRARY_CSS } from "../image-library/library.js";
import { PresentationRulesPanel } from "../settings/presentation-rules.js";
import { escapeHtml } from "../../shared/html-escape.js";

describe("Wave 4 CSS separation, in-DOM confirm & shared helpers", () => {
  let restoreDom: (() => void) | null = null;

  beforeEach(() => {
    restoreDom = installFakeDocument();
  });

  afterEach(() => {
    restoreDom?.();
    restoreDom = null;
  });

  test("APERTURE_SETTINGS_CSS excludes stage-only dialogue rules while APERTURE_STAGE_CSS includes them", () => {
    expect(APERTURE_SETTINGS_CSS).not.toContain("[data-vn-dialogue]");
    expect(APERTURE_STAGE_CSS).toContain("[data-vn-dialogue]");
  });

  test("DOCKED_LIBRARY_CSS eliminates redundant !important bloat", () => {
    const importantCount = (DOCKED_LIBRARY_CSS.match(/!important/g) ?? []).length;
    expect(importantCount).toBeLessThan(10);
  });

  test("PresentationRulesPanel.guardNavigation uses in-DOM alertdialog instead of window.confirm", () => {
    const panel = new PresentationRulesPanel(() => "chat-1", () => {});
    const mount = new FakeNode("div");
    const host = panel.host;
    if (!(host instanceof FakeNode)) throw new Error("Presentation rules should mount in the fake DOM");
    mount.append(host);
    mount.querySelector("form")!.dispatchEvent(new FakeEvent("input"));
    let navigated = false;
    const allowed = panel.guardNavigation(() => { navigated = true; });
    expect(allowed).toBe(false);
    expect(navigated).toBe(false);

    const dialog = mount.querySelector('[data-rule-nav-confirm][role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.hidden).toBe(false);

    const leaveBtn = dialog!.querySelector("[data-rule-nav-leave]")!;
    leaveBtn.click();
    expect(navigated).toBe(true);
    expect(dialog?.hidden).toBe(true);
  });

  test("escapeHtml escapes all five HTML metacharacters", () => {
    expect(escapeHtml(`<div class="x" data-y='z'>a & b</div>`)).toBe(
      "&lt;div class=&quot;x&quot; data-y=&#39;z&#39;&gt;a &amp; b&lt;/div&gt;",
    );
  });
});
