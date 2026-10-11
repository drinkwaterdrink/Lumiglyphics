import type { FrontendRequest, TurnView } from "../../protocol.js";
import type { ImageRequestRecord } from "../../shared/image-review.js";

type Draft = { prompt: string; negative: string; parameters: string };
const CSS = `
:host{position:absolute;inset:0;pointer-events:none;z-index:9;font:14px/1.45 var(--vn-shell-family,system-ui);color:var(--vn-shell-text,#eee);--paper:var(--vn-shell-panel,#171822);--edge:var(--vn-shell-border,#535565);--accent:var(--vn-shell-accent,#c1b0eb)}
[hidden]{display:none!important}button,input,textarea,select{font:inherit;color:inherit;box-sizing:border-box}button{cursor:pointer;min-height:44px;padding:8px 12px;border:1px solid var(--edge);border-radius:9px;background:var(--vn-shell-button,#252632)}button:disabled{opacity:.55;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[data-launch]{position:absolute;top:70px;right:max(12px,env(safe-area-inset-right));pointer-events:auto;background:var(--paper)}section{pointer-events:auto;position:absolute;right:12px;top:124px;width:min(490px,calc(100% - 24px));max-height:calc(100% - 144px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;border:1px solid var(--edge);border-radius:12px;padding:16px;background:var(--paper);box-shadow:0 12px 40px #0009}
h2{margin:0;font-size:19px}small,p{color:var(--vn-shell-muted,#bbc);overflow-wrap:anywhere}label{display:block;margin:12px 0}textarea,select{width:100%;background:var(--vn-shell-field,#101119);border:1px solid var(--edge);border-radius:6px;padding:8px}textarea{min-height:90px;font:13px/1.5 ui-monospace,monospace}textarea[readonly]{opacity:.85}.row{display:flex;gap:8px;flex-wrap:wrap}.row button:first-child{border-color:var(--accent)}[data-notice]{color:var(--accent);white-space:pre-wrap}details{margin:10px 0}summary{cursor:pointer}.toggle{display:flex;align-items:center;gap:8px}.toggle input{width:20px;height:20px}
`;

export class ImageStudio {
  private readonly host: HTMLElement;
  private readonly root: ShadowRoot;
  private turn: TurnView | null = null;
  private selectedJob = "";
  private selectedRequest = "";
  private drafts = new Map<string, Draft>();
  private submitted = new Set<string>();
  private preparing = new Set<string>();
  private review = true;
  private cursor = 0;

