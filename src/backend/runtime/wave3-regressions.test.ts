import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ChatMessageDTO, SpindleAPI } from "lumiverse-spindle-types";
import { DEFAULT_CONFIG } from "../../config.js";
import { scrubStoryDNASwipes, type StoryDNASet } from "../../shared/story-dna.js";
import { reduceRpgState } from "../../shared/rpg-state.js";
import { emptySingleCharacter } from "../core/visual-state.js";
import { buildOutboundDramaticBrief, planTurn } from "./planner.js";
import { harvestTurnStoryDNA } from "./story-dna-harvester.js";
import { FakeNode, installFakeDocument } from "../../frontend/stage/stage-test-dom.js";
import { formatSkillCheckBreakdown, RpgStageController } from "../../frontend/stage/rpg-hud.js";

const message: ChatMessageDTO & { role: "assistant" } = {
  id: "assistant-wave3",
  chat_id: "chat-w3",
  index_in_chat: 2,
  is_user: false,
  name: "Sandra",
  content: "Sandra unlocks the heavy brass safe.",
  send_date: 1,
  swipe_id: 0,
  swipes: ["Sandra unlocks the heavy brass safe."],
  swipe_dates: [1],
  extra: {},
  parent_message_id: "user-1",
  branch_id: null,
  created_at: 1,
  role: "assistant",
};

