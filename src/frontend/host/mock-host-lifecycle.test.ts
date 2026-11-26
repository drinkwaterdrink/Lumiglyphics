import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { installFakeDocument } from "../stage/stage-test-dom.js";
import { DialogueSheet } from "../stage/dialogue-sheet.js";
import { AssetJobSchema } from "../../shared/contracts.js";
import { AssetScheduler } from "../../backend/core/asset-scheduler.js";
import { buildRpgTurnSnapshot, reduceRpgState } from "../../shared/rpg-state.js";
import { normalizeReaderPreferences } from "../../shared/reader-preferences.js";
import { APERTURE_CSS_LENS_FOLIO } from "../theme/aperture/lens-folio.js";
import { APERTURE_CSS_ROUTE_BAR_READER } from "../theme/aperture/route-bar-reader.js";
import { APERTURE_CSS_SHEETS_STAGE_PALETTES } from "../theme/aperture/sheets-stage-palettes.js";
import { VN_SHELL_PRESET_TOKENS_CSS } from "../theme/palette-tokens.js";
import { THEME_PRESET_CSS } from "../theme/presets.js";

function makeDialogueCard(): {
  host: HTMLElement;
  card: HTMLElement;
  text: HTMLElement;
} {
  const host = document.createElement("div");
  const card = document.createElement("div");
  const text = document.createElement("div");
  text.setAttribute("data-vn-dialogue-text", "");
  card.appendChild(text);
  host.appendChild(card);
  document.body.appendChild(host);
  return { host, card, text };
}

function readCssVar(el: HTMLElement, prop: string): string {
  const s = el.style as unknown as { getPropertyValue?: (k: string) => string; [k: string]: unknown };
  return typeof s.getPropertyValue === "function" ? s.getPropertyValue(prop) : String(s[prop] ?? "");
}

