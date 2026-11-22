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
import { loadStoryDNASet, saveItemDNA } from './story-dna-store.js';
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
function kindTypographyDirective(doc: StoryDocument): string {
  const lowerName = doc.name.toLowerCase();
  if (doc.kind === 'phone') {
    return 'Straight-on front-facing macro close-up of a lit smartphone screen filling 90% of the frame, crisp legible dark-mode chat/message UI bubbles, clear timestamps, sharp high-contrast typography';
  }
  if (doc.kind === 'terminal') {
    return 'Straight-on front-facing close-up of a glowing monospace terminal display filling 90% of the frame, crisp legible green or amber phosphor text rows, sharp scanlines';
  }
  if (doc.kind === 'journal' || /\b(?:ledger|register|account|logbook|book)\b/.test(lowerName)) {
    return 'Straight-on top-down flat-lay open double-page spread filling 90% of the frame, flat open pages with ruled ledger columns, handwritten ink entries, dates, and figures clearly legible edge-to-edge, never a closed book';
  }
  if (doc.kind === 'map' || /\b(?:timetable|schedule|chart|blueprint)\b/.test(lowerName)) {
    return 'Straight-on top-down flat-lay sheet filling 90% of the frame, crisp printed gridlines, clear legible labels, routes, times, and ink annotations';
  }
  if (doc.kind === 'notice' || doc.kind === 'poster' || doc.kind === 'flyer' || doc.kind === 'newspaper' || doc.kind === 'receipt' || doc.kind === 'pamphlet') {
    return 'Straight-on front-facing flat-lay printed document filling 90% of the frame, bold legible headline, clean printed body copy and stamps sharp from corner to corner';
  }
  return 'Straight-on top-down flat-lay open stationery sheet filling 90% of the frame, crisp legible handwritten ink or printed lettering sharp across the entire page';
}

