export interface BackendUuidContext {
  uuid?: { v4(): Promise<string>; v7?(): Promise<string> } | undefined;
  host?: { capabilities?: Record<string, number> | undefined } | undefined;
}

let activeBackendUuidProvider: (() => Promise<string>) | null = null;

export function bindBackendUuidProvider(spindle: BackendUuidContext | null | undefined): void {
  if ((spindle?.host?.capabilities?.["uuid-v1"] ?? 0) >= 1 && typeof spindle?.uuid?.v4 === "function") {
    const uuidApi = spindle.uuid;
    activeBackendUuidProvider = () => uuidApi.v4();
    return;
  }
  activeBackendUuidProvider = null;
}

export function unbindBackendUuidProvider(): void {
  activeBackendUuidProvider = null;
}

export function generateBackendUuidSync(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    let hex = "";
    for (let i = 0; i < bytes.length; i += 1) {
      hex += bytes[i]!.toString(16).padStart(2, "0");
    }
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `lg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function generateBackendUuid(): Promise<string> {
  if (activeBackendUuidProvider) {
    return activeBackendUuidProvider();
  }
  return generateBackendUuidSync();
}
