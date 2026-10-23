import {assertPromptLengths} from "../../shared/prompt-length.js";
import {promptProfileSummary} from "../../shared/image-prompt-profile.js";
import {assertCapabilityOutput} from '../../shared/model-output-capabilities.js';
import type { BackendResponse, FrontendRequest } from "../../protocol.js";
import type { ImageRequestEdits } from "../../shared/image-review.js";

type Preview = Extract<BackendResponse, { type: "vn_external_image_review" }>;

/** External illustration approval remains available when the story overlay is closed. */
export class ExternalImageReview {
  private readonly host: HTMLDivElement;
  private readonly dialog: HTMLDialogElement;
  private readonly heading: HTMLElement;
  private readonly receipt: HTMLElement;
  private readonly prompt: HTMLTextAreaElement;
  private readonly negative: HTMLTextAreaElement;
  private readonly parameters: HTMLTextAreaElement;
  private readonly status: HTMLElement;
  private readonly generate: HTMLButtonElement;
  private preview: Preview | null = null;
  private opener: HTMLElement | null = null;
  private sending = false;

  constructor(mount: HTMLElement, private readonly send: (request: FrontendRequest) => void, private readonly onOpenChange: (open: boolean) => void = () => {}) {
    this.host = document.createElement("div");
    mount.append(this.host);
    const root = this.host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{font:inherit;color:var(--lumiverse-text,#eee)}
      dialog{box-sizing:border-box;width:min(40rem,calc(100vw / var(--lumiverse-ui-scale,1) - 1rem));max-height:calc(100dvh / var(--lumiverse-ui-scale,1) - 1rem);padding:0;border:1px solid var(--lumiverse-border,#626879);border-radius:16px;background:var(--lumiverse-bg,#151823);color:inherit;box-shadow:0 20px 80px #0008}
      dialog,dialog::backdrop{pointer-events:auto}dialog::backdrop{background:#0009} form{display:flex;flex-direction:column;margin:0}header,footer{padding:1rem;background:var(--lumiverse-bg-elevated,#202535)}header{display:flex;align-items:center;gap:.75rem}h2{font-size:1.1rem;flex:1;margin:0}.body{padding:1rem;overflow:auto}p{line-height:1.5;margin:.25rem 0 1rem}label{display:block;margin:.75rem 0}textarea{box-sizing:border-box;width:100%;margin-top:.4rem;min-height:7rem;padding:.7rem;border:1px solid var(--lumiverse-border,#626879);border-radius:10px;background:var(--lumiverse-card-bg,#101420);color:inherit;font:inherit;resize:vertical}button{min-width:44px;min-height:44px;padding:.65rem .9rem;border:1px solid var(--lumiverse-border,#626879);border-radius:10px;color:inherit;background:var(--lumiverse-bg-elevated,#252e40);font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible,textarea:focus-visible{outline:2px solid var(--lumiverse-primary,#a7c8ff);outline-offset:2px}footer{display:flex;gap:.6rem;flex-wrap:wrap}.status{font-size:.9rem;flex-basis:100%;margin:0}details>summary{min-height:44px;display:flex;align-items:center;cursor:pointer}
      @media(max-width:600px){dialog{margin:auto}header,.body,footer{padding:.8rem}}
    </style><dialog aria-labelledby="external-image-title"><form><header><h2 id="external-image-title">Review external picture</h2><button type="button" data-close aria-label="Cancel picture">×</button></header><div class="body"><p data-receipt></p><label>Positive prompt<textarea data-positive aria-label="Positive prompt" spellcheck="false"></textarea></label><label>Negative prompt<textarea data-negative aria-label="Negative prompt" spellcheck="false"></textarea></label><details><summary>Parameters and references</summary><p data-reference></p><label>Parameters (JSON)<textarea data-parameters aria-label="Parameters (JSON)" spellcheck="false"></textarea></label></details></div><footer><button type="submit" data-generate>Generate this picture</button><button type="button" data-skip>Skip picture</button><p class="status" role="status" aria-live="polite" data-status></p></footer></form></dialog>`;
    this.dialog = root.querySelector("dialog")!;
    this.heading = root.querySelector("h2")!;
    this.receipt = root.querySelector("[data-receipt]")!;
    this.prompt = root.querySelector("[data-positive]")!;
    this.negative = root.querySelector("[data-negative]")!;
    this.parameters = root.querySelector("[data-parameters]")!;
    this.status = root.querySelector("[data-status]")!;
    this.generate = root.querySelector("[data-generate]")!;
    this.dialog.addEventListener("cancel", event => { event.preventDefault(); this.cancel(); });
    root.querySelector("[data-close]")!.addEventListener("click", () => this.cancel());
    root.querySelector("[data-skip]")!.addEventListener("click", () => this.cancel());
    this.dialog.querySelector("form")!.addEventListener("submit", event => { event.preventDefault(); this.approve(); });
    this.prompt.addEventListener("input", () => this.validate());
    this.negative.addEventListener("input", () => this.validate());
    this.parameters.addEventListener("input", () => this.validate());
  }

  receive(preview: Preview): void {
    if (preview.record.state !== "review") {
      if (this.preview?.requestId === preview.requestId && this.preview.record.requestId === preview.record.requestId) this.close();
      return;
    }
    // Repeated delivery must never discard text already being edited.
    if (this.preview?.requestId === preview.requestId && this.preview.record.requestId === preview.record.requestId) return;
    if (this.preview) this.cancel();
    this.preview = preview;
    this.onOpenChange(true);
    this.sending = false;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.heading.textContent = `Review picture · ${preview.characterName}`;
    this.receipt.textContent = `Warp illustration · ${preview.record.provider} · ${preview.record.model}. One picture; no image request is sent until you approve.`;
    if(preview.record.promptProfile?.outputSummary)this.receipt.textContent+=' '+preview.record.promptProfile.outputSummary;
    this.dialog.querySelector("[data-reference]")!.textContent = preview.record.referenceSummary;
    this.prompt.value = preview.record.prompt;
    this.negative.value = preview.record.negativePrompt;
    this.parameters.value = JSON.stringify(preview.record.parameters, null, 2);
    this.validate();
    if (!this.dialog.open) this.dialog.showModal();
    this.prompt.focus();
  }

  private edits(): ImageRequestEdits {
    const length = this.prompt.value.length + this.negative.value.length;
    if(!this.prompt.value.trim())throw new Error("Enter a positive prompt.");
    assertPromptLengths(this.prompt.value,this.negative.value,this.preview?.record.promptProfile);
    const parameters: unknown = JSON.parse(this.parameters.value);
    if (!parameters || typeof parameters !== "object" || Array.isArray(parameters) || this.parameters.value.length > 16000) throw new Error("Parameters must be a JSON object under 16 KB.");
    if(this.preview?.record.promptProfile?.output&&this.preview.record.promptProfile.outputManaged)assertCapabilityOutput(this.preview.record.promptProfile.output,parameters as Record<string,unknown>);
    return { prompt: this.prompt.value, negativePrompt: this.negative.value, parameters: parameters as Record<string, unknown> };
  }
  private validate(): void {
    try { this.edits(); this.generate.disabled = this.sending; this.status.textContent = `${this.prompt.value.length + this.negative.value.length} / ${(this.preview?.record.promptProfile?.maxCharacters??3000).toLocaleString()} combined characters. ${this.preview?.record.promptProfile?promptProfileSummary(this.preview.record.promptProfile):'Legacy budget.'} Approval starts image generation.`; }
    catch (error) { this.generate.disabled = true; this.status.textContent = [error instanceof Error ? error.message : String(error),this.preview?.record.promptAdaptationError].filter(Boolean).join('\n'); }
  }
  private approve(): void {
    const preview = this.preview;
    if (!preview || this.sending) return;
    try {
      const edits = this.edits(); this.sending = true; this.generate.disabled = true;
      this.send({ type: "vn_external_image_review", chatId: preview.chatId, requestId: preview.requestId, reviewRequestId: preview.record.requestId, action: "generate", edits });
      this.status.textContent = "Waiting for approval confirmation…";
    } catch (error) { this.sending = false; this.validate(); this.status.textContent = error instanceof Error ? error.message : String(error); }
  }
  error(chatId: string | undefined, requestId: string | undefined, error: string): void {
    if (!this.preview || chatId !== this.preview.chatId || requestId !== this.preview.requestId) return;
    this.sending = false; this.validate(); this.status.textContent = error;
  }
  result(chatId: string, requestId: string): void {
    if (this.preview?.chatId === chatId && this.preview.requestId === requestId) this.close();
  }
  cancel(): void {
    const preview = this.preview;
    this.close();
    if (preview) this.send({ type: "vn_external_image_cancel", request: { version: 1, provider: "warp", chatId: preview.chatId, requestId: preview.requestId } });
  }
  private close(): void {
    const wasOpen = Boolean(this.preview);
    this.preview = null; this.sending = false;
    if (this.dialog.open) this.dialog.close();
    if (this.opener?.isConnected) this.opener.focus();
    this.opener = null;
    if (wasOpen) this.onOpenChange(false);
  }
  destroy(): void { this.cancel(); this.host.remove(); }
}
