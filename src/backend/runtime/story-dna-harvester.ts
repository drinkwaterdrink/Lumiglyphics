import type { SpindleAPI } from 'lumiverse-spindle-types';
import { z } from 'zod';
import type { TurnPlan } from '../../shared/contracts.js';
import { isScenarioTitle } from '../../shared/card-role.js';
import {
  createItemId,
  createLocationId,
  deriveShortAliases,
  findMatchingItem,
  findMatchingLocation,
  isStoryEntryActiveOnBranch,
  type ItemDNA,
  type LocationDNA,
  type NpcBelief,
  type StoryDNASet,
} from '../../shared/story-dna.js';
import { loadConfig, loadTurnRecord, turnPath } from './storage.js';
import { extractSimTracker } from './simtracker.js';
import { targetDnaPassages } from './character-dna-autofill.js';
import { resolvePlannerConnection } from './connections.js';
import { jsonObject } from './planner/json-repair.js';
import { loadVisualContext } from './context.js';

const MUNDANE_ITEM_WORDS = new Set([
  'door', 'doors', 'table', 'tables', 'chair', 'chairs', 'desk', 'desks', 'bed', 'beds',
  'window', 'windows', 'floor', 'wall', 'walls', 'ceiling', 'room', 'hall',
  'hand', 'hands', 'arm', 'arms', 'eye', 'eyes', 'face', 'head', 'finger', 'fingers',
  'cup', 'cups', 'mug', 'mugs', 'glass', 'glasses', 'plate', 'plates', 'bowl', 'fork', 'spoon',
  'shirt', 'coat', 'dress', 'jacket', 'shoes', 'boots', 'pants', 'skirt', 'pocket', 'pockets',
  'bag', 'bags', 'paper', 'papers', 'sheet', 'sheets', 'pen', 'pencil', 'phone', 'phones',
  'bottle', 'bottles', 'napkin', 'towel', 'pillow', 'blanket', 'bench', 'stairs', 'step', 'steps',
  'tree', 'trees', 'rock', 'rocks', 'grass', 'water', 'food', 'bread', 'tea', 'coffee',
  'wine', 'beer', 'air', 'wind', 'light', 'shadow', 'shadows', 'item', 'thing', 'object',
]);

const COMMON_MUNDANE_MODIFIERS = new Set([
  'a', 'an', 'the', 'my', 'his', 'her', 'their', 'your', 'our', 'this', 'that', 'some',
  'old', 'new', 'wooden', 'wood', 'metal', 'plain', 'simple', 'empty', 'full', 'open', 'closed',
  'large', 'small', 'little', 'big', 'tall', 'short', 'clean', 'dirty', 'hot', 'cold',
  'warm', 'cool', 'dark', 'heavy', 'lightweight', 'ordinary', 'standard', 'plastic', 'ceramic',
]);

const SIGNIFICANCE_HINT_RE = /\b(heirloom|artifact|relic|enchanted|cursed|rune|runic|sigil|cipher|letter|journal|grimoire|talisman|amulet|medallion|locket|codex|scroll|crest|signet|royal|ancient|sacred|blessed|forbidden)\b/i;

export function isSignificantStoryItem(name: string, contextText?: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 160) return false;
  if (isScenarioTitle(trimmed)) return false;

  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const headWord = words[words.length - 1]!;
  if (words.length === 1 && MUNDANE_ITEM_WORDS.has(headWord)) return false;

  const hasExplicitSignificance = SIGNIFICANCE_HINT_RE.test(trimmed) || Boolean(contextText && SIGNIFICANCE_HINT_RE.test(contextText));
  if (MUNDANE_ITEM_WORDS.has(headWord) && !hasExplicitSignificance) {
    return false;
  }

  const allMundaneOrModifiers = words.every(
    (w) => MUNDANE_ITEM_WORDS.has(w) || COMMON_MUNDANE_MODIFIERS.has(w)
  );
  if (!allMundaneOrModifiers) return true;

  if (words.length >= 2 && hasExplicitSignificance) {
    return true;
  }
  return false;
}

