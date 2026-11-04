import {ImageActivityPanel} from './image-activity.js';
import {VersionComparison} from './version-comparison.js';
import {PromptHistory,type PromptEditSnapshot} from './prompt-history.js';
import {lintCompiledPrompt} from '../../shared/prompt-lint.js';
import {resolveImagePromptProfileV2} from '../../shared/image-prompt-profile-v2.js';
import {describePictureExplanation} from './picture-explanation.js';
import {sceneImageCandidatesFor,loadVnImageCandidates} from '../stage/image-loader.js';
import type {ImageRetryQueueView} from '../../shared/image-retries.js';
import type {LocalPictureOperations} from './local-operations.js';
import {promptRevisionSummary} from './prompt-revision.js';
import {retainedSceneEvidence,changedSceneEvidence,type SceneEvidence} from '../../shared/prompt-scene-evidence.js';
import {promptProfileSummary} from "../../shared/image-prompt-profile.js";
import {assertCapabilityOutput} from '../../shared/model-output-capabilities.js';
import {inspectorState,pictureStateLabel,pictureStateSummary} from './inspector-model.js';
import {PreparedBriefView,PREPARED_BRIEF_CSS,type BriefDestination} from './prepared-brief-view.js';
import {PresentationRulesPanel} from '../settings/presentation-rules.js';
import type {PresentationRuleCatalog} from '../../shared/presentation-rules.js';
import { modelOutputHelp } from '../../shared/image-model-output.js';
import { LUMIGLYPHICS_VERSION } from '../../shared/build-info.js';
import { IMAGE_PROMPT_MAX_CHARS, assertPromptLengths, fitPromptToBudget } from '../../shared/prompt-length.js';
import type { VisualNovelConfig } from "../../config.js";
import type { ImageTemplate } from "../../shared/image-templates.js";
import { BUILTIN_SHARED_STYLES } from "../../shared/image-styles.js";
import type { ConnectionCatalogOption, FrontendRequest, TurnView } from "../../protocol.js";
import type { ImageRequestRecord,ImageRequestEdits } from "../../shared/image-review.js";
import {isMobileWidth,trapFocusWithin} from './focus-trap.js';

type Draft = { prompt: string; negative: string; parameters: string };
const CSS = `
:host{position:absolute;inset:0;pointer-events:none;z-index:9;font:14px/1.45 var(--vn-shell-family,system-ui);color:var(--vn-shell-text,#f4f7ee);--paper:#11241c;--edge:rgba(160,205,185,.22);--accent:#dcebad;--vn-shell-field:rgba(14,28,22,.85);--vn-shell-button:rgba(22,46,36,.8)}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])){color:#172721;--paper:#eef3e5;--edge:rgba(35,65,50,.18);--accent:#234b39;--vn-shell-field:#fbfdf7;--vn-shell-button:#e2ecde;--vn-shell-text:#172721;--vn-shell-muted:#4b6b5d}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section{color:#172721!important;background:#eef3e5!important}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section small,:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section p{color:#4b6b5d!important}
[hidden]{display:none!important}button,input,input:not([type=checkbox]),textarea,select{font:inherit;color:inherit;box-sizing:border-box}button{cursor:pointer;min-height:44px;padding:8px 12px;border:1px solid var(--edge);border-radius:9px;background:var(--vn-shell-button,#252632)}button:disabled{opacity:.55;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[data-launch]{max-width:130px;position:absolute;top:70px;right:max(12px,env(safe-area-inset-right));pointer-events:auto;background:var(--paper)}section{pointer-events:auto;position:absolute;right:12px;top:124px;width:min(490px,calc(100% - 24px));max-height:calc(100% - 144px);display:flex;flex-direction:column;overflow:hidden;overscroll-behavior:contain;box-sizing:border-box;border:1px solid var(--edge);border-radius:12px;padding:0;background:var(--paper);box-shadow:0 12px 40px #0009}
[data-launch][data-waiting]:not([data-waiting="0"])::after{content:attr(data-waiting);position:absolute;top:-7px;right:-4px;min-width:20px;height:20px;padding:0 3px;display:grid;place-items:center;border-radius:999px;background:var(--accent);color:var(--paper);font:700 11px/1 system-ui;border:1px solid var(--edge);box-sizing:border-box}h2{margin:0;font-size:19px}small,p{color:var(--vn-shell-muted,#bbc);overflow-wrap:anywhere}label{display:block;margin:12px 0}textarea,select{width:100%;background:var(--vn-shell-field,#101119);border:1px solid var(--edge);border-radius:6px;padding:8px}textarea{min-height:90px;font:16px/1.5 ui-monospace,monospace}textarea[readonly]{opacity:.85}.row{display:flex;gap:8px;flex-wrap:wrap}.row button:first-child{border-color:var(--accent)}[data-notice]{color:var(--accent);white-space:pre-wrap}details{margin:10px 0}summary::before{content:"▸";margin-right:8px}details[open]>summary::before{content:"▾"}summary{cursor:pointer;min-height:44px;display:flex;align-items:center}.toggle{display:flex;align-items:center;gap:8px}.toggle input{width:20px;height:20px}
[data-studio-header],[data-studio-footer]{padding:12px 16px;flex:none;background:var(--paper)}[data-studio-header]{border-bottom:1px solid var(--edge);justify-content:space-between;align-items:center}[data-studio-body]{padding:0 16px 12px;overflow:auto;overscroll-behavior:contain;min-height:0}[data-studio-footer]{border-top:1px solid var(--edge)}[data-studio-footer] [data-notice]{margin:8px 0 0}select{min-height:44px}[data-provenance],[data-diagnostic]{white-space:pre-wrap;overflow-wrap:anywhere}[data-card-role]>small,[data-turn-recovery]>small,[data-diagnostics]>small{display:block;margin:8px 0 12px}[data-recovery]>small{display:block;margin:8px 0 12px}[data-subject-name]{min-height:44px;font:inherit}section{color:var(--vn-shell-text,inherit)}section small,section p{color:var(--vn-shell-muted,inherit)}:host{container-type:inline-size}[data-close]{width:44px;padding:0;font-size:24px;flex:none}[data-build]{font:11px/1.3 system-ui;opacity:.8}
[data-notice-row]{display:flex;gap:4px;align-items:flex-start}[data-notice-row] [data-notice]{flex:1;min-width:0;max-height:20dvh;overflow:auto}[data-dismiss-notice]{flex:none;width:44px;padding:0;font-size:24px}
@container (max-width:600px){section{inset:max(76px,calc(env(safe-area-inset-top) + 64px)) 8px max(12px,env(safe-area-inset-bottom));width:auto;max-height:none;border-radius:12px}[data-studio-footer]{padding:10px 12px}[data-studio-header]{padding:10px 12px}}
@media(max-height:500px){section{inset:max(76px,calc(env(safe-area-inset-top) + 64px)) 8px max(12px,env(safe-area-inset-bottom));width:auto;max-height:none}[data-studio-header],[data-studio-footer]{padding:8px 12px}[data-studio-footer] .row{flex-wrap:nowrap;overflow-x:auto}[data-studio-footer] .row button{flex:none}[data-studio-footer] [data-notice]{max-height:12dvh}}
`;
const INSPECTOR_CSS=`
:host{--paper:var(--vn-shell-panel,#171822)}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])){--paper:#f8faf6;color:#172721;--vn-shell-text:#172721;--vn-shell-muted:#4b6b5d;--vn-shell-field:#ffffff;--vn-shell-button:#e5eee2;--accent:#1e5a40;--edge:rgba(86,128,107,.35)}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section{color:#172721!important;background:#f8faf6!important}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) details{background:#ffffff!important;border-color:rgba(86,128,107,.3)!important}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-context]{background:#eef5ee!important;border-color:rgba(86,128,107,.3)!important}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-scene]{color:#142820!important}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) textarea{background:#ffffff!important;color:#142820!important;border-color:rgba(86,128,107,.35)!important}section{width:min(510px,calc(100% - 24px));color:var(--vn-shell-text,#eee);backdrop-filter:blur(16px)}section small,section p{color:var(--vn-shell-muted,#bbc)}[data-studio-body]{padding-top:14px}details{border:1px solid color-mix(in srgb,var(--edge) 65%,transparent);border-radius:10px;background:rgba(255,255,255,.025);padding:0 12px;margin:8px 0}details[open]{padding-bottom:12px;background:rgba(255,255,255,.04);border-color:color-mix(in srgb,var(--accent) 42%,var(--edge))}summary{font-weight:600}[data-context]{display:flex;gap:12px;align-items:flex-start;margin:10px 0;padding:12px;border-radius:12px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 12%,rgba(255,255,255,.03)),rgba(0,0,0,.24));border:1px solid color-mix(in srgb,var(--accent) 30%,var(--edge))}[data-context-text]{min-width:0;flex:1}[data-status]{font-size:16px;display:block}[data-paragraph]{display:inline-block;margin-top:4px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.07);font-size:11px;font-weight:600}[data-scene]{margin:6px 0 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:13px}[data-thumbnail]{width:74px;height:92px;flex:none;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--edge));border-radius:10px;background:var(--vn-shell-field,#101119);display:grid;place-items:center;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.35)}[data-thumbnail] img{width:100%;height:100%;object-fit:cover}[data-placeholder]{font-size:30px;color:var(--accent)}[data-state-detail]{margin:8px 0;font-size:13px}[data-meta]{font-size:12px;margin:6px 0;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.05);display:inline-block}[data-prompt-editor]{margin:14px 0;padding:12px;border-radius:12px;background:rgba(255,255,255,.025);border:1px solid color-mix(in srgb,var(--edge) 70%,transparent)}[data-edit-help]{font-size:12px;margin:0 0 8px}label{font-weight:500;margin:10px 0}label small{float:right;font-weight:400;font-size:11px}textarea{margin-top:6px;font:16px/1.5 var(--vn-shell-family,system-ui);border-radius:8px}[data-positive]{min-height:135px;resize:vertical}[data-negative]{min-height:68px;resize:vertical}[data-budget-meter]{height:6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0 4px}[data-budget-fill]{height:100%;width:0%;background:var(--accent);border-radius:999px;transition:width .2s ease,background-color .2s ease}[data-budget-fill][data-tone="warn"]{background:#f5c462}[data-budget-fill][data-tone="over"]{background:var(--vn-shell-danger,#ffb4ab)}[data-combined-count]{display:block;font-variant-numeric:tabular-nums;text-align:right;font-size:12px}[data-validation]{display:block;color:var(--vn-shell-danger,#ffb4ab);margin:6px 0}[aria-invalid="true"]{border-color:var(--vn-shell-danger,#ffb4ab)}[data-picture-strip]{display:flex;gap:8px;margin-bottom:8px}[data-picture-strip] button{flex:1;min-width:0;padding:6px 8px;font-size:12px;display:flex;align-items:center;gap:6px;border-radius:10px}[data-picture-strip] img{width:30px;height:34px;object-fit:cover;border-radius:5px}[data-picture-strip] [aria-pressed="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--vn-shell-button,#252632));box-shadow:inset 0 0 0 1px var(--accent)}[data-picture-navigation] label{margin:0}[data-retry-queue]{margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid color-mix(in srgb,var(--edge) 55%,transparent)}[data-retry-queue] [data-queue-status]{display:block;margin-top:6px;font-size:12px}[data-studio-footer] .row{display:block}[data-studio-footer] button{width:100%;border-color:var(--accent);font-weight:650}[data-action-help]{display:block;font-size:12px;text-align:center;margin-top:6px}[data-notice-row]{border-top:1px solid var(--edge);margin-top:10px}[data-notice]{font-size:12px}[data-rewrite-changed]{padding:10px;border:1px solid var(--accent);border-radius:8px;margin:8px 0;background:color-mix(in srgb,var(--accent) 8%,transparent)}[data-rewrite-changed] p{margin:0 0 8px}[data-previous-scene]{padding-left:20px;overflow-wrap:anywhere}[data-reply-settings] details{margin-left:4px}[data-secondary-actions]{margin-bottom:8px}[data-secondary-actions] button{font-size:13px}[data-subject-name]{width:100%}
section[data-state="planning"],section[data-state="empty"],section[data-state="zero-budget"],section[data-state="idle"]{bottom:auto;max-height:calc(100% - 92px)}
.studio-tab-bar{display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px;margin-bottom:12px;border-bottom:1px solid var(--edge);scrollbar-width:none}.studio-tab-bar::-webkit-scrollbar{display:none}
.studio-tab-btn{background:var(--vn-shell-field,rgba(255,255,255,.05));border:1px solid var(--edge);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;color:var(--vn-shell-muted,#aaa);cursor:pointer;white-space:nowrap;flex:none;min-height:34px;transition:all .15s ease}.studio-tab-btn:hover{background:rgba(255,255,255,.08);color:var(--vn-shell-text,#eee)}.studio-tab-btn[aria-selected="true"]{background:color-mix(in srgb,var(--accent) 22%,var(--vn-shell-button,#252632));border-color:var(--accent);color:var(--accent);font-weight:700}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) .studio-tab-btn{background:#eef3e5;color:#4b6b5d;border-color:rgba(35,65,50,.18)}:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) .studio-tab-btn[aria-selected="true"]{background:#dcebad;color:#172721;border-color:#234b39}
.studio-tab-panel{display:flex;flex-direction:column;gap:10px}.studio-tab-panel[hidden]{display:none!important}
@container(max-width:600px){section{width:auto}[data-context]{gap:10px}[data-studio-body]{padding:12px}[data-thumbnail]{width:56px;height:72px}}
`;

export class ImageStudio {
  private readonly comparison=new VersionComparison();
  private lastOpenCursor:number|null=null;
  private workspaceScroll=0;
  private browseLibrary:(()=>void)|undefined;
  private readonly brief=new PreparedBriefView(destination=>this.navigateBrief(destination));
  private readonly host: HTMLElement;
  private readonly root: ShadowRoot;
  private preferences:PresentationRulesPanel;
  private turn: TurnView | null = null;
  private previewLoad:AbortController|null=null;
  private previewKey='';
  private selectedJob = "";
  private operationSignature='';
  private planningChat = '';
  private maxImagesPerTurn: number | undefined;
  private previousWording = new Map<string, Draft & {requestId:string;sceneEvidence:SceneEvidence[]}>();
  private selectedRequest = "";
  private drafts = new Map<string, Draft>();
  private editHistories=new Map<string,PromptHistory>();
  private lintTimer:ReturnType<typeof setTimeout>|null=null;
  private composing=false;
  private submitted = new Set<string>();
  private preparing = new Set<string>();
  private preparationStarts=new Map<string,{requestId:string|undefined;status:string|undefined;failureId:string|undefined}>();
  private review = true;
  private templates: ImageTemplate[] = [];
  private templateRequest = "";
  private defaultTemplate = "portrait";
  private rebuilding = new Set<string>();
  private rerolling = new Set<string>();
  private cursor = 0;
  private readonly activity=new ImageActivityPanel(record=>{if(!this.turn)return;this.send({type:'vn_image_review',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,requestId:record.requestId,action:'generate'});});
  private recoveryJob = "";
  private replanning = false;
  private recovering: "stop"|"retry"|null=null;
  private dismissedNotices = new Set<string>();
  private renderHeavyTimeout: any = null;

