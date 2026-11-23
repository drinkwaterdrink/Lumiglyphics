import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { installFakeDocument } from "./stage-test-dom.js";
import { DossierCard } from "./dossier-card.js";
import { StageDossiers } from "./dossiers.js";
import { FullscreenLightbox } from "./fullscreen-lightbox.js";
import { openReferenceCropperModal } from "./reference-cropper.js";

describe("Wave 1 reliability & interaction state regressions", () => {
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

  test("DossierCard.setStoryDnaError re-enables item art & autofill buttons", () => {
    const mount = document.createElement("div");
    const card = new DossierCard(mount);
    const itemArtBtn = document.createElement("button");
    itemArtBtn.setAttribute("data-generate-item-art", "");
    itemArtBtn.disabled = true;
    itemArtBtn.textContent = "Generating Item Art…";

    const autofillBtn = document.createElement("button");
    autofillBtn.setAttribute("data-story-dna-autofill", "");
    autofillBtn.disabled = true;

    const statusEl = document.createElement("div");
    statusEl.setAttribute("data-story-dna-status", "");
    statusEl.hidden = true;

    const host = (mount.firstElementChild as HTMLElement | null) ?? mount;
    host.append(itemArtBtn, autofillBtn, statusEl);
    card.setStoryDnaError("Image provider timed out.");

    expect(itemArtBtn.disabled).toBe(false);
    expect(itemArtBtn.textContent).toBe("✨ Generate Item Art");
    expect(autofillBtn.disabled).toBe(false);
    expect(statusEl.hidden).toBe(false);
    expect(statusEl.textContent).toBe("Image provider timed out.");
  });

  test("StageDossiers.setDocumentAssets preserves unrelated in-flight documentArtBusy entries", () => {
    const root = document.createElement("div");
    const text = document.createElement("div");
    const controls = document.createElement("div");
    const dossiers = new StageDossiers(root, text, controls, () => {}, () => {}, () => {});

    // Access internal busy set through public documentArtBusy check via setDocumentArtRequester + open or direct state
    (dossiers as any).documentArtBusy.add("doc-a");
    (dossiers as any).documentArtBusy.add("doc-b");

    dossiers.setDocumentAssets({
      "doc-a": {
        documentId: "doc-a",
        contentHash: "hash-a",
        imageId: "img-a",
        imageUrl: "https://example.com/a.png",
      },
    });

    expect((dossiers as any).documentArtBusy.has("doc-a")).toBe(false);
    expect((dossiers as any).documentArtBusy.has("doc-b")).toBe(true);

    dossiers.clearDocumentArtState();
    expect((dossiers as any).documentArtBusy.size).toBe(0);
  });

  test("openReferenceCropperModal disables Apply until image loads and cleans up on close", () => {
    const mount = document.createElement("div");
    const modal = openReferenceCropperModal({
      slot: "face",
      sourceUrl: "data:image/png;base64,iVBORw0KGgo=",
      mount,
      onConfirm: () => {},
    });

    const applyBtn = modal.element.querySelector("[data-cropper-apply]") as HTMLButtonElement | null;
    expect(applyBtn).not.toBeNull();
    expect(applyBtn?.disabled).toBe(true);

    modal.close();
    expect(mount.children.length).toBe(0);
  });

  test("FullscreenLightbox sets dialog ARIA attributes and restores focus on close", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    Object.defineProperties(trigger, {
      isConnected: { get: () => document.body.contains(trigger) },
      getClientRects: { value: () => [trigger.getBoundingClientRect()] },
    });
    let focusedTrigger = false;
    trigger.focus = () => {
      focusedTrigger = true;
      (document as any).activeElement = trigger;
    };
    trigger.focus();
    focusedTrigger = false;

    const lightbox = new FullscreenLightbox();
    lightbox.show({ src: "data:image/png;base64,iVBORw0KGgo=", title: "Scene" });

    const backdrop = document.body.querySelector(".vn-lightbox-backdrop") as HTMLElement | null;
    expect(backdrop).not.toBeNull();
    expect(backdrop?.getAttribute("role")).toBe("dialog");
    expect(backdrop?.getAttribute("aria-modal")).toBe("true");
    const infoBtn = backdrop?.querySelector('[data-action="info-toggle"]');
    expect(infoBtn?.getAttribute("aria-expanded")).toBe("false");

    lightbox.close();
    expect(focusedTrigger).toBe(true);
    expect(document.body.querySelector(".vn-lightbox-backdrop")).toBeNull();
  });
});
