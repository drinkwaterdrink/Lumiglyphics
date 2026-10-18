let sequence=0;

/** Correlation and local record IDs only; never use this helper for secrets or authentication.
 * randomUUID is absent on some HTTP/self-hosted browser contexts. Backend user
 * and chat checks remain authoritative regardless of how an ID was produced. */
export function createUiId(source:{randomUUID?:()=>string}|null=globalThis.crypto??null):string{
 if(source?.randomUUID)return source.randomUUID();
 sequence++;
 return `lg-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2,12)}`;
}
