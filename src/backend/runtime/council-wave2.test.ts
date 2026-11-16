import { describe, expect, test } from "bun:test";
import type { ChatMessageDTO, SpindleAPI } from "lumiverse-spindle-types";
import { DEFAULT_CONFIG } from "../../config.js";
import { TurnPlanSchema } from "../../shared/contracts.js";
import { reduceRpgState } from "../../shared/rpg-state.js";
import { loadCharacterDNALibrary } from "./character-dna-store.js";
import {
  cancelSplitHorizonLore,
  registerVisualNovelBackend,
  scheduleSplitHorizonLore,
  sendState,
  viewRegistry,
} from "./controller.js";
import { normalizeLumiBooks } from "./context-providers/lumibooks.js";
import { prepareNarrative } from "../core/paragraphs.js";
import { jsonObject } from "./planner/json-repair.js";
import { planTurn } from "./planner.js";
import { emptySingleCharacter } from "../core/visual-state.js";
import { chatStatePath, turnPath, type StoredChatState, type StoredTurnRecord } from "./storage.js";

const baseMessage: ChatMessageDTO & { role: "assistant" } = {
  id: "msg-w2-1",
  chat_id: "chat-w2",
  index_in_chat: 1,
  is_user: false,
  name: "Mira",
  content: "Mira smiles softly.",
  send_date: 1,
  swipe_id: 0,
  swipes: ["Mira smiles softly."],
  swipe_dates: [1],
  extra: {},
  parent_message_id: "user-0",
  branch_id: null,
  created_at: 1,
  role: "assistant",
};

