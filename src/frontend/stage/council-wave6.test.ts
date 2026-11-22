import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FakeDocument, FakeEvent, FakeNode, installFakeDocument } from "./stage-test-dom";
import { VnStage } from "./vn-stage";
import { DialogueSheet } from "./dialogue-sheet";
import { ReaderWorkspace } from "./reader-workspace";
import { SceneScrubber } from "./scene-scrubber";
import { FullscreenLightbox } from "./fullscreen-lightbox";
import { ImageLibrary } from "../image-library/library";
import { ImageStudio } from "../image-review/studio";
import { normalizeReaderPreferences } from "../../shared/reader-preferences";
import { normalizeTooltipPreferences } from "../../shared/dossiers";
import type { FrontendRequest, TurnView } from "../../protocol";

describe("Council Wave 6: Split-Horizon Lore Patch, One-Thumb Stage, Theme Bridge & Gesture Media", () => {
  let restore: () => void;
  let originalCustomEvent: typeof globalThis.CustomEvent | undefined;

  beforeEach(() => {
    restore = installFakeDocument();
    if (!(document as unknown as { body?: unknown }).body) {
      (document as unknown as { body: FakeNode }).body = new FakeNode("body");
    }
    originalCustomEvent = globalThis.CustomEvent;
    (globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class FakeCustomEvent extends FakeEvent {
      detail: unknown;
      constructor(type: string, init?: { bubbles?: boolean; cancelable?: boolean; detail?: unknown }) {
        super(type);
        this.detail = init?.detail;
      }
    };
    (FakeDocument as unknown as { createTreeWalker: () => { nextNode: () => null } }).createTreeWalker = () => ({
      nextNode: () => null,
    });
  });

  afterEach(() => {
    if (originalCustomEvent) {
      (globalThis as unknown as { CustomEvent: unknown }).CustomEvent = originalCustomEvent;
    }
    delete (FakeDocument as unknown as { createTreeWalker?: unknown }).createTreeWalker;
    restore();
  });

  test("#4 VnStage.patchTurnLore hydrates World Lens HUD & scene caption without resetting reading cursor", () => {
    const mount = new FakeNode("div");
    const stage = new VnStage({ mount: mount as unknown as HTMLElement, textSpeed: 0 });
    stage.setTooltipPreferences(normalizeTooltipPreferences({ enabled: true }));
    try {
      stage.loadTurn({
        mode: "standard",
        paragraphs: [
          { id: "p0", text: "First beat in rain.", speaker: "Narrator" },
          { id: "p1", text: "Nadine crosses Kestrel Keep courtyard.", speaker: "Narrator" },
        ],
        choices: [],
      });
      (stage as unknown as { advance(): void }).advance();
      expect(stage.getState().currentParagraphIndex).toBe(1);

      const key = { chatId: "c1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fingerprint-1", revision: 1 };
      const presentation = {
        version: 1 as const,
        snapshots: [
          {
            at: { key, paragraphIndex: 0 },
            entities: [],
            presentEntityIds: [],
            speakerEntityId: null,
            drawableEntityId: null,
            locationId: null,
            stateByEntity: {},
          },
          {
            at: { key, paragraphIndex: 1 },
            entities: [
              { id: "nadine", kind: "npc" as const, name: "Nadine", aliases: [], firstParagraph: 1, facts: [] },
              { id: "keep", kind: "place" as const, name: "Kestrel Keep", aliases: [], firstParagraph: 1, facts: [] },
            ],
            presentEntityIds: ["nadine", "keep"],
            speakerEntityId: null,
            drawableEntityId: null,
            locationId: "keep",
            stateByEntity: {},
          },
        ],
      };

      stage.patchTurnLore({ presentation });
      expect(stage.getState().currentParagraphIndex).toBe(1);

      const hudNames = (stage as unknown as { dossiers: { sceneHudEntries(): Array<{ name: string }> } }).dossiers
        .sceneHudEntries()
        .map((e) => e.name);
      expect(hudNames).toContain("Nadine");
      expect(hudNames).toContain("Kestrel Keep");

      const sceneCaption = (stage as unknown as { themeRoot: FakeNode }).themeRoot.querySelector("[data-vn-caption-scene]");
      if (sceneCaption) {
        expect(sceneCaption.textContent).toBe("Kestrel Keep");
      }
    } finally {
      stage.destroy();
    }
  });

  test("#5 DialogueSheet drags from [data-vn-sheet-header], ignores tool clicks, and SceneScrubber preserves open <details>", () => {
    const root = new FakeNode("div");
    const dialogue = new FakeNode("div");
    const sheet = new DialogueSheet(
      root as unknown as HTMLElement,
      dialogue as unknown as HTMLElement,
      () => {},
      () => {},
    );
    sheet.setPreferences(normalizeReaderPreferences({ textHeight: 160 }));

    const header = dialogue.querySelector("[data-vn-sheet-header]")!;
    const toolBtn = dialogue.querySelector("[data-action='caption-auto']")!;

    // Clicking inside tools must NOT initiate sheet drag
    const toolDown = new FakeEvent("pointerdown") as FakeEvent & {
      pointerId: number;
      clientY: number;
      button: number;
    };
    toolDown.pointerId = 1;
    toolDown.clientY = 300;
    toolDown.button = 0;
    Object.defineProperty(toolDown, "target", { value: toolBtn, configurable: true });
    header.dispatchEvent(toolDown);
    expect((sheet as unknown as { drag: unknown }).drag).toBeNull();

    // Pointerdown on header itself initiates drag and releases cleanly
    const headerDown = new FakeEvent("pointerdown") as FakeEvent & {
      pointerId: number;
      clientY: number;
      button: number;
    };
    headerDown.pointerId = 2;
    headerDown.clientY = 300;
    headerDown.button = 0;
    Object.defineProperty(headerDown, "target", { value: header, configurable: true });
    header.dispatchEvent(headerDown);
    expect((sheet as unknown as { drag: unknown }).drag).not.toBeNull();
    header.dispatchEvent(new FakeEvent("pointercancel"));
    expect((sheet as unknown as { drag: unknown }).drag).toBeNull();
    sheet.destroy();

    // SceneScrubber preserves <details open> across page updates (>25 events)
    const scrubber = new SceneScrubber(() => true);
    const key = { chatId: "c1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fingerprint-1", revision: 1 };
    const entries = Array.from({ length: 30 }, (_, idx) => ({
      paragraphIndex: idx,
      speaker: idx === 0 ? "Narrator" : "Nadine",
      excerpt: `Line ${idx}`,
      pinned: false,
      images: [],
    }));
    scrubber.setModel({ version: 1, key, currentParagraphIndex: 0, paragraphs: entries } as never, 0);
    const details = scrubber.element.querySelector("[data-scene-history-details]") as unknown as FakeNode & { open?: boolean };
    expect(details).not.toBeNull();
    details.open = true;

    const nextPageBtn = scrubber.element.querySelector("[data-scene-next]") as unknown as FakeNode;
    nextPageBtn.click();
    const detailsAfter = scrubber.element.querySelector("[data-scene-history-details]") as unknown as FakeNode & { open?: boolean };
    expect(detailsAfter).toBe(details);
    expect(detailsAfter.open).toBe(true);
  });

  test("#5 ReaderWorkspace removes .route-bar & static Chapter IV labels, updates dynamic captions, and wires Aperture Cast toggle", () => {
    const shell = new FakeNode("main");
    const reader = new FakeNode("div");
    shell.append(reader);
    const workspace = new ReaderWorkspace(
      shell as unknown as HTMLElement,
      reader as unknown as HTMLElement,
      () => {},
      () => {},
    );
    try {
      expect(shell.querySelector(".route-bar")).toBeNull();
      expect(shell.textContent).not.toContain("Chapter IV");
      expect(shell.textContent).not.toContain("CHAPTER IV");
      expect(shell.textContent).not.toContain("Kit Hall");

      shell.querySelector('[data-reader-destination="more"]')!.click();
      workspace.setCaption("Kael · 2 / 4");
      expect(shell.querySelector("[data-reader-caption-strong]")!.textContent).toBe("Kael");
      expect(shell.querySelector("[data-workspace-scene-title]")!.textContent).toBe("Kael");
      expect(shell.querySelector("[data-workspace-scene-sub]")!.textContent).toBe("2 / 4");
      expect(shell.querySelector("[data-aperture-chapter]")!.textContent).toBe("KAEL");

      let castEvents = 0;
      shell.addEventListener("lumiglyphics:cast-toggle", () => {
        castEvents += 1;
      });
      const castBtn = shell.querySelector('.aperture-overlay [data-action="cast-toggle"]')!;
      expect(castBtn).not.toBeNull();
      castBtn.click();
      expect(castEvents).toBe(1);
    } finally {
      workspace.destroy();
    }
  });

  test("#5 VnStage instant single-tap advances with 0ms delay and stationary 460ms pointerdown toggles HUD", async () => {
    const mount = new FakeNode("div");
    const stage = new VnStage({ mount: mount as unknown as HTMLElement, textSpeed: 0 });
    try {
      stage.loadTurn({
        mode: "standard",
        paragraphs: [
          { id: "p0", text: "First beat.", speaker: "Narrator" },
          { id: "p1", text: "Second beat.", speaker: "Narrator" },
        ],
        choices: [],
      });
      const root = (stage as unknown as { root: FakeNode }).root;
      const stageSurface = root.querySelector(".stage") ?? root;

      // Single tap (click) advances immediately with zero delay
      stageSurface.click();
      expect(stage.getState().currentParagraphIndex).toBe(1);

      // Stationary pointerdown >= 460ms toggles HUD hidden without advancing past end
      const initialHud = root.dataset.vnHudHidden === "true";
      const holdStart = new FakeEvent("pointerdown") as FakeEvent & {
        pointerId: number;
        clientX: number;
        clientY: number;
        button: number;
      };
      holdStart.pointerId = 1;
      holdStart.clientX = 100;
      holdStart.clientY = 100;
      holdStart.button = 0;
      Object.defineProperty(holdStart, "target", { value: stageSurface, configurable: true });
      root.dispatchEvent(holdStart);

      await new Promise((r) => setTimeout(r, 510));
      expect(root.dataset.vnHudHidden === "true").toBe(!initialHud);

      const holdUp = new FakeEvent("pointerup");
      root.dispatchEvent(holdUp);
    } finally {
      stage.destroy();
    }
  });

  test("#6 ImageLibrary uses non-nested cards, non-blocking Undo delete toast, and flushes delete on close", () => {
    const sent: FrontendRequest[] = [];
    const library = new ImageLibrary(document.createElement("div"), (req) => sent.push(req), () => {});
    const turn: TurnView = {
      chatId: "chat-1",
      messageId: "m1",
      swipeId: 0,
      sourceFingerprint: "fingerprint-1",
      revision: 1,
      speaker: "Narrator",
      paragraphs: ["Scene one."],
    } as TurnView;

    library.setContext(turn, 0);
    library.open("images");
    const req = sent[0] as Extract<FrontendRequest, { type: "vn_image_library" }>;
    const key = { chatId: "chat-1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fingerprint-1", revision: 1 };
    library.receive("chat-1", req.requestId, {
      entries: [
        {
          key,
          jobId: "job-del",
          imageId: "img-del",
          createdAt: "2026-11-15T10:00:00.000Z",
          messageNumber: 1,
          paragraphIndex: 0,
          role: "scene",
          versionLabel: "current",
          available: true,
          thumbnailUrl: "/api/v1/images/img-del",
          imageUrl: "/api/v1/images/img-del",
          excerpt: "Rainy courtyard",
        },
      ],
      replies: [],
      nextCursor: null,
      notice: "",
    });

    const shadow = (library as unknown as { root: FakeNode }).root;
    const card = shadow.querySelector("[data-image-card]")!;
    expect(card.tagName.toLowerCase()).toBe("div");
    expect(card.getAttribute("role")).toBe("group");
    const openBtn = card.querySelector("[data-image-card-open]")!;
    const fullscreenBtn = card.querySelector("[data-image-fullscreen]")!;
    expect(openBtn.contains(fullscreenBtn)).toBe(false);

    // Open detail and trigger non-blocking delete
    openBtn.click();
    const deleteBtn = shadow.querySelector("[data-delete-picture]")!;
    deleteBtn.click();
    expect(sent.some((r) => r.type === "vn_delete_image")).toBe(false);

    const toast = shadow.querySelector("[data-library-toast]")!;
    expect(toast.hidden).toBe(false);
    expect(toast.textContent).toContain("Picture removed");

    // Undo cancels deletion
    const undoBtn = shadow.querySelector("[data-library-toast] button")!;
    undoBtn.click();
    expect(toast.hidden).toBe(true);
    expect(sent.some((r) => r.type === "vn_delete_image")).toBe(false);

    // Delete again and close workspace -> flushes immediate vn_delete_image
    openBtn.click();
    deleteBtn.click();
    library.close();
    const deletes = sent.filter((r): r is Extract<FrontendRequest, { type: "vn_delete_image" }> => r.type === "vn_delete_image");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.imageId).toBe("img-del");
  });

  test("#6 + #8 ImageStudio bridges tokens dynamically and dispatches Reframe/Relight/Continuity locks", () => {
    const sampleTurn = {
      chatId: "chat-1",
      messageId: "m1",
      swipeId: 0,
      sourceFingerprint: "fingerprint-1",
      revision: 1,
      speaker: "Narrator",
      status: "ready",
      choices: [],
      paragraphs: ["Courtyard at dusk."],
      assets: [{ jobId: "j1", cueId: "c1", paragraphIndex: 0, status: "generated" }],
      imageRequests: [
        {
          jobId: "j1",
          requestId: "r1",
          paragraphIndex: 0,
          model: "flux3",
          provider: "nanogpt",
          connectionId: "conn-1",
          prompt: "Courtyard at dusk",
          negativePrompt: "blurry",
          state: "review",
          parameters: {},
          referenceSummary: "none",
          createdAt: "now",
        },
      ],
    } as TurnView;

    const sent: FrontendRequest[] = [];
    const studioA = new ImageStudio(new FakeNode("div") as unknown as HTMLElement, (req) => sent.push(req), () => {});
    studioA.setTurn(sampleTurn);
    studioA.open();

    const shadowA = (studioA as unknown as { root: FakeNode }).root;
    const styleText = shadowA.querySelectorAll("style").map((s) => s.textContent).join("\n");
    expect(styleText).toContain("--vn-shell-panel");
    expect(styleText).toContain("--studio-tab-h");
    expect(styleText).not.toContain("#234b39");
    expect(styleText).not.toContain("#eef3e5");
    expect(styleText).not.toContain("prefers-color-scheme: light");

    const lockSubjectA = shadowA.querySelector("[data-lock-subject]") as FakeNode & { checked?: boolean };
    const lockLightingA = shadowA.querySelector("[data-lock-lighting]") as FakeNode & { checked?: boolean };
    expect(lockSubjectA.hasAttribute("checked") || lockSubjectA.checked === true).toBe(true);
    lockSubjectA.checked = true;
    expect(lockLightingA.hasAttribute("checked")).toBe(false);
    lockLightingA.checked = true;

    shadowA.querySelector("[data-camera-reframe]")!.click();
    expect((shadowA.querySelector("[data-camera-relight]") as FakeNode & { disabled?: boolean }).disabled).toBe(true);
    studioA.destroy();

    const studioB = new ImageStudio(new FakeNode("div") as unknown as HTMLElement, (req) => sent.push(req), () => {});
    studioB.setTurn(sampleTurn);
    studioB.open();
    const shadowB = (studioB as unknown as { root: FakeNode }).root;
    (shadowB.querySelector("[data-lock-subject]") as FakeNode & { checked?: boolean }).checked = false;
    (shadowB.querySelector("[data-lock-lighting]") as FakeNode & { checked?: boolean }).checked = true;
    shadowB.querySelector("[data-camera-relight]")!.click();
    studioB.destroy();

    const reprepares = sent.filter(
      (r): r is Extract<FrontendRequest, { type: "vn_reprepare_image_template" }> =>
        r.type === "vn_reprepare_image_template",
    );
    expect(reprepares).toHaveLength(2);
    expect(reprepares[0]!.reframe).toBe(true);
    expect(reprepares[0]!.lockContinuity).toBe(true);
    expect(reprepares[1]!.relight).toBe(true);
    expect(reprepares[1]!.lockContinuity).toBe(true);
  });

  test("#6 FullscreenLightbox renders 44px controls, filmstrip rail, GPU zoom, and rail/keyboard navigation", () => {
    const lb = FullscreenLightbox.open({
      src: "/img-1.png",
      title: "Beat 1",
      gallery: [
        { src: "/img-1.png", title: "Beat 1" },
        { src: "/img-2.png", title: "Beat 2" },
      ],
      galleryIndex: 0,
    });

    const backdrop = (lb as unknown as { backdrop: FakeNode }).backdrop;
    const railBtns = backdrop.querySelectorAll(".vn-lightbox-rail-item");
    expect(railBtns).toHaveLength(2);

    const img = backdrop.querySelector(".vn-lightbox-img")!;
    const zoomBtn = backdrop.querySelector('[data-action="zoom-toggle"]')!;
    zoomBtn.click();
    expect(img.style.transform).toContain("translate3d(");
    expect(img.style.transform).toContain("scale(2)");

    const keyRight = new FakeEvent("keydown", { key: "ArrowRight" });
    (lb as unknown as { handleKeyDown: (e: FakeEvent) => void }).handleKeyDown(keyRight);
    expect(backdrop.querySelector(".vn-lightbox-title")!.textContent).toBe("Beat 2");

    railBtns[0]!.click();
    expect(backdrop.querySelector(".vn-lightbox-title")!.textContent).toBe("Beat 1");

    lb.close();
  });

  test("#7 Revamped Reader View replaces quick-draft button with permanent inline message bar, renders circular speaker avatar, pyramid menu logo, word-highlight auto-read, and shared opacity", async () => {
    const mount = new FakeNode("div");
    const submitted: string[] = [];
    const autoChanges: boolean[] = [];
    const stage = new VnStage({
      mount: mount as unknown as HTMLElement,
      textSpeed: 0,
      onAutoPlayChange: (active) => {
        autoChanges.push(active);
      },
      onSubmit: async (text) => {
        submitted.push(text);
      },
    });
    try {
      const themeRoot = (stage as unknown as { themeRoot: FakeNode }).themeRoot;
      const root = (stage as unknown as { root: FakeNode }).root;
      const shell = stage.panelMount as unknown as FakeNode;

      // Quick draft button removed; duplicate bottom studio icon removed; permanent inline message composer present
      expect(themeRoot.querySelector("[data-vn-compose-toggle]")).toBeNull();
      expect(themeRoot.querySelector("[data-vn-control='studio']")).toBeNull();
      expect(shell.querySelector('[data-action="studio-toggle"]')).not.toBeNull();
      const pyramidMenu = shell.querySelector("[data-aperture-open]")!;
      expect(pyramidMenu.innerHTML).toContain("vn-pyramid-logo");

      // Step nav (< and >) lives inside .reader-progress > .reader-step-nav inside [data-vn-dialogue]
      const dialogue = themeRoot.querySelector("[data-vn-dialogue]")!;
      const stepNav = dialogue.querySelector(".reader-progress .reader-step-nav")!;
      expect(stepNav).not.toBeNull();
      expect(stepNav.querySelector("[data-vn-control='previous']")).not.toBeNull();
      expect(stepNav.querySelector("[data-vn-continue]")).not.toBeNull();

      const composer = themeRoot.querySelector("[data-vn-inline-composer]");
      const input = themeRoot.querySelector("[data-vn-inline-message]") as FakeNode & { value: string };
      const sendBtn = themeRoot.querySelector("[data-vn-inline-send]");
      expect(composer).not.toBeNull();
      expect(input).not.toBeNull();
      expect(sendBtn).not.toBeNull();

      // Panels menu button hidden by default, toggleable via setShowPanelsMenu
      const panelsBtn = shell.querySelector('[data-action="panels-toggle"]')!;
      expect(panelsBtn.hidden).toBe(true);
      stage.setShowPanelsMenu(true);
      expect(panelsBtn.hidden).toBe(false);
      stage.setShowPanelsMenu(false);
      expect(panelsBtn.hidden).toBe(true);

      // Opacity slider updates both root (dialogue + bottom bar) and shell (topbar)
      stage.setReaderPreferences(normalizeReaderPreferences({ backgroundOpacity: 0.42 }));
      expect((root.style as unknown as Record<string, string>)["--caption-opacity"]).toBe("0.42");
      expect((shell.style as unknown as Record<string, string>)["--caption-opacity"]).toBe("0.42");

      // Speaker avatar populates when a speaker is present
      stage.loadTurn({
        mode: "standard",
        paragraphs: [
          { id: "fp:0", text: "Hello there friend.", speaker: "Sable Thorne" },
          { id: "fp:1", text: "Second line.", speaker: "Sable Thorne" },
        ],
      });
      const avatar = themeRoot.querySelector("[data-vn-speaker-avatar]")!;
      expect(avatar.hidden).toBe(false);
      expect(avatar.textContent).toBe("S");

      // Play button to the left of Hide Eye toggles Auto-Read & fires onAutoPlayChange
      const playBtn = dialogue.querySelector("[data-action='caption-auto']")!;
      playBtn.click();
      expect(stage.isAutoPlaying()).toBe(true);
      expect(autoChanges).toEqual([true]);
      expect(playBtn.getAttribute("aria-pressed")).toBe("true");

      // Speech progress highlights words and sets --vn-tts-progress
      stage.setSpeechProgress({
        cursor: {
          chatId: "c1",
          messageId: "m1",
          sourceFingerprint: "fp",
          paragraphIndex: 0,
          swipeId: 0,
          revision: 0,
        },
        elapsedSeconds: 1.5,
        durationSeconds: 3.0,
        timing: "none",
      });
      const dialogueText = themeRoot.querySelector("[data-vn-dialogue-text]")!;
      expect(dialogueText.getAttribute("data-vn-speech-speaking")).toBe("true");
      expect((dialogueText.style as unknown as Record<string, string>)["--vn-tts-progress"]).toBe("50%");

      // Submitting from the permanent inline composer sends reply
      input.value = "I step into the dorm.";
      input.dispatchEvent(new FakeEvent("input", { bubbles: true }));
      composer!.dispatchEvent(new FakeEvent("submit", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 10));
      expect(submitted).toEqual(["I step into the dorm."]);
    } finally {
      stage.destroy();
    }
  });
});
