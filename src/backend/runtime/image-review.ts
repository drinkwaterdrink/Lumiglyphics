import type { SpindleAPI } from "lumiverse-spindle-types";
import type { ImageRequestEdits, ImageRequestRecord } from "../../shared/image-review.js";

export type ImageGenerationRequest = Parameters<SpindleAPI["imageGen"]["generate"]>[0];
const blocked = /(?:api.?key|authorization|password|credential|token|secret|reference|(?:source|input|resolved|init)images?|(?:^|_)images?$|image(?:Data|Url|_data|_url|_bytes|_base64)|^v4_|^uc$|^negativePrompt$|^rawRequestOverride$|^__proto__$|^constructor$|^prototype$)/i;

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
    if (!["requestId", "jobId", "prompt", "negativePrompt", "model", "provider", "connectionId", "referenceSummary", "createdAt"].every((key) => typeof item[key] === "string" && item[key].length <= 32000)) continue;
    if (!Number.isInteger(item.paragraphIndex) || item.paragraphIndex < 0 || !item.parameters || typeof item.parameters !== "object" || Array.isArray(item.parameters)) continue;
    const record: ImageRequestRecord = {
      requestId: item.requestId, jobId: item.jobId, paragraphIndex: item.paragraphIndex, state: item.state,
      prompt: item.prompt, negativePrompt: item.negativePrompt, model: item.model, provider: item.provider, connectionId: item.connectionId,
      ...(typeof item.connectionRevision === "number" ? { connectionRevision: item.connectionRevision } : {}),
      parameters: safeImageParameters(item.parameters), referenceSummary: item.referenceSummary, createdAt: item.createdAt
    };
    const length = JSON.stringify(record).length;
    if (size + length > 512000) continue;
    size += length; result.unshift(record);
  }
  return result.sort((a, b) => candidates.findIndex((item) => item?.requestId === a.requestId) - candidates.findIndex((item) => item?.requestId === b.requestId));
}

export function applyImageEdits(request: ImageGenerationRequest, edits: ImageRequestEdits): ImageGenerationRequest {
  const text = (value: unknown, required: boolean): string => {
    if (typeof value !== "string" || value.length > 32000 || (required && !value.trim())) throw new Error("Prompt must be text, nonempty, and at most 32,000 characters.");
    return value;
  };
  const prompt = edits.prompt === undefined ? request.prompt : text(edits.prompt, true);
  const negativePrompt = edits.negativePrompt === undefined ? request.negativePrompt : text(edits.negativePrompt, false);
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
  for (const [key, caption] of [["v4_prompt", prompt], ["v4_negative_prompt", negativePrompt ?? ""]] as const) {
    const block = parameters[key] as { caption?: { base_caption?: string } } | undefined;
    if (block?.caption) block.caption.base_caption = caption;
  }
  if ("negativePrompt" in parameters) parameters.negativePrompt = negativePrompt ?? "";
  return { ...request, prompt, ...(negativePrompt !== undefined ? { negativePrompt } : {}), parameters };
}

type Metadata = { provider: string; connectionRevision?: number; referenceSummary?: string };
type Pending = { request: ImageGenerationRequest; resolve: (request: ImageGenerationRequest) => void; reject: (error: Error) => void; skipped: boolean };

function aborted(message: string): Error { const error = new Error(message); error.name = "AbortError"; return error; }

export class ImageReviewGate {
  private pending = new Map<string, Pending>();
  constructor(private readonly onRecord: (record: ImageRequestRecord) => Promise<void>) {}

  async prepare(jobId: string, paragraphIndex: number, input: ImageGenerationRequest, metadata: Metadata, review: boolean, signal: AbortSignal): Promise<ImageGenerationRequest> {
    if (signal.aborted) throw aborted("Image request cancelled.");
    const request = structuredClone(input);
    const record: ImageRequestRecord = {
      requestId: crypto.randomUUID(), jobId, paragraphIndex, state: review ? "review" : "prepared",
      prompt: request.prompt, negativePrompt: request.negativePrompt ?? "", model: request.model ?? "Host default",
      provider: metadata.provider, connectionId: request.connection_id ?? "Host default",
      ...(metadata.connectionRevision !== undefined ? { connectionRevision: metadata.connectionRevision } : {}),
      parameters: safeImageParameters(request.parameters ?? {}), referenceSummary: metadata.referenceSummary ?? "No extension reference", createdAt: new Date().toISOString()
    };
    if (review && (record.prompt.length > 32000 || record.negativePrompt.length > 32000 || JSON.stringify(record).length > 80000)) throw new Error("Image request is too large to review. Shorten the prompt/settings and prepare it again.");
    if (!review) { await this.onRecord(record); if (signal.aborted) throw aborted("Image request cancelled."); return request; }
    let item!: Pending;
    const approved = new Promise<ImageGenerationRequest>((resolve, reject) => { item = { request, resolve, reject, skipped: false }; });
    // Attach rejection handling before notification/storage can yield to cancellation.
    const observed = approved.then((value) => ({ value }), (error: Error) => ({ error }));
    this.pending.set(record.requestId, item);
    const abort = (): void => { this.pending.delete(record.requestId); item.reject(aborted("Image request cancelled.")); };
    signal.addEventListener("abort", abort, { once: true });
    try {
      await this.onRecord(record);
      const result = await observed;
      if ("error" in result || signal.aborted) {
        await this.onRecord({ ...record, state: item.skipped ? "skipped" : "cancelled" });
        throw "error" in result ? result.error : aborted("Image request cancelled.");
      }
      const edited = result.value;
      await this.onRecord({ ...record, state: "approved", prompt: edited.prompt, negativePrompt: edited.negativePrompt ?? "", parameters: safeImageParameters(edited.parameters ?? {}) });
      if (signal.aborted) throw aborted("Image request cancelled.");
      return edited;
    } finally { this.pending.delete(record.requestId); signal.removeEventListener("abort", abort); }
  }

  decide(requestId: string, action: "generate" | "skip", edits: ImageRequestEdits): boolean {
    const item = this.pending.get(requestId);
    if (!item) return false;
    if (action === "skip") { this.pending.delete(requestId); item.skipped = true; item.reject(aborted("Image skipped.")); return true; }
    const edited = applyImageEdits(item.request, edits);
    this.pending.delete(requestId);
    item.resolve(edited);
    return true;
  }
}
