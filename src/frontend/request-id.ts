export interface FrontendUuidContext {
  uuid?: { v4(): string; v7?(): string } | undefined;
  host?: { capabilities?: Record<string, number> | undefined } | undefined;
}

let sequence = 0;
let activeUuidProvider: (() => string) | null = null;

export function bindFrontendUuidProvider(ctx: FrontendUuidContext | null | undefined): void {
  if ((ctx?.host?.capabilities?.["frontend-uuid-v1"] ?? 0) >= 1 && typeof ctx?.uuid?.v4 === "function") {
    const uuidApi = ctx.uuid;
    activeUuidProvider = () => uuidApi.v4();
    return;
  }
  activeUuidProvider = null;
}

export function unbindFrontendUuidProvider(): void {
  activeUuidProvider = null;
}

function formatUuidV4FromRandomValues(getRandomValues: (array: Uint8Array) => Uint8Array): string {
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Correlation and local record IDs only; never use this helper for secrets or authentication.
 * Uses Spindle's `ctx.uuid.v4()` when `frontend-uuid-v1` is available, then `crypto.getRandomValues`
 * (which works on plain-HTTP origins where `crypto.randomUUID()` is unavailable).
 */
export function createUiId(
  source: { randomUUID?: () => string; getRandomValues?: (array: Uint8Array) => Uint8Array } | null = globalThis.crypto ?? null,
): string {
  const defaultSource = globalThis.crypto ?? null;
  if (source === defaultSource && activeUuidProvider) {
    return activeUuidProvider();
  }
  if (source?.getRandomValues) {
    return formatUuidV4FromRandomValues((arr) => source.getRandomValues!(arr));
  }
  sequence++;
  return `lg-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
