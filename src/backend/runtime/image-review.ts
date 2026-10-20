import {ImagePromptProfileSchema,PROMPT_STORAGE_MAX} from "../../shared/image-prompt-profile.js";
import type {ImagePromptProfile} from "../../shared/image-prompt-profile.js";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { syncGeneratedModelOutput } from './template-output.js';
import type { ImageRequestEdits, ImageRequestRecord } from "../../shared/image-review.js";
import { ImagePromptMetadataSchema, type ImagePromptMetadata } from "../../shared/image-templates.js";
import { compactPromptText, compactNegativePrompt, assertPromptLengths, IMAGE_PROMPT_MAX_CHARS } from '../../shared/prompt-length.js';

export type ImageGenerationRequest = Parameters<SpindleAPI["imageGen"]["generate"]>[0] & {promptProfile?:ImagePromptProfile};
const blocked = /(?:api.?key|authorization|password|credential|token|secret|reference|(?:source|input|resolved|init)images?|(?:^|_)images?$|image(?:Data|Url|_data|_url|_bytes|_base64)|^_lumiglyphics|^v4_|^uc$|^negativePrompt$|^rawRequestOverride$|^__proto__$|^constructor$|^prototype$)/i;

/** History/editor values contain no credential fields or reference-image bytes. */
export function safeImageParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  const visit = (value: unknown, depth: number): unknown => {
    if (depth > 8) return undefined;
    if (typeof value === "string") return value.startsWith("data:") || value.length > 4096 ? undefined : value;
    if (value === null || typeof value === "boolean" || typeof value === "number") return value;
    // Omit an entire array if any entry is omitted, preserving positional meaning.
    if (Array.isArray(value)) { const entries = value.slice(0, 64).map((entry) => visit(entry, depth + 1)); return value.length > 64 || entries.includes(undefined) ? undefined : entries; }
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !blocked.test(key)).slice(0, 64).map(([key, entry]) => [key, visit(entry, depth + 1)]).filter(([, entry]) => entry !== undefined));
    return undefined;
  };
  const safe = visit(parameters, 0) as Record<string, unknown>;
  return JSON.stringify(safe).length <= 16000 ? safe : {};
}

/** Bound persisted/IPC history and drop invalid records from older or edited storage. */
export function safeImageHistory(input: unknown): ImageRequestRecord[] {
  if (!Array.isArray(input)) return [];
  const result: ImageRequestRecord[] = [];
  let size = 0;
  const candidates = input.slice(-32);
  // Retain active drafts before older attempts so history limits cannot hide an approval.
  for (const item of [...candidates].reverse().sort((a, b) => Number(b?.state === "review") - Number(a?.state === "review"))) {
    if (!item || typeof item !== "object" || !["review", "prepared", "approved", "skipped", "cancelled"].includes(item.state)) continue;
    if (!["requestId", "jobId", "prompt", "negativePrompt", "model", "provider", "connectionId", "referenceSummary", "createdAt"].every((key) => typeof item[key] === "string" && item[key].length <= PROMPT_STORAGE_MAX)) continue;
    if (!Number.isInteger(item.paragraphIndex) || item.paragraphIndex < 0 || !item.parameters || typeof item.parameters !== "object" || Array.isArray(item.parameters)) continue;
    const record: ImageRequestRecord = {
      ...(typeof item.canRegeneratePrompt === 'boolean' ? {canRegeneratePrompt:item.canRegeneratePrompt} : {}),
      requestId: item.requestId, jobId: item.jobId, paragraphIndex: item.paragraphIndex, state: item.state,
      prompt: item.prompt, negativePrompt: item.negativePrompt, model: item.model, provider: item.provider, connectionId: item.connectionId,
      ...(typeof item.connectionRevision === "number" ? { connectionRevision: item.connectionRevision } : {}),
      parameters: safeImageParameters(item.parameters), referenceSummary: item.referenceSummary, createdAt: item.createdAt
    };
    const profile=ImagePromptProfileSchema.safeParse(item.promptProfile);
    if(profile.success) record.promptProfile=profile.data;
    const metadata = ImagePromptMetadataSchema.safeParse(item.imagePromptMetadata);
    if (metadata.success) record.imagePromptMetadata = metadata.data;
    const length = JSON.stringify(record).length;
    if (size + length > 512000) continue;
    size += length; result.unshift(record);
  }
  return result.sort((a, b) => candidates.findIndex((item) => item?.requestId === a.requestId) - candidates.findIndex((item) => item?.requestId === b.requestId));
}