  constructor(mount: HTMLElement, private readonly send: (request: FrontendRequest) => void, private readonly saveReview: (enabled: boolean) => void) {
    this.host = document.createElement("div");
    this.host.dataset.imageStudio = "";
    this.root = this.host.attachShadow({ mode: "open" });
    this.root.innerHTML = `<style>${CSS}</style><button type="button" data-launch aria-expanded="false">Image prompts</button><section hidden aria-label="Image prompts"><div class="row"><h2>Image prompts</h2><button type="button" data-close aria-label="Close image prompts">Close</button></div><label class="toggle"><input type="checkbox" data-review checked>Review before generating</label><small>Applies to the next image batch. Held pictures stay held. You can keep reading.</small><label>Picture<select data-picture aria-label="Picture"></select></label><label data-history hidden>Recorded request<select data-request aria-label="Recorded request"></select></label><p data-scene></p><p data-meta></p><label>Positive prompt<textarea data-positive aria-label="Positive prompt" spellcheck="false"></textarea></label><label>Negative prompt<textarea data-negative aria-label="Negative prompt" spellcheck="false"></textarea></label><small>Negative prompts and individual settings are model dependent.</small><details><summary>Parameters and references</summary><p data-reference></p><label>Parameters (JSON)<textarea data-parameters aria-label="Parameters (JSON)" spellcheck="false"></textarea></label><small>Advanced overrides for this picture only. Reference bytes and host-managed fields are omitted. Your provider may ignore unsupported parameters.</small></details><div class="row"><button type="button" data-generate>Generate this</button><button type="button" data-skip>Skip</button><button type="button" data-reset>Reset edits</button><button type="button" data-prepare>Prepare replacement</button><button type="button" data-copy>Copy prompt</button></div><p data-notice role="status"></p><small>Shows the extension request prepared for Lumiverse; the host converts it for the provider.</small></section>`;
    mount.append(this.host);
    this.el<HTMLButtonElement>("[data-launch]").onclick = () => {
      const section = this.el<HTMLElement>("section"); section.hidden = !section.hidden;
      this.el<HTMLButtonElement>("[data-launch]").setAttribute("aria-expanded", String(!section.hidden));
      if (!section.hidden) { this.selectedJob = this.turn?.assets.filter((asset) => asset.paragraphIndex <= this.cursor).at(-1)?.jobId ?? this.selectedJob; this.selectedRequest = ""; this.render(); section.scrollTop = 0; }
    };
    this.el<HTMLButtonElement>("[data-close]").onclick = () => { this.el<HTMLElement>("section").hidden = true; this.el<HTMLButtonElement>("[data-launch]").setAttribute("aria-expanded", "false"); this.el<HTMLButtonElement>("[data-launch]").focus(); };
    this.el<HTMLInputElement>("[data-review]").onchange = () => { this.saveReview(this.el<HTMLInputElement>("[data-review]").checked); };
    this.el<HTMLSelectElement>("[data-picture]").onchange = () => { this.selectedJob = this.el<HTMLSelectElement>("[data-picture]").value; this.selectedRequest = ""; this.render(); };
    this.el<HTMLSelectElement>("[data-request]").onchange = () => { this.selectedRequest = this.el<HTMLSelectElement>("[data-request]").value; this.render(); };
    for (const selector of ["[data-positive]", "[data-negative]", "[data-parameters]"]) this.el<HTMLTextAreaElement>(selector).oninput = () => {
      const record = this.record();
      if (record?.state === "review") this.drafts.set(record.requestId, { prompt: this.el<HTMLTextAreaElement>("[data-positive]").value, negative: this.el<HTMLTextAreaElement>("[data-negative]").value, parameters: this.el<HTMLTextAreaElement>("[data-parameters]").value });
    };
    this.el<HTMLButtonElement>("[data-generate]").onclick = () => this.decide("generate");
    this.el<HTMLButtonElement>("[data-skip]").onclick = () => this.decide("skip");
    this.el<HTMLButtonElement>("[data-reset]").onclick = () => { const record = this.record(); if (record) this.drafts.delete(record.requestId); this.render(); };
    this.el<HTMLButtonElement>("[data-prepare]").onclick = () => {
      if (!this.turn || this.preparing.has(this.selectedJob)) return;
      this.preparing.add(this.selectedJob); this.render();
      this.send({ type: "vn_prepare_image", chatId: this.turn.chatId, messageId: this.turn.messageId, sourceFingerprint: this.turn.sourceFingerprint, jobId: this.selectedJob });
    };
    this.el<HTMLButtonElement>("[data-copy]").onclick = () => { void this.copy(); };
    this.render();
  }
  private el<T extends HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  private records(): ImageRequestRecord[] { return this.turn?.imageRequests?.filter((record) => record.jobId === this.selectedJob) ?? []; }
  private record(): ImageRequestRecord | undefined { return this.records().find((record) => record.requestId === this.selectedRequest) ?? this.records().at(-1); }

  setTurn(turn: TurnView | null): void {
    if (this.turn?.chatId !== turn?.chatId || this.turn?.sourceFingerprint !== turn?.sourceFingerprint || this.turn?.messageId !== turn?.messageId) { this.drafts.clear(); this.submitted.clear(); this.preparing.clear(); this.selectedJob = ""; this.selectedRequest = ""; }
    this.turn = turn;
    for (const record of turn?.imageRequests ?? []) if (record.state !== "review") { this.submitted.delete(record.requestId); this.drafts.delete(record.requestId); }
    for (const asset of turn?.assets ?? []) if ((turn?.imageRequests ?? []).some((record) => record.jobId === asset.jobId && record.state === "review") || asset.status === "failed" || asset.status === "cancelled") this.preparing.delete(asset.jobId);
    this.render();
  }
  setReview(enabled: boolean): void { this.review = enabled; this.el<HTMLInputElement>("[data-review]").checked = enabled; }
  setCursor(cursor: number): void { this.cursor = cursor; }
  showError(error: string): void { this.submitted.clear(); this.preparing.clear(); this.render(); this.el<HTMLElement>("[data-notice]").textContent = error; }