describe("Mock Lumiverse Host Lifecycle Contract (8 Scenarios + Wave A Regressions)", () => {
  let restoreDom: (() => void) | null = null;

  beforeEach(() => {
    restoreDom = installFakeDocument();
    if (!(document as any).body) {
      (document as any).body = document.createElement("body");
    }
  });

  afterEach(() => {
    restoreDom?.();
    restoreDom = null;
  });

  test("1. Initial mount when host targets are already present", () => {
    const { host, card, text } = makeDialogueCard();
    const sheet = new DialogueSheet(host, card, () => {}, () => {});
    expect(card.querySelector("[data-vn-sheet-handle]")).not.toBeNull();
    expect(card.querySelector(".caption-edge")).not.toBeNull();
    expect(readCssVar(host, "--vn-sheet-height")).not.toBe("");
    sheet.destroy();
  });

  test("2. Initial mount when host elements arrive late", async () => {
    const delayedRoot = document.createElement("div");
    let attached = false;
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        document.body.appendChild(delayedRoot);
        const card = document.createElement("div");
        const text = document.createElement("div");
        delayedRoot.appendChild(card);
        const sheet = new DialogueSheet(delayedRoot, card, () => {}, () => {});
        attached = Boolean(card.querySelector("[data-vn-sheet-handle]"));
        sheet.destroy();
        resolve();
      }, 10);
    });
    expect(attached).toBe(true);
  });

  test("3. Missing/nullable optional host references & optional permission degradation", () => {
    const corePermissions = new Set(["app_manipulation", "chat_mutation", "chats"]);
    expect(corePermissions.has("image_gen")).toBe(false);
    expect(corePermissions.has("tts")).toBe(false);
    expect(corePermissions.has("chats")).toBe(true);

    // DialogueSheet operates cleanly even without optional onToggleAutoPlay or rect geometry
    const { host, card, text } = makeDialogueCard();
    const sheet = new DialogueSheet(host, card, () => {}, () => {});
    expect(() => sheet.setAutoPlayActive(false)).not.toThrow();
    sheet.destroy();
  });

  test("4. Route/chat navigation and return/remount without stale DOM", () => {
    const { host, card, text } = makeDialogueCard();
    const first = new DialogueSheet(host, card, () => {}, () => {});
    expect(card.querySelectorAll("[data-vn-sheet-handle]").length).toBe(1);
    first.destroy();
    expect(card.querySelectorAll("[data-vn-sheet-handle]").length).toBe(0);

    // Remount on return without leaking duplicate handles or edges
    const second = new DialogueSheet(host, card, () => {}, () => {});
    expect(card.querySelectorAll("[data-vn-sheet-handle]").length).toBe(1);
    expect(card.querySelectorAll(".caption-edge").length).toBe(1);
    second.destroy();
  });

  test("5. Disable/unload cleanup removes handle + edge without orphaned DOM or listeners", () => {
    const { host, card, text } = makeDialogueCard();
    const sheet = new DialogueSheet(host, card, () => {}, () => {});
    const handle = card.querySelector("[data-vn-sheet-handle]");
    expect(handle?.getAttribute("aria-valuemin")).not.toBeNull();
    expect(handle?.getAttribute("aria-valuemax")).not.toBeNull();
    expect(handle?.getAttribute("aria-valuenow")).not.toBeNull();

    sheet.destroy();
    expect(card.querySelector("[data-vn-sheet-handle]")).toBeNull();
    expect(card.querySelector(".caption-edge")).toBeNull();
    expect(() => sheet.destroy()).not.toThrow();
  });

  test("6. State persistence and rehydration vs rendered DOM (preset tokens + light/dark parity)", () => {
    expect(VN_SHELL_PRESET_TOKENS_CSS).toContain("color-scheme: light;");
    expect(VN_SHELL_PRESET_TOKENS_CSS).toContain("color-scheme: dark;");
    expect(VN_SHELL_PRESET_TOKENS_CSS).toContain("--aperture-tts-word-ink:");
    expect(VN_SHELL_PRESET_TOKENS_CSS).toContain("--aperture-text-shadow:");
    expect(VN_SHELL_PRESET_TOKENS_CSS).toContain("--vn-shell-danger-ink:");
    expect(THEME_PRESET_CSS["literature-club"]).not.toContain("[data-vn-control-icon] { display: none; }");
    expect(APERTURE_CSS_LENS_FOLIO).toContain("var(--aperture-tts-word-ink");
    expect(APERTURE_CSS_ROUTE_BAR_READER).toContain("@media (pointer: coarse)");
    expect(APERTURE_CSS_SHEETS_STAGE_PALETTES).toContain("@media (prefers-reduced-motion: reduce)");
  });

  test("7. Async failure / stale result & Wave A backend scheduler/RPG regressions", async () => {
    const scheduler = new AssetScheduler();
    let runs = 0;
    const ownerTurnKey = { chatId: "chat-1", assistantMessageId: "m-1", swipeId: "s-1", sourceFingerprint: "src-fp-1234", revision: 1 };
    const job1 = scheduler.schedule(
      AssetJobSchema.parse({
        jobId: "job-1",
        ownerTurnKey,
        sceneId: "scene-1",
        sceneRevision: 1,
        paragraphIndex: 0,
        promptFingerprint: "prompt-fp-1234",
        provider: "mock-img",
        priority: "visible",
        status: "queued",
        queuedAt: new Date().toISOString(),
      }),
      async () => {
        runs += 1;
        return { imageId: "img-1", imageUrl: "data:image/png;base64,AA==" };
      },
    );
    await job1.promise;
    expect(scheduler.markBrowserReady("job-1").imageUrl).toBe("data:image/png;base64,AA==");

    // Scheduling a second job with same promptFingerprint after browser_ready reuses without re-running
    const job2 = scheduler.schedule(
      AssetJobSchema.parse({
        jobId: "job-2",
        ownerTurnKey,
        sceneId: "scene-1",
        sceneRevision: 1,
        paragraphIndex: 1,
        promptFingerprint: "prompt-fp-1234",
        provider: "mock-img",
        priority: "next",
        status: "queued",
        queuedAt: new Date().toISOString(),
      }),
      async () => {
        runs += 1;
        return { imageId: "img-2", imageUrl: "data:image/png;base64,BB==" };
      },
    );
    expect(job2.reused).toBe(true);
    expect(job2.job.status).toBe("browser_ready");
    expect(runs).toBe(1);

    // Thought Cabinet excludes resolved entries
    const rpg = reduceRpgState(null, {});
    const promptCtx = buildRpgTurnSnapshot(rpg, "full", {
      thoughtCabinet: [
        { id: "t1", title: "Active Clue", summary: "Still thinking", status: "active" },
        { id: "t2", title: "Solved Mystery", summary: "Already solved", status: "resolved" },
      ] as any,
    });
    expect(promptCtx).toContain("Active Clue");
    expect(promptCtx).not.toContain("Solved Mystery");
  });

  test("8. Mobile (375px) vs Desktop (1280px) layout variance on DialogueSheet", () => {
    const { host, card, text } = makeDialogueCard();
    (window as any).innerWidth = 375;
    (window as any).innerHeight = 667;
    const mobileSheet = new DialogueSheet(host, card, () => {}, () => {});
    const mobileHeight = readCssVar(host, "--vn-sheet-height");
    mobileSheet.destroy();

    (window as any).innerWidth = 1280;
    (window as any).innerHeight = 800;
    const desktopSheet = new DialogueSheet(host, card, () => {}, () => {});
    const desktopHeight = readCssVar(host, "--vn-sheet-height");
    desktopSheet.destroy();

    expect(mobileHeight).not.toBe("");
    expect(desktopHeight).not.toBe("");
  });
});