export function filterStoryDnaForActiveBranch(
  set: StoryDNASet,
  activeTags: ReadonlySet<string>
): StoryDNASet {
  if (!activeTags || activeTags.size === 0) return set;
  const locations: Record<string, LocationDNA> = Object.create(null);
  for (const [id, loc] of Object.entries(set.locations)) {
    if (isStoryEntryActiveOnBranch(loc, activeTags)) locations[id] = loc;
  }
  const items: Record<string, ItemDNA> = Object.create(null);
  for (const [id, item] of Object.entries(set.items)) {
    if (isStoryEntryActiveOnBranch(item, activeTags)) items[id] = item;
  }
  return { ...set, locations, items };
}

function recordSwipeTag(
  entry: { autoDiscovered?: boolean | undefined; seenInSwipes?: string[] | undefined },
  swipeTag: string
): boolean {
  if (!entry.autoDiscovered || !swipeTag) return false;
  const seen = entry.seenInSwipes ?? [];
  if (seen.includes(swipeTag)) return false;
  entry.seenInSwipes = [...seen, swipeTag].slice(-60);
  return true;
}

function linkLocationEdge(a: LocationDNA | undefined, b: LocationDNA | undefined): boolean {
  if (!a || !b || a.id === b.id) return false;
  let changed = false;
  const add = (from: LocationDNA, targetName: string) => {
    if (from.locked) return;
    const list = from.connectedLocations ?? [];
    if (!list.some((x) => x.trim().toLowerCase() === targetName.trim().toLowerCase())) {
      from.connectedLocations = [...list, targetName].slice(0, 24);
      changed = true;
    }
  };
  add(a, b.name);
  add(b, a.name);
  return changed;
}