/** Build a strictly spoiler-gated, typography-first flat-lay close-up prompt for readable document props. */
export function buildDocumentPropPromptInput(params: {
  doc: StoryDocument;
  plan: TurnPlan;
  throughParagraphIndex: number;
  config: VisualNovelConfig;
  profileV2?: ImagePromptProfileV2;
  modelId?: string;
}): BuiltDocumentPropPrompt {
  const maxIndex = Math.max(0, Math.min(Math.max(0, params.plan.paragraphs.length - 1), params.throughParagraphIndex));
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
    .slice(0, 6)
    .map((quote) => `"${quote.slice(0, 140)}"`);

  const contentHash = stableHash64(canonicalJson({
    id: gatedDoc.id,
    kind: gatedDoc.kind,
    name: gatedDoc.name,
    visualDetails: uniqueDetails,
    sections: visibleQuotes,
    sceneSurfaceKey,
    styleId: params.config.selectedSharedStyleId,
    modelId: params.modelId ?? params.config.documentImageModel ?? params.config.imageModel ?? null,
    v: 2,
  }));

  const keyframe = deriveColorScriptKeyframe({
    baseLighting: scene?.environment.lighting ?? null,
    location: scene?.environment.location ?? null,
    timeOfDay: scene?.environment.timeOfDay ?? null,
    weather: scene?.environment.weather ?? null,
    description: scene?.environment.description ?? null,
    chromaticLutEnabled: params.config.chromaticLutEnabled !== false,
  });

  const framingDirective = kindTypographyDirective(gatedDoc);
  const textContentDirective = visibleQuotes.length
    ? `Exact legible text clearly visible on the surface: ${visibleQuotes.join(' | ')}`
    : `Legible in-universe ${gatedDoc.name} layout with crisp readable headings, lines, and entries matching its format`;

  const propSubject = [
    framingDirective,
    `Subject: ${gatedDoc.name} (${KIND_MATERIAL_HINTS[gatedDoc.kind]})`,
    uniqueDetails.length ? `Physical details: ${uniqueDetails.join(', ')}` : '',
    textContentDirective,
  ].filter(Boolean).join('. ');

  const brief: VisualBrief = {
    scene: sanitizeVisualNarrativeDescription([
      `Flat-lay inspection surface (${surface}) barely visible at the outer edges`,
      'zero people, no hands obstructing text, razor-sharp focus from corner to corner',
    ].join(', ')),
    subjects: '',
    action: propSubject,
    composition: 'Straight-on orthographic 90-degree flat-lay close-up filling 90% of the frame, deep focus, zero tilt or blur',
    lighting: keyframe.lighting || scene?.environment.lighting || 'even clear directional reading light with crisp contrast on text',
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
      depthOfField: 'deep',
      focusTarget: gatedDoc.name,
    },
    composition: {
      mode: 'centered',
      subjectPlacements: [{ subject: gatedDoc.name, depth: 'foreground', scale: 'dominant' }],
      stagingNote: 'Straight-on readable flat-lay document view with sharp legible typography, zero people or hands.',
    },
    source: 'deterministic-fallback',
  });

  const effectiveModel = params.modelId?.trim() || params.config.documentImageModel?.trim() || params.config.imageModel?.trim() || undefined;
  const profile = params.profileV2 ?? resolveImagePromptProfileV2(null, effectiveModel);
  const baseStyle = resolveStyleDNA(params.config, params.config.selectedSharedStyleId).styleDNA;
  // Preserve legible document clarity: strip blur/softening styling in favor of crisp typography
  const docStyleDNA = {
    ...baseStyle,
    rendering: ['crisp high-resolution typography', 'sharp flat-lay document clarity', 'deep focus'],
    avoidIntent: [...(baseStyle.avoidIntent ?? []), 'blurry text', 'illegible scribbles', 'shallow depth of field', 'bokeh', 'closed book'],
  };
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
    styleDNA: docStyleDNA,
    profile,
    outputPlan,
    detailLevel: 'detailed',
    modelId: effectiveModel,
  });

  const docNegatives = 'closed book, zoomed out, distant view, blurry text, illegible scribbles, shallow depth of field, bokeh, out of focus, hands covering text, person, human face, portrait';
  const extraNegative = params.config.negativePrompt?.trim()
    ? `${compiled.negativePrompt ? `${compiled.negativePrompt}, ` : ''}${params.config.negativePrompt.trim()}, ${docNegatives}`
    : `${compiled.negativePrompt ? `${compiled.negativePrompt}, ` : ''}${docNegatives}`;

  return {
    document: gatedDoc,
    contentHash,
    sceneSurfaceKey,
    prompt: compiled.prompt,
    ...(compiled.negativePrompt || profile.negativePolicy !== 'positive-only' ? { negativePrompt: extraNegative } : {}),
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
  let targetDoc = (plan.storyDocuments ?? []).find(
    (d) => d.id === documentId || d.name.toLowerCase() === documentId.toLowerCase(),
  );
  if (!targetDoc) {
    const storyDna = await loadStoryDNASet(spindle, chatId, userId).catch(() => null);
    const dnaDoc = storyDna?.documents
      ? Object.values(storyDna.documents).find((d) => d.id === documentId || d.name.toLowerCase() === documentId.toLowerCase())
      : undefined;
    if (dnaDoc) {
      const mappedSections = (dnaDoc.sections ?? []).map((s, idx) => ({
        paragraphIndex: typeof s.paragraphIndex === 'number' ? s.paragraphIndex : idx,
        start: 0,
        end: s.text.length,
        text: s.text,
      }));
      const noteText = dnaDoc.customNotes?.trim();
      targetDoc = {
        id: dnaDoc.id,
        name: dnaDoc.name,
        kind: (dnaDoc.kind as StoryDocument['kind']) || 'note',
        paragraphIndex: 0,
        sections: mappedSections.length > 0 ? mappedSections : (noteText ? [{ paragraphIndex: 0, start: 0, end: noteText.length, text: noteText }] : []),
        ...(dnaDoc.visualDetails ? { visualDetails: dnaDoc.visualDetails } : {}),
      };
    }
  }
  if (!targetDoc) {
    throw new Error(`Document "${documentId}" was not found in this turn or World Lens.`);
  }

  const config = await loadConfig(spindle, userId);
  const preferredConn = config.documentImageConnectionId?.trim() || config.imageConnectionId;
  const { connectionId, workflowId } = splitConnectionSelection(preferredConn);
  const selected = connectionId && typeof spindle.imageGen?.getConnection === 'function'
    ? await spindle.imageGen.getConnection(connectionId, userId)
    : typeof spindle.imageGen?.listConnections === 'function'
      ? (await spindle.imageGen.listConnections(userId)).find((entry) => entry.is_default) ?? undefined
      : undefined;
  const effectiveConnectionId = connectionId || selected?.id;
  const provider = selected?.provider?.trim().toLowerCase() ?? null;
  const model = config.documentImageModel?.trim() || config.imageModel?.trim() || selected?.model || undefined;

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


export async function generateItemPropArtwork(params: {
  spindle: SpindleAPI;
  chatId: string;
  itemId: string;
  userId?: string;
}) {
  const { spindle, chatId, itemId, userId } = params;
  const storyDna = await loadStoryDNASet(spindle, chatId, userId);
  const item = storyDna.items[itemId] ?? Object.values(storyDna.items).find((i) => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase());
  if (!item) {
    throw new Error(`Item "${itemId}" was not found in World Lens.`);
  }
  if (!spindle.imageGen || typeof spindle.imageGen.generate !== 'function') {
    throw new Error('Image generation is unavailable for this connection.');
  }

  const config = await loadConfig(spindle, userId);
  const preferredConn = config.documentImageConnectionId?.trim() || config.imageConnectionId;
  const { connectionId, workflowId } = splitConnectionSelection(preferredConn);
  const selected = connectionId && typeof spindle.imageGen?.getConnection === 'function'
    ? await spindle.imageGen.getConnection(connectionId, userId)
    : typeof spindle.imageGen?.listConnections === 'function'
      ? (await spindle.imageGen.listConnections(userId)).find((entry) => entry.is_default) ?? undefined
      : undefined;
  const effectiveConnectionId = connectionId || selected?.id;
  const provider = selected?.provider?.trim().toLowerCase() ?? null;
  const model = config.documentImageModel?.trim() || config.imageModel?.trim() || selected?.model || undefined;

  const profileV2 = await loadImagePromptProfileV2(spindle, config, provider, model, {
    ...config.imageParameters,
    ...(workflowId ? { workflow_id: workflowId } : {}),
  });

  const detailClauses = [
    item.description,
    item.itemType ? `type: ${item.itemType}` : '',
    item.materials ? `materials: ${item.materials}` : '',
    item.distinctiveFeatures?.length ? `distinctive features: ${item.distinctiveFeatures.join(', ')}` : '',
    item.colors?.length ? `colors: ${item.colors.join(', ')}` : '',
  ].filter(Boolean).join('. ');

  const brief: VisualBrief = {
    scene: 'Clean atmospheric studio-lit pedestal or dark neutral slate backdrop isolating the artifact, zero people or hands',
    subjects: '',
    action: `Centered hero close-up prop illustration of ${item.name}${detailClauses ? `: ${detailClauses}` : ''}. Intricate craft, dramatic rim lighting showcasing silhouette, textures, and elemental or magical effects`,
    composition: 'Centered studio artifact hero shot filling the frame with clean margins',
    lighting: 'Dramatic studio key light with subtle rim highlights on textures and materials',
    subjectMode: 'none',
    framing: 'close-up',
    referencePolicy: 'none',
    sources: [`itemDna:${item.id}`],
    conflicts: [],
  };

  const shotSpec = createDefaultShotSpec({
    intent: 'detail',
    output: { requestedRatio: '1:1', actualRatio: '1:1', orientation: 'square' },
    camera: { shotSize: 'close-up', angle: 'eye-level', lens: 'macro', depthOfField: 'shallow', focusTarget: item.name },
    composition: {
      mode: 'centered',
      subjectPlacements: [{ subject: item.name, depth: 'foreground', scale: 'dominant' }],
      stagingNote: 'Isolated centered artifact hero prop study, zero people or faces.',
    },
    source: 'deterministic-fallback',
  });

  const styleDNA = resolveStyleDNA(config, config.selectedSharedStyleId).styleDNA;
  const outputPlan = resolveImageOutputPlan({
    capabilities: profileV2.outputCapabilities,
    parameters: {},
    requestedRatio: '1:1',
    source: profileV2.capabilitySource,
    modelId: model,
  });

  const compiled = compileModelPrompt({
    brief,
    shotSpec,
    styleDNA,
    profile: profileV2,
    outputPlan,
    detailLevel: 'standard',
    modelId: model,
  });

  const mergedBaseParams: Record<string, unknown> = {
    ...(selected?.default_parameters ?? {}),
    ...config.imageParameters,
    ...(workflowId ? { workflow_id: workflowId } : {}),
  };
  let shapedParams: Record<string, unknown>;
  try {
    shapedParams = globalOutputParameters('1:1', provider, model, mergedBaseParams);
  } catch {
    shapedParams = mergedBaseParams;
  }
  const safeParams = sanitizeImagePayloadParameters(
    providerOutputParameters(modelOutputParameters(provider, model, shapedParams)),
    provider ?? undefined,
    model,
  );

  const neg = `${compiled.negativePrompt ? `${compiled.negativePrompt}, ` : ''}person, human, character portrait, hands holding, crowd`;
  const generated = await spindle.imageGen.generate({
    prompt: compiled.prompt,
    ...(profileV2.negativePolicy !== 'positive-only' ? { negativePrompt: neg } : {}),
    ...(effectiveConnectionId ? { connection_id: effectiveConnectionId } : {}),
    ...(model ? { model } : {}),
    parameters: safeParams,
    owner_chat_id: chatId,
    ...(userId ? { userId } : {}),
  });

  if (!generated?.imageId) {
    throw new Error('Item prop image generation finished without an image ID.');
  }

  const referenceImageUrl = `/api/v1/images/${encodeURIComponent(generated.imageId)}`;
  return saveItemDNA(spindle, chatId, { ...item, referenceImageUrl, lastUpdated: Date.now() }, userId);
}
