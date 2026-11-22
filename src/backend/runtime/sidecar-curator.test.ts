import { describe, expect, test } from "bun:test";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { DEFAULT_CONFIG, normalizeConfig } from "../../config.js";
import {
  StoryDocumentSchema,
  filterStrictStoryDocuments,
  mergeStoryDocuments,
  senseDocumentsDeterministically,
} from "../../shared/story-documents.js";
import type { StoryDNASet } from "../../shared/story-dna.js";
import { TurnPlanSchema } from "../../shared/contracts.js";
import { resolveSidecarConnection } from "./connections.js";
import { extractTurnLoreAsync } from "./planner.js";
import { harvestTurnStoryDNA } from "./story-dna-harvester.js";

describe("P0 storyDocuments.sections <= 16 & Sidecar Curator Engine", () => {
  test("senseDocumentsDeterministically and mergeStoryDocuments cap sections at <=16 and documents at <=12", () => {
    const quotes = Array.from({ length: 24 }, (_, idx) => `"Line ${idx + 1} of the long ledger entry."`).join(" ");
    const paragraphs = [
      {
        index: 0,
        text: `She opens the weathered harbour ledger and reads aloud: ${quotes}`,
      },
      {
        index: 1,
        text: `It continues: ${Array.from({ length: 12 }, (_, idx) => `"Continuation ${idx + 1} in the margin."`).join(" ")}`,
      },
    ];

    const sensed = senseDocumentsDeterministically(paragraphs);
    expect(sensed.length).toBeGreaterThan(0);
    for (const doc of sensed) {
      expect(doc.sections.length).toBeLessThanOrEqual(16);
      expect((doc.observations ?? []).length).toBeLessThanOrEqual(16);
      expect(() => StoryDocumentSchema.parse(doc)).not.toThrow();
    }

    const extraDoc = {
      ...sensed[0]!,
      sections: Array.from({ length: 22 }, (_, i) => ({
        paragraphIndex: 0,
        start: i * 2,
        end: i * 2 + 1,
        text: `S${i}`,
      })),
    };
    const merged = mergeStoryDocuments(sensed, [extraDoc]);
    for (const doc of merged) {
      expect(doc.sections.length).toBeLessThanOrEqual(16);
      expect(() => StoryDocumentSchema.parse(doc)).not.toThrow();
    }
  });

  test("filterStrictStoryDocuments drops bare generic nouns and suppressed nouns while keeping quoted/sidecar docs", () => {
    const bareGeneric = {
      id: "doc-note-1",
      name: "the note",
      kind: "note" as const,
      paragraphIndex: 0,
      sections: [],
    };
    const quotedLetter = {
      id: "doc-letter-1",
      name: "crimson-sealed warrant",
      kind: "letter" as const,
      paragraphIndex: 0,
      sections: [{ paragraphIndex: 0, start: 10, end: 25, text: "Arrest the duke" }],
    };
    const suppressedFlyer = {
      id: "doc-flyer-1",
      name: "torn flyer",
      kind: "flyer" as const,
      paragraphIndex: 0,
      sections: [{ paragraphIndex: 0, start: 30, end: 40, text: "Lost hound" }],
    };

    const filtered = filterStrictStoryDocuments([bareGeneric, quotedLetter, suppressedFlyer], {
      suppressedNouns: ["torn flyer"],
    });
    expect(filtered.map((d) => d.name)).toEqual(["crimson-sealed warrant"]);

    const sidecarKept = filterStrictStoryDocuments([bareGeneric], {
      fromSidecarLlm: true,
    });
    expect(sidecarKept.map((d) => d.name)).toEqual(["the note"]);
  });

  test("resolveSidecarConnection uses sidecarConnectionId + sidecarModel override or falls back to parserConnectionId", async () => {
    const catalog = [
      { id: "main-pro", name: "Main Pro", provider: "openai", model: "gpt-4o", is_default: true },
      { id: "fast-flash", name: "Fast Flash", provider: "google", model: "gemini-2.0-flash", is_default: false },
    ];
    const mockSpindle = {
      connections: {
        get: async (id: string) => catalog.find((c) => c.id === id) ?? null,
        list: async () => catalog,
      },
    } as unknown as SpindleAPI;

    const fallback = await resolveSidecarConnection(mockSpindle, {
      parserConnectionId: "main-pro",
      sidecarConnectionId: null,
      sidecarModel: "",
    });
    expect(fallback).toEqual({ id: "main-pro", provider: "openai", model: "gpt-4o" });

    const dedicated = await resolveSidecarConnection(mockSpindle, {
      parserConnectionId: "main-pro",
      sidecarConnectionId: "fast-flash",
      sidecarModel: "gemini-2.5-flash-lite",
    });
    expect(dedicated).toEqual({
      id: "fast-flash",
      provider: "google",
      model: "gemini-2.5-flash-lite",
    });
  });

  test("extractTurnLoreAsync parses 6-in-1 Sidecar Curator payload and vetoes suppressed document nouns", async () => {
    let usedConnectionId: string | undefined;
    let usedModel: string | undefined;
    const paragraphs = [
      {
        index: 0,
        text: 'Vane glances at the crumpled paper on the floor, then unfolds the Imperial Warrant. It reads: "By order of the Crown, seal the vaults." Vane swaps his bloodstained coat for a dry charcoal travel cloak.',
      },
    ];

    const catalog = [
      { id: "main-pro", name: "Main Pro", provider: "openai", model: "gpt-4o", is_default: true },
      { id: "fast-sidecar", name: "Fast Sidecar", provider: "google", model: "gemini-2.0-flash", is_default: false },
    ];
    const mockSpindle = {
      connections: {
        get: async (id: string) => catalog.find((c) => c.id === id) ?? null,
        list: async () => catalog,
      },
      generate: {
        raw: async (req: Record<string, unknown>) => {
          usedConnectionId = req.connection_id as string | undefined;
          usedModel = req.model as string | undefined;
          return {
            content: JSON.stringify({
              storyReferences: [
                {
                  kind: "object",
                  name: "Imperial Warrant",
                  paragraphIndex: 0,
                  field: "significance",
                  value: "Royal order sealing the vaults.",
                  evidence: 'unfolds the Imperial Warrant. It reads: "By order of the Crown, seal the vaults."',
                },
              ],
              storyDocuments: [
                {
                  name: "Imperial Warrant",
                  kind: "letter",
                  paragraphIndex: 0,
                  sections: [
                    {
                      paragraphIndex: 0,
                      text: "By order of the Crown, seal the vaults.",
                      evidence: 'It reads: "By order of the Crown, seal the vaults."',
                    },
                  ],
                },
              ],
              suppressedDocumentNouns: ["crumpled paper"],
              npcBeliefs: [
                {
                  npc: "Vane",
                  topic: "Crown vault order",
                  belief: "Knows the Crown ordered the vaults sealed immediately.",
                  status: "knows",
                },
              ],
              threadUpdates: [
                {
                  title: "The Sealed Vaults",
                  action: "open",
                  summary: "Discover why the Crown ordered the vaults sealed.",
                },
              ],
              wardrobeDeltas: [
                {
                  character: "Vane",
                  activeOutfit: "dry charcoal travel cloak",
                },
              ],
            }),
          };
        },
      },
    } as unknown as SpindleAPI;

    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      collectEntityReferences: true,
      parserConnectionId: "main-pro",
      sidecarConnectionId: "fast-sidecar",
      sidecarModel: "gemini-2.5-flash-lite",
      strictDocumentSensing: true,
    });

    const result = await extractTurnLoreAsync(mockSpindle, {
      config,
      paragraphs,
    });

    expect(usedConnectionId).toBe("fast-sidecar");
    expect(usedModel).toBe("gemini-2.5-flash-lite");
    expect(result.sidecarSucceeded).toBe(true);
    expect(result.storyDocuments.map((d) => d.name)).toEqual(["Imperial Warrant"]);
    expect(result.npcBeliefs).toEqual([
      {
        npc: "Vane",
        topic: "Crown vault order",
        belief: "Knows the Crown ordered the vaults sealed immediately.",
        status: "knows",
      },
    ]);
    expect(result.threadUpdates).toEqual([
      {
        title: "The Sealed Vaults",
        action: "open",
        summary: "Discover why the Crown ordered the vaults sealed.",
      },
    ]);
    expect(result.wardrobeDeltas).toEqual([
      {
        character: "Vane",
        activeOutfit: "dry charcoal travel cloak",
      },
    ]);

    const dnaSet: StoryDNASet = { locations: {}, items: {}, revision: 0 };
    const plan = TurnPlanSchema.parse({
      schemaVersion: 1,
      key: { chatId: "chat-1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fingerprint-1", revision: 0 },
      paragraphs: [{ index: 0, sourceIndex: 0, text: paragraphs[0]!.text }],
      scenes: [
        {
          sceneId: "s1",
          revision: 0,
          startParagraph: 0,
          environment: {
            location: "Vault Antechamber",
            timeOfDay: "night",
            weather: null,
            lighting: "torchlight",
            description: "Stone hall",
            persistentElements: [],
          },
          cast: [],
          continuity: { revision: 0, characters: {}, facts: {} },
          basePrompt: "hall",
          cameraLock: {
            framing: "wide",
            angle: "eye level",
            perspective: "fixed",
            lens: "35mm",
            subjectAnchor: "center",
            horizon: "middle",
            safeDialogueRegion: "lower third",
            aspectRatio: "16:9",
          },
          compositionLock: "center",
          activeAssetId: null,
          priorSceneId: null,
        },
      ],
      visualCues: [],
      choices: [],
      initialContinuity: { revision: 0, characters: {}, facts: {} },
      continuityDeltas: [],
      terminalContinuity: { revision: 0, characters: {}, facts: {} },
      planningStatus: "planned",
      createdAt: new Date().toISOString(),
      storyDocuments: result.storyDocuments,
    });

    harvestTurnStoryDNA(plan, dnaSet, "m1:0", null, {
      mindLedgerEnabled: true,
      chapterCodexEnabled: true,
      sidecar: {
        npcBeliefs: result.npcBeliefs,
        threadUpdates: result.threadUpdates,
      },
    });

    expect(dnaSet.npcBeliefs?.["Vane"]?.[0]?.knowsSecret).toBe(true);
    expect(dnaSet.thoughtCabinet?.some((t) => t.title === "The Sealed Vaults")).toBe(true);
  });
});
