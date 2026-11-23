import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { installFakeDocument } from "./stage-test-dom.js";
import { QuickDirectorPopover, type QuickDirectorCommand } from "./quick-director.js";
import { createDocumentReader, documentSurfaceForKind } from "./document-reader.js";
import { DOSSIER_CSS } from "./dossier-css.js";

describe("Wave D — Quick-Director, Secrets Board & Tactile Document Reader", () => {
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

  test("QuickDirectorPopover emits Shot, Relight, Regenerate, and Outfit commands, handles Escape, and destroys cleanly", () => {
    const mount = document.createElement("div");
    document.body.appendChild(mount);
    const commands: QuickDirectorCommand[] = [];
    const director = new QuickDirectorPopover({
      mount,
      onDirect: (cmd) => commands.push(cmd),
      onOpenArtwork: () => {},
    });

    director.setPreset("midnight-noir");
    director.setPicture({ label: "Artwork for passage 1", imageUrl: "/saved" });
    director.open();
    expect(director.isOpen()).toBe(true);
    const shadow = director.getShadowRoot();

    // Empty wardrobe hint shown initially
    expect(shadow.textContent).toContain("No wardrobe states saved");

    // Populate outfits and click Shot + Outfit
    director.setOutfits([
      { charId: "c1", charName: "Sable", key: "Raincoat", outfit: "yellow raincoat", active: false },
    ]);
    const closeUpBtn = shadow.querySelector('[data-dir-label="Close-up"]') as HTMLButtonElement;
    closeUpBtn.click();
    expect(commands).toHaveLength(0);
    const prepare = shadow.querySelector("[data-dir-prepare]") as HTMLButtonElement;
    prepare.click();
    expect(director.isOpen()).toBe(false);
    expect(commands[0]?.kind).toBe("shot");
    expect(commands[0]?.label).toBe("Close-up");

    director.open();
    const outfitBtn = shadow.querySelector('[data-dir-outfit="Raincoat"]') as HTMLButtonElement;
    outfitBtn.click();
    expect(commands).toHaveLength(1);
    prepare.click();
    expect(commands[1]?.kind).toBe("outfit");

    // Escape closes
    director.open();
    const sheet = shadow.querySelector(".dir-sheet") as HTMLElement;
    sheet.dispatchEvent({ type: "keydown", key: "Escape", bubbles: true, preventDefault() {}, stopPropagation() {} } as any);
    expect(director.isOpen()).toBe(false);

    director.destroy();
    expect(mount.querySelector("[data-vn-quick-director]")).toBeNull();
  });

  test("documentSurfaceForKind and createDocumentReader Quote in Reply emit contextual excerpt", () => {
    expect(documentSurfaceForKind("letter")).toBe("parchment");
    expect(documentSurfaceForKind("receipt")).toBe("ledger");
    expect(documentSurfaceForKind("terminal")).toBe("terminal");
    expect(documentSurfaceForKind("notice")).toBe("memo");

    let quoted = "";
    const reader = createDocumentReader(
      {
        id: "doc-1",
        name: "Dorm 47 Timetable",
        kind: "letter",
        paragraphIndex: 0,
        sections: [{ heading: "Curfew", text: "Night curfew begins at 10:15 PM.", paragraphIndex: 0 }],
      } as any,
      () => {},
      () => {},
      {
        onQuoteInReply: (q) => { quoted = q; },
      },
    );

    expect(reader.dataset.documentSurface).toBe("parchment");
    const quoteBtn = reader.querySelector("[data-document-quote]") as HTMLButtonElement;
    expect(quoteBtn).not.toBeNull();
    quoteBtn.click();
    expect(quoted).toContain("Dorm 47 Timetable");
    expect(quoted).toContain("Night curfew begins at 10:15 PM.");
  });

  test("DOSSIER_CSS includes tactile secret chips and action styling", () => {
    expect(DOSSIER_CSS).toContain('.secret-chip[data-state="knows"]');
    expect(DOSSIER_CSS).toContain('.secret-chip[data-state="suspects"]');
    expect(DOSSIER_CSS).toContain('.secret-chip[data-state="unaware"]');
    expect(DOSSIER_CSS).toContain(".secret-action-btn");
  });
});
