import type { SpindleAPI } from 'lumiverse-spindle-types';
import { z } from 'zod';
import type { VisualNovelConfig } from '../../config.js';
import type { DocumentAssetView } from '../../protocol.js';
import type { SceneState, TurnPlan } from '../../shared/contracts.js';
import { createDefaultShotSpec } from '../../shared/image-shot-spec.js';
import { sanitizeImagePayloadParameters } from '../../shared/image-payload-sanitizer.js';
import { resolveImagePromptProfileV2, type ImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import { resolveStyleDNA } from '../../shared/style-dna.js';
import { visibleStoryDocuments, type StoryDocument } from '../../shared/story-documents.js';
import { canonicalJson } from '../core/scene-image-cache.js';
import { splitConnectionSelection } from './images.js';
import { loadImagePromptProfileV2 } from './image-prompt-profile.js';
import { resolveImageOutputPlan } from './image-output-plan.js';
import { compileModelPrompt } from './model-prompt-compiler.js';
import { globalOutputParameters, modelOutputParameters, providerOutputParameters } from './template-output.js';
import { loadConfig } from './storage.js';
import { deriveColorScriptKeyframe, sanitizeVisualNarrativeDescription } from './visual-brief.js';

const DocumentArtRecordSchema = z.object({
  id: z.string().min(1).max(120),
  documentId: z.string().min(1).max(120),
  documentName: z.string().min(1).max(200),
  contentHash: z.string().min(8).max(80),
  sceneSurfaceKey: z.string().max(240),
  imageId: z.string().min(1).max(256),
  createdAt: z.string(),
  lastUsedAt: z.number().optional(),
}).strict();

const DocumentArtLibrarySchema = z.object({
  version: z.literal(1),
  entries: z.array(DocumentArtRecordSchema).max(64),
}).strict();

type DocumentArtLibrary = z.infer<typeof DocumentArtLibrarySchema>;

type Runtime = { tails: Map<string, Promise<void>> };
const runtimes = new WeakMap<object, Runtime>();

function runtime(api: SpindleAPI): Runtime {
  let r = runtimes.get(api);
  if (!r) {
    r = { tails: new Map() };
    runtimes.set(api, r);
  }
  return r;
}

function scope(chatId: string, userId?: string): string {
  return canonicalJson([userId ?? null, chatId]);
}

function storagePath(chatId: string): string {
  return `chats/${encodeURIComponent(chatId).replaceAll('%', '_')}/document-art.json`;
}

function storageOptions(userId?: string) {
  return userId ? { userId } : undefined;
}

async function transaction<T>(api: SpindleAPI, chatId: string, userId: string | undefined, work: () => Promise<T>): Promise<T> {
  const r = runtime(api);
  const key = scope(chatId, userId);
  const previous = r.tails.get(key) ?? Promise.resolve();
  const current = previous.then(work, work);
  const tail = current.then(() => undefined, () => undefined);
  r.tails.set(key, tail);
  try {
    return await current;
  } finally {
    if (r.tails.get(key) === tail) r.tails.delete(key);
  }
}

function stableHash64(source: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let i = 0; i < source.length; i++) {
    const c = source.charCodeAt(i);
    left = Math.imul(left ^ c, 0x01000193) >>> 0;
    right = Math.imul(right ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return `${left.toString(16).padStart(8, '0')}${right.toString(16).padStart(8, '0')}`;
}

export async function loadDocumentArt(api: SpindleAPI, chatId: string, userId?: string): Promise<DocumentArtLibrary> {
  if (!api.userStorage) return { version: 1, entries: [] };
  const raw = await api.userStorage.getJson<unknown>(storagePath(chatId), { fallback: null, ...storageOptions(userId) });
  if (raw === null) return { version: 1, entries: [] };
  const parsed = DocumentArtLibrarySchema.safeParse(raw);
  if (!parsed.success) return { version: 1, entries: [] };
  return parsed.data;
}

function activeSceneForParagraph(plan: TurnPlan, paragraphIndex: number): SceneState | undefined {
  let active = plan.scenes[0];
  for (const scene of plan.scenes) {
    if (scene.startParagraph <= paragraphIndex) active = scene;
  }
  return active;
}

function inferRestingSurface(doc: StoryDocument, scene?: SceneState): string {
  const obsText = (doc.observations ?? []).map((o) => `${o.evidence} ${o.summary ?? ''} ${o.material ?? ''}`).join(' ').toLowerCase();
  const envDesc = `${scene?.environment.location ?? ''} ${scene?.environment.description ?? ''} ${scene?.environment.persistentElements.join(' ') ?? ''}`.toLowerCase();
  const combined = `${obsText} ${envDesc}`;
  if (/\b(?:flagstone|cobblestone|puddle|wet stone|stairwell|pavement|sidewalk)\b/.test(combined)) {
    return /\bwet|damp|rain|puddle\b/.test(combined) ? 'wet dark stone flagstones with thin rain puddles' : 'weathered stone flagstones';
  }
  if (/\b(?:desk|table|counter|oak|mahogany|wooden)\b/.test(combined)) {
    return 'worn timber table surface';
  }
  if (/\b(?:wall|board|bulletin|post|door)\b/.test(combined) && doc.kind === 'poster') {
    return 'weathered notice board surface';
  }
  return scene?.environment.location ? `resting surface in ${scene.environment.location}` : 'weathered surface';
}

const KIND_MATERIAL_HINTS: Record<StoryDocument['kind'], string> = {
  flyer: 'creased printed paper handbill',
  letter: 'folded stationery sheet',
  note: 'small torn slip of handwritten paper',
  journal: 'open bound cloth-covered field journal page',
  map: 'creased parchment cartographic sheet',
  poster: 'broadside printed sheet',
  receipt: 'narrow thermal or ink-stamped paper receipt',
  notice: 'official stamped paper decree',
  newspaper: 'folded newsprint column sheet',
  pamphlet: 'creased trifold booklet page',
  phone: 'lit handheld smartphone screen showing readable message thread',
  terminal: 'glowing monospace CRT or rugged terminal screen',
};

export type BuiltDocumentPropPrompt = {
  document: StoryDocument;
  contentHash: string;
  sceneSurfaceKey: string;
  prompt: string;
  negativePrompt?: string;
};

/** Build a strictly spoiler-gated macro close-up prompt grounded in active scene lighting & resting surface. */
export function buildDocumentPropPromptInput(params: {
  doc: StoryDocument;
  plan: TurnPlan;
  throughParagraphIndex: number;
  config: VisualNovelConfig;
  profileV2?: ImagePromptProfileV2;
  modelId?: string;
}): BuiltDocumentPropPrompt {
  const maxIndex = Math.max(0, Math.min(params.plan.paragraphs.length - 1, params.throughParagraphIndex));
  const [gatedDoc] = visibleStoryDocuments([params.doc], maxIndex);
  if (!gatedDoc) {
    throw new Error(`Document "${params.doc.name}" has not been revealed at paragraph ${maxIndex + 1}.`);
  }

  const scene = activeSceneForParagraph(params.plan, maxIndex);
  const surface = inferRestingSurface(gatedDoc, scene);
  const sceneSurfaceKey = [
    scene?.environment.location ?? '',
    surface,
    scene?.environment.timeOfDay ?? '',
    scene?.environment.weather ?? '',
    scene?.environment.lighting ?? '',
  ].join('|');

  const physicalDetails = [
    ...(gatedDoc.observations ?? []).flatMap((o) => [o.material, o.condition, o.summary, ...(o.visualDetails ?? [])]),
    gatedDoc.visualDetails,
  ].filter((v): v is string => Boolean(v && v.trim()));
  const uniqueDetails = [...new Set(physicalDetails.map((s) => s.trim()))].slice(0, 8);

  const visibleQuotes = gatedDoc.sections
    .map((s) => s.text.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((quote) => `"${quote.slice(0, 110)}"`);

  const contentHash = stableHash64(canonicalJson({
    id: gatedDoc.id,
    kind: gatedDoc.kind,
    name: gatedDoc.name,
    visualDetails: uniqueDetails,
    sections: visibleQuotes,
    sceneSurfaceKey,
    styleId: params.config.selectedSharedStyleId,
    modelId: params.modelId ?? params.config.imageModel ?? null,
  }));

  const keyframe = deriveColorScriptKeyframe({
    baseLighting: scene?.environment.lighting ?? null,
    location: scene?.environment.location ?? null,
    timeOfDay: scene?.environment.timeOfDay ?? null,
    weather: scene?.environment.weather ?? null,
    description: scene?.environment.description ?? null,
    chromaticLutEnabled: params.config.chromaticLutEnabled !== false,
  });

  const propSubject = [
    `Extreme close-up macro prop study of ${gatedDoc.name} (${KIND_MATERIAL_HINTS[gatedDoc.kind]})`,
    uniqueDetails.length ? `physical details: ${uniqueDetails.join(', ')}` : '',
    visibleQuotes.length ? `clearly visible legible ink lettering showing ${visibleQuotes.join(' and ')}` : '',
    gatedDoc.kind !== 'phone' && gatedDoc.kind !== 'terminal' ? 'tactile paper grain, ink bleed, realistic creases' : '',
  ].filter(Boolean).join(', ');

  const brief: VisualBrief = {
    scene: sanitizeVisualNarrativeDescription([
      `Resting on ${surface}`,
      scene?.environment.weather ? `ambient weather: ${scene.environment.weather}` : '',
      'tightly cropped macro still-life object focus, no unmentioned characters or bystanders',
    ].filter(Boolean).join(', ')),
    subjects: '',
    action: propSubject,
    composition: 'Overhead 45-degree macro angle filling frame cleanly with subtle edge breathing room, shallow depth of field isolating the document surface',
    lighting: keyframe.lighting || scene?.environment.lighting || 'moody directional ambient light',
    subjectMode: 'none',
    framing: 'close-up',
    referencePolicy: 'none',
    sources: [`storyDocument:${gatedDoc.id}`],
    conflicts: [],
  };

  const shotSpec = createDefaultShotSpec({
    intent: 'detail',
    output: {
      requestedRatio: '4:3',
      actualRatio: '4:3',
      orientation: 'landscape',
    },
    camera: {
      shotSize: 'macro',
      angle: 'overhead',
      lens: 'macro',
      depthOfField: 'shallow',
      focusTarget: gatedDoc.name,
    },
    composition: {
      mode: 'centered',
      subjectPlacements: [{ subject: gatedDoc.name, depth: 'foreground', scale: 'dominant' }],
      stagingNote: 'Macro still-life inspection view of document prop, zero people or faces.',
    },
    source: 'deterministic-fallback',
  });

  const effectiveModel = params.modelId?.trim() || params.config.imageModel?.trim() || undefined;
  const profile = params.profileV2 ?? resolveImagePromptProfileV2(null, effectiveModel);
  const styleDNA = resolveStyleDNA(params.config, params.config.selectedSharedStyleId).styleDNA;
  const outputPlan = resolveImageOutputPlan({
    capabilities: profile.outputCapabilities,
    parameters: {},
    requestedRatio: '4:3',
    source: profile.capabilitySource,
    modelId: effectiveModel,
  });

  const compiled = compileModelPrompt({
    brief,
    shotSpec,
    styleDNA,
    profile,
    outputPlan,
    detailLevel: 'compact',
    modelId: effectiveModel,
  });

  const extraNegative = params.config.negativePrompt?.trim()
    ? `${compiled.negativePrompt ? `${compiled.negativePrompt}, ` : ''}${params.config.negativePrompt.trim()}, person, human face, portrait`
    : `${compiled.negativePrompt ? `${compiled.negativePrompt}, ` : ''}person, human face, portrait`;

  return {
    document: gatedDoc,
    contentHash,
    sceneSurfaceKey,
    prompt: compiled.prompt,
    ...(compiled.negativePrompt ? { negativePrompt: extraNegative } : {}),
  };
}

export async function findCachedDocumentArt(
  api: SpindleAPI,
  chatId: string,
  documentId: string,
  contentHash: string,
  userId?: string,
): Promise<DocumentAssetView | null> {
  const library = await loadDocumentArt(api, chatId, userId).catch(() => ({ version: 1 as const, entries: [] }));
  const hit = library.entries.find((e) => e.documentId === documentId && e.contentHash === contentHash);
  if (!hit) return null;
  try {
    const img = await api.images.get(hit.imageId, userId);
    if (!img) return null;
  } catch {
    return null;
  }
  return {
    documentId,
    contentHash,
    imageId: hit.imageId,
    imageUrl: `/api/v1/images/${encodeURIComponent(hit.imageId)}`,
  };
}

export async function listTurnDocumentAssets(
  api: SpindleAPI,
  chatId: string,
  plan: TurnPlan,
  throughParagraphIndex: number,
  userId?: string,
): Promise<Record<string, DocumentAssetView>> {
  const docs = plan.storyDocuments ?? [];
  if (!docs.length || !api.userStorage) return {};
  const library = await loadDocumentArt(api, chatId, userId).catch(() => ({ version: 1 as const, entries: [] }));
  if (!library.entries.length) return {};
  const config = await loadConfig(api, userId).catch(() => null);
  if (!config) return {};

  const out: Record<string, DocumentAssetView> = {};
  const visible = visibleStoryDocuments(docs, throughParagraphIndex);
  for (const doc of visible) {
    try {
      const built = buildDocumentPropPromptInput({ doc, plan, throughParagraphIndex, config });
      const match = library.entries.find((e) => e.documentId === doc.id && e.contentHash === built.contentHash);
      if (!match) continue;
      const exists = await api.images.get(match.imageId, userId).catch(() => null);
      if (!exists) continue;
      out[doc.id] = {
        documentId: doc.id,
        contentHash: match.contentHash,
        imageId: match.imageId,
        imageUrl: `/api/v1/images/${encodeURIComponent(match.imageId)}`,
      };
    } catch {
      // Ignore individual asset lookup errors so turn hydration stays fast.
    }
  }
  return out;
}

export async function generateDocumentPropArtwork(params: {
  spindle: SpindleAPI;
  chatId: string;
  plan: TurnPlan;
  documentId: string;
  throughParagraphIndex: number;
  regenerate?: boolean;
  userId?: string;
}): Promise<DocumentAssetView & { cached: boolean }> {
  const { spindle, chatId, plan, documentId, throughParagraphIndex, regenerate = false, userId } = params;
  const targetDoc = (plan.storyDocuments ?? []).find(
    (d) => d.id === documentId || d.name.toLowerCase() === documentId.toLowerCase(),
  );
  if (!targetDoc) {
    throw new Error(`Document "${documentId}" was not found in this turn.`);
  }

  const config = await loadConfig(spindle, userId);
  const { connectionId, workflowId } = splitConnectionSelection(config.imageConnectionId);
  const selected = connectionId && typeof spindle.imageGen?.getConnection === 'function'
    ? await spindle.imageGen.getConnection(connectionId, userId)
    : typeof spindle.imageGen?.listConnections === 'function'
      ? (await spindle.imageGen.listConnections(userId)).find((entry) => entry.is_default) ?? undefined
      : undefined;
  const effectiveConnectionId = connectionId || selected?.id;
  const provider = selected?.provider?.trim().toLowerCase() ?? null;
  const model = config.imageModel?.trim() || selected?.model || undefined;

  const profileV2 = await loadImagePromptProfileV2(spindle, config, provider, model, {
    ...config.imageParameters,
    ...(workflowId ? { workflow_id: workflowId } : {}),
  });

  const built = buildDocumentPropPromptInput({
    doc: targetDoc,
    plan,
    throughParagraphIndex,
    config,
    profileV2,
    ...(model ? { modelId: model } : {}),
  });

  if (!regenerate) {
    const cached = await findCachedDocumentArt(spindle, chatId, targetDoc.id, built.contentHash, userId);
    if (cached) return { ...cached, cached: true };
  }

  if (!spindle.imageGen || typeof spindle.imageGen.generate !== 'function') {
    throw new Error('Image generation is unavailable for this connection.');
  }

  const mergedBaseParams: Record<string, unknown> = {
    ...(selected?.default_parameters ?? {}),
    ...config.imageParameters,
    ...(workflowId ? { workflow_id: workflowId } : {}),
  };
  const desiredRatio = config.imageOutputAspectRatio !== 'default'
    ? config.imageOutputAspectRatio
    : (provider === 'openrouter' || provider === 'nanogpt' || provider === 'novelai' ? '4:3' : 'default');
  let shapedParams: Record<string, unknown>;
  try {
    shapedParams = globalOutputParameters(desiredRatio, provider, model, mergedBaseParams);
  } catch {
    shapedParams = mergedBaseParams;
  }
  const rawParams = providerOutputParameters(
    modelOutputParameters(provider, model, shapedParams),
  );
  const safeParams = sanitizeImagePayloadParameters(rawParams, provider ?? undefined, model);

  const req: Parameters<SpindleAPI['imageGen']['generate']>[0] = {
    prompt: built.prompt,
    ...(built.negativePrompt && profileV2.negativePolicy !== 'positive-only' ? { negativePrompt: built.negativePrompt } : {}),
    ...(effectiveConnectionId ? { connection_id: effectiveConnectionId } : {}),
    ...(model ? { model } : {}),
    parameters: safeParams,
    owner_chat_id: chatId,
    ...(userId ? { userId } : {}),
  };

  const generated = await spindle.imageGen.generate(req);
  if (!generated?.imageId) {
    throw new Error('Document prop image generation finished without an image ID.');
  }

  const now = Date.now();
  await transaction(spindle, chatId, userId, async () => {
    if (!spindle.userStorage) return;
    const library = await loadDocumentArt(spindle, chatId, userId);
    const filtered = library.entries.filter(
      (e) => !(e.documentId === targetDoc.id && e.contentHash === built.contentHash),
    );
    filtered.push({
      id: `docart-${targetDoc.id}-${built.contentHash.slice(0, 8)}`,
      documentId: targetDoc.id,
      documentName: targetDoc.name,
      contentHash: built.contentHash,
      sceneSurfaceKey: built.sceneSurfaceKey.slice(0, 240),
      imageId: generated.imageId!,
      createdAt: new Date(now).toISOString(),
      lastUsedAt: now,
    });
    if (filtered.length > 64) {
      filtered.sort((a, b) => (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0));
      filtered.splice(0, filtered.length - 64);
    }
    await spindle.userStorage.setJson(
      storagePath(chatId),
      DocumentArtLibrarySchema.parse({ version: 1, entries: filtered }),
      storageOptions(userId),
    );
  }).catch(() => {});

  return {
    documentId: targetDoc.id,
    contentHash: built.contentHash,
    imageId: generated.imageId,
    imageUrl: `/api/v1/images/${encodeURIComponent(generated.imageId)}`,
    cached: false,
  };
}