describe("Wave 2 Council Regressions", () => {
  test("unclosed <think> containing broken scratch braces recovers fenced JSON cleanly", () => {
    const raw = `<think>First draft {"broken": [1, 2
Still thinking about choices {unfinished
\`\`\`json
{
  "scenes": [{ "startParagraph": 0 }],
  "cues": [{ "paragraphIndex": 0, "expression": "gentle smile" }]
}
\`\`\`
`;
    const parsed = jsonObject(raw) as { scenes?: unknown[]; cues?: Array<{ expression?: string }> };
    expect(Array.isArray(parsed.scenes)).toBe(true);
    expect(parsed.cues?.[0]?.expression).toBe("gentle smile");
  });

  test("LumiBooks allocates equal quota across characters, locations, and things up to 32 cap", () => {
    const mk = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
        name: `${prefix} ${i}`,
        description: `${prefix} description ${i}`,
      }));
    const now = 1_700_000_000_000;
    const ev = normalizeLumiBooks(
      {
        chatId: "chat-w2",
        userId: "user-1",
        updatedAt: now,
        fileStates: { characters: "on", locations: "on", things: "on" },
        files: {
          characters: { entities: mk("npc", 30) },
          locations: { entities: mk("place", 10) },
          things: { entities: mk("item", 10) },
        },
      },
      { chatId: "chat-w2", userId: "user-1" },
      now
    );
    expect(ev.status.status).toBe("available");
    expect(ev.status.recordCount).toBe(32);
    const counts = { npc: 0, place: 0, object: 0 };
    for (const ent of ev.proposal?.entities ?? []) counts[ent.kind]++;
    expect(counts.npc + counts.place + counts.object).toBe(32);
    expect(counts.place).toBeGreaterThanOrEqual(10);
    expect(counts.object).toBeGreaterThanOrEqual(10);
    expect(counts.npc).toBe(12);
  });

  test("dialogue speaker attribution matches short < 3-char lines after stripping quotes", () => {
    const res = prepareNarrative('<dialogue speaker="Mira">"No."</dialogue>');
    expect(res.paragraphs[0]?.text).toBe('"No."');
    expect(res.detectedSpeakers).toEqual([{ paragraphIndex: 0, speaker: "Mira" }]);
  });

  test("KV-static system prompt stays byte-identical across persona/RPG/lore turns while dynamic brief routes to user", async () => {
    const captured: Array<{ system: string; user: string }> = [];
    let currentPersona = "Alex";
    const spindle: any = {
      chats: { get: async () => ({ character_id: "char-1" }) },
      characters: {
        get: async () => ({ id: "char-1", name: "Mira", description: "silver hair", tags: [], extensions: {} }),
      },
      personas: { getActive: async () => ({ name: currentPersona, description: "traveller" }) },
      connections: { get: async () => ({ id: "c1", provider: "google", model: "gemini-3.5-flash-lite", is_default: true }), list: async () => [] },
      generate: {
        raw: async (req: any) => {
          captured.push({ system: req.messages[0].content, user: req.messages[1].content });
          return {
            content: JSON.stringify({
              scenes: [{ startParagraph: 0, environment: { location: "Harbor", timeOfDay: "dusk", weather: null, lighting: "lanterns", description: "Old harbor", persistentElements: [] }, cast: ["Mira"] }],
              cues: [{ paragraphIndex: 0, expression: "watchful" }],
              audioCues: [{ paragraphIndex: 0, bgm: "harbor-theme" }],
            }),
          };
        },
      },
      log: { warn: () => {} },
    };

    const rpg1 = reduceRpgState(null, { personaName: "Hero" });
    rpg1.turnCounter = 1;
    rpg1.vitals.companions = [{ name: "Mira", affinity: 35, status: "healthy" }];
    const r1 = await planTurn(spindle, {
      chatId: "chat-w2",
      message: { ...baseMessage, content: "At the harbor." },
      content: "At the harbor.",
      previousScene: null,
      previousContinuity: null,
      previousRpgState: rpg1,
      splitHorizonLore: true,
      recentMessages: [],
      config: {
        ...DEFAULT_CONFIG,
        rpgMode: "full",
        tooltips: { ...DEFAULT_CONFIG.tooltips, enabled: true },
        includeCharacterContext: true,
        includePersonaContext: true,
        includeLorebookContext: false,
        includeSimTrackerContext: false,
      },
      singleCharacter: emptySingleCharacter(),
      characterAppearance: {},
    });

    currentPersona = "Vex";
    const rpg2 = reduceRpgState(rpg1, { personaName: "Hero" });
    rpg2.turnCounter = 7;
    rpg2.flags.gate_unlocked = true;
    rpg2.vitals.inventory = ["Iron Key"];
    const r2 = await planTurn(spindle, {
      chatId: "chat-w2",
      message: { ...baseMessage, id: "msg-w2-2", content: "Through the gate.\n\nShadows stir." },
      content: "Through the gate.\n\nShadows stir.",
      previousScene: r1.plan.scenes[0]!,
      previousContinuity: r1.plan.terminalContinuity,
      previousRpgState: rpg2,
      splitHorizonLore: true,
      recentMessages: [],
      config: {
        ...DEFAULT_CONFIG,
        rpgMode: "full",
        tooltips: { ...DEFAULT_CONFIG.tooltips, enabled: true },
        includeCharacterContext: true,
        includePersonaContext: true,
        includeLorebookContext: false,
        includeSimTrackerContext: false,
      },
      singleCharacter: r1.singleCharacter,
      characterAppearance: { Mira: "silver hair, green coat" },
    });

    expect(captured.length).toBe(2);
    expect(captured[0]!.system).toBe(captured[1]!.system);
    expect(captured[0]!.user).toContain("USER/PERSONA: Alex");
    expect(captured[1]!.user).toContain("USER/PERSONA: Vex");
    expect(captured[1]!.user).toContain("[STATE] T7");
    expect(r1.personaName).toBe("Alex");
    expect(r2.personaName).toBe("Vex");
    expect(r1.plan.audioCues[0]?.bgm).toBe("harbor-theme");
  });

  test("0->1->0 swipe switch preserves swipe 0 DNA and sendState updates activeTurnKeys", async () => {
    const store = new Map<string, unknown>();
    const sent: any[] = [];
    const swipe0 = "Mira stands by the forge.";
    const swipe1 = "Lyra inspects the lantern.";
    let activeSwipe = 0;
    const messages = [
      {
        id: "m-swipe",
        chat_id: "chat-sw",
        index_in_chat: 0,
        is_user: false,
        name: "Narrator",
        content: swipe0,
        swipe_id: 0,
        swipes: [swipe0, swipe1],
        role: "assistant",
      },
    ];
    let callCount = 0;
    const spindle: any = {
      chats: { get: async () => ({ id: "chat-sw", character_id: "card-1" }) },
      chat: {
        getMessages: async () =>
          messages.map((m) => ({
            ...m,
            swipe_id: activeSwipe,
            content: activeSwipe === 0 ? swipe0 : swipe1,
          })),
      },
      characters: { get: async () => ({ id: "card-1", name: "Scenario", description: "", tags: [], extensions: {} }) },
      personas: { getActive: async () => null },
      connections: { get: async () => null, list: async () => [] },
      generate: {
        raw: async () => {
          callCount++;
          const who = activeSwipe === 0 ? "Mira" : "Lyra";
          return {
            content: JSON.stringify({
              scenes: [{ startParagraph: 0, environment: { location: "Forge", timeOfDay: "day", weather: null, lighting: "firelight", description: "Warm forge", persistentElements: [] }, cast: [who] }],
              cues: [{ paragraphIndex: 0, character: who, expression: "focused" }],
              characters: [{ name: who, description: `${who} silver coat` }],
              storyReferences: [{ kind: "npc", name: who, field: "appearance", value: `${who} silver coat`, paragraphIndex: 0, evidence: activeSwipe === 0 ? swipe0 : swipe1 }],
            }),
          };
        },
      },
      userStorage: {
        getJson: async (p: string, opts?: { fallback?: unknown }) => (store.has(p) ? structuredClone(store.get(p)) : opts?.fallback ?? null),
        setJson: async (p: string, v: unknown) => { store.set(p, structuredClone(v)); },
      },
      sendToFrontend: (msg: unknown) => sent.push(msg),
      on: () => () => {},
      onFrontendMessage: () => {},
      log: { warn: () => {}, error: () => {}, info: () => {} },
    };
    store.set("config.json", {
      ...DEFAULT_CONFIG,
      generateImages: false,
      maxImagesPerTurn: 0,
      includeCharacterContext: false,
      includePersonaContext: false,
      includeLorebookContext: false,
      includeSimTrackerContext: false,
    });
    registerVisualNovelBackend(spindle);
    await sendState(spindle, "chat-sw", "u-sw", { viewOpen: true });

    const lib0 = await loadCharacterDNALibrary(spindle, "chat-sw", "u-sw");
    const mira0 = Object.values(lib0.characters).find((c) => c.name === "Mira");
    expect(mira0?.seenInSwipes).toEqual(["m-swipe::0"]);

    activeSwipe = 1;
    await sendState(spindle, "chat-sw", "u-sw", { viewOpen: true });
    const lib1 = await loadCharacterDNALibrary(spindle, "chat-sw", "u-sw");
    const miraAfter = Object.values(lib1.characters).find((c) => c.name === "Mira");
    const lyraAfter = Object.values(lib1.characters).find((c) => c.name === "Lyra");
    expect(miraAfter?.seenInSwipes).toEqual(["m-swipe::0"]);
    expect(lyraAfter?.seenInSwipes).toEqual(["m-swipe::1"]);

    // Switching back 1 -> 0 hits stored swipe 0 record cleanly with no extra planner call
    const beforeCalls = callCount;
    activeSwipe = 0;
    await sendState(spindle, "chat-sw", "u-sw", { viewOpen: true });
    expect(callCount).toBe(beforeCalls);
    const state = store.get(chatStatePath("chat-sw")) as StoredChatState;
    expect(state.activeTurnPath).toBe(turnPath("chat-sw", "m-swipe", 0));
    expect((sent.filter((m) => m.type === "vn_state" || m.type === "vn_turn").at(-1) as any).turn.swipeId).toBe(0);
    viewRegistry().close("u-sw", "chat-sw");
  });

  test("scheduleSplitHorizonLore emits fenced vn_turn_lore_patch and cancels cleanly on supersede", async () => {
    const store = new Map<string, unknown>();
    const sent: any[] = [];
    const path = turnPath("chat-lh", "msg-lh", 0);
    const key = {
      chatId: "chat-lh",
      assistantMessageId: "msg-lh",
      swipeId: 0,
      sourceFingerprint: "fp-lore-horizon-1",
      revision: 0,
    };
    const record: StoredTurnRecord = {
      schemaVersion: 1,
      speaker: "Narrator",
      status: "ready",
      plan: TurnPlanSchema.parse({
        schemaVersion: 1,
        key,
        paragraphs: [{ index: 0, sourceIndex: 0, text: "The Brass Astrolabe gleams inside the Foundry." }],
        scenes: [{
          sceneId: "scene-lh",
          revision: 0,
          startParagraph: 0,
          environment: {
            location: "Foundry",
            timeOfDay: "night",
            weather: null,
            lighting: "forge glow",
            description: "An old foundry.",
            persistentElements: [],
          },
          cast: [],
          continuity: { revision: 0, characters: {}, facts: {} },
          basePrompt: "old foundry",
          cameraLock: {
            framing: "medium wide",
            angle: "eye level",
            perspective: "fixed",
            lens: "50mm",
            subjectAnchor: "center",
            horizon: "upper third",
            safeDialogueRegion: "lower third",
            aspectRatio: "16:9",
          },
          compositionLock: "centered",
          activeAssetId: null,
          priorSceneId: null,
        }],
        visualCues: [],
        choices: [],
        initialContinuity: { revision: 0, characters: {}, facts: {} },
        continuityDeltas: [],
        terminalContinuity: { revision: 0, characters: {}, facts: {} },
        planningStatus: "planned",
        createdAt: new Date().toISOString(),
      }),
      jobs: [],
      updatedAt: new Date().toISOString(),
    };
    let loreCalls = 0;
    const spindle: any = {
      chats: { get: async () => ({ id: "chat-lh", character_id: "card-lh" }) },
      chat: {
        getMessages: async () => [{
          id: "msg-lh",
          chat_id: "chat-lh",
          index_in_chat: 0,
          is_user: false,
          name: "Narrator",
          content: "The Brass Astrolabe gleams inside the Foundry.",
          swipe_id: 0,
          swipes: ["The Brass Astrolabe gleams inside the Foundry."],
          role: "assistant",
        }],
      },
      characters: { get: async () => ({ id: "card-lh", name: "Scenario", description: "", tags: [], extensions: {} }) },
      personas: { getActive: async () => null },
      connections: { get: async () => null, list: async () => [] },
      generate: {
        raw: async () => {
          loreCalls++;
          if (loreCalls === 1) {
            // Main critical-path plan omits storyReferences/storyDocuments (Split-Horizon)
            return {
              content: JSON.stringify({
                scenes: [{ startParagraph: 0, environment: { location: "Foundry", timeOfDay: "night", weather: null, lighting: "forge glow", description: "An old foundry.", persistentElements: [] }, cast: [] }],
                cues: [],
              }),
            };
          }
          return {
            content: JSON.stringify({
              storyReferences: [{
                kind: "object",
                name: "Brass Astrolabe",
                paragraphIndex: 0,
                field: "appearance",
                value: "brass",
                evidence: "The Brass Astrolabe gleams inside the Foundry.",
              }],
              storyDocuments: [],
            }),
          };
        },
      },
      userStorage: {
        getJson: async (p: string, opts?: { fallback?: unknown }) => (store.has(p) ? structuredClone(store.get(p)) : opts?.fallback ?? null),
        setJson: async (p: string, v: unknown) => { store.set(p, structuredClone(v)); },
      },
      sendToFrontend: (msg: unknown) => sent.push(msg),
      on: () => () => {},
      onFrontendMessage: () => {},
      log: { warn: () => {}, error: () => {}, info: () => {} },
    };
    store.set("config.json", {
      ...DEFAULT_CONFIG,
      generateImages: false,
      maxImagesPerTurn: 0,
      tooltips: { ...DEFAULT_CONFIG.tooltips, enabled: true },
      includeCharacterContext: false,
      includePersonaContext: false,
      includeLorebookContext: false,
      includeSimTrackerContext: false,
    });
    registerVisualNovelBackend(spindle);
    await sendState(spindle, "chat-lh", "u-lh", { viewOpen: true });
    // Cancel the auto-scheduled 1500ms job before firing to verify cancel discipline
    cancelSplitHorizonLore("u-lh:chat-lh");
    await new Promise((r) => setTimeout(r, 40));
    expect(sent.filter((m) => m.type === "vn_turn_lore_patch")).toHaveLength(0);

    const activeState = store.get(chatStatePath("chat-lh")) as StoredChatState;
    const savedTurn = store.get(activeState.activeTurnPath!) as StoredTurnRecord;
    expect(savedTurn.plan.storyReferences).toBeUndefined();

    // Now trigger immediate Split-Horizon worker while turn key is active & fenced
    scheduleSplitHorizonLore(spindle, {
      userId: "u-lh",
      chatId: "chat-lh",
      path: activeState.activeTurnPath!,
      turnKey: savedTurn.plan.key,
      intakeEpoch: 0,
      config: { ...DEFAULT_CONFIG, tooltips: { ...DEFAULT_CONFIG.tooltips, enabled: true } },
      paragraphs: savedTurn.plan.paragraphs,
      prevLocationName: null,
      messages: [],
      delayMs: 0,
    });
    await new Promise((r) => setTimeout(r, 60));
    const patches = sent.filter((m) => m.type === "vn_turn_lore_patch");
    expect(patches).toHaveLength(1);
    expect(patches[0].messageId).toBe("msg-lh");
    expect(patches[0].presentation).toBeTruthy();
    const updated = store.get(activeState.activeTurnPath!) as StoredTurnRecord;
    expect(updated.plan.storyReferences?.[0]?.name).toBe("Brass Astrolabe");
    viewRegistry().close("u-lh", "chat-lh");
  });
});