  constructor(mount: HTMLElement, private readonly send: (request: FrontendRequest) => void, private readonly saveReview: (enabled: boolean) => void,private readonly onVisibility?:(open:boolean)=>void,private readonly onOperations?:(operations:LocalPictureOperations|null)=>void) {
    this.host = document.createElement("div");
    this.host.dataset.imageStudio = "";
    this.host.hidden = true;
    this.root = this.host.attachShadow({ mode: "open" });
    this.root.innerHTML = `<style>${CSS}</style><button type="button" data-launch aria-expanded="false">Image prompts</button><section hidden aria-label="Image prompts"><div class="row" data-studio-header><div><h2>Image prompts</h2><small data-build>${LUMIGLYPHICS_VERSION}</small></div><button type="button" data-close aria-label="Close image prompts" title="Close image prompts">×</button></div><div data-studio-body><label class="toggle"><input type="checkbox" data-review checked>Review before generating</label><small data-review-help>Applies to the next image batch. Held pictures stay held. You can keep reading.</small><details data-card-role><summary>Card role for this chat</summary><label>Card role<select data-role aria-label="Card role"><option value="auto">Auto</option><option value="character">Character</option><option value="scenario">Scenario / world / narrator</option></select></label><button type="button" data-save-role>Save card role</button><small data-role-help>Applies to future replies. Existing pictures and held prompts stay unchanged. Auto uses available visual evidence.</small></details><details data-turn-recovery><summary>Reply recovery</summary><small>Retry unfinished pictures prepares only unfinished slots again and stops their current work. Completed pictures stay. New previews always need approval. Replan asks the story-reader model to reconsider the whole reply and may use text tokens.</small><button type="button" data-retry-unfinished>Prepare unfinished previews</button><button type="button" data-replan>Replan this reply</button></details><label>Picture<select data-picture aria-label="Picture"></select></label><label data-history hidden>Recorded request<select data-request aria-label="Recorded request"></select></label><div data-batch-recovery hidden><p data-batch-status role="status"></p><button type="button" data-stop-images>Stop pending pictures</button><small>Stops this reply’s waiting image work. Requests already sent may still finish at the provider. Completed pictures stay.</small></div><p data-scene></p><p data-meta></p><p data-model-help role="status" hidden></p><label>Picture template<select data-template aria-label="Picture template"></select></label><button type="button" data-use-template>Use template</button><div data-template-confirm hidden><p>Replacing rebuilds this prompt and parameters from the selected template. Your current edits will be replaced.</p><div class="row"><button type="button" data-keep>Keep edits</button><button type="button" data-replace>Replace with template</button></div></div><details data-recovery hidden><summary>Correct this picture’s subject</summary><small>Prepare a new preview for this picture only. No image is generated until you approve it.</small><label>Picture subject<select data-subject-mode aria-label="Picture subject"><option value="character">Character</option><option value="environment">Environment / no people</option></select></label><div data-person-fields><label>Character name<input data-subject-name aria-label="Character name" list="vn-subject-candidates" maxlength="160"></label><datalist id="vn-subject-candidates" data-candidates></datalist><label>Appearance<textarea data-subject-appearance aria-label="Appearance" maxlength="2000" placeholder="Concrete visual details, separated by commas: hair, eyes, skin, clothes, species…"></textarea></label><small>Use known appearance by leaving this blank, or supply details for this picture.</small><label class="toggle"><input type="checkbox" data-save-appearance>Save appearance for this character in this chat</label></div><small data-environment-help hidden>Choose a no-people template above. Character appearance and references are omitted.</small><button type="button" data-correct>Prepare corrected preview</button></details><details data-diagnostics><summary>Picture diagnostics</summary><p data-diagnostic></p><button type="button" data-copy-diagnostic>Copy diagnostics</button><small>Copies subject and template names and status only. No appearance descriptions, chat text, prompts or provider error payloads are included.</small></details><details><summary>Prompt sources</summary><p data-provenance></p></details><p data-edit-help role="status"></p><label>Positive prompt <small data-positive-count></small><textarea data-positive maxlength="65000" aria-label="Positive prompt" spellcheck="false" inputmode="text"></textarea></label><label>Negative prompt <small data-negative-count></small><textarea data-negative maxlength="65000" aria-label="Negative prompt" spellcheck="false" inputmode="text"></textarea></label><small data-prompt-profile></small><small data-combined-count role="status"></small><small>Regenerate prompt uses your story-reader model to prepare fresh wording. It uses text tokens; an image is generated only after approval.</small><small>Negative prompts and individual settings are model dependent.</small><details><summary>Parameters and references</summary><p data-reference></p><label>Parameters (JSON)<textarea data-parameters aria-label="Parameters (JSON)" spellcheck="false" inputmode="text"></textarea></label><small>Advanced overrides for this picture only. Reference bytes and host-managed fields are omitted. Your provider may ignore unsupported parameters.</small></details><small>Shows the extension request prepared for Lumiverse; the host converts it for the provider.</small></div><footer data-studio-footer><div class="row"><button type="button" data-generate>Generate this</button><button type="button" data-skip>Skip</button><button type="button" data-reset>Reset edits</button><button type="button" data-retry-image>Retry this picture</button><button type="button" data-prepare>Edit and regenerate</button><button type="button" data-regenerate-prompt>Regenerate prompt</button><button type="button" data-copy>Copy prompt</button></div><div data-notice-row hidden><p data-notice role="status"></p><button type="button" data-dismiss-notice aria-label="Dismiss image prompt notice" title="Dismiss image prompt notice">&#215;</button></div></footer></section>`;
    this.layoutInspector();
    this.el('[data-context]').after(this.activity.element);
    const scope=document.createElement('small');scope.dataset.correctionScope='';scope.setAttribute('role','status');
    this.el('[data-save-appearance]').closest('label')!.after(scope);
    this.el<HTMLInputElement>('[data-save-appearance]').onchange=()=>this.updateCorrectionScope();
    const quick=document.createElement('button');quick.type='button';quick.dataset.queueRetry='';quick.textContent='Retry picture';
    const batchApprove=document.createElement('button');batchApprove.type='button';batchApprove.dataset.batchApprove='';batchApprove.textContent='Approve all held';batchApprove.hidden=true;
    this.el('[data-secondary-actions]').append(quick,batchApprove);
    quick.onclick=()=>{if(!quick.disabled)this.queuePictures([this.selectedJob]);};
    batchApprove.onclick=()=>this.decideAll('generate');
    this.el<HTMLSelectElement>('[data-artwork-connection]').onchange=()=>{
      const connId=this.el<HTMLSelectElement>('[data-artwork-connection]').value;
      const conn=this.imageConnections.find(c=>c.id===connId);
      if(conn)this.el<HTMLInputElement>('[data-artwork-model]').placeholder=conn.model||'Connection default';
      this.updateCostEstimate();
    };
    this.el<HTMLInputElement>('[data-artwork-model]').oninput=()=>this.updateCostEstimate();
    const queue=document.createElement('div');queue.dataset.retryQueue='';queue.innerHTML='<div class="row"><button type="button" data-queue-unfinished>Retry unfinished</button><button type="button" data-clear-retries>Clear queued retries</button></div><small data-queue-status role="status" aria-live="polite"></small>';
    this.el('[data-state-detail]').after(queue);
    this.el<HTMLButtonElement>('[data-queue-unfinished]').onclick=()=>this.queuePictures((this.turn?.assets??[]).filter(a=>a.source!=='cache'&&!['generated','browser_ready'].includes(a.status)).map(a=>a.jobId).filter(id=>!this.retryQueueJobs.has(id)&&id!==this.retryActive));
    this.el<HTMLButtonElement>('[data-clear-retries]').onclick=()=>{if(this.turn)this.send({type:'vn_queue_image_retries',version:1,...this.recoveryScope(),revision:this.turn.revision,action:'clear'});};
    for(const [selector,key] of [['[data-output-size]','size'],['[data-output-ratio]','aspectRatio']] as const)this.el<HTMLSelectElement>(selector).onchange=()=>{
      try{
        const parameters=JSON.parse(this.el<HTMLTextAreaElement>('[data-parameters]').value);
        if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw new Error('Parameters must be a JSON object.');
        parameters[key]=this.el<HTMLSelectElement>(selector).value;
        this.el<HTMLTextAreaElement>('[data-parameters]').value=JSON.stringify(parameters,null,2);
        this.el<HTMLTextAreaElement>('[data-parameters]').dispatchEvent(new Event('input',{bubbles:true}));
      }catch(error){this.showError(error instanceof Error?error.message:String(error));}
    };
    const preferences=document.createElement('details');preferences.innerHTML='<summary>Remember a template preference</summary><button type="button" data-remember>Use selected template in a preference</button><div data-preferences></div>';
    this.el('[data-template-confirm]').after(preferences);
    this.preferences=new PresentationRulesPanel(()=>this.turn?.chatId??'',request=>this.send(request));
    preferences.querySelector('[data-preferences]')!.append(this.preferences.host);
    preferences.addEventListener('toggle',()=>{if(preferences.open)this.preferences.ensureLoaded();});
    preferences.querySelector<HTMLButtonElement>('[data-remember]')!.onclick=()=>{const target=this.el<HTMLSelectElement>('[data-template]').value;const source=this.record()?.imagePromptMetadata?.template.id;this.preferences.propose(target,source&&source!==target?'template':'dialogue',source);};

    this.el<HTMLButtonElement>('[data-restore-wording]').onclick=()=>{
      const record=this.record(), previous=this.previousWording.get(this.selectedJob);
      if(!record||!previous)return;
      this.drafts.set(this.draftKey(record),{prompt:previous.prompt,negative:previous.negative,parameters:this.el<HTMLTextAreaElement>('[data-parameters]').value});
      this.previousWording.delete(this.selectedJob);this.render();
    };
    mount.append(this.host);
    this.el<HTMLButtonElement>("[data-launch]").onclick = () => {
      if(this.el<HTMLElement>('section').hidden)this.open();else this.setOpen(false);
    };
    this.el<HTMLButtonElement>('[data-dismiss-notice]').onclick=()=>{
      const text=this.el<HTMLElement>('[data-notice]').textContent??'';
      if(this.dismissedNotices.size>=32)this.dismissedNotices.clear();
      this.dismissedNotices.add(this.noticeKey(text));this.setNotice('');this.el<HTMLButtonElement>('[data-close]').focus();
    };
    this.el<HTMLButtonElement>("[data-close]").onclick = () => { this.setOpen(false);this.el<HTMLButtonElement>("[data-launch]").focus(); };
    this.el<HTMLInputElement>("[data-review]").onchange = () => { this.saveReview(this.el<HTMLInputElement>("[data-review]").checked); };
    this.el<HTMLSelectElement>("[data-picture]").onchange = () => { this.selectedJob = this.el<HTMLSelectElement>("[data-picture]").value; this.selectedRequest = ""; this.render(); };
    this.el<HTMLSelectElement>("[data-template]").onchange = () => this.render();
    this.el<HTMLSelectElement>("[data-request]").onchange = () => { this.selectedRequest = this.el<HTMLSelectElement>("[data-request]").value; this.render(); };
    for (const selector of ["[data-positive]", "[data-negative]", "[data-parameters]"]) this.el<HTMLTextAreaElement>(selector).oninput = () => {
      const record = this.record();
      if (record) this.drafts.set(this.draftKey(record), { prompt: this.el<HTMLTextAreaElement>("[data-positive]").value, negative: this.el<HTMLTextAreaElement>("[data-negative]").value, parameters: this.el<HTMLTextAreaElement>("[data-parameters]").value });
      this.historyFor()?.edit(this.editSnapshot(),selector,Date.now());
      this.updateHistoryButtons();this.scheduleLint();
      this.updateCounts();
    };
    this.el<HTMLButtonElement>("[data-use-template]").onclick = () => {
      const record = this.record(); if (!record || record.state !== "review" || this.rebuilding.has(record.requestId) || this.submitted.has(record.requestId) || this.rebuilding.has(record.requestId)) return;
      if (this.drafts.has(this.draftKey(record))) this.el<HTMLElement>("[data-template-confirm]").hidden = false;
      else this.rebuildTemplate();
    };
    this.el<HTMLButtonElement>("[data-keep]").onclick = () => { this.el<HTMLElement>("[data-template-confirm]").hidden = true; this.el<HTMLSelectElement>("[data-template]").value = this.record()?.imagePromptMetadata?.template.id ?? this.defaultTemplate; };
    this.el<HTMLButtonElement>("[data-replace]").onclick = () => this.rebuildTemplate();

    this.el<HTMLButtonElement>('[data-reframe]').onclick = () => {
      const record = this.record();
      if (!record || record.state !== 'review' || this.rebuilding.has(record.requestId) || !this.turn) return;
      this.rebuilding.add(record.requestId);
      this.render();
      const templateId = record.imagePromptMetadata?.template.id ?? this.el<HTMLSelectElement>('[data-template]').value ?? this.defaultTemplate;
      this.send({
        type: 'vn_reprepare_image_template',
        chatId: this.turn.chatId,
        messageId: this.turn.messageId,
        sourceFingerprint: this.turn.sourceFingerprint,
        requestId: record.requestId,
        templateId,
        reframe: true
      });
    };

    this.el<HTMLButtonElement>('[data-fit-model]').onclick = () => {
      const record = this.record();
      if (!record || record.state !== 'review' || this.rebuilding.has(record.requestId) || !this.turn) return;
      this.rebuilding.add(record.requestId);
      this.render();
      const templateId = record.imagePromptMetadata?.template.id ?? this.el<HTMLSelectElement>('[data-template]').value ?? this.defaultTemplate;
      this.send({
        type: 'vn_reprepare_image_template',
        chatId: this.turn.chatId,
        messageId: this.turn.messageId,
        sourceFingerprint: this.turn.sourceFingerprint,
        requestId: record.requestId,
        templateId,
        fitToModel: true
      });
    };

    this.el<HTMLButtonElement>('[data-change-style-btn]').onclick = () => {
      const record = this.record();
      if (!record || record.state !== 'review' || this.rebuilding.has(record.requestId) || !this.turn) return;
      const styleId = this.el<HTMLSelectElement>('[data-style-select]').value;
      this.rebuilding.add(record.requestId);
      this.render();
      const templateId = record.imagePromptMetadata?.template.id ?? this.el<HTMLSelectElement>('[data-template]').value ?? this.defaultTemplate;
      this.send({
        type: 'vn_reprepare_image_template',
        chatId: this.turn.chatId,
        messageId: this.turn.messageId,
        sourceFingerprint: this.turn.sourceFingerprint,
        requestId: record.requestId,
        templateId,
        styleId
      });
    };

    this.el<HTMLButtonElement>('[data-regenerate-model-single]').onclick = () => {
      const record = this.record();
      if (!record || record.state !== 'review' || this.rebuilding.has(record.requestId) || !this.turn) return;
      const model = this.el<HTMLInputElement>('[data-artwork-model]').value.trim();
      const connectionId = this.el<HTMLSelectElement>('[data-artwork-connection]')?.value || undefined;
      const templateId = record.imagePromptMetadata?.template.id ?? this.el<HTMLSelectElement>('[data-template]').value ?? this.defaultTemplate;
      this.rebuilding.add(record.requestId);
      this.render();
      this.send({
        type: 'vn_reprepare_image_template',
        chatId: this.turn.chatId,
        messageId: this.turn.messageId,
        sourceFingerprint: this.turn.sourceFingerprint,
        requestId: record.requestId,
        templateId,
        model: model || undefined,
        connectionId
      });
    };

    this.el<HTMLButtonElement>('[data-regenerate-model-all]').onclick = () => {
      if (!this.turn) return;
      const model = this.el<HTMLInputElement>('[data-artwork-model]').value.trim();
      const connectionId = this.el<HTMLSelectElement>('[data-artwork-connection]')?.value || undefined;
      const reviewable = (this.turn.imageRequests ?? []).filter(r => r.state === 'review');
      if (reviewable.length === 0) return;
      for (const r of reviewable) {
        this.rebuilding.add(r.requestId);
        this.send({
          type: 'vn_reprepare_image_template',
          chatId: this.turn.chatId,
          messageId: this.turn.messageId,
          sourceFingerprint: this.turn.sourceFingerprint,
          requestId: r.requestId,
          templateId: r.imagePromptMetadata?.template.id ?? this.defaultTemplate,
          model: model || undefined,
          connectionId
        });
      }
      this.render();
    };

    this.el<HTMLInputElement>('[data-auto-director]').onchange = () => {
      const auto = this.el<HTMLInputElement>('[data-auto-director]').checked;
      for (const sel of ['[data-camera-shot-size]','[data-camera-angle]','[data-camera-lens]','[data-camera-composition]','[data-camera-depth]','[data-camera-safe-area]']) {
        this.el<HTMLSelectElement>(sel).disabled = auto;
      }
    };

    this.el<HTMLButtonElement>('[data-apply-camera]').onclick = () => {
      const record = this.record();
      if (!record || record.state !== 'review' || this.rebuilding.has(record.requestId) || !this.turn) return;
      const auto = this.el<HTMLInputElement>('[data-auto-director]').checked;
      const templateId = record.imagePromptMetadata?.template.id ?? this.el<HTMLSelectElement>('[data-template]').value ?? this.defaultTemplate;
      this.rebuilding.add(record.requestId);
      this.render();
      if (auto) {
        this.send({
          type: 'vn_reprepare_image_template',
          chatId: this.turn.chatId,
          messageId: this.turn.messageId,
          sourceFingerprint: this.turn.sourceFingerprint,
          requestId: record.requestId,
          templateId
        });
      } else {
        this.send({
          type: 'vn_reprepare_image_template',
          chatId: this.turn.chatId,
          messageId: this.turn.messageId,
          sourceFingerprint: this.turn.sourceFingerprint,
          requestId: record.requestId,
          templateId,
          manualCamera: {
            shotSize: this.el<HTMLSelectElement>('[data-camera-shot-size]').value || undefined,
            angle: this.el<HTMLSelectElement>('[data-camera-angle]').value || undefined,
            lensFeel: this.el<HTMLSelectElement>('[data-camera-lens]').value || undefined,
            composition: this.el<HTMLSelectElement>('[data-camera-composition]').value || undefined,
            depth: this.el<HTMLSelectElement>('[data-camera-depth]').value || undefined,
            dialogueSafeArea: (this.el<HTMLSelectElement>('[data-camera-safe-area]').value || 'auto') as any
          }
        });
      }
    };
    // Events retarget to this shadow host outside the studio; keep native
    // input focus/defaults while preventing reader advance and hotkeys.
    for(const type of ['click','keydown','wheel','pointerdown','pointerup','touchstart','touchend']) this.root.addEventListener(type,event=>event.stopPropagation());
    // Focus synchronously inside the user's tap without cancelling native caret placement.
    this.root.addEventListener('click', event => {
      const target = event.target;
      if ((target as any)?.tagName?.toUpperCase?.() === 'TEXTAREA' && !(target as any).readOnly && !(target as any).disabled) (target as any).focus({ preventScroll: true });
    });
    this.root.addEventListener("keydown", event => {
      const keyEvent = event as KeyboardEvent;
      if (keyEvent.key === "Escape") { this.el<HTMLButtonElement>("[data-close]").click(); return; }
      if (keyEvent.key === "Enter" && (keyEvent.ctrlKey || keyEvent.metaKey)) {
        const generate = this.el<HTMLButtonElement>("[data-generate]");
        if (!generate.hidden && !generate.disabled) { keyEvent.preventDefault(); generate.click(); }
      }
      // The mobile review surface is modal; keep keyboard focus inside it.
      if (keyEvent.key === "Tab" && this.mobileLayout() && !this.el<HTMLElement>("section").hidden) {
        trapFocusWithin(this.el("section"), keyEvent, (this.root.activeElement ?? document.activeElement) as Element | null);
      }
    });
    this.el<HTMLButtonElement>("[data-generate]").onclick = () => this.decide("generate");
    this.el<HTMLButtonElement>("[data-skip]").onclick = () => this.decide("skip");
    this.el<HTMLButtonElement>("[data-reset]").onclick = () => { const record = this.record(); if (record) this.drafts.delete(this.draftKey(record)); this.render(); };
    this.el<HTMLButtonElement>('[data-regenerate-prompt]').onclick=()=>this.regeneratePrompt();
    this.el<HTMLButtonElement>('[data-retry-image]').onclick=()=>{
      if(!this.turn||this.el<HTMLButtonElement>('[data-retry-image]').disabled)return;
      const record=this.record();
      if(record&&this.drafts.has(this.draftKey(record)))this.el<HTMLButtonElement>('[data-prepare]').click();
      else this.prepareSavedScene();
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
        if(draft) {assertPromptLengths(draft.prompt,draft.negative,record?.promptProfile);if(!parameters || typeof parameters!=='object' || Array.isArray(parameters)) throw new Error('Parameters must be a JSON object.');}
        const request:FrontendRequest={ type:'vn_prepare_image',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,jobId:this.selectedJob,
          ...(this.el<HTMLSelectElement>('[data-template]').value ? {templateId:this.el<HTMLSelectElement>('[data-template]').value} : {}),
          ...(draft ? {edits:{prompt:draft.prompt,negativePrompt:draft.negative,parameters}} : {})};
        this.beginPreparation(this.selectedJob);this.render();this.send(request);
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
      this.beginPreparation(this.selectedJob);this.render();
    };
    for(const selector of ['[data-positive]','[data-negative]','[data-parameters]']){
      const input=this.el<HTMLTextAreaElement>(selector);
      input.addEventListener('compositionstart',()=>{this.composing=true;this.historyFor()?.beginComposition();});
      input.addEventListener('compositionend',()=>{this.historyFor()?.edit(this.editSnapshot(),selector,Date.now());this.historyFor()?.endComposition();this.composing=false;this.updateHistoryButtons();this.scheduleLint();});
    }
    this.el<HTMLButtonElement>('[data-prompt-undo]').onclick=()=>this.movePromptHistory(false);
    this.el<HTMLButtonElement>('[data-prompt-redo]').onclick=()=>this.movePromptHistory(true);
    this.root.addEventListener('keydown',rawEvent=>{const event=rawEvent as KeyboardEvent;if(event.isComposing||this.composing||!(event.ctrlKey||event.metaKey))return;const key=event.key.toLowerCase();if(key==='z'||key==='y'){if(!(event.target instanceof HTMLTextAreaElement)||!event.target.matches('[data-positive],[data-negative],[data-parameters]'))return;event.preventDefault();this.movePromptHistory(key==='y'||event.shiftKey);}});
    this.el<HTMLButtonElement>("[data-copy]").onclick = () => { void this.copy(); };
    this.render();
  }
  private el<T extends HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  private retryQueueJobs=new Set<string>();
  private retryActive:string|null=null;
  setRetryQueue(queue:ImageRetryQueueView):void {
    if(!this.turn||queue.chatId!==this.turn.chatId||queue.messageId!==this.turn.messageId||queue.sourceFingerprint!==this.turn.sourceFingerprint||queue.swipeId!==this.turn.swipeId||queue.revision!==this.turn.revision)return;
    this.retryQueueJobs=new Set(queue.jobIds);this.retryActive=queue.activeJobId;this.render();
  }
  private queuePictures(ids:string[]):void {
    if(!this.turn||!ids.length)return;
    for(const id of ids)this.retryQueueJobs.add(id);
    const request:FrontendRequest={type:"vn_queue_image_retries",version:1,...this.recoveryScope(),revision:this.turn.revision,action:"enqueue",jobIds:ids};
    this.render();try{this.send(request);}catch(error){this.retryQueueJobs.clear();this.showError(error instanceof Error?error.message:String(error));}
  }
  private beginPreparation(jobId:string):void{
    const asset=this.turn?.assets.find(asset=>asset.jobId===jobId);
    const latest=this.turn?.imageRequests?.filter(record=>record.jobId===jobId).at(-1);
    this.preparationStarts.set(jobId,{requestId:latest?.requestId,status:asset?.status,failureId:asset?.failureId});
    this.preparing.add(jobId);
  }
  private prepareSavedScene():void {
    if(!this.turn||this.preparing.has(this.selectedJob))return;
    const jobId=this.selectedJob;this.beginPreparation(jobId);this.render();
    this.send({type:'vn_prepare_image',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,jobId});
  }
  private layoutInspector():void {
    const body=this.el<HTMLElement>('[data-studio-body]');
    const context=document.createElement('div');context.dataset.context='';
    context.innerHTML='<div data-thumbnail><img data-preview hidden alt="Selected picture"><span data-placeholder aria-hidden="true">◇</span></div><div data-context-text><strong data-status role="status"></strong><small data-paragraph></small></div>';
    context.querySelector('[data-context-text]')!.append(this.el('[data-scene]'));
    const versionsContainer = document.createElement('div');
    versionsContainer.dataset.previousVersionsContainer = '';
    versionsContainer.hidden = true;
    versionsContainer.style.cssText = 'margin:8px 0;padding:10px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--edge);display:flex;flex-direction:column;gap:8px;';
    versionsContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <strong style="font-size:12px;color:var(--accent)" title="The latest 50 versions per picture are retained.">Previous Versions</strong>
        <small data-versions-count style="opacity:0.75;font-size:10px"></small>
      </div>
      <div data-versions-strip style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin"></div>
    `;
    versionsContainer.append(this.comparison.element);
    const detail=document.createElement('p');detail.dataset.stateDetail='';
    const navigation=document.createElement('div');navigation.dataset.pictureNavigation='';
    navigation.innerHTML='<div data-picture-strip role="group" aria-label="Pictures in this reply"></div>';
    navigation.append(this.el('[data-picture]').closest('label')!);
    const editor=document.createElement('div');editor.dataset.promptEditor='';
    for(const selector of ['[data-edit-help]','[data-positive]','[data-negative]','[data-prompt-profile]','[data-combined-count]']){
      if(selector==='[data-combined-count]'){const budgetMeter=document.createElement('div');budgetMeter.dataset.budgetMeter='';budgetMeter.setAttribute('aria-hidden','true');budgetMeter.innerHTML='<div data-budget-fill></div>';editor.append(budgetMeter);}
      const element=this.el(selector);editor.append(element.tagName?.toUpperCase()==='TEXTAREA'?element.closest('label')!:element);
    }
    const enrichSection = document.createElement('div');
    enrichSection.dataset.enrichSection = '';
    enrichSection.style.cssText = 'margin:12px 0 8px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--edge);display:flex;flex-direction:column;gap:8px;';
    enrichSection.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <strong style="font-size:12px;color:var(--accent);display:inline-flex;align-items:center;gap:5px">✨ Guided Prompt Enricher</strong>
        <small style="opacity:0.75;font-size:10px">Cinematic detail &amp; lighting</small>
      </div>
      <div style="display:flex;gap:6px">
        <input type="text" data-enrich-guidance placeholder="Optional direction (e.g. 'longer hair, golden hour rim lighting, bokeh')..." maxlength="400" style="flex:1;min-height:38px;padding:6px 10px;border-radius:8px;border:1px solid var(--edge);background:var(--vn-shell-field,#101119);color:inherit;font-size:12px" />
        <button type="button" data-enrich-submit style="flex:none;min-height:38px;padding:6px 14px;border-radius:8px;background:color-mix(in srgb,var(--accent) 22%,var(--vn-shell-button,#252632));border:1px solid var(--accent);color:#fff;font-weight:650;font-size:12px;cursor:pointer;white-space:nowrap">✨ Enrich</button>
      </div>
    `;
    enrichSection.querySelector<HTMLButtonElement>('[data-enrich-submit]')!.onclick = () => {
      const guidance = enrichSection.querySelector<HTMLInputElement>('[data-enrich-guidance]')?.value.trim();
      this.enrichPrompt(guidance);
    };
    editor.append(enrichSection);
    const validation=document.createElement('small');validation.dataset.validation='';validation.role='alert';validation.hidden=true;editor.append(validation);
    const changed=document.createElement('div');changed.dataset.rewriteChanged='';changed.hidden=true;
    changed.innerHTML='<p>Rewrite ready. Review the wording before generating.</p><p data-revision-count></p><small data-revision-fields></small><p data-revision-scene hidden></p><details><summary>Compare previous wording</summary><p>The draft captured when you requested this rewrite. Your current wording is in the editors above. Counts do not verify that every detail was preserved.</p><ul data-previous-scene hidden></ul><label>Previous positive prompt<textarea readonly data-previous-positive></textarea></label><label>Previous negative prompt<textarea readonly data-previous-negative></textarea></label></details><button type="button" data-restore-wording>Restore previous wording</button>';editor.append(changed);
    const actions=document.createElement('details');actions.dataset.promptActions='';actions.innerHTML='<summary>Customize</summary><div class="row" data-secondary-actions></div><small>Rewrite and enrich wording use your story-reader model and text tokens. Retry picture starts an image request immediately using the saved scene. Reframe changes camera composition while preserving scene facts. Fit to model trims lower-priority adjectives to fit tight model limits.</small>';
    for(const selector of ['[data-regenerate-prompt]','[data-reset]','[data-copy]','[data-skip]'])actions.querySelector('[data-secondary-actions]')!.append(this.el(selector));
    const reframe=document.createElement('button');reframe.type='button';reframe.dataset.reframe='';reframe.textContent='Reframe shot';
    const fitModel=document.createElement('button');fitModel.type='button';fitModel.dataset.fitModel='';fitModel.textContent='Fit to model';
    actions.querySelector('[data-secondary-actions]')!.append(reframe,fitModel);editor.append(actions);
    const tools=document.createElement('div');tools.dataset.pictureTools='';
    const template=document.createElement('details');template.dataset.templateTools='';template.innerHTML='<summary>Template and framing</summary>';
    for(const selector of ['[data-template]','[data-use-template]','[data-template-confirm]']){const element=this.el(selector);template.append(element.tagName?.toUpperCase()==='SELECT'?element.closest('label')!:element);}tools.append(template);

    const styleTools=document.createElement('details');styleTools.dataset.styleTools='';
    styleTools.innerHTML=`<summary>Change Style</summary>
      <div style="margin:8px 0">
        <label>Semantic Style<select data-style-select aria-label="Select visual style"></select></label>
        <button type="button" data-change-style-btn style="margin-top:6px">Apply style</button>
        <small style="display:block;margin-top:6px">Preserves scene facts, character identities and camera framing, recompiling with the target style's StyleDNA.</small>
      </div>`;
    tools.append(styleTools);

    const cameraTools=document.createElement('details');cameraTools.dataset.cameraTools='';
    cameraTools.innerHTML=`<summary>Camera &amp; Director overrides</summary>
      <div style="margin:8px 0">
        <label class="toggle"><input type="checkbox" data-auto-director checked>Auto Director (smart shot choices)</label>
        <div data-manual-camera-controls style="margin-top:8px">
          <label>Shot size<select data-camera-shot-size disabled>
            <option value="">Auto</option>
            <option value="extreme-close-up">Extreme close-up</option>
            <option value="close-up">Close-up</option>
            <option value="medium-close-up">Medium close-up</option>
            <option value="medium">Medium</option>
            <option value="medium-wide">Medium-wide</option>
            <option value="full-body">Full-body</option>
            <option value="wide">Wide</option>
            <option value="establishing">Establishing</option>
            <option value="macro">Macro</option>
          </select></label>
          <label>Angle<select data-camera-angle disabled>
            <option value="">Auto</option>
            <option value="eye-level">Eye-level</option>
            <option value="low-angle">Low-angle</option>
            <option value="high-angle">High-angle</option>
            <option value="overhead">Overhead</option>
            <option value="ground-level">Ground-level</option>
            <option value="three-quarter">Three-quarter</option>
            <option value="profile">Profile</option>
            <option value="over-the-shoulder">Over-the-shoulder</option>
          </select></label>
          <label>Lens feel<select data-camera-lens disabled>
            <option value="">Auto</option>
            <option value="ultrawide">Ultrawide</option>
            <option value="wide">Wide</option>
            <option value="normal">Normal (50mm)</option>
            <option value="portrait">Portrait (85mm)</option>
            <option value="telephoto">Telephoto</option>
            <option value="macro">Macro</option>
          </select></label>
          <label>Composition<select data-camera-composition disabled>
            <option value="">Auto</option>
            <option value="centered">Centered</option>
            <option value="rule-of-thirds">Rule of thirds</option>
            <option value="symmetrical">Symmetrical</option>
            <option value="layered-depth">Layered depth</option>
            <option value="leading-lines">Leading lines</option>
            <option value="negative-space">Negative space</option>
            <option value="lateral-ensemble">Lateral ensemble</option>
          </select></label>
          <label>Depth of field<select data-camera-depth disabled>
            <option value="">Auto</option>
            <option value="deep">Deep focus</option>
            <option value="moderate">Moderate</option>
            <option value="shallow">Shallow / bokeh</option>
            <option value="selective">Selective</option>
          </select></label>
          <label>Dialogue safe area<select data-camera-safe-area disabled>
            <option value="auto">Auto</option>
            <option value="always">Always reserve bottom</option>
            <option value="off">Off (full bleed)</option>
          </select></label>
          <button type="button" data-apply-camera style="margin-top:6px">Apply camera</button>
        </div>
      </div>`;
    tools.append(cameraTools);

    const modelTools = document.createElement('details'); modelTools.dataset.modelTools = '';
    modelTools.open = true;
    modelTools.innerHTML = `<summary>Image Model &amp; Regeneration</summary>
      <div style="margin:8px 0">
        <label>Active connection
          <select data-artwork-connection aria-label="Select image connection" style="width:100%;box-sizing:border-box;margin-top:4px"></select>
        </label>
        <label style="margin-top:10px">Model override
          <input type="text" data-artwork-model list="vn-artwork-model-suggestions" placeholder="Connection default (or model ID)" style="width:100%;box-sizing:border-box;margin-top:4px" />
          <datalist id="vn-artwork-model-suggestions">
            <option value="recraft-v4.1-flash">Recraft v4.1 Flash (10k chars)</option>
            <option value="recraft-20b">Recraft 20B (10k chars)</option>
            <option value="blackforestlabs/flux-3/klein/text-to-image">FLUX.3 Klein (Square safe)</option>
            <option value="xai/grok-imagine-image/v2.0/text-to-image">Grok Imagine 2.0</option>
            <option value="openai/gpt-image-2.5/flare/text-to-image">GPT Image 2.5</option>
            <option value="qwen-image-3">Qwen Image 3</option>
            <option value="anima/text-to-image">Anima</option>
            <option value="bytedance/seedream-v5.0-pro">Seedream 5.0 Pro</option>
          </datalist>
        </label>
        <small style="display:block;margin-top:4px;opacity:0.8">Recompiles prompt dialect specifically for the chosen model.</small>
        <div data-cost-estimate style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--edge);font-size:12px"></div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button type="button" data-regenerate-model-single style="font-size:12px;padding:6px 12px">Regenerate this picture</button>
          <button type="button" data-regenerate-model-all style="font-size:12px;padding:6px 12px">Regenerate all in scene</button>
        </div>
      </div>`;

    const history=document.createElement('details');history.dataset.requestHistory='';history.innerHTML='<summary>Request history</summary>';history.append(this.el('[data-history]'));
    const settings=document.createElement('details');settings.dataset.replySettings='';settings.innerHTML='<summary>Reply and review settings</summary>';
    const toggle=this.el('[data-review]').closest('label')!,help=this.root.querySelector<HTMLElement>('[data-review-help]')??toggle.nextElementSibling;if(help)settings.append(toggle,help);else settings.append(toggle);
    for(const selector of ['[data-card-role]','[data-turn-recovery]','[data-batch-recovery]'])settings.append(this.el(selector));
    const meta=this.el('[data-meta]'),model=this.el('[data-model-help]'),notice=this.el('[data-notice-row]');
    const output=document.createElement('div');output.dataset.outputControls='';
    output.innerHTML='<p data-output-summary role="status"></p><div data-output-fields><label>Image size<select data-output-size aria-label="Image size"></select></label><label data-output-ratio-field>Aspect ratio<select data-output-ratio aria-label="Image aspect ratio"></select></label><small>Published values for this model. Changes apply to this picture only.</small></div>';
    const outputOptions=document.createElement('details');outputOptions.dataset.outputOptions='';outputOptions.innerHTML='<summary>Image size &amp; framing</summary>';outputOptions.append(output);

    const tabs = document.createElement('nav');
    tabs.dataset.studioTabs = '';
    tabs.className = 'studio-tab-bar';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Artwork studio sections');

    const tabDefs = [
      { id: 'picture', label: 'Picture' },
      { id: 'prompt', label: 'Prompt' },
      { id: 'camera', label: 'Camera' },
      { id: 'style', label: 'Style' },
      { id: 'model', label: 'Model' },
      { id: 'history', label: 'History' }
    ] as const;

    for (const tab of tabDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'studio-tab-btn';
      btn.dataset.tab = tab.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', tab.id === 'picture' ? 'true' : 'false');
      btn.textContent = tab.label;
      btn.onclick = () => this.switchTab(tab.id);
      tabs.append(btn);
    }

    const panelPicture = document.createElement('div');
    panelPicture.className = 'studio-tab-panel';
    panelPicture.dataset.tabPanel = 'picture';
    const explanation=document.createElement('details');explanation.dataset.pictureExplanation='';explanation.innerHTML='<summary>Why this picture?</summary><p data-picture-explanation-text style="white-space:pre-wrap;overflow-wrap:anywhere"></p>';
    panelPicture.append(explanation,context, versionsContainer, detail, this.brief.element, this.el('[data-recovery]').closest('details')!);

    const panelPrompt = document.createElement('div');
    panelPrompt.className = 'studio-tab-panel';
    panelPrompt.dataset.tabPanel = 'prompt';
    panelPrompt.hidden = true;
    const editTools=document.createElement('div');editTools.className='row';editTools.dataset.promptEditTools='';editTools.hidden=true;editTools.innerHTML='<button type="button" data-prompt-undo aria-label="Undo prompt edit">Undo</button><button type="button" data-prompt-redo aria-label="Redo prompt edit">Redo</button>';
    panelPrompt.append(meta, model,editor);


    const panelCamera = document.createElement('div');
    panelCamera.className = 'studio-tab-panel';
    panelCamera.dataset.tabPanel = 'camera';
    panelCamera.hidden = true;
    panelCamera.append(template, cameraTools, outputOptions);

    const panelStyle = document.createElement('div');
    panelStyle.className = 'studio-tab-panel';
    panelStyle.dataset.tabPanel = 'style';
    panelStyle.hidden = true;
    panelStyle.append(styleTools);

    const panelModel = document.createElement('div');
    panelModel.className = 'studio-tab-panel';
    panelModel.dataset.tabPanel = 'model';
    panelModel.hidden = true;
    panelModel.append(modelTools);

    const panelHistory = document.createElement('div');
    panelHistory.className = 'studio-tab-panel';
    panelHistory.dataset.tabPanel = 'history';
    panelHistory.hidden = true;
    panelHistory.append(
      this.el('[data-diagnostics]').closest('details')!,
      this.el('[data-provenance]').closest('details')!,
      this.el('[data-parameters]').closest('details')!,
      history,
      settings
    );

    const overview=document.createElement('p');overview.dataset.pictureOverview='';overview.setAttribute('role','status');overview.setAttribute('aria-atomic','true');overview.style.cssText='font-size:12px;margin:0 0 10px;overflow-wrap:anywhere';
    tools.replaceChildren(tabs,editTools,panelPicture,panelPrompt,panelCamera,panelStyle,panelModel,panelHistory);
    body.replaceChildren(overview,navigation,tools,notice);
    for(const field of ['positive','negative','parameters']){const note=document.createElement('small');note.dataset.promptLint=field;note.setAttribute('role','status');this.el(`[data-${field}]`).after(note);}
    const actionHelp=document.createElement('small');actionHelp.dataset.actionHelp='';this.el('[data-studio-footer]').append(actionHelp);
    const style=document.createElement('style');style.textContent=INSPECTOR_CSS+PREPARED_BRIEF_CSS+DOCKED_STUDIO_CSS;this.root.append(style);
  }
  private diagnosticText(): string {
    const asset = this.turn?.assets.find(entry => entry.jobId === this.selectedJob);
    const d = asset?.diagnostic;
    return d ? [`Status: ${d.status.replaceAll('_', ' ')}`, `Subject: ${d.subject ?? 'None'}`, `Template: ${d.template ?? 'Legacy / unavailable'}`, `SimTracker: ${d.tracker}`, `Story reader: ${d.planner ?? 'Unavailable'}`, d.explanation, ...(asset?.previousImage ? ['The previous picture is displayed while its replacement waits or fails.'] : [])].join('\n') : 'Diagnostics are unavailable for this older picture. Refresh the reader after updating.';
  }
  private updateCorrectionScope():void{
    const save=this.el<HTMLInputElement>('[data-save-appearance]').checked;
    this.el('[data-correction-scope]').textContent=save?'Preparing this preview also saves the appearance for this named character in this chat. Existing held prompts and pictures keep their snapshots.':'This picture only. Preparing the preview does not save a chat-wide appearance override.';
  }
  private navigateBrief(destination:BriefDestination):void{
    const tab = destination === 'prompt' ? 'prompt' : destination === 'output' ? 'camera' : destination === 'template' ? 'camera' : 'picture';
    this.switchTab(tab);
    const selector=destination==='prompt'?'[data-positive]':destination==='subject'?'[data-subject-mode]':destination==='template'?'[data-template]':this.el('[data-output-options]').hidden||this.el('[data-output-fields]').hidden?'[data-parameters]':'[data-output-size]';
    let target=this.el<HTMLElement>(selector);
    if(destination==='output')try{JSON.parse(this.el<HTMLTextAreaElement>('[data-parameters]').value);}catch{target=this.el('[data-parameters]');}
    for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName?.toUpperCase()==='DETAILS')(parent as any).open=true;
    target.scrollIntoView({block:'nearest'});target.focus({preventScroll:true});
  }
  private editSnapshot():PromptEditSnapshot{return {prompt:this.el<HTMLTextAreaElement>('[data-positive]').value,negativePrompt:this.el<HTMLTextAreaElement>('[data-negative]').value,parametersText:this.el<HTMLTextAreaElement>('[data-parameters]').value};}
  private historyFor():PromptHistory|undefined {const r=this.record();if(!r||!this.turn)return;const key=JSON.stringify([this.turn.chatId,this.turn.messageId,this.turn.swipeId,this.turn.sourceFingerprint,this.turn.revision,r.jobId,r.requestId,r.state==='review'?'review':'replacement']);let history=this.editHistories.get(key);if(!history){history=new PromptHistory(this.editSnapshot());this.editHistories.set(key,history);while(this.editHistories.size>8)this.editHistories.delete(this.editHistories.keys().next().value!);}return history;}
  private updateHistoryButtons():void{const h=this.historyFor();this.el<HTMLButtonElement>('[data-prompt-undo]').disabled=!h?.canUndo||this.el<HTMLTextAreaElement>('[data-positive]').disabled;this.el<HTMLButtonElement>('[data-prompt-redo]').disabled=!h?.canRedo||this.el<HTMLTextAreaElement>('[data-positive]').disabled;}
  private movePromptHistory(redo:boolean):void{if(this.composing||this.el<HTMLTextAreaElement>('[data-positive]').disabled)return;const r=this.record(),h=this.historyFor();if(!r||!h)return;const next=redo?h.redo():h.undo();this.el<HTMLTextAreaElement>('[data-positive]').value=next.prompt;this.el<HTMLTextAreaElement>('[data-negative]').value=next.negativePrompt;this.el<HTMLTextAreaElement>('[data-parameters]').value=next.parametersText;this.drafts.set(this.draftKey(r),{prompt:next.prompt,negative:next.negativePrompt,parameters:next.parametersText});this.updateCounts();this.updateHistoryButtons();this.scheduleLint();}
  private scheduleLint():void{if(this.lintTimer)clearTimeout(this.lintTimer);this.lintTimer=setTimeout(()=>{this.lintTimer=null;this.updateInlineLint();},200);}
  private updateInlineLint():void{const record=this.record();for(const field of ['positive','negative','parameters'])this.el(`[data-prompt-lint="${field}"]`).textContent='';if(!record)return;const snapshot=this.editSnapshot();const profile=record.promptProfileV2??{...resolveImagePromptProfileV2(record.provider,record.model),...(record.promptProfile?{hardMaxCharacters:record.promptProfile.maxCharacters}:{})};const result=lintCompiledPrompt({prompt:snapshot.prompt,negativePrompt:snapshot.negativePrompt,profile,brief:record.imagePromptMetadata?.brief,referenceAttachmentKnown:false});for(const field of ['positive','negative'] as const){const messages=[...result.errors,...result.warnings].filter(message=>field==='negative'?message.includes('positive-only'):!message.includes('positive-only'));this.el(`[data-prompt-lint="${field}"]`).textContent=messages.length?`Advisory: ${messages.join(' ')}`:'';}try{const value=JSON.parse(snapshot.parametersText);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();}catch{this.el('[data-prompt-lint="parameters"]').textContent='Parameters must be a JSON object. Your text is kept for editing.';}}
  private draftKey(record:ImageRequestRecord): string {return record.state==='review' ? record.requestId : `replacement:${record.jobId}:${record.requestId}`;}
  private updateCounts(): void {
    const previous=this.previousWording.get(this.selectedJob);
    if(previous){
      const result=promptRevisionSummary(previous,{prompt:this.el<HTMLTextAreaElement>('[data-positive]').value,negative:this.el<HTMLTextAreaElement>('[data-negative]').value});
      const change=result.delta===0?'same length':`${Math.abs(result.delta).toLocaleString()} ${result.delta<0?'fewer':'more'}`;
      this.el('[data-revision-count]').textContent=`Combined: ${result.before.toLocaleString()} → ${result.after.toLocaleString()} characters · ${change}`;
      this.el('[data-revision-fields]').textContent=([['Positive',result.positive],['Negative',result.negative]] as const).map(([name,field])=>`${name}: ${field.before.toLocaleString()} → ${field.after.toLocaleString()}${field.changed?'':' (unchanged)'}`).join(' · ');
      this.el<HTMLTextAreaElement>('[data-previous-positive]').value=previous.prompt;
      this.el<HTMLTextAreaElement>('[data-previous-negative]').value=previous.negative;
      const changed=changedSceneEvidence(previous.sceneEvidence,this.el<HTMLTextAreaElement>('[data-positive]').value);
      const note=this.el('[data-revision-scene]');note.hidden=!changed.length;
      note.textContent=changed.length?`Review ${changed.map(entry=>entry.field).join(' and ')}: the exact previous wording changed. It may have been paraphrased; check who does what and where.`:'';
      const list=this.el('[data-previous-scene]');list.hidden=!previous.sceneEvidence.length;list.replaceChildren();
      for(const entry of previous.sceneEvidence){const item=document.createElement('li');item.textContent=`Previous ${entry.field}: ${entry.text}`;list.append(item);}
    }
    let total=0;
    for(const name of ['positive','negative'] as const) {
      const length=this.el<HTMLTextAreaElement>(`[data-${name}]`).value.length;
      total+=length;
      this.el<HTMLElement>(`[data-${name}-count]`).textContent=`${length.toLocaleString()} characters`;
    }
    const profile=this.record()?.promptProfile,maximum=profile?.maxCharacters??IMAGE_PROMPT_MAX_CHARS;
    let error='';
    try{assertPromptLengths(this.el<HTMLTextAreaElement>('[data-positive]').value,this.el<HTMLTextAreaElement>('[data-negative]').value,profile);}catch(cause){error=cause instanceof Error?cause.message:String(cause);}
    this.el<HTMLElement>('[data-combined-count]').textContent=`${total.toLocaleString()} / ${maximum.toLocaleString()} combined characters${error?' — blocked draft; repair required':''}`;
    const fill=this.root.querySelector<HTMLElement>('[data-budget-fill]');if(fill){const pct=Math.min(100,Math.round((total/Math.max(1,maximum))*100));fill.style.width=`${pct}%`;fill.dataset.tone=total>maximum?'over':pct>=85?'warn':'ok';}
    this.el<HTMLElement>('[data-prompt-profile]').textContent=profile?promptProfileSummary(profile):'Legacy request · 3,000 combined characters. Counts are characters, not tokens.';
    if(!error&&!this.el<HTMLTextAreaElement>('[data-positive]').value.trim())error='Enter a positive prompt before generating.';
    let parameters:Record<string,unknown>|undefined;
    try{const value:unknown=JSON.parse(this.el<HTMLTextAreaElement>('[data-parameters]').value);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();parameters=value as Record<string,unknown>;}catch{if(!error)error='Parameters must be a valid JSON object.';}
    if(!error&&profile?.output&&profile.outputManaged&&parameters)try{assertCapabilityOutput(profile.output,parameters);}catch(cause){error=cause instanceof Error?cause.message:String(cause);}
    const renderHeavy = () => {
      if (typeof document === 'undefined' || !this.host.isConnected) return;
      this.renderOutputControls(parameters);
      this.brief.render(this.planningChat||this.turn?.status==='planning'?undefined:this.record(),{prompt:this.el<HTMLTextAreaElement>('[data-positive]').value,negativePrompt:this.el<HTMLTextAreaElement>('[data-negative]').value,...(parameters?{parameters}:{})},{
        prompt:!this.el<HTMLTextAreaElement>('[data-positive]').readOnly,
        subject:!this.el('[data-recovery]').hidden,
        template:!this.el<HTMLSelectElement>('[data-template]').disabled,
        output:Boolean(this.record()),
      });
    };
    if (this.renderHeavyTimeout) clearTimeout(this.renderHeavyTimeout);
    if (!this.host.isConnected || typeof window === 'undefined' || (globalThis as any).IS_TEST) {
      renderHeavy();
    } else {
      this.renderHeavyTimeout = setTimeout(renderHeavy, 180);
    }
    this.updateRewriteLabel();
    const repair=this.el<HTMLButtonElement>('[data-regenerate-prompt]');
    const needsAdaptation=Boolean(this.record())&&(total>maximum||profile?.negativeMode==='positive-only'&&Boolean(this.el<HTMLTextAreaElement>('[data-negative]').value.trim()));
    const repairPrimary=needsAdaptation&&this.record()?.canRegeneratePrompt!==false;
    const destination=this.el<HTMLElement>(repairPrimary?'[data-studio-footer]':'[data-secondary-actions]');
    if(repair.parentElement!==destination)destination.prepend(repair);
    repair.toggleAttribute('data-primary-repair',repairPrimary);
    const state=this.currentInspectorState();
    const selectedRecord=this.record();
    const hasEdits=Boolean(selectedRecord&&selectedRecord.state!=='review'&&this.drafts.has(this.draftKey(selectedRecord)));
    this.el('[data-reset]').hidden=selectedRecord?.state!=='review'&&!hasEdits;
    const editPrimary=hasEdits&&(state.kind==='failed'||state.kind==='cancelled'||state.kind==='completed');
    const prepare=this.el<HTMLButtonElement>('[data-prepare]');
    const previewDestination=this.el<HTMLElement>(editPrimary||state.action==='prepare'?'[data-studio-footer]':'[data-secondary-actions]');
    if(prepare.parentElement!==previewDestination)previewDestination.prepend(prepare);
    prepare.hidden=editPrimary?repairPrimary:state.action!=='prepare';
    this.el('[data-retry-image]').hidden=repairPrimary||editPrimary||state.action!=='retry';
    this.el('[data-generate]').hidden=repairPrimary||state.action!=='generate';
    prepare.textContent=editPrimary?'Prepare edited preview':state.kind==='historical'?'Prepare new preview':'Prepare replacement';
    if(repairPrimary){
      this.el('[data-studio-footer]').hidden=false;
      this.el('[data-queue-retry]').hidden=true;
      this.el('[data-action-help]').textContent='Fits this draft using text tokens. Preserves character details; no image is generated.';
    }else if(this.el('[data-queue-retry]').dataset.eligible!==undefined){
      this.el('[data-queue-retry]').hidden=hasEdits||this.el('[data-queue-retry]').dataset.eligible!=='true';
    }
    if(!repairPrimary){
      const quickVisible=!this.el('[data-queue-retry]').hidden;
      this.el('[data-studio-footer]').hidden=!state.action&&!quickVisible&&!editPrimary;
      this.el('[data-action-help]').textContent=editPrimary?'Prepares your edited wording for review. No image is generated.':state.action==='generate'?'Starts an image request with this prompt.':'Prepares a preview. Generate only after approval.';
    }
    const validation=this.el<HTMLElement>('[data-validation]');validation.textContent=[error,error?this.record()?.promptAdaptationError:''].filter(Boolean).join('\n');validation.hidden=!error||!this.record();
    const needsAttention=Boolean(error&&selectedRecord)&&['held','failed','cancelled','completed','historical'].includes(state.kind);
    this.el('section').dataset.state=needsAttention?'needs-attention':state.kind;
    this.el('[data-status]').textContent=needsAttention?'Prompt needs attention':editPrimary?'Edited prompt ready':state.title;
    this.el('[data-state-detail]').textContent=needsAttention?(needsAdaptation?'Fit the wording to this model, or edit it below. Your current draft is kept until a valid replacement is ready.':'Correct the highlighted draft or parameter fields before preparing or generating this picture.'):editPrimary?'Your edits are local. Prepare an edited preview to review them before generating a replacement picture.':state.detail;
    if(editPrimary)this.el('[data-edit-help]').textContent='Edit the wording below, then choose Prepare edited preview. Your saved request stays unchanged until approval.';
    for(const selector of ['[data-positive]','[data-negative]'])this.el(selector).setAttribute('aria-invalid',String(Boolean(error)));
    for(const selector of ['[data-generate]','[data-prepare]']){const button=this.el<HTMLButtonElement>(selector);if(button.dataset.available!==undefined)button.disabled=button.dataset.available!=='true'||Boolean(error);}
    const retry=this.el<HTMLButtonElement>('[data-retry-image]'),record=this.record();
    if(retry.dataset.available!==undefined)retry.disabled=retry.dataset.available!=='true'||Boolean(error&&record&&this.drafts.has(this.draftKey(record)));
    const reviewable = (this.turn?.imageRequests ?? []).filter(r => r.state === 'review');
    const batchBtn = this.root.querySelector<HTMLButtonElement>('[data-batch-approve]');
    if (batchBtn) {
      batchBtn.hidden = reviewable.length <= 1;
      batchBtn.textContent = `Approve all held (${reviewable.length})`;
      if (batchBtn.dataset.available !== undefined) batchBtn.disabled = Boolean(error);
    }
    this.updateCostEstimate();
  }

  private renderOutputControls(parameters?:Record<string,unknown>):void{
    const profile=this.record()?.promptProfile,caps=profile?.output,managed=profile?.outputManaged===true;
    this.el<HTMLElement>('[data-output-options]').hidden=!caps;
    if(!caps)return;
    const editable=!this.el<HTMLTextAreaElement>('[data-parameters]').readOnly;
    this.el<HTMLElement>('[data-output-summary]').textContent=[profile.outputSummary??'Published model output values are available.',managed&&parameters?`Current size: ${String(parameters.size??'connection default')}${parameters.aspectRatio!==undefined?`; ratio: ${String(parameters.aspectRatio)}`:''}.`:'Custom raw settings remain authoritative; edit them in the image connection.'].join('\n');
    this.el<HTMLElement>('[data-output-fields]').hidden=!managed;
    const fill=(selector:string,values:string[],current:unknown)=>{
      const select=this.el<HTMLSelectElement>(selector),selected=typeof current==='string'?current:values[0]??'';
      const choices=[...values];if(selected&&!choices.includes(selected))choices.unshift(selected);
      select.replaceChildren(...choices.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=values.includes(value)?value:`Unsupported: ${value}`;return option;}));
      select.value=selected;select.disabled=!editable;
    };
    fill('[data-output-size]',caps.sizes,parameters?.size);
    this.el<HTMLElement>('[data-output-ratio-field]').hidden=!caps.ratios;
    if(caps.ratios)fill('[data-output-ratio]',caps.ratios,parameters?.aspectRatio??parameters?.aspect_ratio);
  }

  private recoveryScope() {return {chatId:this.turn!.chatId,messageId:this.turn!.messageId,swipeId:this.turn!.swipeId,sourceFingerprint:this.turn!.sourceFingerprint,requestId:globalThis.crypto?.randomUUID?.() ?? `vn-recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`};}
  private renderRecoveryMode():void {
    this.updateCorrectionScope();
    const environment=this.el<HTMLSelectElement>('[data-subject-mode]').value==='environment';
    this.el<HTMLElement>('[data-person-fields]').hidden=environment;
    this.el<HTMLElement>('[data-environment-help]').hidden=!environment;
  }
  private records(): ImageRequestRecord[] { return this.turn?.imageRequests?.filter((record) => record.jobId === this.selectedJob) ?? []; }
  private record(): ImageRequestRecord | undefined { return this.records().find((record) => record.requestId === this.selectedRequest) ?? this.records().at(-1); }

  setTurn(turn: TurnView | null): void {
    if(!turn||(this.planningChat&&turn.chatId!==this.planningChat))this.planningChat='';
    if(this.turn?.chatId!==turn?.chatId||!turn)this.setOpen(false);
    if(this.turn?.chatId!==turn?.chatId)this.preferences.clear();
    if (this.turn?.chatId !== turn?.chatId || this.turn?.sourceFingerprint !== turn?.sourceFingerprint || this.turn?.messageId !== turn?.messageId || this.turn?.swipeId !== turn?.swipeId || this.turn?.revision !== turn?.revision) { this.workspaceScroll=0;this.lastOpenCursor=null;this.editHistories.clear();this.drafts.clear(); this.previousWording.clear(); this.submitted.clear(); this.preparing.clear();this.preparationStarts.clear(); this.rebuilding.clear(); this.rerolling.clear(); this.selectedJob = ""; this.selectedRequest = ""; this.recoveryJob = "";this.retryQueueJobs.clear();this.retryActive=null; }
    this.replanning = false;this.recovering=null;
    this.turn = turn;
    for(const pending of [this.rerolling,this.rebuilding])for(const id of pending){
      const record=turn?.imageRequests?.find(record=>record.requestId===id);
      const latest=turn?.imageRequests?.filter(candidate=>candidate.jobId===record?.jobId).at(-1);
      if(!record||latest?.requestId!==id||record.state!=='review')pending.delete(id);
    }
    for (const record of turn?.imageRequests ?? []) if (record.state !== "review") {
      const draft=this.drafts.get(record.requestId);
      if(record.state==='cancelled'&&draft&&!this.drafts.has(this.draftKey(record)))this.drafts.set(this.draftKey(record),draft);
      this.submitted.delete(record.requestId); this.drafts.delete(record.requestId);
    }
    for(const jobId of this.preparing){
      const baseline=this.preparationStarts.get(jobId);
      const asset=turn?.assets.find(asset=>asset.jobId===jobId);
      const latest=turn?.imageRequests?.filter(record=>record.jobId===jobId).at(-1);
      const terminal=asset&&['failed','cancelled','generated','browser_ready'].includes(asset.status);
      if(!asset||latest?.requestId!==baseline?.requestId||terminal&&(asset.status!==baseline?.status||asset.failureId!==baseline?.failureId)){
        this.preparing.delete(jobId);this.preparationStarts.delete(jobId);
      }
    }
    this.render();
  }
  setPlanning(chatId:string,planning:boolean):void {this.planningChat=planning?chatId:this.planningChat===chatId?'':this.planningChat;this.render();}
  setConfig(config: VisualNovelConfig): void { this.activity.setSaver(config.dataSaverMode);this.maxImagesPerTurn=config.maxImagesPerTurn;this.preferences.setConfig(config); this.templates = config.imageTemplates.map(t => ({ ...t })); this.defaultTemplate = config.defaultImageTemplateId; this.render(); }
  private rebuildTemplate(): void {
    const record = this.record(); const templateId = this.el<HTMLSelectElement>("[data-template]").value;
    if (!this.turn || record?.state !== "review" || !templateId || this.rebuilding.has(record.requestId) || this.submitted.has(record.requestId) || this.rebuilding.has(record.requestId)) return;
    this.rebuilding.add(record.requestId); this.render();
    this.send({ type: "vn_reprepare_image_template", chatId: this.turn.chatId, messageId: this.turn.messageId, sourceFingerprint: this.turn.sourceFingerprint, requestId: record.requestId, templateId });
  }
  getElement():HTMLElement {return this.host;}
  close():void {if(!this.el<HTMLElement>('section').hidden)this.workspaceScroll=this.el<HTMLElement>('[data-studio-body]').scrollTop;this.setOpen(false);}
  setLibraryOpener(open:()=>void):void {
    this.browseLibrary=open;
    if(this.root.querySelector('[data-workspace-library]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.workspaceLibrary='';button.textContent='Browse saved artwork';button.onclick=()=>this.browseLibrary?.();
    this.el('[data-studio-body]').prepend(button);
  }
  setReview(enabled: boolean): void { this.review = enabled; this.el<HTMLInputElement>("[data-review]").checked = enabled; }
  setCursor(cursor: number): void { this.cursor = cursor; }
  private setOpen(open:boolean):void{
    const section=this.el<HTMLElement>('section'),changed=section.hidden===open;
    section.hidden=!open;
    this.host.hidden=!open;
    if(open) this.host.dataset.open='true'; else delete this.host.dataset.open;
    // F15: aria-modal only on the mobile fullscreen layout; desktop keeps the
    // non-modal side panel semantics.
    if(open&&this.mobileLayout())section.setAttribute('aria-modal','true');
    else section.removeAttribute('aria-modal');
    this.el<HTMLButtonElement>('[data-launch]').setAttribute('aria-expanded',String(open));
    if(changed)this.onVisibility?.(open);
  }
  /** Mirrors the @container (max-width:600px) breakpoint in CSS. */
  private mobileLayout():boolean{
    return isMobileWidth(this.host);
  }
  open():void{
    if(!this.el<HTMLElement>('section').hidden)return;
    if(!this.host.dataset.vnWorkspaceTool||this.lastOpenCursor!==this.cursor||!this.turn?.assets.some(asset=>asset.jobId===this.selectedJob)){this.workspaceScroll=0;this.selectedJob=this.turn?.assets.filter(asset=>asset.paragraphIndex<=this.cursor).at(-1)?.jobId??this.selectedJob;this.selectedRequest='';}
    this.lastOpenCursor=this.cursor;
    this.render();this.setOpen(true);this.el<HTMLElement>('[data-studio-body]').scrollTop=this.workspaceScroll;this.el<HTMLButtonElement>('[data-close]').focus({preventScroll:true});
    const asset=this.turn?.assets.find(entry=>entry.jobId===this.selectedJob);
    if(asset?.error?.startsWith('No usable appearance was resolved for ')){
      this.el<HTMLDetailsElement>('[data-reply-settings]').open=true;
      this.el<HTMLDetailsElement>('[data-turn-recovery]').open=true;
      const target=this.turn?.cardRoleAvailable?this.el<HTMLDetailsElement>('[data-card-role]'):this.el<HTMLDetailsElement>('[data-recovery]');
      if(!target.hidden){target.open=true;target.scrollIntoView({block:'nearest'});}
    }
  }
  private noticeKey(text:string):string {return JSON.stringify([this.turn?.chatId,this.turn?.messageId,this.turn?.swipeId,this.turn?.sourceFingerprint,this.turn?.revision,this.selectedJob,this.selectedRequest,this.records().at(-1)?.requestId,text]);}
  private setNotice(text:string):void {
    const visible=!!text&&!this.dismissedNotices.has(this.noticeKey(text));
    this.el<HTMLElement>('[data-notice]').textContent=visible?text:'';
    this.el<HTMLElement>('[data-notice-row]').hidden=!visible;
  }
  showError(error: string): void { this.replanning = false;this.recovering=null; this.submitted.clear(); this.preparing.clear();this.preparationStarts.clear(); this.rerolling.clear();this.rebuilding.clear(); this.render(); this.setNotice(error); }

  private enrichPrompt(guidance?: string): void {
    if (!this.turn) return;
    const record = this.record();
    if (!record||record.canRegeneratePrompt===false||this.rerolling.has(record.requestId)||this.rebuilding.has(record.requestId)||this.submitted.has(record.requestId)||this.preparing.has(this.selectedJob)) return;
    let edits: ImageRequestEdits | undefined;
    try {
      const parameters: unknown = JSON.parse(this.el<HTMLTextAreaElement>('[data-parameters]').value);
      edits = {
        prompt: this.el<HTMLTextAreaElement>('[data-positive]').value,
        negativePrompt: this.el<HTMLTextAreaElement>('[data-negative]').value,
        parameters: (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) ? parameters as Record<string, unknown> : {}
      };
      if (!edits.prompt?.trim()) throw new Error('Enter a positive prompt before enriching it.');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : String(error));
      return;
    }
    if (this.previousWording.size >= 12) this.previousWording.delete(this.previousWording.keys().next().value!);
    this.previousWording.set(this.selectedJob, {
      requestId: record.requestId,
      sceneEvidence: retainedSceneEvidence(this.el<HTMLTextAreaElement>('[data-positive]').value, record.imagePromptMetadata?.brief),
      prompt: this.el<HTMLTextAreaElement>('[data-positive]').value,
      negative: this.el<HTMLTextAreaElement>('[data-negative]').value,
      parameters: this.el<HTMLTextAreaElement>('[data-parameters]').value
    });
    if (record.state === 'review') {
      this.rerolling.add(record.requestId);
      this.render();
      this.send({
        type: 'vn_enrich_image_prompt',
        chatId: this.turn.chatId,
        messageId: this.turn.messageId,
        sourceFingerprint: this.turn.sourceFingerprint,
        requestId: record.requestId,
        ...(guidance ? { guidance } : {}),
        ...(edits ? { edits } : {})
      });
    } else {
      this.beginPreparation(this.selectedJob);
      this.render();
      this.send({
        type: 'vn_prepare_image',
        chatId: this.turn.chatId,
        messageId: this.turn.messageId,
        sourceFingerprint: this.turn.sourceFingerprint,
        jobId: this.selectedJob,
        regeneratePrompt: true,
        promptOperation: 'enrich',
        ...(guidance ? { guidance } : {}),
        edits,
        ...(this.el<HTMLSelectElement>('[data-template]').value ? { templateId: this.el<HTMLSelectElement>('[data-template]').value } : {})
      });
    }
    this.setNotice(guidance ? `Enriching prompt with direction: "${guidance}"...` : 'Enriching prompt with cinematic detail & lighting...');
  }

  private regeneratePrompt():void {
    if(!this.turn||this.el<HTMLButtonElement>('[data-regenerate-prompt]').disabled)return;
    const record=this.record();
    let edits:ImageRequestEdits|undefined;
    const profile=record?.promptProfile;
    const maxChars=profile?.maxCharacters??IMAGE_PROMPT_MAX_CHARS;
    const posVal=this.el<HTMLTextAreaElement>('[data-positive]').value;
    const negVal=this.el<HTMLTextAreaElement>('[data-negative]').value;
    const total=posVal.length+negVal.length;
    const needsFit=Boolean(record)&&(total>maxChars||profile?.negativeMode==='positive-only'&&Boolean(negVal.trim()));
    if(needsFit){
      const fitted=fitPromptToBudget(posVal,negVal,maxChars,profile?.negativeMode);
      this.el<HTMLTextAreaElement>('[data-positive]').value=fitted.prompt;
      this.el<HTMLTextAreaElement>('[data-negative]').value=fitted.negativePrompt;
      if (record) {
        this.drafts.set(this.draftKey(record), {
          prompt: fitted.prompt,
          negative: fitted.negativePrompt,
          parameters: this.el<HTMLTextAreaElement>('[data-parameters]').value
        });
      }
      this.updateCounts();
      this.updateRewriteLabel();
      this.setNotice('Prompt fitted to character budget. Ready to generate.');
      return;
    }
    if(record)try{
      const parameters:unknown=JSON.parse(this.el<HTMLTextAreaElement>('[data-parameters]').value);
      if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw new Error('Parameters must be a valid JSON object before repairing the prompt.');
      edits={prompt:this.el<HTMLTextAreaElement>('[data-positive]').value,negativePrompt:this.el<HTMLTextAreaElement>('[data-negative]').value,parameters:parameters as Record<string,unknown>};
      if(!edits.prompt?.trim())throw new Error('Enter a positive prompt before rewriting it.');
    }catch(error){this.showError(error instanceof Error?error.message:String(error));return;}
    if(record){
      if(this.previousWording.size>=12)this.previousWording.delete(this.previousWording.keys().next().value!);
      this.previousWording.set(this.selectedJob,{requestId:record.requestId,sceneEvidence:retainedSceneEvidence(this.el<HTMLTextAreaElement>('[data-positive]').value,record.imagePromptMetadata?.brief),prompt:this.el<HTMLTextAreaElement>('[data-positive]').value,negative:this.el<HTMLTextAreaElement>('[data-negative]').value,parameters:this.el<HTMLTextAreaElement>('[data-parameters]').value});
    }
    if(record?.state==='review'){
      this.rerolling.add(record.requestId);this.render();
      this.send({type:'vn_regenerate_image_prompt',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,requestId:record.requestId,...(edits?{edits}:{})});
    }else{
      this.beginPreparation(this.selectedJob);this.render();
      this.send({type:'vn_prepare_image',chatId:this.turn.chatId,messageId:this.turn.messageId,sourceFingerprint:this.turn.sourceFingerprint,jobId:this.selectedJob,regeneratePrompt:true,...(edits?{edits}:{}),
        ...(this.el<HTMLSelectElement>('[data-template]').value?{templateId:this.el<HTMLSelectElement>('[data-template]').value}:{})});
    }
  }

  private updateRewriteLabel():void{
    const record=this.record(),button=this.el<HTMLButtonElement>('[data-regenerate-prompt]');
    const total=this.el<HTMLTextAreaElement>('[data-positive]').value.length+this.el<HTMLTextAreaElement>('[data-negative]').value.length;
    const needsFit=Boolean(record)&&(total>(record?.promptProfile?.maxCharacters??3000)||record?.promptProfile?.negativeMode==='positive-only'&&Boolean(this.el<HTMLTextAreaElement>('[data-negative]').value.trim()));
    const busy=this.preparing.has(this.selectedJob)||Boolean(record&&this.rerolling.has(record.requestId));
    button.textContent=busy?needsFit?'Fitting prompt…':'Rewriting prompt…':needsFit?'Fit to budget':'Rewrite prompt';
    button.title=needsFit?'Compresses the current edited draft while preserving named subjects and their appearance facts. Uses story-reader text tokens; generation still requires approval.':'Uses the current edited wording to describe the same scene again. Uses story-reader text tokens; generation still requires approval.';
  }

  setImageActivity(chatId:string,activity:unknown):void{const wasWaiting=this.activity.waiting;this.activity.setActivity(chatId,activity);if(this.activity.waiting)this.syncActivityStatus();else if(wasWaiting)this.render();}
  private syncActivityStatus():void{if(this.activity.waiting){this.el('[data-status]').textContent='Waiting · data saver';this.el('[data-state-detail]').textContent='This picture has not been sent. Approve this prepared picture to send one image request.';}}

  private render(): void {
    this.el<HTMLElement>("[data-template-confirm]").hidden = true;
    const waiting=(this.turn?.assets??[]).filter(asset=>this.stateForJob(asset.jobId,this.turn?.imageRequests?.filter(record=>record.jobId===asset.jobId).at(-1)).kind==='held').length;
    const launcher=this.el<HTMLButtonElement>("[data-launch]");launcher.textContent="Image prompts";launcher.dataset.waiting=String(waiting);launcher.setAttribute("aria-label",`Image prompts${waiting?` (${waiting} waiting)`:""}`);
    if (!this.turn?.assets.some((asset) => asset.jobId === this.selectedJob)) { this.selectedJob = this.turn?.assets[0]?.jobId ?? ""; this.selectedRequest = ""; }
    const picker = this.el<HTMLSelectElement>("[data-picture]");
    picker.replaceChildren();
    for (const asset of this.turn?.assets ?? []) {
      const option = document.createElement("option"); option.value = asset.jobId;
      const latest = this.turn?.imageRequests?.filter((record) => record.jobId === asset.jobId).at(-1);
      const role=asset.stageAsset?.role;const label=role==='background'?'Background':role==='portrait'?`Portrait${asset.stageAsset?.character?` · ${asset.stageAsset.character}`:''}`:'Picture';
      option.textContent = `${label} · Paragraph ${asset.paragraphIndex + 1} — ${pictureStateLabel(this.stateForJob(asset.jobId,latest))}`;
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
    this.activity.setContext(this.turn,record);
    const asset = this.turn?.assets.find((entry) => entry.jobId === this.selectedJob);
    const draft = record ? this.drafts.get(this.draftKey(record)) : undefined;
    this.el<HTMLElement>("[data-scene]").textContent = asset ? this.turn?.paragraphs[asset.paragraphIndex] ?? "" : '';
    this.el<HTMLElement>("[data-meta]").textContent = record ? `${record.provider} · ${record.model}` : '';
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
    this.el<HTMLElement>('[data-picture-explanation-text]').textContent=describePictureExplanation(asset?.explanation)+(asset?.previousImage?'\nThe previous picture remains visible while its replacement is prepared.':'');
    const metadata = record?.imagePromptMetadata;
    this.el<HTMLElement>("[data-provenance]").textContent = metadata ? `${metadata.template.name} · ${metadata.template.category} · ${metadata.format === "tags" ? "Tags" : "Description"}\n${metadata.selectionReason}\nFraming: ${metadata.brief.framing}; subjects: ${metadata.brief.subjectMode === "none" ? "no people" : metadata.brief.subjectMode === "ensemble" ? "full scene cast, including persona when present" : "one character"}; references: ${metadata.brief.referencePolicy}\nSimTracker: ${metadata.trackerStatus}${metadata.trackerSourceMessageId ? ` (message ${metadata.trackerSourceMessageId})` : ""}\nSources: ${metadata.brief.sources.join(", ") || "Story scene"}${metadata.brief.conflicts.length ? `\nConflicts: ${metadata.brief.conflicts.join("; ")}` : ""}` : "Template and source metadata are unavailable for this older request.";
    if(metadata?.presentationRuleTrace)this.el<HTMLElement>("[data-provenance]").textContent+=`\nTemplate preferences:\n${metadata.presentationRuleTrace.summary}`;
    for (const [selector, value] of [["[data-positive]", draft?.prompt ?? record?.prompt ?? ""], ["[data-negative]", draft?.negative ?? record?.negativePrompt ?? ""], ["[data-parameters]", draft?.parameters ?? JSON.stringify(record?.parameters ?? {}, null, 2)]] as const) { const field = this.el<HTMLTextAreaElement>(selector); if(field.value!==value) field.value = value; field.readOnly = !editable; }
    this.updateCounts();
    this.el<HTMLElement>('[data-edit-help]').textContent=localEditable ? 'Edit a local replacement draft below, then Prepare replacement. The recorded request stays unchanged; generation still needs approval.' : record?.state==='review' ? 'Editable preview. Positive and negative share the prepared budget shown below.' : !record ? 'No editable request is saved for this picture. Choose Prepare new preview first; generation still needs approval.' : 'Recorded request — read-only while this picture is running. Finish or skip waiting pictures to prepare a replacement.';
    this.el<HTMLElement>("[data-reference]").textContent = record?.referenceSummary ?? "";
    const modelHelp = this.el<HTMLElement>('[data-model-help]');
    modelHelp.textContent = [modelOutputHelp(record?.provider, record?.model, record?.parameters ?? {}),record?.promptProfile?.outputSummary].filter(Boolean).join(' ');
    modelHelp.hidden = !modelHelp.textContent;
    for (const selector of ["[data-generate]", "[data-skip]", "[data-reset]"]) { this.el<HTMLButtonElement>(selector).disabled = !editable; this.el<HTMLButtonElement>(selector).hidden = record?.state !== "review"; }
    const enrich=this.el<HTMLButtonElement>('[data-enrich-submit]');enrich.disabled=!editable||record?.canRegeneratePrompt===false||!!record&&this.rerolling.has(record.requestId)||this.preparing.has(this.selectedJob);
    enrich.textContent=!!record&&(this.rerolling.has(record.requestId)||this.preparing.has(this.selectedJob))?'Enriching…':'Enrich wording';
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
    this.updateRewriteLabel();
    reroll.disabled=!asset||asset.source!=='cache'&&record?.canRegeneratePrompt===false||this.replanning||this.preparing.has(this.selectedJob)||!!this.recovering||rolling||Boolean(record&&(this.submitted.has(record.requestId)||this.rebuilding.has(record.requestId)))||(record?.state==='review'?record.canRegeneratePrompt===false:Boolean(busy));

    const reframe = this.el<HTMLButtonElement>('[data-reframe]');
    reframe.hidden = record?.state !== "review";
    reframe.disabled = !editable || !asset || asset.source === 'cache' || this.preparing.has(this.selectedJob) || Boolean(record && this.rebuilding.has(record.requestId));

    const fitModel = this.el<HTMLButtonElement>('[data-fit-model]');
    fitModel.hidden = record?.state !== "review";
    fitModel.disabled = !editable || !asset || asset.source === 'cache' || this.preparing.has(this.selectedJob) || Boolean(record && this.rebuilding.has(record.requestId));

    const styleSelect = this.el<HTMLSelectElement>('[data-style-select]');
    if (styleSelect.children.length === 0) {
      for (const s of BUILTIN_SHARED_STYLES) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        styleSelect.append(opt);
      }
    }
    const currentStyle = record?.imagePromptMetadata?.styleSnapshot?.medium;
    if (currentStyle) {
      const match = BUILTIN_SHARED_STYLES.find(s => s.description.includes(currentStyle) || s.name.toLowerCase().includes(currentStyle.toLowerCase()));
      if (match) styleSelect.value = match.id;
    }
    const changeStyleBtn = this.el<HTMLButtonElement>('[data-change-style-btn]');
    changeStyleBtn.disabled = !editable || !asset || asset.source === 'cache' || this.preparing.has(this.selectedJob) || Boolean(record && this.rebuilding.has(record.requestId));

    const modelInput = this.el<HTMLInputElement>('[data-artwork-model]');
    if (this.root.activeElement !== modelInput) {
      modelInput.value = record?.model ?? '';
    }
    const regenSingle = this.el<HTMLButtonElement>('[data-regenerate-model-single]');
    regenSingle.disabled = !editable || !asset || asset.source === 'cache' || this.preparing.has(this.selectedJob) || Boolean(record && this.rebuilding.has(record.requestId));

    const regenAll = this.el<HTMLButtonElement>('[data-regenerate-model-all]');
    const reviewableCount = (this.turn?.imageRequests ?? []).filter(r => r.state === 'review').length;
    regenAll.disabled = !editable || reviewableCount === 0 || this.preparing.size > 0;

    const applyCameraBtn = this.el<HTMLButtonElement>('[data-apply-camera]');
    applyCameraBtn.disabled = !editable || !asset || asset.source === 'cache' || this.preparing.has(this.selectedJob) || Boolean(record && this.rebuilding.has(record.requestId));

    const autoDirector = this.el<HTMLInputElement>('[data-auto-director]');
    const shotSpec = record?.imagePromptMetadata?.shotSpec ?? record?.shotSpec;
    if (shotSpec && shotSpec.source === 'manual') {
      autoDirector.checked = false;
      this.el<HTMLSelectElement>('[data-camera-shot-size]').value = shotSpec.camera.shotSize;
      this.el<HTMLSelectElement>('[data-camera-angle]').value = shotSpec.camera.angle;
      this.el<HTMLSelectElement>('[data-camera-lens]').value = shotSpec.camera.lens;
      this.el<HTMLSelectElement>('[data-camera-composition]').value = shotSpec.composition.mode;
      this.el<HTMLSelectElement>('[data-camera-depth]').value = shotSpec.camera.depthOfField;
      for (const sel of ['[data-camera-shot-size]','[data-camera-angle]','[data-camera-lens]','[data-camera-composition]','[data-camera-depth]','[data-camera-safe-area]']) {
        this.el<HTMLSelectElement>(sel).disabled = false;
      }
    } else {
      autoDirector.checked = true;
      for (const sel of ['[data-camera-shot-size]','[data-camera-angle]','[data-camera-lens]','[data-camera-composition]','[data-camera-depth]','[data-camera-safe-area]']) {
        this.el<HTMLSelectElement>(sel).disabled = true;
      }
    }
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
    this.historyFor()?.checkpoint(this.editSnapshot());this.updateHistoryButtons();this.scheduleLint();
    this.renderInspector();
    this.syncActivityStatus();
    this.renderConnectionDropdown();
    this.updateCostEstimate();
    this.setNotice(this.recovering ? (this.recovering==='stop'?'Stopping pending pictures…':'Preparing unfinished pictures for review…') : rolling ? "Rewriting prompt with the story-reader model… Uses text tokens; image generation still needs approval." : (asset?.error ?? '') || (record && this.rebuilding.has(record.requestId) ? "Rebuilding template… Wait for a new preview before generating." : ''));
    this.publishOperations();
  }
  private publishOperations():void{
    const turn=this.turn;
    const jobs:LocalPictureOperations['jobs']=[];
    for(const asset of turn?.assets??[]){
      const record=turn?.imageRequests?.filter(candidate=>candidate.jobId===asset.jobId).at(-1);
      const kind=record&&this.rerolling.has(record.requestId)?'rewrite':record&&this.rebuilding.has(record.requestId)?'template':this.preparing.has(asset.jobId)?'prepare':null;
      if(kind)jobs.push({jobId:asset.jobId,kind,...(record?{requestId:record.requestId}:{})});
    }
    const snapshot:LocalPictureOperations|null=turn&&jobs.length?{chatId:turn.chatId,messageId:turn.messageId,sourceFingerprint:turn.sourceFingerprint,swipeId:turn.swipeId,revision:turn.revision,jobs}:null;
    const signature=JSON.stringify(snapshot);
    if(signature!==this.operationSignature){this.operationSignature=signature;this.onOperations?.(snapshot);}
  }
  private stateForJob(jobId:string,record?:ImageRequestRecord){
    return inspectorState({asset:this.turn?.assets.find(entry=>entry.jobId===jobId),requestState:record&&this.submitted.has(record.requestId)?'approved':record?.state,
      planning:Boolean(this.planningChat)||this.turn?.status==='planning',preparing:this.preparing.has(jobId),hasTurn:!!this.turn,zeroBudget:this.maxImagesPerTurn===0,
      operation:record&&this.rerolling.has(record.requestId)?'rewrite':record&&this.rebuilding.has(record.requestId)?'template':undefined,
      retryQueued:this.retryQueueJobs.has(jobId),retryRunning:this.retryActive===jobId});
  }
  private currentInspectorState(){return this.stateForJob(this.selectedJob,this.record());}
  private renderInspector():void {
    const asset=this.turn?.assets.find(entry=>entry.jobId===this.selectedJob),record=this.record();
    const planning=Boolean(this.planningChat)||this.turn?.status==='planning';
    const pending=this.preparing.has(this.selectedJob)||Boolean(record&&(this.rebuilding.has(record.requestId)||this.rerolling.has(record.requestId)));
    const state=this.currentInspectorState();
    this.el('section').dataset.state=state.kind;
    this.el('[data-status]').textContent=state.title;this.el('[data-state-detail]').textContent=state.detail;
    this.el('[data-paragraph]').textContent=asset&&!planning?`Picture ${(this.turn?.assets.indexOf(asset)??0)+1} of ${this.turn?.assets.length} · ${asset.stageAsset?.role==='background'?'Background':asset.stageAsset?.role==='portrait'?'Portrait':'Scene'} · Paragraph ${asset.paragraphIndex+1}`:'';
    this.el('[data-picture-navigation]').hidden=!asset||planning||(this.turn?.assets.length??0)<2;
    this.el('[data-scene]').hidden=planning;
    this.el('[data-meta]').hidden=!record||planning;
    this.el('[data-prompt-editor]').hidden=!record||planning;
    this.el('[data-picture-tools]').hidden=!asset||planning;
    this.el('[data-thumbnail]').hidden=!asset||planning;
    this.el('[data-model-help]').hidden=!record||planning||!this.el('[data-model-help]').textContent;
    this.el('[data-turn-recovery]').hidden=planning||!this.turn;
    if(planning)this.el('[data-card-role]').hidden=true;
    const image=this.el<HTMLImageElement>('[data-preview]');
    const candidates=asset?sceneImageCandidatesFor(asset):[];
    const key=JSON.stringify([this.turn?.chatId,this.turn?.messageId,this.turn?.sourceFingerprint,this.turn?.swipeId,this.turn?.revision,asset?.jobId,candidates]);
    if(key!==this.previewKey){
      this.previewLoad?.abort();this.previewKey=key;const controller=new AbortController();this.previewLoad=controller;
      image.hidden=true;image.removeAttribute('src');this.el('[data-placeholder]').hidden=false;
      if(candidates.length)void loadVnImageCandidates(candidates,undefined,controller.signal).then(url=>{
        if(controller.signal.aborted||this.previewLoad!==controller)return;
        image.src=url;image.alt=asset?.previousImage?'Previous picture while replacement is pending':'Selected picture';image.hidden=false;this.el('[data-placeholder]').hidden=true;
      }).catch(()=>{if(!controller.signal.aborted){image.hidden=true;this.el('[data-placeholder]').hidden=false;}});
    }
    this.comparison.setContext(JSON.stringify([this.turn?.chatId,this.turn?.messageId,this.turn?.swipeId,this.turn?.sourceFingerprint,this.turn?.revision,this.selectedJob]),asset);
    const versions = asset?.previousVersions ?? [];
    const container = this.root.querySelector<HTMLElement>('[data-previous-versions-container]');
    const vStrip = this.root.querySelector<HTMLElement>('[data-versions-strip]');
    const countLabel = this.root.querySelector<HTMLElement>('[data-versions-count]');
    if (container && vStrip) {
      if (versions.length > 0 && !planning) {
        container.hidden = false;
        if (countLabel) countLabel.textContent = `${versions.length} version${versions.length > 1 ? 's' : ''}`;
        vStrip.replaceChildren();
        versions.forEach((ver, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border-radius:8px;background:var(--vn-shell-field,rgba(0,0,0,0.3));border:1px solid var(--edge);cursor:pointer;flex-shrink:0;width:76px;text-align:center;color:inherit;font-size:10px;';
          btn.disabled=ver.restorable===false;
          btn.title = ver.restoreNotice??`Version ${idx + 1}. Click to restore as active picture.`;
          const thumbnail=document.createElement('img');
          thumbnail.src=`/api/v1/images/${encodeURIComponent(ver.imageId)}`;
          thumbnail.style.cssText='width:64px;height:74px;object-fit:cover;border-radius:6px;display:block';
          thumbnail.alt=`v${idx+1}`;
          const number=document.createElement('span');number.style.fontWeight='700';number.textContent=`v${idx+1}`;
          const restoreLabel=document.createElement('span');restoreLabel.style.cssText='color:var(--accent);font-size:9px';restoreLabel.textContent=ver.restorable===false?'Metadata unavailable':'Restore ↺';
          btn.append(thumbnail,number,restoreLabel);
          const selectedTurn=this.turn,selectedJob=this.selectedJob;
          btn.onclick = () => {
            if (ver.restorable===false||!selectedTurn||this.turn!==selectedTurn||this.selectedJob!==selectedJob) return;
            this.send({
              type: 'vn_restore_previous_image',
              chatId: this.turn.chatId,
              messageId: this.turn.messageId,
              sourceFingerprint: this.turn.sourceFingerprint,
              jobId: this.selectedJob,
              versionId: ver.versionId,
              swipeId: selectedTurn.swipeId,
              revision: selectedTurn.revision
            });
            this.setNotice(`Restoring Version ${idx + 1}...`);
          };
          vStrip.append(btn);
        });
      } else {
        container.hidden = true;
      }
    }
    const strip=this.el('[data-picture-strip]');strip.replaceChildren();
    const assets=this.turn?.assets??[];strip.hidden=assets.length<2||assets.length>3;
    const stateFor=(jobId:string)=>this.stateForJob(jobId,this.turn?.imageRequests?.filter(record=>record.jobId===jobId).at(-1));
    const overview=this.el('[data-picture-overview]');overview.hidden=planning||assets.length<2;overview.textContent=overview.hidden?'':pictureStateSummary(assets.map(entry=>stateFor(entry.jobId)));
    if(!strip.hidden)for(const [index,entry] of assets.entries()){
      const label=pictureStateLabel(stateFor(entry.jobId));
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(entry.jobId===this.selectedJob));button.setAttribute('aria-label',`Picture ${index+1}, paragraph ${entry.paragraphIndex+1}`);button.setAttribute('aria-description',label);
      if(entry.imageUrl){const thumb=document.createElement('img');thumb.src=entry.imageUrl;thumb.alt='';button.append(thumb);}const caption=document.createElement('span');caption.textContent=`Picture ${index+1} · ${label}`;button.append(caption);
      button.onclick=()=>{this.selectedJob=entry.jobId;this.selectedRequest='';this.render();};strip.append(button);
    }
    this.el('[data-picture]').closest('label')!.hidden=assets.length>=2&&assets.length<=3;
    this.el('[data-request-history]').hidden=this.records().length<2;
    const previous=this.previousWording.get(this.selectedJob);
    this.el('[data-rewrite-changed]').hidden=record?.state!=='review'||!previous||previous.requestId===record.requestId||pending;
    const selected={generate:'[data-generate]',retry:'[data-retry-image]',prepare:'[data-prepare]'};
    for(const [action,selector] of Object.entries(selected)){
      const button=this.el<HTMLButtonElement>(selector);button.hidden=state.action!==action;
      button.dataset.available=String(!button.disabled);
    }
    this.el('[data-generate]').textContent='Generate picture';this.el('[data-retry-image]').textContent='Edit before retry';this.el('[data-prepare]').textContent=state.kind==='historical'?'Prepare new preview':'Prepare replacement';
    const queued=this.retryQueueJobs.has(this.selectedJob)||this.retryActive===this.selectedJob;
    const quickEligible=!!asset&&!pending&&asset.source!=='cache'&&['failed','cancelled','generated','browser_ready'].includes(asset.status);
    const quick=this.el<HTMLButtonElement>('[data-queue-retry]');quick.hidden=!quickEligible&&!queued;quick.disabled=queued||planning||this.replanning||!!this.recovering;
    quick.dataset.eligible=String(quickEligible||queued);
    quick.textContent=this.retryActive===this.selectedJob?'Retry in progress…':queued?'Retry queued':asset&&['generated','browser_ready'].includes(asset.status)?'Regenerate picture':'Retry picture';
    quick.title='Starts one image attempt without prompt review, using the saved scene and current image settings. Local prompt edits are not applied.';
    this.el('[data-retry-queue]').hidden=!this.turn||planning;
    const unfinished=assets.filter(a=>a.source!=='cache'&&!['generated','browser_ready'].includes(a.status));
    this.el<HTMLButtonElement>('[data-queue-unfinished]').disabled=!unfinished.some(a=>!this.retryQueueJobs.has(a.jobId)&&this.retryActive!==a.jobId)||this.replanning||!!this.recovering;
    this.el<HTMLButtonElement>('[data-clear-retries]').hidden=this.retryQueueJobs.size===0;
    this.el('[data-queue-status]').hidden=!this.retryQueueJobs.size&&!this.retryActive&&unfinished.length===0;
    this.el('[data-queue-status]').textContent=this.retryQueueJobs.size||this.retryActive?`${this.retryQueueJobs.size} queued${this.retryActive?' · 1 retry running':''}. ${this.retryActive?'':'Waiting for current image work or held previews. '}Quick retries skip review. Each picture gets one attempt.`:'Quick retry skips review. Uses the saved scene and current image settings; editable previews are available below.';
    this.el('[data-studio-footer]').hidden=!state.action&&quick.hidden;
    this.el('[data-action-help]').textContent=!quick.hidden?'Quick retry starts an image request without review.':state.action==='generate'?'Starts an image request with this prompt.':'Prepares a preview. Generate only after approval.';
    this.updateCounts();
    if(!record)this.el<HTMLButtonElement>('[data-prepare]').disabled=this.el<HTMLButtonElement>('[data-prepare]').dataset.available!=='true';
  }
  private decide(action: "generate" | "skip"): void {
    const record = this.record(); if (!this.turn || record?.state !== "review" || this.submitted.has(record.requestId) || this.rebuilding.has(record.requestId) || this.rerolling.has(record.requestId)) return;
    try {
      const parameters: unknown = action === "generate" ? JSON.parse(this.el<HTMLTextAreaElement>("[data-parameters]").value) : {};
      if (action === "generate" && (!parameters || typeof parameters !== "object" || Array.isArray(parameters))) throw new Error("Parameters must be a JSON object.");
      const prompt = this.el<HTMLTextAreaElement>("[data-positive]").value;
      if (action === "generate") assertPromptLengths(prompt,this.el<HTMLTextAreaElement>("[data-negative]").value,record.promptProfile);
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
  private imageConnections: ConnectionCatalogOption[] = [];
  private activeTab = 'picture';

  setConnectionCatalog(state: { options?: readonly ConnectionCatalogOption[]; status?: string; error?: string }): void {
    this.imageConnections = state.options ? [...state.options] : [];
    this.renderConnectionDropdown();
    this.updateCostEstimate();
  }

  private switchTab(tabId: string): void {
    this.activeTab = tabId;
    this.el<HTMLElement>('[data-prompt-edit-tools]').hidden=tabId!=='prompt'&&tabId!=='history';
    const tabBtns = this.root.querySelectorAll<HTMLButtonElement>('.studio-tab-btn');
    for (const btn of tabBtns) {
      btn.setAttribute('aria-selected', String(btn.dataset.tab === tabId));
    }
    const panels = this.root.querySelectorAll<HTMLElement>('.studio-tab-panel');
    for (const panel of panels) {
      panel.hidden = panel.dataset.tabPanel !== tabId;
    }
  }

  private renderConnectionDropdown(): void {
    const select = this.root.querySelector<HTMLSelectElement>('[data-artwork-connection]');
    if (!select) return;
    const currentVal = select.value;
    select.replaceChildren();

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Active Connection Default';
    select.append(defaultOpt);

    for (const conn of this.imageConnections) {
      const opt = document.createElement('option');
      opt.value = conn.id;
      opt.textContent = `${conn.name} (${conn.provider} · ${conn.model})${conn.isDefault ? ' [Default]' : ''}`;
      select.append(opt);
    }

    if (currentVal && this.imageConnections.some(c => c.id === currentVal)) {
      select.value = currentVal;
    }
  }

  private updateCostEstimate(): void {
    const costEl=this.root.querySelector<HTMLElement>('[data-cost-estimate]');
    if(costEl)costEl.textContent='Price unavailable · The provider has not reported verified pricing. Check your provider before generating.';
  }

  private decideAll(action: 'generate' | 'skip'): void {
    if (!this.turn) return;
    const reviewable = (this.turn.imageRequests ?? []).filter(r => r.state === 'review' && !this.submitted.has(r.requestId) && !this.rebuilding.has(r.requestId) && !this.rerolling.has(r.requestId));
    if (reviewable.length === 0) return;
    for (const record of reviewable) {
      try {
        const draft = this.drafts.get(this.draftKey(record));
        const parameters: unknown = action === 'generate' && draft ? JSON.parse(draft.parameters) : {};
        const prompt = draft?.prompt ?? record.prompt;
        const negativePrompt = draft?.negative ?? record.negativePrompt;
        if (action === 'generate') {
          assertPromptLengths(prompt, negativePrompt, record.promptProfile);
          if (!prompt.trim()) continue;
        }
        const request: FrontendRequest = {
          type: 'vn_image_review',
          chatId: this.turn.chatId,
          messageId: this.turn.messageId,
          sourceFingerprint: this.turn.sourceFingerprint,
          requestId: record.requestId,
          action,
          ...(action === 'generate' ? { edits: { prompt, negativePrompt, parameters: (parameters ?? {}) as Record<string, unknown> } } : {})
        };
        this.submitted.add(record.requestId);
        this.send(request);
      } catch (error) {
        this.showError(error instanceof Error ? error.message : String(error));
      }
    }
    this.render();
  }

  setPresentationRules(chat:string,id:string,catalog:PresentationRuleCatalog){return this.preferences.receive(chat,id,catalog);}
  presentationRulesError(error:string,id?:string){this.preferences.error(error,id);}
  destroy(): void { this.comparison.destroy();if(this.lintTimer)clearTimeout(this.lintTimer);this.editHistories.clear();this.previewLoad?.abort();this.previewLoad=null;this.setOpen(false);this.preferences.destroy(); this.drafts.clear(); this.host.remove(); }
}

function friendlyStatus(status: string): string { return ({ browser_ready: "Ready", generated: "Ready", queued: "Waiting", generating: "Generating", review: "Awaiting review", approved: "Approved", cancelled: "Cancelled", skipped: "Skipped", failed: "Failed" } as Record<string, string>)[status] ?? status; }

const DOCKED_STUDIO_CSS=`
:host([data-vn-workspace-tool]:not([data-open="true"])),
:host([data-vn-workspace-tool][hidden]),
:host([data-vn-workspace-tool]) section[hidden] {
  display: none !important;
}
:host([data-vn-workspace-tool][data-open="true"]:not([hidden])){position:relative;inset:auto;display:block;width:100%;height:100%;z-index:auto;pointer-events:auto}
:host([data-vn-workspace-tool]) [data-launch]{display:none}
:host([data-vn-workspace-tool]) section,:host([data-vn-workspace-tool]) section[data-state]{position:relative;inset:auto;width:100%;max-width:none;height:100%;max-height:none;border:0;border-radius:0;box-shadow:none}
:host([data-vn-workspace-tool]) [data-studio-header]{display:none}
:host([data-vn-workspace-tool]) [data-studio-body]{padding:18px;flex:1}
:host([data-vn-workspace-tool]) [data-studio-footer]{padding:12px 18px;margin-bottom:calc(76px + env(safe-area-inset-bottom, 0px));background:transparent;border-top:1px solid var(--edge)}
:host([data-vn-workspace-tool]) [data-studio-footer] button{border-radius:999px;font-weight:750;background:var(--accent);color:#0f2019;border:1px solid var(--accent);box-shadow:0 4px 14px rgba(0,0,0,.25)}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-studio-footer] button{background:#234b39;color:#fbfdf7;border-color:#234b39;box-shadow:0 4px 14px rgba(35,65,50,.2)}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section{color:#172721}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section small,:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) section p{color:#436353}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-context]{background:rgba(235,243,230,.92);border-color:#b9ccbe;color:#172721}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-thumbnail]{background:#fdfefc;border-color:#b9ccbe}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) details{background:rgba(235,243,230,.7);border-color:#b9ccbe;color:#172721}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) details[open]{background:rgba(240,247,236,.95);border-color:#234b39}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) textarea,:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) select,:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) input{background:#fdfefb;border-color:#b3c5b8;color:#172721}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-retry-queue]{background:rgba(235,243,230,.8);border-color:#b9ccbe}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-retry-queue] button{background:#e2ecde;border-color:#b3c5b8;color:#172721;border-radius:999px}
[data-workspace-library]{display:none}
:host([data-vn-workspace-tool]) [data-workspace-library]{display:block;width:100%;background:transparent;margin-bottom:16px}
`;
