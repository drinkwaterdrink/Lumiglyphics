import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FakeEvent, installFakeDocument } from "./stage-test-dom.js";
import { DOCKED_DOSSIER_CSS, DOSSIER_CSS } from "./dossier-card.js";
import { DOCUMENT_READER_CSS } from "./document-reader.js";
import { RPG_HUD_CSS, RpgStageController } from "./rpg-hud.js";
import { APERTURE_CSS_ROUTE_BAR_READER } from "../theme/aperture/route-bar-reader.js";
import { APERTURE_OUTER_CSS, APERTURE_STAGE_CSS } from "../theme/aperture-theme.js";
import { CharacterFolio } from "./character-folio.js";
import { createEmptyCharacterDNA } from "../../shared/character-dna.js";

describe("Wave 2 & 3 mobile touch targets, docked header dedup, Folio filter & RPG drawer a11y", () => {
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

  test("docked World Lens hides duplicate page title block and enforces 44px touch targets", () => {
    expect(DOCKED_DOSSIER_CSS).toContain(".dossier-page-title-block{display:none!important}");
    expect(DOSSIER_CSS).toContain("[data-vn-track-selection] button{min-height:44px;min-width:44px;");
    expect(DOCUMENT_READER_CSS).toContain("[data-document-art-gen]{margin:0;min-height:44px;min-width:44px;");
    expect(RPG_HUD_CSS).toContain("min-height: 44px;");
    expect(APERTURE_CSS_ROUTE_BAR_READER).toContain("[data-vn-scene-postcard] button.vn-postcard-pill {\n  min-height: 44px !important;");
    expect(APERTURE_CSS_ROUTE_BAR_READER).toContain("@media (max-width: 390px)");
    expect(APERTURE_STAGE_CSS).toContain(".route-bar {");
    expect(APERTURE_OUTER_CSS).toContain("[data-vn-dialogue]");
    expect(DOSSIER_CSS).toContain(".world-scene-banner{");
    expect(DOSSIER_CSS).toContain("[data-reference-thumb]{");
    expect(DOSSIER_CSS).toContain(".world-lens.world-lens-preview{display:flex;flex-direction:column;");
  });

  test("CharacterFolio renders roster search & In Scene filter when cast exceeds 4", () => {
    const folio = new CharacterFolio({});
    const library = Object.fromEntries(
      ["Aurelia", "Bram", "Caspian", "Dahlia", "Elowen"].map((name) => {
        const dna = createEmptyCharacterDNA(name);
        return [dna.id, dna];
      }),
    );
    const ids = Object.keys(library);
    (folio as any).loreMap = {
      [ids[0]!]: { inScene: true },
      [ids[4]!]: { inScene: true },
    };
    folio.setLibrary(library);
    folio.setActiveCharacter(ids[0]!);

    const search = folio.element.querySelector("[data-folio-roster-search]") as HTMLInputElement | null;
    const inSceneBtn = folio.element.querySelector("[data-folio-roster-inscene]") as HTMLButtonElement | null;
    expect(search).not.toBeNull();
    expect(inSceneBtn).not.toBeNull();
    expect(folio.element.querySelector("[data-folio-roster]")?.contains(search!)).toBe(false);
    expect(folio.element.querySelectorAll(".folio-roster-item").length).toBe(5);

    inSceneBtn!.click();
    expect(folio.element.querySelectorAll(".folio-roster-item").length).toBe(2);

    const searchAfter = folio.element.querySelector("[data-folio-roster-search]") as HTMLInputElement;
    searchAfter.value = "elo";
    searchAfter.oninput?.(new Event("input") as any);
    // Only Elowen matches "elo"
    expect(folio.element.querySelectorAll(".folio-roster-item").length).toBe(1);
  });

  test("RpgStageController drawer closes on Escape and restores focus to the RPG bar", () => {
    const stageEl = document.createElement("div");
    const hudEl = document.createElement("div");
    const hud = new RpgStageController();
    hud.mount(stageEl, hudEl);
    hud.update("lite", null);
    const bar = hudEl.querySelector("[data-vn-rpg-bar]") as HTMLButtonElement;
    let focusedBar = false;
    bar.focus = () => {
      focusedBar = true;
      (document as any).activeElement = bar;
    };
    bar.click();

    const drawer = stageEl.querySelector("[data-vn-rpg-drawer]") as HTMLElement;
    expect(drawer.hidden).toBe(false);

    focusedBar = false;
    const esc = new FakeEvent("keydown", { key: "Escape", cancelable: true });
    (hud as any).handleDrawerKeyDown(esc);
    expect(drawer.hidden).toBe(true);
    expect(focusedBar).toBe(true);
  });
});