export function harvestTurnStoryDNA(
  plan: TurnPlan,
  set: StoryDNASet,
  swipeTag: string,
  prevLocationName?: string | null,
  options?: { mindLedgerEnabled?: boolean; chapterCodexEnabled?: boolean }
): boolean {
  let changed = false;
  let lastLoc: LocationDNA | undefined = prevLocationName
    ? findMatchingLocation(set.locations, prevLocationName)
    : undefined;

  for (const scene of plan.scenes) {
    const locName = scene.environment.location?.trim();
    if (!locName || isScenarioTitle(locName)) continue;
    const deletedMatch = findMatchingLocation(set.deletedLocations ?? {}, locName)
      ?? set.deletedLocations?.[createLocationId(locName)];
    if (deletedMatch) continue;

    let loc = findMatchingLocation(set.locations, locName);
    const atmosphere = [scene.environment.timeOfDay, scene.environment.weather]
      .filter((x): x is string => Boolean(x && x.trim()))
      .join(', ');

    if (!loc) {
      const id = createLocationId(locName);
      loc = {
        id,
        name: locName,
        aliases: deriveShortAliases(locName),
        ...(scene.environment.description?.trim() ? { environmentDescription: scene.environment.description.trim().slice(0, 2000) } : {}),
        ...(scene.environment.lighting?.trim() ? { lighting: scene.environment.lighting.trim().slice(0, 500) } : {}),
        ...(atmosphere ? { atmosphere: atmosphere.slice(0, 500) } : {}),
        persistentElements: (scene.environment.persistentElements ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 24),
        connectedLocations: [],
        autoDiscovered: true,
        seenInSwipes: swipeTag ? [swipeTag] : [],
        lastUpdated: Date.now(),
      };
      set.locations[id] = loc;
      changed = true;
    } else {
      if (recordSwipeTag(loc, swipeTag)) changed = true;
      if (!loc.locked) {
        const nextAliases = deriveShortAliases(loc.name, loc.aliases);
        if (nextAliases.length > loc.aliases.length) {
          loc.aliases = nextAliases;
          changed = true;
        }
        if (!loc.environmentDescription && scene.environment.description?.trim()) {
          loc.environmentDescription = scene.environment.description.trim().slice(0, 2000);
          changed = true;
        }
        if (!loc.lighting && scene.environment.lighting?.trim()) {
          loc.lighting = scene.environment.lighting.trim().slice(0, 500);
          changed = true;
        }
        if (!loc.atmosphere && atmosphere) {
          loc.atmosphere = atmosphere.slice(0, 500);
          changed = true;
        }
        if (scene.environment.persistentElements?.length) {
          const merged = [...loc.persistentElements];
          for (const el of scene.environment.persistentElements) {
            const clean = el.trim();
            if (clean && !merged.some((m) => m.toLowerCase() === clean.toLowerCase())) {
              merged.push(clean);
            }
          }
          if (merged.length > loc.persistentElements.length) {
            loc.persistentElements = merged.slice(0, 24);
            changed = true;
          }
        }
      }
    }

    if (options?.chapterCodexEnabled !== false && (!lastLoc || lastLoc.id !== loc.id)) {
      const codex = set.chapterCodex ?? [];
      const lastEntry = codex.at(-1);
      if (!lastEntry || lastEntry.location.toLowerCase() !== loc.name.toLowerCase()) {
        const entryId = `ch-${loc.id}-${codex.length + 1}`.slice(0, 250);
        const who = Array.from(new Set(
          [scene.character, ...(scene.cast ?? [])]
            .map((name) => (name ?? "").trim())
            .filter(Boolean)
        )).slice(0, 12);
        const whatChanged: string[] = [];
        const prevName = lastLoc?.name || prevLocationName?.trim();
        if (prevName && prevName.toLowerCase() !== loc.name.toLowerCase()) {
          whatChanged.push(`Moved from ${prevName} to ${loc.name}`);
        }
        if (scene.environment.timeOfDay) whatChanged.push(`Time: ${scene.environment.timeOfDay}`);
        if (scene.environment.weather) whatChanged.push(`Weather: ${scene.environment.weather}`);
        if (scene.attire) whatChanged.push(`Attire: ${scene.attire.slice(0, 140)}`);
        const baseDesc = (scene.environment.description?.trim() || loc.environmentDescription || `Scene at ${loc.name}`).slice(0, 1400);
        const structuredSummary = [
          who.length > 0 ? `Who: ${who.join(", ")}` : "",
          `Where: ${loc.name}`,
          whatChanged.length > 0 ? `Changed: ${whatChanged.join("; ")}` : "",
          baseDesc
        ].filter(Boolean).join(" | ").slice(0, 2000);
        set.chapterCodex = [
          ...codex,
          {
            id: entryId,
            title: loc.name.slice(0, 180),
            location: loc.name.slice(0, 180),
            who,
            where: loc.name.slice(0, 180),
            whatChanged: whatChanged.slice(0, 12),
            summary: structuredSummary,
            ...(plan.key?.assistantMessageId ? { messageId: plan.key.assistantMessageId.slice(0, 160) } : {}),
            seenInSwipes: swipeTag ? [swipeTag] : [],
            timestamp: Date.now()
          }
        ].slice(-40);
        changed = true;
      }
    }

    if (linkLocationEdge(lastLoc, loc)) changed = true;
    lastLoc = loc;
  }

  for (const ref of plan.storyReferences ?? []) {
    if (ref.kind === 'place') {
      const match = findMatchingLocation(set.locations, ref.name);
      if (match && !match.locked && ref.value?.trim()) {
        if (!match.environmentDescription && (ref.field === 'description' || ref.field === 'surroundings' || ref.field === 'layout')) {
          match.environmentDescription = ref.value.trim().slice(0, 2000);
          changed = true;
        } else if (!match.loreText && (ref.field === 'history' || ref.field === 'significance' || ref.field === 'customs')) {
          match.loreText = ref.value.trim().slice(0, 4000);
          changed = true;
        }
      }
    }
  }

  const upsertItem = (
    name: string,
    patch: {
      description?: string | undefined;
      itemType?: string | undefined;
      heldBy?: string | undefined;
      loreText?: string | undefined;
      feature?: string | undefined;
    }
  ) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const deleted = findMatchingItem(set.deletedItems ?? {}, cleanName)
      ?? set.deletedItems?.[createItemId(cleanName)];
    if (deleted) return;

    let item = findMatchingItem(set.items, cleanName);
    if (!item) {
      const id = createItemId(cleanName);
      item = {
        id,
        name: cleanName,
        aliases: deriveShortAliases(cleanName),
        ...(patch.itemType ? { itemType: patch.itemType.slice(0, 100) } : {}),
        description: (patch.description?.trim() || cleanName).slice(0, 2000),
        distinctiveFeatures: patch.feature ? [patch.feature.slice(0, 300)] : [],
        colors: [],
        ...(patch.heldBy ? { heldBy: patch.heldBy.slice(0, 160) } : {}),
        ...(patch.loreText ? { loreText: patch.loreText.slice(0, 4000) } : {}),
        autoDiscovered: true,
        seenInSwipes: swipeTag ? [swipeTag] : [],
        lastUpdated: Date.now(),
      };
      set.items[id] = item;
      changed = true;
      return;
    }

    if (recordSwipeTag(item, swipeTag)) changed = true;
    if (item.locked) return;
    const nextAliases = deriveShortAliases(item.name, item.aliases);
    if (nextAliases.length > item.aliases.length) {
      item.aliases = nextAliases;
      changed = true;
    }
    if ((!item.description || item.description === item.name) && patch.description?.trim()) {
      item.description = patch.description.trim().slice(0, 2000);
      changed = true;
    }
    if (!item.itemType && patch.itemType) {
      item.itemType = patch.itemType.slice(0, 100);
      changed = true;
    }
    if (!item.heldBy && patch.heldBy) {
      item.heldBy = patch.heldBy.slice(0, 160);
      changed = true;
    }
    if (!item.loreText && patch.loreText) {
      item.loreText = patch.loreText.slice(0, 4000);
      changed = true;
    }
    if (patch.feature && !item.distinctiveFeatures.some((f) => f.toLowerCase() === patch.feature!.toLowerCase())) {
      item.distinctiveFeatures = [...item.distinctiveFeatures, patch.feature.slice(0, 300)].slice(0, 24);
      changed = true;
    }
  };

  for (const doc of plan.storyDocuments ?? []) {
    const body = doc.sections.map((s) => s.text.trim()).filter(Boolean).join(' ');
    upsertItem(doc.name, {
      itemType: doc.kind,
      description: body || `${doc.kind}: ${doc.name}`,
      loreText: body || undefined,
    });
  }

  for (const ref of plan.storyReferences ?? []) {
    if (ref.kind !== 'object') continue;
    if (!isSignificantStoryItem(ref.name, ref.value)) continue;
    upsertItem(ref.name, {
      ...(ref.field === 'owner' ? { heldBy: ref.value } : {}),
      ...(ref.field === 'description' || ref.field === 'appearance' ? { description: ref.value } : {}),
      ...(ref.field === 'significance' || ref.field === 'provenance' || ref.field === 'history' || ref.field === 'function'
        ? { loreText: ref.value, description: ref.value }
        : {}),
      ...(ref.field === 'condition' ? { feature: ref.value } : {}),
    });
  }

  for (const cue of plan.visualCues) {
    const prop = typeof cue.action === 'object' && cue.action !== null ? cue.action.object?.trim() : undefined;
    if (!prop) continue;
    if (!isSignificantStoryItem(prop, cue.visualFocus ?? cue.visualDescription)) continue;
    upsertItem(prop, {
      description: cue.visualFocus?.trim() || prop,
      ...(cue.character?.trim() ? { heldBy: cue.character.trim() } : {}),
    });
  }

  // P10 #31: Link ItemDNA <-> RPG inventory so acquired RPG gear enters Story DNA canonically.
  for (const invItem of plan.rpgState?.vitals.inventory ?? []) {
    const cleanInv = invItem.trim();
    if (!cleanInv) continue;
    upsertItem(cleanInv, {
      description: cleanInv,
      heldBy: plan.rpgState?.vitals.name || 'Player',
    });
  }

  if (options?.mindLedgerEnabled !== false) {
    const ledger = [...(set.thoughtCabinet ?? [])];
    const narrativeText = (plan.paragraphs ?? []).map((p) => p.text).join(' ').toLowerCase();
    const completedQuests = (plan.rpgState?.quests ?? [])
      .filter((q) => q.status === 'completed')
      .map((q) => q.title.toLowerCase());
    const explicitlyResolved = (plan.resolvedThreads ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
    // 1. Advance existing Thought Cabinet threads (germinating -> internalized -> resolved)
    for (const entry of ledger) {
      if (entry.status === 'resolved') continue;
      const keywords = entry.title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4);
      const mentioned = keywords.some((kw) => narrativeText.includes(kw));
      const questResolved = completedQuests.some((qt) => keywords.some((kw) => qt.includes(kw)));
      const entryTitleLower = entry.title.toLowerCase();
      const entryIdLower = entry.id.toLowerCase();
      const threadExplicitlyResolved = explicitlyResolved.some(
        (t) => t === entryIdLower || t === entryTitleLower || entryTitleLower.includes(t) || t.includes(entryTitleLower)
      );
      if (threadExplicitlyResolved || questResolved || (mentioned && /\b(?:solved|uncovered|revealed|confessed|resolved|truth came out|mystery ended)\b/.test(narrativeText))) {
        entry.status = 'resolved';
        entry.updatedAt = Date.now();
        changed = true;
      } else if (entry.status === 'germinating' && mentioned) {
        entry.status = 'internalized';
        entry.updatedAt = Date.now();
        changed = true;
      }
    }
    // 2. Harvest new threads and spoiler-free public NPC beliefs from visible references
    const nextBeliefs: Record<string, NpcBelief[]> = {
      ...(set.npcBeliefs ?? {}),
    };
    for (const ref of plan.storyReferences ?? []) {
      const cleanVal = ref.value?.trim();
      if (!cleanVal) continue;
      if (ref.kind === 'npc' && (ref.field === 'statedGoals' || ref.field === 'relationships' || ref.field === 'condition')) {
        const npcKey = ref.name.trim().slice(0, 120);
        if (npcKey) {
          const list = [...(nextBeliefs[npcKey] ?? [])];
          const topic = ref.field;
          const existingBelief = list.find((b) => b.topic === topic && b.belief.toLowerCase() === cleanVal.slice(0, 400).toLowerCase());
          if (!existingBelief) {
            list.push({
              topic,
              belief: cleanVal.slice(0, 400),
              knowsSecret: false,
              seenInSwipes: swipeTag ? [swipeTag] : [],
              updatedAt: Date.now(),
            });
            nextBeliefs[npcKey] = list.slice(-12);
            changed = true;
          }
        }
      }
      if (ref.field !== 'significance' && ref.field !== 'statedGoals' && ref.field !== 'customs' && ref.field !== 'risks') continue;
      const title = `${ref.name}: ${cleanVal.split(/[.;!?]/)[0]?.trim() || cleanVal}`.slice(0, 160);
      const existingEntry = ledger.find((e) => e.title.toLowerCase() === title.toLowerCase());
      if (existingEntry) {
        if (existingEntry.status === 'germinating') {
          existingEntry.status = 'internalized';
          existingEntry.updatedAt = Date.now();
          changed = true;
        }
        continue;
      }
      const category = ref.field === 'risks' ? 'foreshadowing' : ref.field === 'statedGoals' ? 'promise' : ref.field === 'significance' ? 'clue' : 'secret';
      const entryId = `tc-${createItemId(ref.name)}-${ledger.length + 1}`.slice(0, 250);
      ledger.push({
        id: entryId,
        title,
        category,
        description: `${ref.evidence?.trim() || cleanVal}`.slice(0, 1500),
        status: 'germinating',
        seenInSwipes: swipeTag ? [swipeTag] : [],
        updatedAt: Date.now()
      });
      changed = true;
    }
    if (Object.keys(nextBeliefs).length > 0) {
      set.npcBeliefs = nextBeliefs;
    }
    if (changed) {
      set.thoughtCabinet = ledger.slice(-40);
    }
  }

  return changed;
}

