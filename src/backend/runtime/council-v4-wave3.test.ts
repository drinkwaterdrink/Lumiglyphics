import { describe, it, expect } from "bun:test";
import { clampCropRect, fitAspectCropRect } from "../../frontend/stage/reference-cropper.js";
import { resolveVoiceForParagraph } from "../../frontend/speech/voice-resolution.js";
import { createEmptyCharacterDNA } from "../../shared/character-dna.js";
import { saveCharacterDNA, loadCharacterDNALibrary } from "./character-dna-store.js";
import { handleCharacterDnaRequest } from "./character-dna-workflow.js";
import { loadCharacterAppearance } from "./storage.js";
import { buildVisualBrief } from "./visual-brief.js";
import { DEFAULT_CONFIG } from "../../config.js";
import type { SpindleAPI } from "lumiverse-spindle-types";

describe("Wave 3 Council v4 Overhaul Tests", () => {
  it("clampCropRect and fitAspectCropRect properly bound normalized crop geometries", () => {
    // Clamping out-of-bounds rects
    const clamped = clampCropRect({ x: -0.2, y: 0.95, width: 0.5, height: 0.5 });
    expect(clamped.x).toBe(0);
    expect(clamped.width).toBe(0.5);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(1.0);

    // 1:1 square crop fitting on a 1000x500 landscape image
    const squareCrop = fitAspectCropRect(1000, 500, "1:1", { x: 0.5, y: 0.5 }, 0.8);
    expect(squareCrop.width).toBeCloseTo(0.4, 2);
    expect(squareCrop.height).toBeCloseTo(0.8, 2);
    expect(squareCrop.x + squareCrop.width).toBeLessThanOrEqual(1.0);
    expect(squareCrop.y + squareCrop.height).toBeLessThanOrEqual(1.0);

    // 3:4 portrait crop fitting on a 500x1000 portrait image
    const portraitCrop = fitAspectCropRect(500, 1000, "3:4", { x: 0.5, y: 0.5 }, 0.8);
    expect(portraitCrop.width).toBeLessThanOrEqual(1.0);
    expect(portraitCrop.height).toBeLessThanOrEqual(1.0);
  });

  it("resolveVoiceForParagraph falls back to character aliases when primary name has no direct override", () => {
    const settings = {
      narrator: { provider: "browser", voiceId: "narrator-voice" },
      characterDefault: { provider: "browser", voiceId: "default-char-voice" },
      characters: {
        "chat::chat-1::orin": { provider: "browser", voiceId: "orin-voice" },
      },
    };

    // When speaker is "Attendant", but alias list includes "Orin"
    const resolved = resolveVoiceForParagraph(settings, {
      chatId: "chat-1",
      paragraphSpeaker: "Attendant",
      turnSpeaker: "Narrator",
      aliases: ["Orin", "The Cloaked Figure"],
    });

    expect(resolved.source).toBe("character-override");
    expect(resolved.ref?.voiceId).toBe("orin-voice");
    expect(resolved.speakerName).toBe("Attendant");
  });

  it("saveCharacterDNA performs true rename and demotes previous name to alias", async () => {
    const store = new Map<string, unknown>();
    const spindle: SpindleAPI = {
      userStorage: {
        getJson: async <T>(path: string, opts?: { fallback?: unknown }) => (store.get(path) as T) ?? (opts?.fallback as T),
        setJson: async (path: string, val: unknown) => { store.set(path, structuredClone(val)); },
      },
      log: { info: () => {}, warn: () => {}, error: () => {} },
    } as unknown as SpindleAPI;

    // Initial character
    const char = createEmptyCharacterDNA("Attendant", "attendant-1");
    char.hair.color = "obsidian black";
    await saveCharacterDNA(spindle, "c1", char, "u1");

    // Rename to Orin
    const renamed = { ...char, name: "Orin" };
    await saveCharacterDNA(spindle, "c1", renamed, "u1");

    const lib = await loadCharacterDNALibrary(spindle, "c1", "u1");
    const saved = lib.characters["attendant-1"];
    expect(saved).toBeDefined();
    expect(saved?.name).toBe("Orin");
    expect(saved?.aliases).toContain("Attendant");
  });

  it("character-dna-workflow lossless merge preserves crop metadata, wardrobe states and thumbnails", async () => {
    const store = new Map<string, unknown>();
    const messages: unknown[] = [];
    const spindle: SpindleAPI = {
      userStorage: {
        getJson: async <T>(path: string, opts?: { fallback?: unknown }) => (store.get(path) as T) ?? (opts?.fallback as T),
        setJson: async (path: string, val: unknown) => { store.set(path, structuredClone(val)); },
      },
      sendToFrontend: (msg: unknown) => { messages.push(msg); },
      log: { info: () => {}, warn: () => {}, error: () => {} },
    } as unknown as SpindleAPI;

    const targetChar = createEmptyCharacterDNA("Aurelia", "aurelia");
    targetChar.hair.color = "gold";
    targetChar.locked = false;

    const otherChar = createEmptyCharacterDNA("Aurie", "aurie");
    otherChar.eyes.color = "violet";
    otherChar.locked = false;
    otherChar.referenceCropMeta = {
      sourceUrl: "https://example.com/aurie.png",
      rect: { x: 0.1, y: 0.1, width: 0.6, height: 0.6 },
      aspect: "1:1",
    };
    otherChar.wardrobeStates = { Battle: "silver plate armor" };
    otherChar.wardrobeThumbnails = { Battle: "https://example.com/armor.png" };
    otherChar.distinguishingFeatures = ["rune scar on right cheek"];

    await saveCharacterDNA(spindle, "c1", targetChar, "u1");
    await saveCharacterDNA(spindle, "c1", otherChar, "u1");

    await handleCharacterDnaRequest(
      spindle,
      {
        type: "vn_character_dna",
        action: "merge",
        chatId: "c1",
        requestId: "req-merge",
        characterId: "aurelia",
        otherId: "aurie",
      },
      "u1"
    );

    const lib = await loadCharacterDNALibrary(spindle, "c1", "u1");
    const merged = lib.characters["aurelia"];
    expect(merged).toBeDefined();
    expect(merged?.eyes.color).toBe("violet");
    expect(merged?.aliases).toContain("Aurie");
    expect(merged?.referenceCropMeta?.sourceUrl).toBe("https://example.com/aurie.png");
    expect(merged?.wardrobeStates?.["Battle"]).toBe("silver plate armor");
    expect(merged?.wardrobeThumbnails?.["Battle"]).toBe("https://example.com/armor.png");
    expect(merged?.distinguishingFeatures).toContain("rune scar on right cheek");
    expect(lib.characters["aurie"]).toBeUndefined();
  });

  it("loadCharacterAppearance enforces Curated DNA > CastArtSetup > Unlocked autoDiscovered DNA > characters.json", async () => {
    const store = new Map<string, unknown>();
    const spindle: SpindleAPI = {
      userStorage: {
        getJson: async <T>(path: string, opts?: { fallback?: unknown; userId?: string }) => {
          return (store.get(path) ?? opts?.fallback) as T;
        },
        setJson: async (path: string, val: unknown) => {
          store.set(path, structuredClone(val));
        },
      },
      log: { info: () => {}, warn: () => {}, error: () => {} },
    } as unknown as SpindleAPI;

    // 1. characters.json has baseline "old baseline look"
    store.set("chats/chat-prec/characters.json", {
      mira: "mira, brown hair, wool coat",
    });

    // 2. Unlocked autoDiscovered DNA stored as background discovery
    const autoChar = createEmptyCharacterDNA("Mira", "mira");
    autoChar.autoDiscovered = true;
    autoChar.locked = false;
    autoChar.hair.color = "auburn";
    store.set("chats/chat-prec/character-dna.json", {
      version: 1,
      characters: { mira: autoChar },
    });

    // 3. Cast Art setup has "cast art setup look"
    store.set("chats/chat-prec/cast-art.json", {
      version: 1,
      characters: [
        {
          entityId: "mira",
          name: "Mira",
          artRevision: 0,
          description: "Mira",
          preferredVariantId: null,
          variants: [],
          setup: {
            appearance: "mira, emerald eyes, formal velvet gown",
            aliases: [],
            outfits: [],
            defaultOutfitId: null,
          },
        },
      ],
    });

    // Cast Art setup overrides unlocked autoDiscovered DNA
    const appMap1 = await loadCharacterAppearance(spindle, "u1", "chat-prec");
    expect(appMap1["Mira"]).toContain("formal velvet gown");

    // 4. Now lock / curate the DNA
    autoChar.locked = true;
    autoChar.hair.color = "platinum blonde";
    autoChar.signatureOutfit = "enchanted armor";
    await saveCharacterDNA(spindle, "chat-prec", autoChar, "u1");

    // Curated DNA overrides Cast Art setup
    const appMap2 = await loadCharacterAppearance(spindle, "u1", "chat-prec");
    expect(appMap2["Mira"]).toContain("platinum blonde");
  });

  it("buildVisualBrief locked wardrobe overrides planner attire", () => {
    const charDna = createEmptyCharacterDNA("Rena", "rena");
    charDna.hair.color = "ruby red";
    charDna.lockActiveWardrobe = true;
    charDna.activeWardrobeKey = "Traveler";
    charDna.wardrobeStates = { Traveler: "heavy fur-lined traveling cloak and leather boots" };

    const cue = {
      paragraphIndex: 0,
      character: "Rena",
      attire: "ragged peasant tunic", // Planner ephemeral attire
    };

    const scene = {
      cast: ["Rena"],
      environment: { location: "Forest Path", description: "pine trees and snow" },
    };

    const brief = buildVisualBrief(
      DEFAULT_CONFIG,
      scene as any,
      cue as any,
      {},
      { characters: { rena: charDna }, version: 1 } as any
    );

    // The locked wardrobe MUST take precedence over the planner's ephemeral attire
    expect(brief.subjectPreparation?.attire).toBe("heavy fur-lined traveling cloak and leather boots");
    expect(brief.subjects).toContain("heavy fur-lined traveling cloak and leather boots");
    expect(brief.subjects).not.toContain("ragged peasant tunic");
  });
});