export function applyImageEdits(request: ImageGenerationRequest, edits: ImageRequestEdits): ImageGenerationRequest {
  if (!edits || typeof edits !== 'object' || Array.isArray(edits)) throw new Error('Image edits must be an object.');
  const text = (value: unknown, required: boolean): string => {
    if (typeof value !== "string" || value.length > PROMPT_STORAGE_MAX || (required && !value.trim())) throw new Error("Prompt must be nonempty text and within the supported inspection size.");
    return value;
  };
  const prompt = edits.prompt === undefined ? request.prompt : text(edits.prompt, true);
  const negativePrompt = edits.negativePrompt === undefined ? request.negativePrompt : text(edits.negativePrompt, false);
  if (edits.prompt !== undefined || edits.negativePrompt !== undefined) assertPromptLengths(prompt, negativePrompt,request.promptProfile);
  const patch = edits.parameters ?? {};
  if (!patch || typeof patch !== "object" || Array.isArray(patch) || JSON.stringify(patch).length > 16000) throw new Error("Image parameters must be a JSON object under 16 KB.");
  const check = (value: unknown, depth: number): void => {
    if (depth > 8) throw new Error("Image parameters are nested too deeply.");
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Image parameters must be finite.");
    if (typeof value === "string" && (value.startsWith("data:") || value.length > 4096)) throw new Error("Binary/oversize parameter values cannot be edited here.");
    if (value && typeof value === "object") for (const [key, entry] of Object.entries(value)) {
      if (blocked.test(key)) throw new Error(`Parameter ${key} is host/reference managed and cannot be overridden here.`);
      check(entry, depth + 1);
    }
  };
  check(patch, 0);
  const merge = (base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> => {
    const result = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
      const prior = result[key];
      result[key] = value && typeof value === "object" && !Array.isArray(value) && prior && typeof prior === "object" && !Array.isArray(prior)
        ? merge(prior as Record<string, unknown>, value as Record<string, unknown>) : value;
    }
    return result;
  };
  const parameters = structuredClone(merge(request.parameters ?? {}, patch));
  syncGeneratedModelOutput(parameters);
  for (const [key, caption] of [["v4_prompt", prompt], ["v4_negative_prompt", negativePrompt ?? ""]] as const) {
    const block = parameters[key] as { caption?: { base_caption?: string } } | undefined;
    if (block?.caption) block.caption.base_caption = caption;
  }
  if ("negativePrompt" in parameters) parameters.negativePrompt = negativePrompt ?? "";
  return { ...request, prompt, ...(negativePrompt !== undefined ? { negativePrompt } : {}), parameters };
}

export type ImagePreparationMetadata = { provider: string; connectionRevision?: number; referenceSummary?: string; imagePromptMetadata?: ImagePromptMetadata; regeneratePrompt?: (request:ImageGenerationRequest) => Promise<ImageGenerationRequest>; rebuildTemplate?: (templateId: string) => Promise<{ request: ImageGenerationRequest; metadata: ImagePreparationMetadata }> };
/** Also synchronize NovelAI/host-managed prompt copies after compaction. */
export function compactImageRequest(request: ImageGenerationRequest): ImageGenerationRequest {
  const over = request.prompt.length + (request.negativePrompt?.length ?? 0) > (request.promptProfile?.maxCharacters??IMAGE_PROMPT_MAX_CHARS);
  const negative=request.negativePrompt !== undefined && over ? compactNegativePrompt(request.negativePrompt) : request.negativePrompt;
  const stillOver=request.prompt.length+(negative?.length??0)>(request.promptProfile?.maxCharacters??IMAGE_PROMPT_MAX_CHARS);
  return applyImageEdits({...request,prompt:stillOver?compactPromptText(request.prompt, true):request.prompt,
    ...(negative !== undefined ? {negativePrompt:negative} : {})},{});
}

type Metadata = ImagePreparationMetadata;
type Pending = { request: ImageGenerationRequest; record: ImageRequestRecord; signal: AbortSignal; metadata:Metadata; rebuild?: Metadata["rebuildTemplate"]; resolve: (request: ImageGenerationRequest) => void; reject: (error: Error) => void; skipped: boolean };

function reviewRecord(jobId: string, paragraphIndex: number, request: ImageGenerationRequest, metadata: Metadata, review: boolean): ImageRequestRecord {
  const record: ImageRequestRecord = {
    canRegeneratePrompt: Boolean(metadata.regeneratePrompt),
    ...(request.promptProfile?{promptProfile:request.promptProfile}:{}),
    requestId: crypto.randomUUID(), jobId, paragraphIndex, state: review ? "review" : "prepared",
    prompt: request.prompt, negativePrompt: request.negativePrompt ?? "", model: request.model ?? "Host default",
    provider: metadata.provider, connectionId: request.connection_id ?? "Host default",
    ...(metadata.connectionRevision !== undefined ? { connectionRevision: metadata.connectionRevision } : {}),
    ...(metadata.imagePromptMetadata ? { imagePromptMetadata: ImagePromptMetadataSchema.parse(metadata.imagePromptMetadata) } : {}),
    parameters: safeImageParameters(request.parameters ?? {}), referenceSummary: metadata.referenceSummary ?? "No extension reference", createdAt: new Date().toISOString()
  };
  if (record.prompt.length > PROMPT_STORAGE_MAX || record.negativePrompt.length > PROMPT_STORAGE_MAX || JSON.stringify(record).length > 160000) throw new Error("Image request is too large to inspect. Shorten the prompt/settings and prepare it again.");
  return record;
}