function responseText(value: unknown): string {
  if (typeof value === 'string') return value;
  const r = value as any;
  const c = r?.content ?? r?.text ?? r?.choices?.[0]?.message?.content ?? '';
  return typeof c === 'string'
    ? c
    : Array.isArray(c)
      ? c.filter((p) => p?.type === 'text').map((p) => p.text).join('\n')
      : '';
}

const LocationAutofillOutputSchema = z.object({
  environmentDescription: z.string().trim().max(2000).optional(),
  lighting: z.string().trim().max(500).optional(),
  atmosphere: z.string().trim().max(500).optional(),
  architecture: z.string().trim().max(500).optional(),
  persistentElements: z.array(z.string().trim().max(300)).max(24).optional(),
  loreText: z.string().trim().max(4000).optional(),
}).strict();

const ItemAutofillOutputSchema = z.object({
  itemType: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  materials: z.string().trim().max(500).optional(),
  distinctiveFeatures: z.array(z.string().trim().max(300)).max(24).optional(),
  colors: z.array(z.string().trim().max(60)).max(12).optional(),
  heldBy: z.string().trim().max(160).optional(),
  loreText: z.string().trim().max(4000).optional(),
}).strict();

export async function autofillLocationDNA(
  spindle: SpindleAPI,
  params: {
    chatId: string;
    userId: string;
    locationId?: string | undefined;
    locationName: string;
    messageId?: string | undefined;
    set: StoryDNASet;
  }
): Promise<LocationDNA> {
  const existing = (params.locationId ? params.set.locations[params.locationId] : undefined)
    ?? findMatchingLocation(params.set.locations, params.locationName);
  if (existing?.locked) {
    throw new Error('Unlock this location’s DNA before auto-filling.');
  }

  const targetName = existing?.name ?? params.locationName.trim();
  const aliases = deriveShortAliases(targetName, existing?.aliases ?? []);
  const candidateNames = [targetName, ...aliases];

  const base: LocationDNA = existing
    ? { ...existing, autoDiscovered: false, aliases, lastUpdated: Date.now() }
    : {
        id: params.locationId?.trim() || createLocationId(targetName),
        name: targetName,
        aliases,
        persistentElements: [],
        connectedLocations: [],
        autoDiscovered: false,
        lastUpdated: Date.now(),
      };

  const config = await loadConfig(spindle, params.userId).catch(() => null);
  const messages = await spindle.chat?.getMessages?.(params.chatId).catch(() => []) ?? [];
  const targetMsg = (params.messageId ? messages.find((m) => m.id === params.messageId) : undefined)
    ?? [...messages].reverse().find((m) => m.role === 'assistant');

  const evidenceParts: string[] = [];
  if (targetMsg) {
    const swipeId = typeof targetMsg.swipe_id === 'number' ? targetMsg.swipe_id : Number(targetMsg.swipe_id ?? 0) || 0;
    const record = await loadTurnRecord(spindle, turnPath(params.chatId, targetMsg.id, swipeId), params.userId).catch(() => null);
    if (record) {
      for (const scene of record.plan.scenes) {
        if (findMatchingLocation({ [base.id]: base }, scene.environment.location)) {
          if (!base.environmentDescription && scene.environment.description) {
            base.environmentDescription = scene.environment.description.trim().slice(0, 2000);
          }
          if (!base.lighting && scene.environment.lighting) {
            base.lighting = scene.environment.lighting.trim().slice(0, 500);
          }
          const atm = [scene.environment.timeOfDay, scene.environment.weather].filter(Boolean).join(', ');
          if (!base.atmosphere && atm) base.atmosphere = atm.slice(0, 500);
          if (scene.environment.persistentElements.length && base.persistentElements.length === 0) {
            base.persistentElements = scene.environment.persistentElements.slice(0, 24);
          }
          evidenceParts.push(`Scene environment: ${JSON.stringify(scene.environment)}`);
        }
      }
      for (const ref of record.plan.storyReferences ?? []) {
        if (ref.kind === 'place' && findMatchingLocation({ [base.id]: base }, ref.name)) {
          evidenceParts.push(`Reference (${ref.field}): ${ref.value}`);
          if (!base.loreText && ref.value.trim()) base.loreText = ref.value.trim().slice(0, 4000);
        }
      }
    }
    if (config?.includeSimTrackerContext) {
      const sim = extractSimTracker(messages.map((m) => ({ id: m.id, content: m.content })), targetMsg.id, config.simTrackerMappings);
      if (sim.world) evidenceParts.push(`SimTracker world: ${sim.world}`);
    }
  }

  for (const m of messages.slice(-10)) {
    for (const passage of targetDnaPassages(m.content, candidateNames)) {
      evidenceParts.push(`Story passage: ${passage}`);
    }
  }

  try {
    if (config) {
      const ctx = await loadVisualContext(spindle, { chatId: params.chatId, userId: params.userId, config, target: targetName });
      if (ctx.plannerContext) evidenceParts.push(`Card/Lore context:\n${ctx.plannerContext.slice(0, 4000)}`);
    }
  } catch {
    // Non-fatal if context loader is unavailable
  }

  if (evidenceParts.length > 0 && config && typeof spindle.generate?.raw === 'function') {
    try {
      const connection = await resolvePlannerConnection(spindle, config, params.userId);
      if (connection) {
        const res = await spindle.generate.raw({
          type: 'raw',
          ...{ connection_id: connection.id, provider: connection.provider, model: connection.model },
          userId: params.userId,
          reasoning: { source: 'off' },
          parameters: { max_tokens: 1500 },
          messages: [
            {
              role: 'system',
              content:
                'Extract image-prompt-ready visual Scenery DNA JSON for ONLY the named story location using the evidence provided. Write concrete, camera-visible spatial architecture, materials, light quality/color temperature, atmosphere, and recurring landmark props without abstract lore or raw measurements so diffusion models render consistent backgrounds. Keep named story details concise. Return strict JSON matching {"environmentDescription"?:string,"lighting"?:string,"atmosphere"?:string,"architecture"?:string,"persistentElements"?:string[],"loreText"?:string}.',
            },
            {
              role: 'user',
              content: JSON.stringify({ location: targetName, existing: base, evidence: evidenceParts.slice(0, 12) }),
            },
          ],
        });
        const parsed = LocationAutofillOutputSchema.safeParse(jsonObject(responseText(res)));
        if (parsed.success) {
          if (parsed.data.environmentDescription) base.environmentDescription = parsed.data.environmentDescription;
          if (parsed.data.lighting) base.lighting = parsed.data.lighting;
          if (parsed.data.atmosphere) base.atmosphere = parsed.data.atmosphere;
          if (parsed.data.architecture) base.architecture = parsed.data.architecture;
          if (parsed.data.persistentElements?.length) base.persistentElements = parsed.data.persistentElements;
          if (parsed.data.loreText) base.loreText = parsed.data.loreText;
        }
      }
    } catch {
      // Fall back gracefully to deterministic evidence extraction above
    }
  }

  if (!base.environmentDescription && evidenceParts.length > 0) {
    const snippet = evidenceParts.find((p) => p.startsWith('Story passage:'));
    if (snippet) base.environmentDescription = snippet.replace(/^Story passage:\s*/, '').slice(0, 600);
  }

  return base;
}

