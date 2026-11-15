import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MOBILE_SHEET_DETENTS,
  mobileSheetDetentHeight,
  sheetHeight,
  snapMobileSheetDetent,
  type ReaderPreferences,
} from "../../shared/reader-preferences.js";
import { WORKSPACE_CSS } from "../settings/workspace-css.js";
import { APERTURE_CSS_LENS_FOLIO } from "../theme/aperture/lens-folio.js";
import { APERTURE_CSS_ROUTE_BAR_READER } from "../theme/aperture/route-bar-reader.js";
import { APERTURE_CSS_SHEETS_STAGE_PALETTES } from "../theme/aperture/sheets-stage-palettes.js";
import { VN_BASE_CSS } from "../theme/base-css.js";
import { READER_SHELL_CSS } from "../theme/reader-shell-css.js";
import { DialogueSheet } from "./dialogue-sheet.js";
import { DOSSIER_CSS } from "./dossier-card.js";
import { RPG_HUD_CSS } from "./rpg-hud.js";
import { THEME_MARKUP } from "./stage-markup.js";
import { FakeEvent, FakeNode, installFakeDocument } from "./stage-test-dom.js";
import { VnStage } from "./vn-stage.js";

const partialPrefs = (value: Partial<ReaderPreferences>) => value as ReaderPreferences;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Wave 4 P5 #1: Mobile 3-Detent DialogueSheet", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installFakeDocument();
  });

  afterEach(() => {
    restore();
  });

  test("mobileSheetDetentHeight & snapMobileSheetDetent enforce Peek 48 / Reader 142 / Expanded 65vh while desktop preserves 224 floor", () => {
    expect(MOBILE_SHEET_DETENTS).toEqual({ compact: 48, reading: 142, expandedRatio: 0.65 });
    expect(mobileSheetDetentHeight("compact", 700, 812)).toBe(48);
    expect(mobileSheetDetentHeight("reading", 700, 812)).toBe(142);
    expect(mobileSheetDetentHeight("expanded", 700, 800)).toBe(520);

    expect(snapMobileSheetDetent(52, 700, 800)).toEqual({ detent: "compact", px: 48 });
    expect(snapMobileSheetDetent(170, 700, 800)).toEqual({ detent: "reading", px: 142 });
    expect(snapMobileSheetDetent(490, 700, 800)).toEqual({ detent: "expanded", px: 520 });

    expect(sheetHeight("compact", 900)).toBe(224);
  });

  test("DialogueSheet mobile detents drag down to 48px, snap via snapToDetent, publish occupied ratio, and zero ratio when hidden", () => {
    const saved: ReaderPreferences[] = [];
    const root = new FakeNode("div");
    root.dataset.vnMobileDetent = "true";
    Object.defineProperty(root, "clientWidth", { value: 390, configurable: true });
    Object.defineProperty(root, "clientHeight", { value: 800, configurable: true });
    root.getBoundingClientRect = () => ({ width: 390, height: 800, top: 0, bottom: 800, left: 0, right: 390 });

    const dialogue = new FakeNode("section");
    let currentDialogueHeight = 142;
    dialogue.getBoundingClientRect = () => ({
      width: 390,
      height: currentDialogueHeight,
      top: 800 - currentDialogueHeight,
      bottom: 800,
      left: 0,
      right: 390,
    });
    root.append(dialogue);

    const sheet = new DialogueSheet(
      root as unknown as HTMLElement,
      dialogue as unknown as HTMLElement,
      () => {},
      (prefs) => saved.push(prefs),
    );

    const expandBtn = root.querySelector('[data-action="caption-expand"]');
    expect(expandBtn).toBeTruthy();
    expect(expandBtn?.hidden).toBe(false);

    sheet.snapToDetent("compact");
    expect(sheet.getDetent()).toBe("compact");
    expect(root.dataset.vnSheetDetent).toBe("compact");
    expect(dialogue.style.height).toBe("48px");
    expect(Number.parseFloat(root.style["--vn-dialogue-occupied-ratio"] ?? "0")).toBeCloseTo(48 / 800, 3);

    const handle = root.querySelector("[data-vn-sheet-handle]")!;
    currentDialogueHeight = 142;
    handle.dispatchEvent(new FakeEvent("pointerdown", { button: 0, pointerId: 1, clientY: 600 } as never));
    handle.dispatchEvent(new FakeEvent("pointermove", { pointerId: 1, clientY: 740 } as never));
    expect(dialogue.style.height).toBe("48px");
    currentDialogueHeight = 48;
    handle.dispatchEvent(new FakeEvent("pointerup", { pointerId: 1, clientY: 740 } as never));
    expect(saved.at(-1)?.sheetSize).toBe("compact");

    // Dragging to an arbitrary intermediate height preserves the user's height without snapping
    currentDialogueHeight = 142;
    handle.dispatchEvent(new FakeEvent("pointerdown", { button: 0, pointerId: 2, clientY: 600 } as never));
    handle.dispatchEvent(new FakeEvent("pointermove", { pointerId: 2, clientY: 512 } as never));
    expect(dialogue.style.height).toBe("230px");
    currentDialogueHeight = 230;
    handle.dispatchEvent(new FakeEvent("pointerup", { pointerId: 2, clientY: 512 } as never));
    expect(dialogue.style.height).toBe("230px");

    currentDialogueHeight = 230;
    handle.dispatchEvent(new FakeEvent("pointerdown", { button: 0, pointerId: 3, clientY: 512 } as never));
    handle.dispatchEvent(new FakeEvent("pointermove", { pointerId: 3, clientY: 650 } as never));
    expect(dialogue.style.height).toBe("92px");
    currentDialogueHeight = 92;
    handle.dispatchEvent(new FakeEvent("pointerup", { pointerId: 3, clientY: 650 } as never));
    expect(dialogue.style.height).toBe("92px");
    expect(root.dataset.vnSheetDetent).toBe("reading");

    sheet.snapToDetent("expanded");
    expect(sheet.getDetent()).toBe("expanded");
    expect(dialogue.style.height).toBe("520px");

    sheet.setHidden(true);
    expect(root.style["--vn-dialogue-occupied-ratio"]).toBe("0.000");

    sheet.destroy();
  });
});