function aborted(message: string): Error { const error = new Error(message); error.name = "AbortError"; return error; }

export class ImageReviewGate {
  private pending = new Map<string, Pending>();
  constructor(private readonly onRecord: (record: ImageRequestRecord) => Promise<void>) {}

  async prepare(jobId: string, paragraphIndex: number, input: ImageGenerationRequest, metadata: Metadata, review: boolean, signal: AbortSignal): Promise<ImageGenerationRequest> {
    if (signal.aborted) throw aborted("Image request cancelled.");
    const request = compactImageRequest(structuredClone(input));
    try{assertPromptLengths(request.prompt,request.negativePrompt,request.promptProfile);}catch{review=true;}
    const record = reviewRecord(jobId, paragraphIndex, request, metadata, review);
    if (!review) { await this.onRecord(record); if (signal.aborted) throw aborted("Image request cancelled."); return request; }
    let item!: Pending;
    const approved = new Promise<ImageGenerationRequest>((resolve, reject) => { item = { request, record, signal, metadata, ...(metadata.rebuildTemplate ? { rebuild: metadata.rebuildTemplate } : {}), resolve, reject, skipped: false }; });
    // Attach rejection handling before notification/storage can yield to cancellation.
    const observed = approved.then((value) => ({ value }), (error: Error) => ({ error }));
    this.pending.set(record.requestId, item);
    const abort = (): void => { this.pending.delete(item.record.requestId); item.reject(aborted("Image request cancelled.")); };
    signal.addEventListener("abort", abort, { once: true });
    try {
      await this.onRecord(record);
      const result = await observed;
      if ("error" in result || signal.aborted) {
        await this.onRecord({ ...item.record, state: item.skipped ? "skipped" : "cancelled" });
        throw "error" in result ? result.error : aborted("Image request cancelled.");
      }
      const edited = result.value;
      await this.onRecord({ ...item.record, state: "approved", prompt: edited.prompt, negativePrompt: edited.negativePrompt ?? "", parameters: safeImageParameters(edited.parameters ?? {}) });
      if (signal.aborted) throw aborted("Image request cancelled.");
      return edited;
    } finally { this.pending.delete(item.record.requestId); signal.removeEventListener("abort", abort); }
  }

  async reprepare(requestId: string, templateId: string): Promise<boolean> {
    const item = this.pending.get(requestId);
    if (!item?.rebuild || item.signal.aborted) return false;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(templateId)) throw new Error("Invalid image template selection.");
    // Claim synchronously: neither an old approval nor a second rebuild can win.
    this.pending.delete(requestId);
    try {
      await this.onRecord({ ...item.record, state: "cancelled" });
      const rebuilt = await item.rebuild(templateId);
      if (item.signal.aborted) throw aborted("Image request cancelled during template preparation.");
      const request = compactImageRequest(structuredClone(rebuilt.request));
      const record = reviewRecord(item.record.jobId, item.record.paragraphIndex, request, rebuilt.metadata, true);
      item.request = request; item.record = record;
      item.metadata = rebuilt.metadata;
      this.pending.set(record.requestId, item);
      await this.onRecord(record);
      if (item.signal.aborted) throw aborted("Image request cancelled during template preparation.");
      return true;
    } catch (error) {
      this.pending.delete(item.record.requestId);
      item.reject(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async regenerate(requestId:string):Promise<boolean> {
    const item=this.pending.get(requestId);
    if(!item?.metadata.regeneratePrompt||item.signal.aborted)return false;
    // An in-flight reroll exclusively owns this approval. Failed rewrites
    // restore the original preview instead of losing a usable request.
    this.pending.delete(requestId);
    try {
      const request=await item.metadata.regeneratePrompt(structuredClone(item.request));
      if(item.signal.aborted)throw aborted('Prompt regeneration cancelled.');
      assertPromptLengths(request.prompt,request.negativePrompt,request.promptProfile);
      const record=reviewRecord(item.record.jobId,item.record.paragraphIndex,request,item.metadata,true);
      await this.onRecord({...item.record,state:'cancelled'});
      if(item.signal.aborted)throw aborted('Prompt regeneration cancelled.');
      item.request=request;item.record=record;
      this.pending.set(record.requestId,item);
      await this.onRecord(record);
      if(item.signal.aborted)throw aborted('Prompt regeneration cancelled.');
      return true;
    }catch(error){
      if(!item.signal.aborted)this.pending.set(item.record.requestId,item);
      throw error;
    }
  }

  decide(requestId: string, action: "generate" | "skip", edits: ImageRequestEdits): boolean {
    const item = this.pending.get(requestId);
    if (!item) return false;
    if (action === "skip") { this.pending.delete(requestId); item.skipped = true; item.reject(aborted("Image skipped.")); return true; }
    const edited = applyImageEdits(item.request, edits);
    assertPromptLengths(edited.prompt,edited.negativePrompt,edited.promptProfile);
    this.pending.delete(requestId);
    item.resolve(edited);
    return true;
  }
}