  private render(): void {
    const waiting = (this.turn?.imageRequests ?? []).filter((record) => record.state === "review").length;
    this.el<HTMLButtonElement>("[data-launch]").textContent = `Image prompts${waiting ? ` (${waiting} waiting)` : ""}`;
    if (!this.turn?.assets.some((asset) => asset.jobId === this.selectedJob)) { this.selectedJob = this.turn?.assets[0]?.jobId ?? ""; this.selectedRequest = ""; }
    const picker = this.el<HTMLSelectElement>("[data-picture]");
    picker.replaceChildren();
    for (const asset of this.turn?.assets ?? []) {
      const option = document.createElement("option"); option.value = asset.jobId;
      const latest = this.turn?.imageRequests?.filter((record) => record.jobId === asset.jobId).at(-1);
      option.textContent = `Paragraph ${asset.paragraphIndex + 1} — ${latest?.state === "review" ? "awaiting review" : asset.status === "generating" && !latest ? "preparing" : asset.status}`;
      picker.append(option);
    }
    picker.value = this.selectedJob;
    const records = this.records();
    if (!records.some((record) => record.requestId === this.selectedRequest) || records.at(-1)?.state === "review") this.selectedRequest = records.at(-1)?.requestId ?? "";
    const history = this.el<HTMLSelectElement>("[data-request]"); history.replaceChildren();
    records.forEach((record, index) => { const option = document.createElement("option"); option.value = record.requestId; option.textContent = `Attempt ${index + 1} — ${record.state}`; history.append(option); });
    history.value = this.selectedRequest;
    this.el<HTMLElement>("[data-history]").hidden = records.length < 2;
    const record = this.record();
    const asset = this.turn?.assets.find((entry) => entry.jobId === this.selectedJob);
    const draft = record?.state === "review" ? this.drafts.get(record.requestId) : undefined;
    this.el<HTMLElement>("[data-scene]").textContent = asset ? this.turn?.paragraphs[asset.paragraphIndex] ?? "" : "No planned pictures for this turn.";
    this.el<HTMLElement>("[data-meta]").textContent = record ? `${record.provider} · ${record.model} · ${record.state}` : asset?.status === "queued" || asset?.status === "generating" ? "Waiting for prompt/reference preparation. Later pictures may depend on an earlier portrait." : "The original request is unavailable for this older or reused picture.";
    const editable = record?.state === "review" && !this.submitted.has(record.requestId);
    for (const [selector, value] of [["[data-positive]", draft?.prompt ?? record?.prompt ?? ""], ["[data-negative]", draft?.negative ?? record?.negativePrompt ?? ""], ["[data-parameters]", draft?.parameters ?? JSON.stringify(record?.parameters ?? {}, null, 2)]] as const) { const field = this.el<HTMLTextAreaElement>(selector); field.value = value; field.readOnly = !editable; }
    this.el<HTMLElement>("[data-reference]").textContent = record?.referenceSummary ?? "";
    for (const selector of ["[data-generate]", "[data-skip]", "[data-reset]"]) this.el<HTMLButtonElement>(selector).disabled = !editable;
    const busy = this.turn?.assets.some((entry) => entry.status === "queued" || entry.status === "generating");
    this.el<HTMLButtonElement>("[data-prepare]").disabled = !asset || Boolean(busy) || this.preparing.has(this.selectedJob);
    this.el<HTMLButtonElement>("[data-copy]").disabled = !record;
    this.el<HTMLElement>("[data-notice]").textContent = asset?.error ?? (record?.state === "review" ? "Edits affect this picture only. Generate starts an image request." : "");
  }
  private decide(action: "generate" | "skip"): void {
    const record = this.record(); if (!this.turn || record?.state !== "review" || this.submitted.has(record.requestId)) return;
    try {
      const parameters: unknown = action === "generate" ? JSON.parse(this.el<HTMLTextAreaElement>("[data-parameters]").value) : {};
      if (action === "generate" && (!parameters || typeof parameters !== "object" || Array.isArray(parameters))) throw new Error("Parameters must be a JSON object.");
      const prompt = this.el<HTMLTextAreaElement>("[data-positive]").value;
      if (action === "generate" && !prompt.trim()) throw new Error("Enter a positive prompt first.");
      const request: FrontendRequest = { type: "vn_image_review", chatId: this.turn.chatId, messageId: this.turn.messageId, sourceFingerprint: this.turn.sourceFingerprint, requestId: record.requestId, action, ...(action === "generate" ? { edits: { prompt, negativePrompt: this.el<HTMLTextAreaElement>("[data-negative]").value, parameters: parameters as Record<string, unknown> } } : {}) };
      this.submitted.add(record.requestId); this.render(); this.send(request);
    } catch (error) { this.showError(error instanceof Error ? error.message : String(error)); }
  }
  private async copy(): Promise<void> {
    const text = this.el<HTMLTextAreaElement>("[data-positive]").value;
    try { await navigator.clipboard.writeText(text); this.el<HTMLElement>("[data-notice]").textContent = "Prompt copied."; }
    catch { const field = this.el<HTMLTextAreaElement>("[data-positive]"); field.focus(); field.select(); this.el<HTMLElement>("[data-notice]").textContent = "Copy unavailable here. The prompt is selected; use Ctrl+C."; }
  }
  destroy(): void { this.drafts.clear(); this.host.remove(); }
}
