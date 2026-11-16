import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { FakeNode, installFakeDocument } from "./stage-test-dom";
import { RPG_HUD_CSS, RpgStageController } from "./rpg-hud";
import { GAME_REQUEST_EVENT, GAME_STATE_EVENT, GameBridge } from "../host/game-bridge";
import { VnStage, type VnGameChoice } from "./vn-stage";
import { buildSyntheticInteractionDraft } from "../../shared/scene-interactions";
import { StageDossiers } from "./dossiers";
import { CharacterFolio } from "./character-folio";
import { createEmptyCharacterDNA } from "../../shared/character-dna";
import { normalizeTooltipPreferences } from "../../shared/dossiers";
import type { TurnView } from "../../protocol";

describe("Council Wave 5: RPG HUD, GameBridge, World Lens & Character Folio", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installFakeDocument();
  });

  afterEach(() => {
    restore();
  });

  it("keeps Lite mode RPG bar interactive, tracks up to 12 checks in drawer, clears on off, and scopes breakdowns", () => {
    expect(RPG_HUD_CSS).toContain("[data-vn-check-info]");
    expect(RPG_HUD_CSS).toContain("min-width: 44px");
    expect(RPG_HUD_CSS).toContain("min-height: 44px");
    expect(RPG_HUD_CSS).toContain("[data-rpg-close]");

    const stageEl = new FakeNode("div");
    const hudEl = new FakeNode("div");
    const ctrl = new RpgStageController();
    ctrl.mount(stageEl as unknown as HTMLElement, hudEl as unknown as HTMLElement);
    ctrl.update("lite", null);

    const bar = hudEl.querySelector("[data-vn-rpg-bar]")!;
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain("d20 Lite Active");
    bar.click();

    const drawer = stageEl.querySelector("[data-vn-rpg-drawer]")!;
    expect(drawer.hidden).toBe(false);
    expect(drawer.textContent).toContain("d20 Lite Rules");

    for (let i = 0; i < 14; i++) {
      ctrl.resolveChoiceSubmission({
        id: `c${i}`,
        label: `Choice ${i}`,
        value: `val ${i}`,
        check: { stat: "Notice", dc: 10 + (i % 4), modifier: 2 },
      });
    }
    expect(drawer.querySelectorAll("li").length).toBe(12);
    expect(bar.textContent).toContain("12 Rolls");

    const theatre = stageEl.querySelector("[data-vn-rpg-theatre]")!;
    expect(theatre.dataset.rollTier).toBeTruthy();
    expect(theatre.style.borderColor).toBe("");

    // Breakdown toggle scoped cleanly per choice id
    const list = new FakeNode("ol");
    const btnA = new FakeNode("button");
    const btnB = new FakeNode("button");
    list.append(btnA, btnB);
    ctrl.decorateChoiceButton(btnA as unknown as HTMLButtonElement, {
      id: "choice-a",
      label: "Inspect",
      value: "inspect",
      check: { stat: "Investigation", dc: 12, modifier: 3 },
    });
    ctrl.decorateChoiceButton(btnB as unknown as HTMLButtonElement, {
      id: "choice-b",
      label: "Climb",
      value: "climb",
      check: { stat: "Athletics", dc: 14, modifier: 1 },
    });

    const infoA = btnA.querySelector("[data-vn-check-info]")!;
    const infoB = btnB.querySelector("[data-vn-check-info]")!;
    infoA.click();
    expect(infoA.getAttribute("aria-expanded")).toBe("true");
    let breakdown = list.querySelector(".vn-rpg-check-breakdown")!;
    expect(breakdown.dataset.vnCheckFor).toBe("choice-a");
    infoB.click();
    expect(infoA.getAttribute("aria-expanded")).toBe("false");
    expect(infoB.getAttribute("aria-expanded")).toBe("true");
    breakdown = list.querySelector(".vn-rpg-check-breakdown")!;
    expect(breakdown.dataset.vnCheckFor).toBe("choice-b");
    infoB.click();
    expect(list.querySelector(".vn-rpg-check-breakdown")).toBeNull();
    expect(infoB.getAttribute("aria-expanded")).toBe("false");

    ctrl.update("off", null);
    ctrl.update("lite", null);
    bar.click();
    expect(drawer.textContent).toContain("No skill checks rolled");

    ctrl.destroy();
  });

  it("times out busy GameBridge providers, supports cancelBusy, and renders detail toggles & 0.70/0.40 odds on VnStage", async () => {
    const listeners = new Map<string, Array<(e: Event) => void>>();
    const dispatched: Array<{ type: string; detail: unknown }> = [];
    const mockWin = {
      addEventListener: (t: string, fn: (e: Event) => void) => listeners.set(t, [...(listeners.get(t) ?? []), fn]),
      removeEventListener: (t: string, fn: (e: Event) => void) => listeners.set(t, (listeners.get(t) ?? []).filter((f) => f !== fn)),
      dispatchEvent: (e: Event) => {
        dispatched.push({ type: e.type, detail: (e as CustomEvent).detail });
        for (const fn of listeners.get(e.type) ?? []) fn(e);
        return true;
      },
    };
    let changeCount = 0;
    const bridge = new GameBridge(mockWin as unknown as Window, () => { changeCount++; }, 15);
    mockWin.dispatchEvent(new CustomEvent(GAME_STATE_EVENT, {
      detail: { version: 1, provider: "warp", chatId: "c1", busy: true, choices: [] },
    }));
    expect(bridge.busyStatusFor("c1").busy).toBe(true);
    expect(bridge.busyStatusFor("c1").timedOut).toBe(false);

    await new Promise((r) => setTimeout(r, 35));
    expect(bridge.busyStatusFor("c1").timedOut).toBe(true);
    expect(changeCount).toBeGreaterThanOrEqual(2);

    bridge.cancelBusy("c1", "warp");
    expect(bridge.busyStatusFor("c1").busy).toBe(false);
    expect(bridge.busyStatusFor("c1").timedOut).toBe(false);
    expect(dispatched.at(-1)?.type).toBe(GAME_REQUEST_EVENT);
    bridge.destroy();

    let cancelled = 0;
    const stage = new VnStage({
      mount: new FakeNode("div") as unknown as HTMLElement,
      textSpeed: 0,
      onGameCancel: () => { cancelled++; },
    });
    stage.loadTurn({ mode: "standard", paragraphs: [{ id: "p0", text: "Test." }] });
    (stage as unknown as { advance(): void }).advance();

    const choices: VnGameChoice[] = [
      { id: "m1", label: "Fair Move", group: null, detail: "Costs 1 favor.", odds: 0.68, provider: "warp", revision: 1 },
      { id: "m2", label: "Good Move", group: null, detail: null, odds: 0.70, provider: "warp", revision: 1 },
    ];
    stage.setGameChoices(choices, { busy: false, timedOut: false });
    const root = (stage as unknown as { root: FakeNode }).root;
    const oddsBadges = root.querySelectorAll("[data-vn-game-odds]");
    expect(oddsBadges.map((b) => b.getAttribute("data-vn-game-odds"))).toEqual(["fair", "good"]);

    const infoBtn = root.querySelector("[data-vn-game-detail-toggle]")!;
    const detailDiv = root.querySelector("[data-vn-game-detail]")!;
    expect(detailDiv.hidden).toBe(true);
    infoBtn.click();
    expect(detailDiv.hidden).toBe(false);
    expect(detailDiv.textContent).toBe("Costs 1 favor.");

    stage.setGameChoices([], { busy: true, timedOut: true });
    const cancelBtn = root.querySelector("[data-vn-game-cancel]")!;
    expect(cancelBtn.textContent).toContain("Stuck? Refresh moves");
    cancelBtn.click();
    expect(cancelled).toBe(1);
    stage.destroy();
  });

  it("builds synthetic interaction drafts, matches StoryDocuments by alias case-insensitively, persists factEdits, and tracks Relationship dirty state in CharacterFolio", () => {
    const itemDrafts = buildSyntheticInteractionDraft({ id: "dna:item:key", kind: "object", name: "Silver Key" });
    expect(itemDrafts.map((d) => d.verb)).toEqual(["examine", "use", "custom"]);
    const locDrafts = buildSyntheticInteractionDraft({ id: "dna:loc:hall", kind: "place", name: "Kit Hall" });
    expect(locDrafts.map((d) => d.verb)).toEqual(["examine", "custom"]);

    const root = new FakeNode("div");
    const text = new FakeNode("div");
    const controls = new FakeNode("div");
    let savedPrefs = normalizeTooltipPreferences({ enabled: true, actionsEnabled: true, linking: "menu-only" });
    const dossiers = new StageDossiers(
      root as unknown as HTMLElement,
      text as unknown as HTMLElement,
      controls as unknown as HTMLElement,
      () => {},
      () => {},
      (next) => { savedPrefs = next; },
      { current: () => "", apply: () => true, focus: () => {} },
    );
    const key = { chatId: "chat-1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fingerprint-1", revision: 1 };
    const paragraph = "The sealed note and Nadine waited. Meet at dawn.";
    text.textContent = paragraph;
    const docStart = paragraph.indexOf("Meet at dawn.");
    const snapshotEntities = [{
      id: "letter",
      kind: "object" as const,
      name: "Waxed Letter",
      aliases: ["SEALED NOTE"],
      firstParagraph: 0,
      facts: [{
        id: "fact1",
        entityId: "letter",
        field: "seal",
        value: "Broken crest",
        visibility: "observed" as const,
        source: { provider: "story" as const, recordId: "r1", chatId: "chat-1", messageId: "m1", sourceFingerprint: "fingerprint-1", observedAt: "2026-01-01T00:00:00Z" },
        revealedAt: { key, paragraphIndex: 0 },
      }],
    }, {
      id: "nadine",
      kind: "npc" as const,
      name: "Nadine",
      aliases: [],
      firstParagraph: 0,
      facts: [],
    }];
    const presentation = {
      version: 1 as const,
      snapshots: [{
        at: { key, paragraphIndex: 0 },
        entities: snapshotEntities,
        presentEntityIds: ["letter", "nadine"],
        speakerEntityId: null,
        drawableEntityId: null,
        locationId: null,
        stateByEntity: {},
      }],
      documents: [{
        id: "doc1",
        name: "sealed note",
        kind: "letter" as const,
        paragraphIndex: 0,
        sections: [{ paragraphIndex: 0, start: docStart, end: docStart + "Meet at dawn.".length, text: "Meet at dawn." }],
      }],
    };
    dossiers.setContext(presentation, [paragraph]);
    dossiers.setPreferences(savedPrefs);
    dossiers.refresh(0);

    // Build NPC action tools via alias/name
    const tools = dossiers.buildNpcActionTools("Nadine");
    expect(tools?.drafts.length).toBeGreaterThan(0);

    // Open Waxed Letter and verify case-insensitive alias document match & fact edit persistence via factEdits
    const cardHost = (dossiers as unknown as { card: { host: FakeNode } }).card.host;
    dossiers.openEntityFromStage("letter", controls as unknown as HTMLElement);
    expect(cardHost.textContent).toContain("Read revealed text");
    expect(cardHost.textContent).toContain("Broken crest");
    (cardHost.querySelector(".fact-edit-btn") as FakeNode).click();
    const editInput = cardHost.querySelector(".fact-edit-input input")!;
    editInput.value = "Crimson lion crest";
    (cardHost.querySelector(".fact-edit-input")!.querySelectorAll("button")[0] as FakeNode).click();
    expect(savedPrefs.overrides[0]?.factEdits?.seal).toBe("Crimson lion crest");

    // CharacterFolio renders in-scene InteractionTray and marks Relationships sliders dirty
    const folioMount = new FakeNode("div");
    const folio = new CharacterFolio();
    folioMount.appendChild(folio.element as unknown as FakeNode);
    folio.setContext("chat-1");
    folio.setLibrary({
      char_nadine: {
        ...createEmptyCharacterDNA("Nadine"),
        id: "char_nadine",
        relationships: [{ targetName: "You", affinity: 10, trust: 5, dynamicLabel: "Guarded", status: "Testing trust", recentBeats: [], lastUpdated: 1 }],
        lastUpdated: 1,
      },
    });
    const turn: TurnView = {
      chatId: "chat-1",
      messageId: "m1",
      swipeId: 0,
      sourceFingerprint: "fingerprint-1",
      revision: 1,
      mode: "standard",
      paragraphs: ["Nadine waited by the door."],
      assets: [],
      presentation,
    } as unknown as TurnView;
    folio.syncFromTurn(turn, 0);
    folio.setSceneActionTools(tools, "Nadine");
    folio.setActiveCharacter("Nadine");
    const actionWrap = folio.element.querySelector("[data-folio-scene-actions]");
    expect(actionWrap).not.toBeNull();
    expect(actionWrap?.textContent).toContain("Ask");
    expect(actionWrap?.textContent).toContain("Approach");
    (actionWrap?.querySelectorAll("button")[0] as FakeNode).click();
    expect((actionWrap?.querySelector("textarea") as unknown as HTMLTextAreaElement)?.value).toContain("Nadine");

    (folio.element.querySelector('[data-subtab="relationships"]') as unknown as HTMLButtonElement).click();
    const saveBtn = folio.element.querySelector("[data-dna-save]") as unknown as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    const affRange = folio.element.querySelector("[data-bond-affinity-range]") as unknown as HTMLInputElement;
    affRange.value = "42";
    affRange.oninput?.(new Event("input") as unknown as Event);
    expect(saveBtn.disabled).toBe(false);
    expect((folio.element.querySelector("[data-bond-affinity]") as unknown as HTMLInputElement).value).toBe("42");
  });
});