export async function autofillItemDNA(
  spindle: SpindleAPI,
  params: {
    chatId: string;
    userId: string;
    itemId?: string | undefined;
    itemName: string;
    messageId?: string | undefined;
    set: StoryDNASet;
  }
): Promise<ItemDNA> {
  const existing = (params.itemId ? params.set.items[params.itemId] : undefined)
    ?? findMatchingItem(params.set.items, params.itemName);
  if (existing?.locked) {
    throw new Error('Unlock this item’s DNA before auto-filling.');
  }

  const targetName = existing?.name ?? params.itemName.trim();
  const aliases = deriveShortAliases(targetName, existing?.aliases ?? []);
  const candidateNames = [targetName, ...aliases];

  const base: ItemDNA = existing
    ? { ...existing, autoDiscovered: false, aliases, lastUpdated: Date.now() }
    : {
        id: params.itemId?.trim() || createItemId(targetName),
        name: targetName,
        aliases,
        description: targetName,
        distinctiveFeatures: [],
        colors: [],
        autoDiscovered: false,
        lastUpdated: Date.now(),
      };

  const config = await loadConfig(spindle, params.userId).catch(() => null);
  const messages = await spindle.chat?.getMessages?.(params.chatId).catch(() => []) ?? [];
  const targetMsg = (params.messageId ? messages.find((m) => m.id === params.messageId) : undefined)
    ?? [...messages].reverse().find((m) => m.role === 'assistant');

  const evidenceParts: string[] = [];
  if (targetMsg) {
    const swipeId = typeof targetMsg.swipe_id === 'number' ? targetMsg.swipe_id : Number(targetMsg.swipe_id ?? 0) || 0;
    const record = await loadTurnRecord(spindle, turnPath(params.chatId, targetMsg.id, swipeId), params.userId).catch(() => null);
    if (record) {
      for (const doc of record.plan.storyDocuments ?? []) {
        if (findMatchingItem({ [base.id]: base }, doc.name)) {
          const text = doc.sections.map((s) => s.text).join(' ').trim();
          if (!base.itemType) base.itemType = doc.kind;
          if (text) {
            base.loreText = base.loreText || text.slice(0, 4000);
            if (!base.description || base.description === base.name) base.description = text.slice(0, 2000);
            evidenceParts.push(`Document (${doc.kind}): ${text}`);
          }
        }
      }
      for (const ref of record.plan.storyReferences ?? []) {
        if (ref.kind === 'object' && findMatchingItem({ [base.id]: base }, ref.name)) {
          evidenceParts.push(`Reference (${ref.field}): ${ref.value}`);
          if (ref.field === 'owner' && !base.heldBy) base.heldBy = ref.value.slice(0, 160);
          else if (!base.description || base.description === base.name) base.description = ref.value.slice(0, 2000);
          else if (!base.loreText) base.loreText = ref.value.slice(0, 4000);
        }
      }
      for (const cue of record.plan.visualCues) {
        const actionObj = typeof cue.action === 'object' && cue.action !== null ? cue.action.object : undefined;
        if (actionObj && findMatchingItem({ [base.id]: base }, actionObj)) {
          if (cue.character && !base.heldBy) base.heldBy = cue.character.slice(0, 160);
          if (cue.visualFocus) evidenceParts.push(`Visual focus: ${cue.visualFocus}`);
        }
      }
    }
  }

  for (const m of messages.slice(-10)) {
    for (const passage of targetDnaPassages(m.content, candidateNames)) {
      evidenceParts.push(`Story passage: ${passage}`);
    }
  }

  if (evidenceParts.length > 0 && config && typeof spindle.generate?.raw === 'function') {
    try {
      const connection = await resolvePlannerConnection(spindle, config, params.userId);
      if (connection) {
        const res = await spindle.generate.raw({
          type: 'raw',
          ...{ connection_id: connection.id, provider: connection.provider, model: connection.model },
          userId: params.userId,
          reasoning: { source: 'off' },
          parameters: { max_tokens: 1200 },
          messages: [
            {
              role: 'system',
              content:
                'Extract image-prompt-ready visual Item DNA JSON for ONLY the named story object/artifact using the evidence provided. Write concrete surface materials, craftsmanship, wear/patina, silhouettes, and descriptive named colors (never hex codes like #FF0000 or abstract measurements) in "colors" so image generators render the prop accurately. Return strict JSON matching {"itemType"?:string,"description"?:string,"materials"?:string,"distinctiveFeatures"?:string[],"colors"?:string[],"heldBy"?:string,"loreText"?:string}.',
            },
            {
              role: 'user',
              content: JSON.stringify({ item: targetName, existing: base, evidence: evidenceParts.slice(0, 12) }),
            },
          ],
        });
        const parsed = ItemAutofillOutputSchema.safeParse(jsonObject(responseText(res)));
        if (parsed.success) {
          if (parsed.data.itemType) base.itemType = parsed.data.itemType;
          if (parsed.data.description) base.description = parsed.data.description;
          if (parsed.data.materials) base.materials = parsed.data.materials;
          if (parsed.data.distinctiveFeatures?.length) base.distinctiveFeatures = parsed.data.distinctiveFeatures;
          if (parsed.data.colors?.length) base.colors = parsed.data.colors;
          if (parsed.data.heldBy) base.heldBy = parsed.data.heldBy;
          if (parsed.data.loreText) base.loreText = parsed.data.loreText;
        }
      }
    } catch {
      // Fall back gracefully to deterministic evidence extraction above
    }
  }

  if ((!base.description || base.description === base.name) && evidenceParts.length > 0) {
    const snippet = evidenceParts.find((p) => p.startsWith('Story passage:') || p.startsWith('Visual focus:'));
    if (snippet) base.description = snippet.replace(/^(?:Story passage|Visual focus):\s*/, '').slice(0, 600);
  }

  return base;
}
