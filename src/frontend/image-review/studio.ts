import { modelOutputHelp } from '../../shared/image-model-output.js';
import { LUMIGLYPHICS_VERSION } from '../../shared/build-info.js';
import { IMAGE_PROMPT_MAX_CHARS, assertPromptLengths } from '../../shared/prompt-length.js';
import type { VisualNovelConfig } from "../../config.js";
import type { ImageTemplate } from "../../shared/image-templates.js";
import type { FrontendRequest, TurnView } from "../../protocol.js";
import type { ImageRequestRecord } from "../../shared/image-review.js";

type Draft = { prompt: string; negative: string; parameters: string };
const CSS = `
:host{position:absolute;inset:0;pointer-events:none;z-index:9;font:14px/1.45 var(--vn-shell-family,system-ui);color:var(--vn-shell-text,#eee);--paper:#171822;--edge:var(--vn-shell-border,#535565);--accent:var(--vn-shell-accent,#c1b0eb)}
[hidden]{display:none!important}button,input,input:not([type=checkbox]),textarea,select{font:inherit;color:inherit;box-sizing:border-box}button{cursor:pointer;min-height:44px;padding:8px 12px;border:1px solid var(--edge);border-radius:9px;background:var(--vn-shell-button,#252632)}button:disabled{opacity:.55;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[data-launch]{position:absolute;top:70px;right:max(12px,env(safe-area-inset-right));pointer-events:auto;background:var(--paper)}section{pointer-events:auto;position:absolute;right:12px;top:124px;width:min(490px,calc(100% - 24px));max-height:calc(100% - 144px);display:flex;flex-direction:column;overflow:hidden;overscroll-behavior:contain;box-sizing:border-box;border:1px solid var(--edge);border-radius:12px;padding:0;background:var(--paper);box-shadow:0 12px 40px #0009}
h2{margin:0;font-size:19px}small,p{color:var(--vn-shell-muted,#bbc);overflow-wrap:anywhere}label{display:block;margin:12px 0}textarea,select{width:100%;background:var(--vn-shell-field,#101119);border:1px solid var(--edge);border-radius:6px;padding:8px}textarea{min-height:90px;font:16px/1.5 ui-monospace,monospace}textarea[readonly]{opacity:.85}.row{display:flex;gap:8px;flex-wrap:wrap}.row button:first-child{border-color:var(--accent)}[data-notice]{color:var(--accent);white-space:pre-wrap}details{margin:10px 0}summary::before{content:"▸";margin-right:8px}details[open]>summary::before{content:"▾"}summary{cursor:pointer;min-height:44px;display:flex;align-items:center}.toggle{display:flex;align-items:center;gap:8px}.toggle input{width:20px;height:20px}
[data-studio-header],[data-studio-footer]{padding:12px 16px;flex:none;background:var(--paper)}[data-studio-header]{border-bottom:1px solid var(--edge);justify-content:space-between;align-items:center}[data-studio-body]{padding:0 16px 12px;overflow:auto;overscroll-behavior:contain;min-height:0}[data-studio-footer]{border-top:1px solid var(--edge)}[data-studio-footer] [data-notice]{margin:8px 0 0}select{min-height:44px}[data-provenance],[data-diagnostic]{white-space:pre-wrap;overflow-wrap:anywhere}[data-card-role]>small,[data-turn-recovery]>small,[data-diagnostics]>small{display:block;margin:8px 0 12px}[data-recovery]>small{display:block;margin:8px 0 12px}[data-subject-name]{min-height:44px;font:inherit}section{color:#eee}section small,section p{color:#c6c7d2}:host{container-type:inline-size}[data-close]{width:44px;padding:0;font-size:24px;flex:none}[data-build]{font:11px/1.3 system-ui;opacity:.8}
[data-notice-row]{display:flex;gap:4px;align-items:flex-start}[data-notice-row] [data-notice]{flex:1;min-width:0;max-height:20dvh;overflow:auto}[data-dismiss-notice]{flex:none;width:44px;padding:0;font-size:24px}
@container (max-width:600px){section{inset:max(76px,calc(env(safe-area-inset-top) + 64px)) 8px max(12px,env(safe-area-inset-bottom));width:auto;max-height:none;border-radius:12px}[data-studio-footer]{padding:10px 12px}[data-studio-header]{padding:10px 12px}}
@media(max-height:500px){section{inset:max(76px,calc(env(safe-area-inset-top) + 64px)) 8px max(12px,env(safe-area-inset-bottom));width:auto;max-height:none}[data-studio-header],[data-studio-footer]{padding:8px 12px}[data-studio-footer] .row{flex-wrap:nowrap;overflow-x:auto}[data-studio-footer] .row button{flex:none}[data-studio-footer] [data-notice]{max-height:12dvh}}
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
  private templates: ImageTemplate[] = [];
  private templateRequest = "";
  private defaultTemplate = "portrait";
  private rebuilding = new Set<string>();
  private rerolling = new Set<string>();
  private cursor = 0;
  private recoveryJob = "";
  private replanning = false;
  private recovering: "stop"|"retry"|null=null;
  private dismissedNotices = new Set<string>();

  constructor(mount: HTMLElement, private readonly send: (request: FrontendRequest) => void, private readonly saveReview: (enabled: boolean) => void) {
    this.host = document.createElement("div");
    this.host.dataset.imageStudio = "";
    this.root = this.host.attachShadow({ mode: "open" });
    this.root.innerHTML = `<style>${CSS}</style><button type="button" data-launch aria-expanded="false">Image prompts</button><section hidden aria-label="Image prompts"><div class="row" data-studio-header><div><h2>Image prompts</h2><small data-build>${LUMIGLYPHICS_VERSION}</small></div><button type="button" data-close aria-label="Close image prompts" title="Close image prompts">×</button></div><div data-studio-body><label class="toggle"><input type="checkbox" data-review checked>Review before generating</label><small>Applies to the next image batch. Held pictures stay held. You can keep reading.</small><details data-card-role><summary>Card role for this chat</summary><label>Card role<select data-role aria-label="Card role"><option value="auto">Auto</option><option value="character">Character</option><option value="scenario">Scenario / world / narrator</option></select></label><button type="button" data-save-role>Save card role</button><small data-role-help>Applies to future replies. Existing pictures and held prompts stay unchanged. Auto uses available visual evidence.</small></details><details data-turn-recovery><summary>Reply recovery</summary><small>Retry unfinished pictures prepares only unfinished slots again and stops their current work. Completed pictures stay. New previews always need approval. Replan asks the story-reader model to reconsider the whole reply and may use text tokens.</small><button type="button" data-retry-unfinished>Retry unfinished pictures</button><button type="button" data-replan>Replan this reply</button></details><label>Picture<select data-picture aria-label="Picture"></select></label><label data-history hidden>Recorded request<select data-request aria-label="Recorded request"></select></label><div data-batch-recovery hidden><p data-batch-status role="status"></p><button type="button" data-stop-images>Stop pending pictures</button><small>Stops this reply’s waiting image work. Requests already sent may still finish at the provider. Completed pictures stay.</small></div><p data-scene></p><p data-meta></p><p data-model-help role="status" hidden></p><label>Picture template<select data-template aria-label="Picture template"></select></label><button type="button" data-use-template>Use template</button><div data-template-confirm hidden><p>Replacing rebuilds this prompt and parameters from the selected template. Your current edits will be replaced.</p><div class="row"><button type="button" data-keep>Keep edits</button><button type="button" data-replace>Replace with template</button></div></div><details data-recovery hidden><summary>Correct this picture’s subject</summary><small>Prepare a new preview for this picture only. No image is generated until you approve it.</small><label>Picture subject<select data-subject-mode aria-label="Picture subject"><option value="character">Character</option><option value="environment">Environment / no people</option></select></label><div data-person-fields><label>Character name<input data-subject-name aria-label="Character name" list="vn-subject-candidates" maxlength="160"></label><datalist id="vn-subject-candidates" data-candidates></datalist><label>Appearance<textarea data-subject-appearance aria-label="Appearance" maxlength="2000" placeholder="Concrete visual details, separated by commas: hair, eyes, skin, clothes, species…"></textarea></label><small>Use known appearance by leaving this blank, or supply details for this picture.</small><label class="toggle"><input type="checkbox" data-save-appearance>Save appearance for this character in this chat</label></div><small data-environment-help hidden>Choose a no-people template above. Character appearance and references are omitted.</small><button type="button" data-correct>Prepare corrected preview</button></details><details data-diagnostics><summary>Picture diagnostics</summary><p data-diagnostic></p><button type="button" data-copy-diagnostic>Copy diagnostics</button><small>Copies subject and template names and status only. No appearance descriptions, chat text, prompts or provider error payloads are included.</small></details><details><summary>Prompt sources</summary><p data-provenance></p></details><p data-edit-help role="status"></p><label>Positive prompt <small data-positive-count></small><textarea data-positive maxlength="32000" aria-label="Positive prompt" spellcheck="false" inputmode="text"></textarea></label><label>Negative prompt <small data-negative-count></small><textarea data-negative maxlength="32000" aria-label="Negative prompt" spellcheck="false" inputmode="text"></textarea></label><small data-combined-count role="status"></small><small>Regenerate prompt uses your story-reader model to prepare fresh wording. It uses text tokens; an image is generated only after approval.</small><small>Negative prompts and individual settings are model dependent.</small><details><summary>Parameters and references</summary><p data-reference></p><label>Parameters (JSON)<textarea data-parameters aria-label="Parameters (JSON)" spellcheck="false" inputmode="text"></textarea></label><small>Advanced overrides for this picture only. Reference bytes and host-managed fields are omitted. Your provider may ignore unsupported parameters.</small></details><small>Shows the extension request prepared for Lumiverse; the host converts it for the provider.</small></div><footer data-studio-footer><div class="row"><button type="button" data-generate>Generate this</button><button type="button" data-skip>Skip</button><button type="button" data-reset>Reset edits</button><button type="button" data-retry-image>Retry this picture</button><button type="button" data-prepare>Edit and regenerate</button><button type="button" data-regenerate-prompt>Regenerate prompt</button><button type="button" data-copy>Copy prompt</button></div><div data-notice-row hidden><p data-notice role="status"></p><button type="button" data-dismiss-notice aria-label="Dismiss image prompt notice" title="Dismiss image prompt notice">&#215;</button></div></footer></section>`;
    mount.append(this.host);
    this.el<HTMLButtonElement>("[data-launch]").onclick = () => {
      const section = this.el<HTMLElement>("section"); section.hidden = !section.hidden;
      this.el<HTMLButtonElement>("[data-launch]").setAttribute("aria-expanded", String(!section.hidden));
      if (!section.hidden) { this.selectedJob = this.turn?.assets.filter((asset) => asset.paragraphIndex <= this.cursor).at(-1)?.jobId ?? this.selectedJob; this.selectedRequest = ""; this.render(); this.el<HTMLElement>("[data-studio-body]").scrollTop = 0; }
    };
    this.el<HTMLButtonElement>('[data-dismiss-notice]').onclick=()=>{
      const text=this.el<HTMLElement>('[data-notice]').textContent??'';
      if(this.dismissedNotices.size>=32)this.dismissedNotices.clear();
      this.dismissedNotices.add(this.noticeKey(text));this.setNotice('');this.el<HTMLButtonElement>('[data-close]').focus();
    };
    this.el<HTMLButtonElement>("[data-close]").onclick = () => { this.el<HTMLElement>("section").hidden = true; this.el<HTMLButtonElement>("[data-launch]").setAttribute("aria-expanded", "false"); this.el<HTMLButtonElement>("[data-launch]").focus(); };
    this.el<HTMLInputElement>("[data-review]").onchange = () => { this.saveReview(this.el<HTMLInputElement>("[data-review]").checked); };
    this.el<HTMLSelectElement>("[data-picture]").onchange = () => { this.selectedJob = this.el<HTMLSelectElement>("[data-picture]").value; this.selectedRequest = ""; this.render(); };
    this.el<HTMLSelectElement>("[data-template]").onchange = () => this.render();
    this.el<HTMLSelectElement>("[data-request]").onchange = () => { this.selectedRequest = this.el<HTMLSelectElement>("[data-request]").value; this.render(); };
    for (const selector of ["[data-positive]", "[data-negative]", "[data-parameters]"]) this.el<HTMLTextAreaElement>(selector).oninput = () => {
      const record = this.record();
      if (record) this.drafts.set(this.draftKey(record), { prompt: this.el<HTMLTextAreaElement>("[data-positive]").value, negative: this.el<HTMLTextAreaElement>("[data-negative]").value, parameters: this.el<HTMLTextAreaElement>("[data-parameters]").value });
      this.updateCounts();
    };
    this.el<HTMLButtonElement>("[data-use-template]").onclick = () => {
      const record = this.record(); if (!record || record.state !== "review" || this.rebuilding.has(record.requestId) || this.submitted.has(record.requestId) || this.rebuilding.has(record.requestId)) return;
      if (this.drafts.has(record.requestId)) this.el<HTMLElement>("[data-template-confirm]").hidden = false;
      else this.rebuildTemplate();
    };
    this.el<HTMLButtonElement>("[data-keep]").onclick = () => { this.el<HTMLElement>("[data-template-confirm]").hidden = true; this.el<HTMLSelectElement>("[data-template]").value = this.record()?.imagePromptMetadata?.template.id ?? this.defaultTemplate; };
    this.el<HTMLButtonElement>("[data-replace]").onclick = () => this.rebuildTemplate();
    // Events retarget to this shadow host outside the studio; keep native
    // input focus/defaults while preventing reader advance and hotkeys.
    for(const type of ['click','keydown','wheel','pointerdown','pointerup','touchstart','touchend']) this.root.addEventListener(type,event=>event.stopPropagation());
    // Focus synchronously inside the user's tap without cancelling native caret placement.
    this.root.addEventListener('click', event => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && !target.readOnly && !target.disabled) target.focus({ preventScroll: true });
    });
    this.root.addEventListener("keydown", event => { if ((event as KeyboardEvent).key === "Escape") this.el<HTMLButtonElement>("[data-close]").click(); });
    this.el<HTMLButtonElement>("[data-generate]").onclick = () => this.decide("generate");
    this.el<HTMLButtonElement>("[data-skip]").onclick = () => this.decide("skip");
    this.el<HTMLButtonElement>("[data-reset]").onclick = () => { const record = this.record(); if (record) this.drafts.delete(this.draftKey(record)); this.render(); };
    this.el<HTMLButtonElement>('[data-regenerate-prompt]').onclick=()=>this.regeneratePrompt();
    this.el<HTMLButtonElement>('[data-retry-image]').onclick=()=>{
      if(!this.turn||this.el<HTMLButtonElement>('[data-retry-image]').disabled)return;
      const jobId=this.selectedJob;this.preparing.add(jobId);this.render();
      this.send({type:'vn_prepare_image',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,jobId});
    };
    for(const [selector,action] of [['[data-stop-images]','stop'],['[data-retry-unfinished]','retry']] as const)this.el<HTMLButtonElement>(selector).onclick=()=>{
      if(!this.turn||this.recovering||this.el<HTMLButtonElement>(selector).disabled)return;
      this.recovering=action;this.render();
      this.send({type:'vn_recover_images',version:1,...this.recoveryScope(),revision:this.turn.revision,action});
    };
    this.el<HTMLButtonElement>("[data-prepare]").onclick = () => {
      if (!this.turn || this.preparing.has(this.selectedJob)) return;
      try {
        const record=this.record();const draft=record ? this.drafts.get(this.draftKey(record)) : undefined;
        const parameters=draft ? JSON.parse(draft.parameters) : undefined;
        if(draft) {assertPromptLengths(draft.prompt,draft.negative);if(!parameters || typeof parameters!=='object' || Array.isArray(parameters)) throw new Error('Parameters must be a JSON object.');}
        const request:FrontendRequest={ type:'vn_prepare_image',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,jobId:this.selectedJob,
          ...(this.el<HTMLSelectElement>('[data-template]').value ? {templateId:this.el<HTMLSelectElement>('[data-template]').value} : {}),
          ...(draft ? {edits:{prompt:draft.prompt,negativePrompt:draft.negative,parameters}} : {})};
        this.preparing.add(this.selectedJob);this.render();this.send(request);
      } catch(error) {this.showError(error instanceof Error ? error.message : String(error));}
    };
    this.el<HTMLButtonElement>('[data-replan]').onclick = () => {
      if (!this.turn || this.replanning || this.el<HTMLButtonElement>('[data-replan]').disabled) return;
      this.replanning = true; this.render();
      this.send({type:'vn_replan_turn',version:1,...this.recoveryScope()});
    };
    this.el<HTMLButtonElement>('[data-copy-diagnostic]').onclick = async () => {
      try { await navigator.clipboard.writeText(this.diagnosticText()); this.setNotice('Diagnostics copied.'); }
      catch { this.setNotice('Clipboard unavailable. You can select the diagnostic text to copy it.'); }
    };
    this.el<HTMLSelectElement>('[data-subject-mode]').onchange=()=>{
      const none=this.el<HTMLSelectElement>('[data-subject-mode]').value==='environment';
      const picker=this.el<HTMLSelectElement>('[data-template]');
      if(this.templates.find(t=>t.id===picker.value)?.subjectMode!==(none?'none':'one')) {
        picker.value=this.templates.find(t=>t.category===(none?'environment':'portrait') && t.subjectMode===(none?'none':'one'))?.id??this.templates.find(t=>t.subjectMode===(none?'none':'one'))?.id??'';
      }
      this.renderRecoveryMode();
    };
    this.el<HTMLInputElement>('[data-subject-name]').onchange=()=>{
      const name=this.el<HTMLInputElement>('[data-subject-name]').value;
      this.el<HTMLTextAreaElement>('[data-subject-appearance]').value=this.turn?.subjectCandidates?.find(c=>c.name===name)?.appearance??'';
    };
    this.el<HTMLButtonElement>('[data-save-role]').onclick=()=>{
      if(!this.turn) return;
      this.send({type:'vn_set_card_role',version:1,...this.recoveryScope(),role:this.el<HTMLSelectElement>('[data-role]').value as 'auto'|'character'|'scenario'});
    };
    this.el<HTMLButtonElement>('[data-correct]').onclick=()=>{
      if(!this.turn || this.preparing.has(this.selectedJob)) return;
      const environment=this.el<HTMLSelectElement>('[data-subject-mode]').value==='environment';
      const name=this.el<HTMLInputElement>('[data-subject-name]').value.trim();
      if(!environment && !name) {this.setNotice('Enter the character name first.');return;}
      const templateId=this.el<HTMLSelectElement>('[data-template]').value;
      this.send({type:'vn_correct_image_subject',version:1,...this.recoveryScope(),jobId:this.selectedJob,templateId,
        subject:environment?{kind:'environment',templateId}:{kind:'character',name,appearance:this.el<HTMLTextAreaElement>('[data-subject-appearance]').value,saveAppearance:this.el<HTMLInputElement>('[data-save-appearance]').checked}});
      this.preparing.add(this.selectedJob);this.render();
    };
    this.el<HTMLButtonElement>("[data-copy]").onclick = () => { void this.copy(); };
    this.render();
  }
  private el<T extends HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  private diagnosticText(): string {
    const asset = this.turn?.assets.find(entry => entry.jobId === this.selectedJob);
    const d = asset?.diagnostic;
    return d ? [`Status: ${d.status.replaceAll('_', ' ')}`, `Subject: ${d.subject ?? 'None'}`, `Template: ${d.template ?? 'Legacy / unavailable'}`, `SimTracker: ${d.tracker}`, `Story reader: ${d.planner ?? 'Unavailable'}`, d.explanation, ...(asset?.previousImage ? ['The previous picture is displayed while its replacement waits or fails.'] : [])].join('\n') : 'Diagnostics are unavailable for this older picture. Refresh the reader after updating.';
  }
  private draftKey(record:ImageRequestRecord): string {return record.state==='review' ? record.requestId : `replacement:${this.selectedJob}:${record.requestId}`;}
  private updateCounts(): void {
    let total=0;
    for(const name of ['positive','negative'] as const) {
      const length=this.el<HTMLTextAreaElement>(`[data-${name}]`).value.length;
      total+=length;
      this.el<HTMLElement>(`[data-${name}-count]`).textContent=`${length.toLocaleString()} characters`;
    }
    this.el<HTMLElement>('[data-combined-count]').textContent=`${total.toLocaleString()} / 3,000 combined${total>IMAGE_PROMPT_MAX_CHARS ? ' — shorten before generating' : ''}`;
  }

  private recoveryScope() {return {chatId:this.turn!.chatId,messageId:this.turn!.messageId,swipeId:this.turn!.swipeId,sourceFingerprint:this.turn!.sourceFingerprint,requestId:globalThis.crypto?.randomUUID?.() ?? `vn-recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`};}
  private renderRecoveryMode():void {
    const environment=this.el<HTMLSelectElement>('[data-subject-mode]').value==='environment';
    this.el<HTMLElement>('[data-person-fields]').hidden=environment;
    this.el<HTMLElement>('[data-environment-help]').hidden=!environment;
  }
  private records(): ImageRequestRecord[] { return this.turn?.imageRequests?.filter((record) => record.jobId === this.selectedJob) ?? []; }
  private record(): ImageRequestRecord | undefined { return this.records().find((record) => record.requestId === this.selectedRequest) ?? this.records().at(-1); }

  setTurn(turn: TurnView | null): void {
    if (this.turn?.chatId !== turn?.chatId || this.turn?.sourceFingerprint !== turn?.sourceFingerprint || this.turn?.messageId !== turn?.messageId || this.turn?.swipeId !== turn?.swipeId || this.turn?.revision !== turn?.revision) { this.drafts.clear(); this.submitted.clear(); this.preparing.clear(); this.rebuilding.clear(); this.rerolling.clear(); this.selectedJob = ""; this.selectedRequest = ""; this.recoveryJob = ""; }
    this.replanning = false;this.recovering=null;
    this.turn = turn;
    for(const id of this.rerolling)if(!turn?.imageRequests?.some(r=>r.requestId===id&&r.state==='review'))this.rerolling.delete(id);
    for (const record of turn?.imageRequests ?? []) if (record.state !== "review") { this.submitted.delete(record.requestId); this.drafts.delete(record.requestId); }
    for (const asset of turn?.assets ?? []) if ((turn?.imageRequests ?? []).some((record) => record.jobId === asset.jobId && record.state === "review") || asset.status === "failed" || asset.status === "cancelled") this.preparing.delete(asset.jobId);
    this.render();
  }
  setConfig(config: VisualNovelConfig): void { this.templates = config.imageTemplates.map(t => ({ ...t })); this.defaultTemplate = config.defaultImageTemplateId; this.render(); }
  private rebuildTemplate(): void {
    const record = this.record(); const templateId = this.el<HTMLSelectElement>("[data-template]").value;
    if (!this.turn || record?.state !== "review" || !templateId || this.rebuilding.has(record.requestId) || this.submitted.has(record.requestId) || this.rebuilding.has(record.requestId)) return;
    this.rebuilding.add(record.requestId); this.render();
    this.send({ type: "vn_reprepare_image_template", chatId: this.turn.chatId, messageId: this.turn.messageId, sourceFingerprint: this.turn.sourceFingerprint, requestId: record.requestId, templateId });
  }
  setReview(enabled: boolean): void { this.review = enabled; this.el<HTMLInputElement>("[data-review]").checked = enabled; }
  setCursor(cursor: number): void { this.cursor = cursor; }
  private noticeKey(text:string):string {return JSON.stringify([this.turn?.chatId,this.turn?.messageId,this.turn?.swipeId,this.turn?.sourceFingerprint,this.turn?.revision,this.selectedJob,this.selectedRequest,this.records().at(-1)?.requestId,text]);}
  private setNotice(text:string):void {
    const visible=!!text&&!this.dismissedNotices.has(this.noticeKey(text));
    this.el<HTMLElement>('[data-notice]').textContent=visible?text:'';
    this.el<HTMLElement>('[data-notice-row]').hidden=!visible;
  }
  showError(error: string): void { this.replanning = false;this.recovering=null; this.submitted.clear(); this.preparing.clear(); this.rerolling.clear(); this.render(); this.setNotice(error); }

  private regeneratePrompt():void {
    if(!this.turn||this.el<HTMLButtonElement>('[data-regenerate-prompt]').disabled)return;
    const record=this.record();
    if(record?.state==='review'){
      this.rerolling.add(record.requestId);this.render();
      this.send({type:'vn_regenerate_image_prompt',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,requestId:record.requestId});
    }else{
      this.preparing.add(this.selectedJob);this.render();
      this.send({type:'vn_prepare_image',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,jobId:this.selectedJob,regeneratePrompt:true,
        ...(this.el<HTMLSelectElement>('[data-template]').value?{templateId:this.el<HTMLSelectElement>('[data-template]').value}:{})});
    }
  }

  private render(): void {
    this.el<HTMLElement>("[data-template-confirm]").hidden = true;
    const waiting = (this.turn?.imageRequests ?? []).filter((record) => record.state === "review").length;
    this.el<HTMLButtonElement>("[data-launch]").textContent = `Image prompts${waiting ? ` (${waiting} waiting)` : ""}`;
    if (!this.turn?.assets.some((asset) => asset.jobId === this.selectedJob)) { this.selectedJob = this.turn?.assets[0]?.jobId ?? ""; this.selectedRequest = ""; }
    const picker = this.el<HTMLSelectElement>("[data-picture]");
    picker.replaceChildren();
    for (const asset of this.turn?.assets ?? []) {
      const option = document.createElement("option"); option.value = asset.jobId;
      const latest = this.turn?.imageRequests?.filter((record) => record.jobId === asset.jobId).at(-1);
      option.textContent = `Paragraph ${asset.paragraphIndex + 1} — ${latest?.state === "review" ? "awaiting review" : asset.status === "generating" && !latest ? "preparing" : friendlyStatus(asset.status)}`;
      picker.append(option);
    }
    picker.value = this.selectedJob;
    const records = this.records();
    if (!records.some((record) => record.requestId === this.selectedRequest) || records.at(-1)?.state === "review") this.selectedRequest = records.at(-1)?.requestId ?? "";
    const history = this.el<HTMLSelectElement>("[data-request]"); history.replaceChildren();
    records.forEach((record, index) => { const option = document.createElement("option"); option.value = record.requestId; option.textContent = `Attempt ${index + 1} — ${friendlyStatus(record.state)}`; history.append(option); });
    history.value = this.selectedRequest;
    this.el<HTMLElement>("[data-history]").hidden = records.length < 2;
    const record = this.record();
    const asset = this.turn?.assets.find((entry) => entry.jobId === this.selectedJob);
    const draft = record ? this.drafts.get(this.draftKey(record)) : undefined;
    this.el<HTMLElement>("[data-scene]").textContent = asset ? this.turn?.paragraphs[asset.paragraphIndex] ?? "" : "No planned pictures for this turn.";
    this.el<HTMLElement>("[data-meta]").textContent = record ? `${record.provider} · ${record.model} · ${friendlyStatus(record.state)}` : asset?.status === "queued" || asset?.status === "generating" ? "Waiting for prompt/reference preparation. Later pictures may depend on an earlier portrait." : "The original request is unavailable for this older or reused picture.";
    const localEditable=Boolean(record && asset && asset.source!=='cache' && ['failed','cancelled','generated','browser_ready'].includes(asset.status) && record.state!=='review' && !this.preparing.has(this.selectedJob) && !this.replanning);
    const editable = localEditable || record?.state === "review" && !this.submitted.has(record.requestId) && !this.rebuilding.has(record.requestId) && !this.rerolling.has(record.requestId);
    const templateSelect = this.el<HTMLSelectElement>("[data-template]");
    const previousTemplate = this.templateRequest === (record?.requestId ?? `job:${this.selectedJob}`) ? templateSelect.value : "";
    this.templateRequest = record?.requestId ?? `job:${this.selectedJob}`;
    templateSelect.replaceChildren();
    const available = [...this.templates];
    const snapshot = record?.imagePromptMetadata?.template;
    if (snapshot && !available.some(t => t.id === snapshot.id)) available.push(snapshot);
    for (const template of available) { const option = document.createElement("option"); option.value = template.id; option.textContent = template.name; templateSelect.append(option); }
    templateSelect.value = available.some(t => t.id === previousTemplate) ? previousTemplate : snapshot?.id ?? this.defaultTemplate;
    templateSelect.disabled = !asset || Boolean(record && (this.rebuilding.has(record.requestId) || this.submitted.has(record.requestId)));
    this.el<HTMLButtonElement>("[data-use-template]").hidden = record?.state !== "review";
    this.el<HTMLButtonElement>("[data-use-template]").disabled = record?.state !== 'review' || !editable || !this.templates.some(t => t.id === templateSelect.value);
    const metadata = record?.imagePromptMetadata;
    this.el<HTMLElement>("[data-provenance]").textContent = metadata ? `${metadata.template.name} · ${metadata.template.category} · ${metadata.format === "tags" ? "Tags" : "Description"}\n${metadata.selectionReason}\nFraming: ${metadata.brief.framing}; subjects: ${metadata.brief.subjectMode === "none" ? "no people" : "one character"}; references: ${metadata.brief.referencePolicy}\nSimTracker: ${metadata.trackerStatus}${metadata.trackerSourceMessageId ? ` (message ${metadata.trackerSourceMessageId})` : ""}\nSources: ${metadata.brief.sources.join(", ") || "Story scene"}${metadata.brief.conflicts.length ? `\nConflicts: ${metadata.brief.conflicts.join("; ")}` : ""}` : "Template and source metadata are unavailable for this older request.";
    for (const [selector, value] of [["[data-positive]", draft?.prompt ?? record?.prompt ?? ""], ["[data-negative]", draft?.negative ?? record?.negativePrompt ?? ""], ["[data-parameters]", draft?.parameters ?? JSON.stringify(record?.parameters ?? {}, null, 2)]] as const) { const field = this.el<HTMLTextAreaElement>(selector); if(field.value!==value) field.value = value; field.readOnly = !editable; }
    this.updateCounts();
    this.el<HTMLElement>('[data-edit-help]').textContent=localEditable ? 'Edit a local replacement draft below, then Prepare edited preview. The recorded request stays unchanged; generation still needs approval.' : record?.state==='review' ? 'Editable preview. Positive and negative share a 3,000-character limit.' : !record ? 'No editable request is saved for this picture. Choose Prepare editable preview first; generation still needs approval.' : 'Recorded request — read-only while this picture is running. Finish or skip waiting pictures to prepare a replacement.';
    this.el<HTMLElement>("[data-reference]").textContent = record?.referenceSummary ?? "";
    const modelHelp = this.el<HTMLElement>('[data-model-help]');
    modelHelp.textContent = modelOutputHelp(record?.provider, record?.model, record?.parameters ?? {});
    modelHelp.hidden = !modelHelp.textContent;
    for (const selector of ["[data-generate]", "[data-skip]", "[data-reset]"]) { this.el<HTMLButtonElement>(selector).disabled = !editable; this.el<HTMLButtonElement>(selector).hidden = record?.state !== "review"; }
    const busy = this.turn?.assets.some((entry) => entry.status === "queued" || entry.status === "generating");
    const unfinished=(this.turn?.assets??[]).filter(entry=>entry.source!=='cache'&&!['browser_ready','generated'].includes(entry.status));
    const retryable=!!asset&&asset.source!=='cache'&&['failed','cancelled','generated','browser_ready'].includes(asset.status)&&record?.state!=='review';
    const retryButton=this.el<HTMLButtonElement>('[data-retry-image]');retryButton.hidden=!retryable;
    retryButton.textContent=asset&&['generated','browser_ready'].includes(asset.status)?'Regenerate this picture':'Retry this picture';
    retryButton.disabled=!retryable||!!busy||this.replanning||!!this.recovering||this.preparing.has(this.selectedJob);
    retryButton.title='Rebuilds this picture from its saved scene and current settings. Local prompt edits are not applied; the new preview needs approval.';
    const held=(this.turn?.imageRequests??[]).filter(r=>r.state==='review'&&unfinished.some(a=>a.jobId===r.jobId)).length;
    this.el<HTMLElement>('[data-batch-recovery]').hidden=!busy;
    this.el<HTMLElement>('[data-batch-status]').textContent=`${held} awaiting review; ${Math.max(0,unfinished.filter(a=>['queued','generating'].includes(a.status)).length-held)} waiting or preparing. Finish these pictures, or stop pending pictures before retrying one.`;
    this.el<HTMLButtonElement>('[data-stop-images]').disabled=!!this.recovering||!busy;
    this.el<HTMLButtonElement>('[data-retry-unfinished]').disabled=!unfinished.some(a=>['failed','cancelled'].includes(a.status))||this.replanning||!!this.recovering||this.preparing.size>0;

    const reroll=this.el<HTMLButtonElement>('[data-regenerate-prompt]');
    const rolling=Boolean(record&&this.rerolling.has(record.requestId));
    reroll.textContent=rolling||this.preparing.has(this.selectedJob)?'Preparing prompt…':'Regenerate prompt';
    reroll.disabled=!asset||asset.source==='cache'||this.replanning||this.preparing.has(this.selectedJob)||!!this.recovering||rolling||Boolean(record&&(this.submitted.has(record.requestId)||this.rebuilding.has(record.requestId)))||(record?.state==='review'?record.canRegeneratePrompt===false:Boolean(busy));
    reroll.title='Uses the story-reader model to reroll this picture’s prompt. Replaces the preview wording; generating the image still requires approval.';
    this.el<HTMLButtonElement>('[data-prepare]').textContent = record ? 'Prepare edited preview' : 'Prepare editable preview';
    this.el<HTMLButtonElement>("[data-prepare]").hidden = record?.state === "review";
    this.el<HTMLButtonElement>("[data-prepare]").disabled = !asset || Boolean(busy) || this.replanning || !!this.recovering || this.preparing.has(this.selectedJob) || !this.templates.some(t => t.id === templateSelect.value);
    this.el<HTMLButtonElement>('[data-prepare]').title=busy ? 'Finish or skip the other waiting pictures before preparing a replacement.' : 'Prepare one edited preview; generation still needs approval.';
    this.el<HTMLButtonElement>('[data-replan]').disabled = !this.turn || Boolean(busy) || this.replanning || !!this.recovering || this.preparing.size > 0;
    this.el<HTMLButtonElement>('[data-replan]').textContent = this.replanning ? 'Replanning…' : 'Replan this reply';
    this.el<HTMLElement>('[data-diagnostic]').textContent = this.diagnosticText();
    this.el<HTMLButtonElement>('[data-copy-diagnostic]').disabled = !asset?.diagnostic;
    this.el<HTMLElement>('[data-recovery]').hidden=!asset || asset.source==='cache' || Boolean(busy) || record?.state==='review';
    this.el<HTMLButtonElement>('[data-correct]').disabled=!asset || Boolean(busy) || this.replanning || !!this.recovering || this.preparing.has(this.selectedJob);
    this.el<HTMLElement>('[data-card-role]').hidden=!this.turn?.cardRoleAvailable;
    this.el<HTMLButtonElement>('[data-save-role]').disabled=Boolean(busy) || this.replanning || !!this.recovering;
    this.el<HTMLSelectElement>('[data-role]').value=this.turn?.cardRole??'auto';
    if(this.recoveryJob!==this.selectedJob){
      this.recoveryJob=this.selectedJob;
      this.el<HTMLInputElement>('[data-subject-name]').value='';
      this.el<HTMLTextAreaElement>('[data-subject-appearance]').value='';
      this.el<HTMLInputElement>('[data-save-appearance]').checked=false;
      this.el<HTMLSelectElement>('[data-subject-mode]').value='character';
      const candidates=this.el<HTMLElement>('[data-candidates]');candidates.replaceChildren();
      for(const candidate of this.turn?.subjectCandidates??[]){const option=document.createElement('option');option.value=candidate.name;candidates.append(option);}
    }
    this.renderRecoveryMode();
    this.el<HTMLButtonElement>("[data-copy]").disabled = !record;
    this.setNotice(this.recovering ? (this.recovering==='stop'?'Stopping pending pictures…':'Preparing unfinished pictures for review…') : rolling ? "Regenerating prompt with the story-reader model… Image generation still needs approval." : (asset?.error ?? (asset?.status==='cancelled'&&record?.state!=='review' ? (record?.state==='skipped'?'This picture was skipped. Retry this picture prepares a new preview.':'This picture was cancelled before it completed. Retry this picture prepares a new preview; no image is sent until you approve.') : '')) || (record && this.rebuilding.has(record.requestId) ? "Rebuilding template… Wait for a new preview before generating." : record?.state === "review" ? "Edits affect this picture only. Generate starts an image request." : ""));
  }
  private decide(action: "generate" | "skip"): void {
    const record = this.record(); if (!this.turn || record?.state !== "review" || this.submitted.has(record.requestId) || this.rebuilding.has(record.requestId) || this.rerolling.has(record.requestId)) return;
    try {
      const parameters: unknown = action === "generate" ? JSON.parse(this.el<HTMLTextAreaElement>("[data-parameters]").value) : {};
      if (action === "generate" && (!parameters || typeof parameters !== "object" || Array.isArray(parameters))) throw new Error("Parameters must be a JSON object.");
      const prompt = this.el<HTMLTextAreaElement>("[data-positive]").value;
      if (action === "generate") assertPromptLengths(prompt,this.el<HTMLTextAreaElement>("[data-negative]").value);
      if (action === "generate" && !prompt.trim()) throw new Error("Enter a positive prompt first.");
      const request: FrontendRequest = { type: "vn_image_review", chatId: this.turn.chatId, messageId: this.turn.messageId, sourceFingerprint: this.turn.sourceFingerprint, requestId: record.requestId, action, ...(action === "generate" ? { edits: { prompt, negativePrompt: this.el<HTMLTextAreaElement>("[data-negative]").value, parameters: parameters as Record<string, unknown> } } : {}) };
      this.submitted.add(record.requestId); this.render(); this.send(request);
    } catch (error) { this.showError(error instanceof Error ? error.message : String(error)); }
  }
  private async copy(): Promise<void> {
    const text = this.el<HTMLTextAreaElement>("[data-positive]").value;
    try { await navigator.clipboard.writeText(text); this.setNotice("Prompt copied."); }
    catch { const field = this.el<HTMLTextAreaElement>("[data-positive]"); field.focus(); field.select(); this.setNotice("Copy unavailable here. The prompt is selected; use Ctrl+C."); }
  }
  destroy(): void { this.drafts.clear(); this.host.remove(); }
}

function friendlyStatus(status: string): string { return ({ browser_ready: "Ready", generated: "Ready", queued: "Waiting", generating: "Generating", review: "Awaiting review", approved: "Approved", cancelled: "Cancelled", skipped: "Skipped", failed: "Failed" } as Record<string, string>)[status] ?? status; }