describe("Wave 3 Regressions (P10 + LumiChronicle + Seat 6 Storylets & RPG UI)", () => {
  test("P10 #31 syncs RPG inventory items into ItemDNA and skips deleted items", () => {
    const set: StoryDNASet = {
      revision: 0,
      locations: {},
      items: {},
      deletedItems: {
        "cursed-coin": {
          id: "cursed-coin",
          name: "Cursed Coin",
          aliases: [],
          description: "Discarded coin",
          distinctiveFeatures: [],
          colors: [],
          lastUpdated: Date.now(),
        },
      },
      thoughtCabinet: [],
      chapterCodex: [],
    };
    const plan: any = {
      key: { chatId: "c1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "f1", revision: 1 },
      paragraphs: [{ index: 0, sourceIndex: 0, text: "Found a Brass Key." }],
      scenes: [{ sceneId: "s1", revision: 1, startParagraph: 0, environment: { location: "Study", description: "Quiet room", persistentElements: [] }, cast: ["Sandra"], character: "Sandra" }],
      visualCues: [],
      rpgState: reduceRpgState(null, {
        personaName: "Kael",
        vitals: { inventory: ["Brass Key", "Cursed Coin"] },
      }),
    };
    const changed = harvestTurnStoryDNA(plan, set, "m1::0");
    expect(changed).toBe(true);
    const items = Object.values(set.items);
    expect(items.some((i) => i.name === "Brass Key" && i.heldBy === "Kael")).toBe(true);
    expect(items.some((i) => i.name === "Cursed Coin")).toBe(false);
  });

  test("Seat 6 thoughtCabinet lifecycle (germinating -> internalized -> resolved) and spoiler-free npcBeliefs", () => {
    const set: StoryDNASet = {
      revision: 0,
      locations: {},
      items: {},
      thoughtCabinet: [],
      chapterCodex: [],
    };
    const turn1: any = {
      key: { chatId: "c1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "f1", revision: 1 },
      paragraphs: [{ index: 0, sourceIndex: 0, text: "Vesper insists she left before midnight." }],
      scenes: [],
      visualCues: [],
      storyReferences: [
        { name: "Silver Locket", kind: "object", field: "significance", value: "Missing crest inside", evidence: "etched crest", paragraphIndex: 0 },
        { name: "Vesper", kind: "npc", field: "statedGoals", value: "Recover the harbor manifest", evidence: "said so", paragraphIndex: 0 },
      ],
    };
    harvestTurnStoryDNA(turn1, set, "m1::0");
    expect(set.thoughtCabinet).toHaveLength(2);
    expect(set.thoughtCabinet![0]!.status).toBe("germinating");
    expect(set.npcBeliefs?.Vesper?.[0]?.knowsSecret).toBe(false);
    expect(set.npcBeliefs?.Vesper?.[0]?.belief).toContain("Recover the harbor manifest");

    // Mention on turn 2 promotes germinating -> internalized
    const turn2: any = {
      ...turn1,
      key: { ...turn1.key, assistantMessageId: "m2" },
      paragraphs: [{ index: 0, sourceIndex: 0, text: "The Silver Locket weighs heavy in her pocket." }],
      storyReferences: [],
    };
    harvestTurnStoryDNA(turn2, set, "m2::0");
    expect(set.thoughtCabinet![0]!.status).toBe("internalized");

    // Explicit resolvedThreads transitions directly to resolved
    const turn3: any = {
      ...turn2,
      key: { ...turn1.key, assistantMessageId: "m3" },
      resolvedThreads: [set.thoughtCabinet![0]!.title],
    };
    harvestTurnStoryDNA(turn3, set, "m3::0");
    expect(set.thoughtCabinet![0]!.status).toBe("resolved");

    // Scrub removes threads only seen on replaced swipes
    const scrubbed = scrubStoryDNASwipes(set, { m1: "m1::1" });
    expect(scrubbed.thoughtCabinet).toHaveLength(0);
    expect(scrubbed.npcBeliefs).toEqual({});
  });

  test("Seat 6 buildOutboundDramaticBrief stays <= 1600 chars and never leaks knowsSecret entries", () => {
    const rpgState = reduceRpgState(null, {
      personaName: "Kael",
      quests: [{ title: "Harbor Ledger", objective: "Inspect the customs office before dawn", status: "active" }],
    });
    // Force turnsSinceProgress >= 2
    const stalled = reduceRpgState(reduceRpgState(rpgState, {}), {});
    const dnaSet: StoryDNASet = {
      revision: 1,
      locations: {},
      items: {},
      thoughtCabinet: [
        { id: "t1", title: "Open Promise", category: "promise", description: "Still open", status: "germinating", updatedAt: 1 },
        { id: "t2", title: "Closed Secret", category: "secret", description: "Done", status: "resolved", updatedAt: 1 },
      ],
      npcBeliefs: {
        Vesper: [
          { topic: "statedGoals", belief: "Public cover story", knowsSecret: false, updatedAt: 1 },
          { topic: "secret", belief: "SECRET SPOILER SHOULD NEVER APPEAR", knowsSecret: true as unknown as false, updatedAt: 2 },
        ],
      },
    };
    const brief = buildOutboundDramaticBrief({ rpgState: stalled, storyDNASet: dnaSet, activeCast: ["Vesper"] });
    expect(brief.length).toBeGreaterThan(0);
    expect(brief.length).toBeLessThanOrEqual(1600);
    expect(brief).toContain("Open Promise");
    expect(brief).not.toContain("Closed Secret");
    expect(brief).toContain("Public cover story");
    expect(brief).not.toContain("SECRET SPOILER");

    const capped = buildOutboundDramaticBrief({ rpgState: stalled, storyDNASet: dnaSet, maxChars: 220 });
    expect(capped.length).toBeLessThanOrEqual(220);
  });

  test("P10 planTurn wires rpgMode lite continuity, choice gating, rpgDeltas, and trailing OUTBOUND DRAMATIC BRIEF", async () => {
    const capturedMessages: Array<{ role: string; content: string }> = [];
    const store = new Map<string, unknown>();
    store.set("chats/chat-w3/story-dna.json", {
      revision: 1,
      locations: {},
      items: {},
      thoughtCabinet: [{ id: "tc-1", title: "Find the Cipher Key", category: "clue", description: "Hidden in vault", status: "internalized", updatedAt: 1 }],
      npcBeliefs: { Sandra: [{ topic: "statedGoals", belief: "Avoid the docks", knowsSecret: false, updatedAt: 1 }] },
    });

    const spindle: SpindleAPI = {
      chats: { get: async () => ({ character_id: "character-1" }) },
      characters: {
        get: async () => ({ id: "character-1", name: "Sandra", description: "detective", personality: "", scenario: "", creator_notes: "", tags: [], world_book_ids: [], extensions: {} }),
      },
      personas: { getActive: async () => null },
      userStorage: {
        getJson: async (key: string, opts?: { fallback?: unknown }) => (store.has(key) ? store.get(key) : (opts?.fallback ?? null)),
        setJson: async (key: string, val: unknown) => { store.set(key, val); },
      },
      connections: {
        get: async () => ({ id: "conn", name: "P", provider: "openai", model: "gpt", is_default: true, api_url: "", preset_id: null, has_api_key: true, metadata: {}, reasoning_bindings: null }),
        list: async () => [],
      },
      generate: {
        raw: async (req: { messages: Array<{ role: string; content: string }> }) => {
          capturedMessages.push(...req.messages);
          return {
            content: JSON.stringify({
              scenes: [{
                startParagraph: 0,
                boundary: { claimedNewScene: false, reason: "same_scene", location: "Study", timeOfDay: null, majorTimeJump: false, environmentReplacement: false, forced: false },
                environment: { location: "Study", description: "Oak study.", persistentElements: [] },
                character: "Sandra",
                cast: ["Sandra"],
              }],
              cues: [{ paragraphIndex: 0, character: "Sandra", expression: "focused", promptDelta: "opening safe" }],
              rpgDeltas: { itemsAdded: ["Cipher Key"], flagsSet: { safe_opened: true } },
              resolvedThreads: ["Find the Cipher Key"],
              choices: [
                {
                  label: "Open inner drawer",
                  submission: "I open the drawer with the Cipher Key.",
                  requires: { flags: ["safe_opened"], items: ["Cipher Key"] },
                  setsFlags: { drawer_looted: true },
                },
                {
                  label: "Call reinforcements",
                  submission: "I radio headquarters.",
                  requires: { flags: ["radio_repaired"] },
                  lockedReason: "Repair the radio first",
                },
              ],
            }),
          };
        },
      },
      log: { warn: () => {}, info: () => {} },
    } as unknown as SpindleAPI;

    const prevRpg = reduceRpgState(null, { personaName: "Detective" });
    const result = await planTurn(spindle, {
      chatId: "chat-w3",
      message,
      content: message.content,
      recentMessages: [],
      previousScene: null,
      previousContinuity: { revision: 0, characters: {}, facts: {} },
      previousRpgState: prevRpg,
      singleCharacter: emptySingleCharacter(),
      characterAppearance: {},
      config: { ...DEFAULT_CONFIG, mode: "cyoa", rpgMode: "lite", systemOneMode: "off" },
    });

    expect(result.usedFallback).toBe(false);
    expect(result.plan.rpgState?.vitals.inventory).toContain("Cipher Key");
    expect(result.plan.rpgState?.flags.safe_opened).toBe(true);
    expect(result.plan.resolvedThreads).toEqual(["Find the Cipher Key"]);
    expect(result.plan.choices[0]?.disabled).toBeUndefined();
    expect(result.plan.choices[0]?.setsFlags).toEqual({ drawer_looted: true });
    expect(result.plan.choices[1]?.disabled).toBe(true);
    expect(result.plan.choices[1]?.lockedReason).toBe("Repair the radio first");

    const userMsg = capturedMessages.find((m) => m.role === "user")?.content ?? "";
    const briefIdx = userMsg.indexOf("OUTBOUND DRAMATIC BRIEF");
    const targetIdx = userMsg.indexOf("TARGET ASSISTANT RESPONSE");
    expect(briefIdx).toBeGreaterThan(-1);
    expect(briefIdx).toBeLessThan(targetIdx);
    const sysMsg = capturedMessages.find((m) => m.role === "system")?.content ?? "";
    expect(sysMsg).not.toContain("OUTBOUND DRAMATIC BRIEF");
  });
});

describe("Wave 3 RpgStageController DOM & Breakdown UI", () => {
  let restore: () => void;
  let origSetTimeout: typeof setTimeout;
  let scheduledTimers: Array<{ delay: number; fn: () => void }>;

  beforeEach(() => {
    restore = installFakeDocument();
    scheduledTimers = [];
    origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void, delay = 0) => {
      scheduledTimers.push({ delay, fn });
      return scheduledTimers.length as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
  });

  afterEach(() => {
    globalThis.setTimeout = origSetTimeout;
    restore();
  });

  test("renders lock pill, itemized breakdown, gates [FLAGS: ...] on rpgMode, and settles <= 600ms", () => {
    const breakdown = formatSkillCheckBreakdown(14, { stat: "CHA", dc: 15, modifier: 3, rollMode: "normal" }, [
      { label: "Base", delta: 2 },
      { label: "Companion Bond", delta: 1 },
    ], 17);
    expect(breakdown).toBe("d20(14) · +2 Base · +1 Companion Bond = 17 vs DC 15");

    const stageEl = new FakeNode("div") as unknown as HTMLElement;
    const hudEl = new FakeNode("div") as unknown as HTMLElement;
    const rpg = new RpgStageController();
    rpg.mount(stageEl, hudEl);

    // Locked choice in rpgMode "off" still shows lock pill and never appends [FLAGS: ...]
    rpg.update("off", null);
    const lockedBtn = new FakeNode("button") as unknown as HTMLButtonElement;
    rpg.decorateChoiceButton(lockedBtn, {
      id: "c-locked",
      label: "Vault",
      value: "Enter vault",
      locked: false,
      disabled: true,
      lockedReason: "Need Master Key",
      setsFlags: { vault_entered: true },
    });
    const lockPill = (lockedBtn as unknown as FakeNode).querySelector("[data-vn-choice-lock]");
    expect(lockPill?.textContent).toBe("🔒 Need Master Key");
    expect(rpg.resolveChoiceSubmission({
      id: "c-locked",
      label: "Vault",
      value: "Enter vault",
      locked: false,
      setsFlags: { vault_entered: true },
    })).toBe("Enter vault");

    // In rpgMode "full", setsFlags appends [FLAGS: ...] and check shows breakdown + <=600ms settle
    const state = reduceRpgState(null, {
      personaName: "Kael",
      vitals: { companions: [{ name: "Mira", hp: 100, maxHp: 100, affinity: 80, status: "healthy" }] },
    });
    rpg.update("full", state);

    const checkBtn = new FakeNode("button") as unknown as HTMLButtonElement;
    rpg.decorateChoiceButton(checkBtn, {
      id: "c-check",
      label: "Persuade",
      value: "Ask Mira for backup",
      locked: false,
      check: { stat: "CHA", dc: 14, modifier: 1, rollMode: "normal" },
    });
    expect(checkBtn.title).toContain("Companion Bond: +1");

    const submission = rpg.resolveChoiceSubmission({
      id: "c-check",
      label: "Persuade",
      value: "Ask Mira for backup",
      locked: false,
      setsFlags: { backup_asked: true },
      check: { stat: "CHA", dc: 14, modifier: 1, rollMode: "normal" },
    });
    expect(submission).toContain("[SKILL CHECK:");
    expect(submission).toContain("[FLAGS: backup_asked=true]");

    const theatre = (stageEl as unknown as FakeNode).querySelector("[data-vn-rpg-theatre]")!;
    expect(theatre.hidden).toBe(false);
    expect(theatre.dataset.rollPhase).toBe("rolling");
    expect(theatre.innerHTML).toContain("vn-rpg-breakdown");
    expect(theatre.innerHTML).toContain("Companion Bond");

    const settleTimer = scheduledTimers.find((t) => t.delay <= 600);
    expect(settleTimer).toBeDefined();
    settleTimer!.fn();
    expect(theatre.dataset.rollPhase).toBe("settled");

    theatre.click();
    expect(theatre.hidden).toBe(true);
    rpg.destroy();
  });
});