describe("Wave 4 Seat 3: 44px Touch Floor, Keyboard Insets & Aria Live Decoupling", () => {
  let restore: () => void;
  let mount: FakeNode;

  beforeEach(() => {
    restore = installFakeDocument();
    mount = new FakeNode("div");
  });

  afterEach(() => {
    restore();
  });

  test("CSS surfaces eliminate sub-44px button overrides, restore clean button, keep 12px speaker, and keep draft bar sticky", () => {
    expect(WORKSPACE_CSS).not.toContain("[data-draft-bar]{position:static");
    expect(WORKSPACE_CSS).toContain("[data-draft-bar]{position:sticky");

    const studioCss = readFileSync(path.join(process.cwd(), "src/frontend/image-review/studio.ts"), "utf8");
    const libraryCss = readFileSync(path.join(process.cwd(), "src/frontend/image-library/library.ts"), "utf8");

    const interactiveBlocks = [
      ...APERTURE_CSS_ROUTE_BAR_READER.match(/\.(?:route-actions button|caption-tool|round-ghost)\s*\{[^}]*\}/g) ?? [],
      ...APERTURE_CSS_LENS_FOLIO.match(/(?:\.caption-tool|\[data-vn-show-text\]|\[data-vn-sheet-handle\])\s*\{[^}]*\}/g) ?? [],
      ...APERTURE_CSS_SHEETS_STAGE_PALETTES.match(/(?:\[data-workspace-back\][^}]*\}|\.workspace-back-btn\.has-label\s*\{[^}]*\}|\.chip\s*\{[^}]*\}|\[data-vn-backlog-search\]\s*\{[^}]*\})/g) ?? [],
      ...DOSSIER_CSS.match(/(?:\[data-dossier-cast-chip\]|\.present-cast-pill[^}]*|\.story-dna-studio-actions button|\.story-dna-footer button|\.vn-inline-tooltip-close)\{[^}]*\}/g) ?? [],
    ];
    expect(interactiveBlocks.length).toBeGreaterThan(8);
    for (const block of interactiveBlocks) {
      expect(block).not.toMatch(/(?:min-)?(?:width|height)\s*:\s*(?:0|[1-9]|[1-3]\d|4[0-3])px\s*!important/i);
    }

    expect(RPG_HUD_CSS).toContain("min-height: 44px");
    expect(studioCss).not.toMatch(/min-height:(?:28|30|32|40)px/);
    expect(libraryCss).toContain("min-height: 44px");

    expect(APERTURE_CSS_ROUTE_BAR_READER).not.toMatch(/\[data-vn-clean-restore\],/);
    expect(APERTURE_CSS_LENS_FOLIO).not.toMatch(/\[data-action="caption-expand"\]\s*\{\s*display:\s*none/);
    const speakerBlocks = APERTURE_CSS_LENS_FOLIO.match(/[^\n{}]*\[data-vn-speaker\][^{]*\{[^}]*\}/g) ?? [];
    expect(speakerBlocks.length).toBeGreaterThan(0);
    for (const block of speakerBlocks) {
      expect(block).not.toMatch(/font-size:\s*(?:9\.5|10|11)px/);
    }

    expect(READER_SHELL_CSS).toContain("--reader-keyboard-inset:0px");
    expect(READER_SHELL_CSS).toContain("[data-vn-interaction] { bottom:calc(var(--reader-bottom) + var(--reader-keyboard-inset,0px)); }");
    expect(studioCss).toContain("var(--reader-keyboard-inset,0px)");
    expect(VN_BASE_CSS).toContain(".sr-only");
    expect(VN_BASE_CSS).toContain("[data-vn-scrub-dot]::before");
    expect(VN_BASE_CSS).toContain("var(--reader-keyboard-inset, 0px)");
  });

  test("THEME_MARKUP & VnStage decouple aria-live from streaming text and announce once after typing completes", async () => {
    expect(THEME_MARKUP).not.toMatch(/<p[^>]*data-vn-dialogue-text[^>]*aria-live/);
    expect(THEME_MARKUP).toMatch(/data-vn-dialogue-live[^>]*aria-live="polite"/);

    const stage = new VnStage({
      mount: mount as unknown as HTMLElement,
      textSpeed: 80,
    });
    stage.setReaderPreferences(partialPrefs({ adjustableSheetEnabled: true, layout: "overlay", sheetSize: "reading", backgroundOpacity: 0.9 }));

    const stageRoot = (stage as unknown as { root: FakeNode }).root;
    const live = stageRoot.querySelector("[data-vn-dialogue-live]")!;
    const pText = stageRoot.querySelector("[data-vn-dialogue-text]")!;

    expect(live).toBeTruthy();
    expect(pText.getAttribute("aria-live")).toBeNull();

    // FakeNode does not instantiate real DOM Text nodes for TypewriterWalker, so simulate active typing first
    const tw = (stage as unknown as {
      typewriter: { prepare: (el: HTMLElement) => boolean; step: (smart: boolean, cb?: () => void) => boolean; finishNow?: () => void; finish: () => void };
    }).typewriter;
    tw.prepare = () => true;
    tw.step = () => false;
    tw.finish = () => {};

    stage.loadTurn({
      mode: "standard",
      paragraphs: [{ id: "p1", text: "Hello there, traveler.", speaker: "Mira" }],
    });

    // While typing is still in progress, live region stays silent
    expect(live.textContent).toBe("");

    await wait(25);
    (stage as unknown as { advance(): void }).advance();

    expect(live.textContent).toBe("Mira: Hello there, traveler.");
    stage.destroy();
  });
});
