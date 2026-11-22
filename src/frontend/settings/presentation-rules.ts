import type {VisualNovelConfig} from '../../config.js';
import { createUiId } from '../request-id.js';
import type {TurnPlan} from '../../shared/contracts.js';
import {
  PresentationRuleCatalogSchema,
  PresentationRuleDraftSchema,
  describePresentationCondition,
  describePresentationAction,
  evaluatePresentationRules,
  type PresentationRuleCatalog,
  type PresentationRuleRequest,
  type PresentationRule,
  type PresentationRuleDraft,
  type RuleCondition,
  type RuleAction
} from '../../shared/presentation-rules.js';

const CSS = `
:host { display:block; color:var(--set-text,var(--vn-shell-text,#eee)); font:15px/1.5 var(--lumiverse-font-family,var(--vn-shell-family,system-ui,sans-serif)); min-width:0; }
* { box-sizing:border-box; }
[hidden] { display:none!important; }
p { line-height:1.5; margin:8px 0; overflow-wrap:anywhere; }
small { display:block; color:var(--set-muted,var(--vn-shell-muted,#bbc)); line-height:1.5; }
label { display:block; margin:12px 0; }
label > span { display:block; margin-bottom:5px; font-weight:600; }
button, input, select { font:inherit; color:inherit; max-width:100%; }
button, select, input { min-height:44px; border:1px solid var(--set-border,var(--vn-shell-border,#646575)); border-radius:9px; background:var(--set-field,var(--vn-shell-field,#181925)); padding:9px 12px; }
input, select { width:100%; font-size:16px; }
button { cursor:pointer; }
button:disabled { opacity:.5; cursor:default; }
button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline:2px solid var(--set-accent,var(--vn-shell-accent,#c1b0eb)); outline-offset:2px; }
.row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.row > * { flex:1 1 auto; }
.rule { padding:12px; border:1px solid var(--set-border,var(--vn-shell-border,#646575)); border-radius:12px; margin:10px 0; }
.rule h4 { margin:0 0 5px; font-size:1em; overflow-wrap:anywhere; }
.rule .row { margin-top:10px; }
.check { display:flex; gap:9px; align-items:center; }
.check input { width:20px; min-height:20px; }
.check span { margin:0; }
.badge { display:inline-block; font-size:0.75em; padding:2px 7px; border-radius:6px; font-weight:600; text-transform:uppercase; margin-left:6px; }
.badge-chat { background:color-mix(in srgb,var(--set-accent,#c1b0eb) 25%,transparent); color:var(--set-accent,#c1b0eb); }
.badge-user { background:color-mix(in srgb,#888 25%,transparent); color:#ccc; }
.badge-conflict { background:color-mix(in srgb,#f87171 25%,transparent); color:#f87171; }
.badge-warning { background:color-mix(in srgb,#fbbf24 25%,transparent); color:#fbbf24; }
.sim-fired { color:#4ade80; font-weight:600; }
.sim-outranked { color:#fbbf24; }
.sim-missed { color:#94a3b8; }
summary { min-height:44px; cursor:pointer; display:flex; align-items:center; gap:8px; font-weight:600; }
summary::before { content:"▸"; color:var(--set-accent,var(--vn-shell-accent,#c1b0eb)); }
details[open] > summary::before { content:"▾"; }
h4 { margin:8px 0; }
fieldset { border:0; padding:0; margin:0; min-width:0; }
form { margin-top:16px; padding-top:8px; border-top:1px solid var(--set-border,var(--vn-shell-border,#646575)); }
[data-preference-preview] { padding:12px; border-left:3px solid var(--set-accent,var(--vn-shell-accent,#c1b0eb)); background:var(--set-surface,transparent); white-space:pre-wrap; }
[data-preference-status] { color:var(--set-accent,var(--vn-shell-accent,#c1b0eb)); white-space:pre-wrap; }
[data-preference-save] { border-color:var(--set-accent,var(--vn-shell-accent,#c1b0eb)); }
.hub-pillars { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; margin-block:14px; }
.hub-pillar { padding:12px; border:1px solid var(--set-border,#444); border-radius:10px; background:var(--set-field,#14151e); font-size:0.9em; }
.hub-pillar strong { display:block; color:var(--set-accent,#c1b0eb); margin-bottom:4px; font-size:1.05em; }
`;

export class PresentationRulesPanel {
  readonly host = document.createElement('div');
  readonly root: ShadowRoot;
  private config: VisualNovelConfig | null = null;
  private catalog: PresentationRuleCatalog | null = null;
  private scope: 'user' | 'chat' = 'chat';
  private loadedChat = '';
  private pending: { id: string; chat: string; mutation: boolean } | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private editingId = '';
  private dirty = false;
  private destroyed = false;
  private currentTurnPlan: TurnPlan | null = null;
  private onSaveConfigCallback?: ((patch: Partial<VisualNovelConfig>) => void) | undefined;

  constructor(
    private getChat: () => string,
    private send: (request: PresentationRuleRequest) => void,
    onSaveConfig?: (patch: Partial<VisualNovelConfig>) => void
  ) {
    this.onSaveConfigCallback = onSaveConfig;
    this.host.dataset.presentationRules = '';
    this.root = this.host.attachShadow({ mode: 'open' });
    this.root.innerHTML = `<style>${CSS}</style>
      <div class="hub-pillars">
        <div class="hub-pillar">
          <strong>1. Scene Direction</strong>
          <span>Presentation Rules, Smart Framing, and Optional Style Overrides.</span>
        </div>
        <div class="hub-pillar">
          <strong>2. Text & Prose Polish</strong>
          <span>Display Regex Rules, Spoilers, and Character Formatting.</span>
        </div>
        <div class="hub-pillar">
          <strong>3. Live Cards & Trackers</strong>
          <span>Panel Dock, SimTracker Mappings, and Live Badges.</span>
        </div>
      </div>

      <label class="check" style="margin-block:12px;padding:8px 12px;border:1px solid var(--set-border,#444);border-radius:8px;background:var(--set-field,#181925)">
        <input data-allow-style-override type="checkbox">
        <span><strong>Allow rules to override active Shared Style</strong> (strictly optional, disabled by default)</span>
      </label>

      <p>Direct the stage camera, templates, backgrounds, audio levels, and visual styles based on live story context.</p>
      <small>Applies during turn planning. Respects model dialects and character identity authorities.</small>

      <label><span>Applies to</span>
        <select data-scope aria-label="Preference scope">
          <option value="chat">This chat</option>
          <option value="user">All my chats</option>
        </select>
      </label>

      <div class="row">
        <button type="button" data-refresh>Refresh preferences</button>
        <button type="button" data-new>New direction rule</button>
        <button type="button" data-test-scene>⚡ Test Against Current Scene</button>
      </div>

      <p data-preference-status role="status" aria-live="polite"></p>
      <div data-sim-results hidden style="margin-block:12px;padding:12px;border:1px solid var(--set-border,#444);border-radius:10px;background:var(--set-field,#14151e)"></div>
      <div data-list></div>

      <details data-examples>
        <summary>Remixable starter packs</summary>
        <div class="row" style="margin-top:8px">
          <button type="button" data-pack="noir_rain">🌧️ Noir Rain</button>
          <button type="button" data-pack="flashback">🕯️ Flashback & Memory</button>
          <button type="button" data-pack="doc_focus">📜 Document & Clue Focus</button>
          <button type="button" data-pack="action_16_9">🎬 Action Widescreen 16:9</button>
          <button type="button" data-pack="two_shot">👥 Two-Shot Dialogue</button>
          <button type="button" data-pack="manga_climax">💥 Manga Climax</button>
        </div>
        <small style="margin-top:6px">Click any pack to pre-fill a tested direction rule. Preview and save to add it.</small>
      </details>

      <form hidden>
        <h4 data-preference-heading>New Scene Direction Rule</h4>
        <fieldset>
          <label><span>Rule Name</span><input data-preference-name aria-label="Rule name" maxlength="80" autocomplete="off"></label>

          <label><span>When (Condition)</span>
            <select data-condition aria-label="Rule condition">
              <optgroup label="Scene & Narrative Beats">
                <option value="dialogue">During attributed dialogue</option>
                <option value="location_changed">At a confirmed location change</option>
                <option value="scene_opening">At scene or turn opening</option>
                <option value="template">When a template would otherwise be chosen</option>
              </optgroup>
              <optgroup label="Subjects & Cast">
                <option value="npc">When an NPC is the picture subject</option>
                <option value="place">At a named location (Place)</option>
                <option value="object">When an item/clue is described</option>
                <option value="cast_present">When a specific cast member is present</option>
                <option value="cast_count">When visible cast count matches</option>
                <option value="speaker_name">When a specific character speaks</option>
                <option value="outfit_matches">When subject outfit matches</option>
              </optgroup>
              <optgroup label="Environment & Atmosphere">
                <option value="time_of_day">During time of day</option>
                <option value="weather">When weather matches</option>
                <option value="ambient">When ambient audio matches</option>
              </optgroup>
              <optgroup label="Dramatic & RPG Context">
                <option value="document_revealed">When a document/clue is revealed</option>
                <option value="shot_intent">When shot intent matches</option>
                <option value="prose_contains">When paragraph prose contains text/regex</option>
                <option value="rpg_state">When RPG state flag matches</option>
                <option value="tracker_field">When SimTracker field matches</option>
              </optgroup>
            </select>
          </label>

          <label data-source-label hidden><span>Original template</span><select data-source aria-label="Original template"></select></label>
          <label data-subject-label hidden>
            <span data-subject-title>Subject Name</span>
            <input data-subject-name aria-label="Subject name" maxlength="256" autocomplete="off">
            <small data-subject-help></small>
          </label>
          <label class="check" data-partial-match-label hidden>
            <input data-partial-match type="checkbox">
            <span>Allow partial substring match (e.g. "Marten House" matches "Marten House - 4th Floor")</span>
          </label>

          <div data-condition-params hidden>
            <label data-val-label hidden><span data-val-title>Value</span><input data-cond-val aria-label="Condition value" maxlength="120"></label>
            <label data-op-label hidden><span>Comparison</span>
              <select data-cond-op aria-label="Condition operator">
                <option value="gte">Greater or equal (≥)</option>
                <option value="eq">Equal (=)</option>
                <option value="lte">Less or equal (≤)</option>
              </select>
            </label>
          </div>

          <label><span>Then (Action)</span>
            <select data-action aria-label="Rule action">
              <optgroup label="Camera & Templates">
                <option value="prefer_template">Prefer an image template</option>
                <option value="prefer_aspect_ratio">Prefer aspect ratio</option>
                <option value="prefer_cast_mode">Prefer cast staging mode</option>
                <option value="prefer_framing">Prefer camera framing</option>
              </optgroup>
              <optgroup label="Stage & Multimedia">
                <option value="limit_effects">Limit stage effects</option>
                <option value="limit_music">Quiet background music</option>
                <option value="hold_background">Hold background</option>
              </optgroup>
              <optgroup label="Documents & Generation Budget">
                <option value="auto_render_document">Auto-render revealed document</option>
                <option value="skip_image_generation">Skip image generation for this beat</option>
              </optgroup>
              <optgroup label="Visual Style (Optional)">
                <option value="prefer_style">Prefer visual style (Optional Style DNA)</option>
              </optgroup>
            </select>
          </label>

          <label data-target-label><span>Prefer template</span><select data-target aria-label="Preferred template"></select></label>
          <label data-ratio-label hidden><span>Aspect ratio</span>
            <select data-ratio aria-label="Preferred aspect ratio">
              <option value="16:9">Widescreen 16:9</option>
              <option value="9:16">Tall Portrait 9:16</option>
              <option value="1:1">Square 1:1</option>
              <option value="3:2">Photo 3:2</option>
              <option value="4:3">Classic 4:3</option>
              <option value="4:5">Portrait 4:5</option>
            </select>
          </label>
          <label data-cast-mode-label hidden><span>Cast staging mode</span>
            <select data-cast-mode aria-label="Preferred cast mode">
              <option value="layered">Layered Sprites</option>
              <option value="illustrated_scene">Illustrated Scene</option>
            </select>
          </label>
          <label data-framing-label hidden><span>Camera framing</span>
            <select data-framing aria-label="Preferred framing">
              <option value="portrait">Portrait</option>
              <option value="upper body">Upper body</option>
              <option value="full body">Full body</option>
              <option value="wide">Wide</option>
              <option value="close-up">Close-up</option>
            </select>
          </label>
          <label data-effect-label hidden><span>Effect limit</span>
            <select data-effect-limit aria-label="Effect limit">
              <option value="gentle">Gentle effects</option>
              <option value="off">No one-shot effects</option>
            </select>
          </label>
          <label data-music-label hidden><span>Music level</span>
            <select data-music-level aria-label="Music level">
              <option value="quiet">Quiet (35% of saved volume)</option>
              <option value="mute">Mute music</option>
            </select>
          </label>
          <label data-hold-mode-label hidden><span>Hold background mode</span>
            <select data-hold-mode aria-label="Hold background mode">
              <option value="stage_backdrop">Keep stage backdrop until scene changes</option>
              <option value="skip_generation">Hold background & skip redundant image generation</option>
            </select>
          </label>
          <label data-style-label hidden><span>Visual style ID / Name</span>
            <input data-style-id aria-label="Style ID" maxlength="120" placeholder="e.g. noir, anime-shinkai, watercolor">
            <small>Active only when "Allow rules to override active Shared Style" is checked.</small>
          </label>

          <label class="check"><input data-preference-enabled type="checkbox" checked><span>Enabled after saving</span></label>

          <details>
            <summary>Priority and Precedence</summary>
            <small>Higher priority wins; the last saved rule breaks ties. This chat overrides All my chats.</small>
            <label><span>Priority (0–100)</span><input data-priority type="number" min="0" max="100" value="50" aria-label="Rule priority"></label>
          </details>

          <p data-preference-preview hidden></p>
          <div class="row">
            <button type="submit" data-preference-save>Save rule</button>
            <button type="button" data-preference-discard>Discard draft</button>
          </div>
        </fieldset>
      </form>`;

    // Dual-editor sync event listener
    window.addEventListener('lumiglyphics:presentation-rules-updated', this.onRulesUpdated);

    this.el<HTMLSelectElement>('[data-scope]').onchange = () => {
      if (this.dirty || this.pending) {
        this.el<HTMLSelectElement>('[data-scope]').value = this.scope;
        this.status('Save or discard your draft before changing scope.');
        return;
      }
      this.scope = this.el<HTMLSelectElement>('[data-scope]').value as 'user' | 'chat';
      this.closeDraft();
      this.renderList();
      this.ensureLoaded();
    };

    const styleOverrideCheckbox = this.el<HTMLInputElement>('[data-allow-style-override]');
    styleOverrideCheckbox.onchange = () => {
      if (this.config) {
        this.config.presentationRulesAllowStyleOverride = styleOverrideCheckbox.checked;
        this.onSaveConfigCallback?.({ presentationRulesAllowStyleOverride: styleOverrideCheckbox.checked });
        this.status(styleOverrideCheckbox.checked ? 'Style overrides enabled.' : 'Style overrides disabled globally.');
        this.renderList();
      }
    };

    this.el('[data-refresh]').onclick = () => this.request({ action: 'list' });
    this.el('[data-new]').onclick = () => this.begin();
    this.el('[data-test-scene]').onclick = () => this.runSceneSimulation();

    // Starter packs
    this.root.querySelectorAll<HTMLButtonElement>('[data-pack]').forEach(button => {
      button.onclick = () => this.applyStarterPack(button.dataset.pack!);
    });

    this.el<HTMLFormElement>('form').oninput = () => {
      this.dirty = true;
      this.syncConditionFields();
      this.preview();
    };

    this.el<HTMLFormElement>('form').onsubmit = e => {
      e.preventDefault();
      const draft = this.draft();
      if (draft) this.request({ action: 'save', scope: this.scope, rule: draft });
    };

    this.el('[data-preference-discard]').onclick = () => {
      if (!this.pending) {
        this.closeDraft();
        this.status('Draft discarded. Saved rules are unchanged.');
      }
    };
  }

  private el<T extends HTMLElement = HTMLElement>(selector: string): T {
    return this.root.querySelector<T>(selector)!;
  }

  guardNavigation(navigate: () => void): boolean {
    if (!this.dirty) { navigate(); return true; }
    let banner = this.root.querySelector<HTMLElement>('[data-rule-nav-confirm]');
    if (!banner) {
      banner = document.createElement('div');
      banner.dataset.ruleNavConfirm = '';
      banner.setAttribute('role', 'alertdialog');
      banner.setAttribute('aria-label', 'Unsaved Scene Direction changes');
      banner.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.22));background:var(--vn-shell-panel,rgba(15,23,42,.92));';
      const msg = document.createElement('span');
      msg.textContent = 'You have unsaved Scene Direction changes. Leave without saving?';
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      const stayBtn = document.createElement('button');
      stayBtn.type = 'button';
      stayBtn.dataset.ruleNavStay = '';
      stayBtn.textContent = 'Keep editing';
      stayBtn.style.cssText = 'min-height:44px;min-width:44px;padding:6px 12px;';
      const leaveBtn = document.createElement('button');
      leaveBtn.type = 'button';
      leaveBtn.dataset.ruleNavLeave = '';
      leaveBtn.textContent = 'Leave without saving';
      leaveBtn.style.cssText = 'min-height:44px;min-width:44px;padding:6px 12px;';
      actions.append(stayBtn, leaveBtn);
      banner.append(msg, actions);
      this.root.prepend(banner);
    }
    banner.hidden = false;
    const stayBtn = banner.querySelector<HTMLButtonElement>('[data-rule-nav-stay]')!;
    const leaveBtn = banner.querySelector<HTMLButtonElement>('[data-rule-nav-leave]')!;
    stayBtn.onclick = () => { banner!.hidden = true; };
    leaveBtn.onclick = () => {
      banner!.hidden = true;
      this.closeDraft();
      navigate();
    };
    stayBtn.focus?.();
    return false;
  }

  setTurnPlan(plan: TurnPlan | null): void {
    this.currentTurnPlan = plan;
  }

  setTurn(turn: { plan?: TurnPlan } | null): void {
    this.currentTurnPlan = turn?.plan ?? null;
  }

  private syncConditionFields() {
    const action = this.el<HTMLSelectElement>('[data-action]').value;
    this.el('[data-target-label]').hidden = action !== 'prefer_template';
    this.el('[data-ratio-label]').hidden = action !== 'prefer_aspect_ratio';
    this.el('[data-cast-mode-label]').hidden = action !== 'prefer_cast_mode';
    this.el('[data-framing-label]').hidden = action !== 'prefer_framing';
    this.el('[data-effect-label]').hidden = action !== 'limit_effects';
    this.el('[data-music-label]').hidden = action !== 'limit_music';
    this.el('[data-hold-mode-label]').hidden = action !== 'hold_background';
    this.el('[data-style-label]').hidden = action !== 'prefer_style';

    const kind = this.el<HTMLSelectElement>('[data-condition]').value;
    this.el('[data-source-label]').hidden = kind !== 'template';
    const isNamed = ['npc', 'place', 'object', 'cast_present', 'speaker_name'].includes(kind);
    this.el('[data-subject-label]').hidden = !isNamed;
    this.el('[data-partial-match-label]').hidden = kind !== 'place';

    if (isNamed) {
      const titles: Record<string, string> = {
        npc: 'NPC Subject Name',
        place: 'Location Name',
        object: 'Item or Clue Name',
        cast_present: 'Cast Member Name',
        speaker_name: 'Speaker Character Name'
      };
      this.el('[data-subject-title]').textContent = titles[kind] ?? 'Subject Name';
    }

    const needsParam = ['cast_count', 'time_of_day', 'weather', 'ambient', 'outfit_matches', 'document_revealed', 'shot_intent', 'prose_contains', 'rpg_state', 'tracker_field'].includes(kind);
    this.el('[data-condition-params]').hidden = !needsParam;
    this.el('[data-val-label]').hidden = !needsParam;
    this.el('[data-op-label]').hidden = kind !== 'cast_count' && kind !== 'rpg_state';
  }

  private status(text: string) {
    this.el('[data-preference-status]').textContent = text;
  }

  private document() {
    return this.catalog?.[this.scope] ?? null;
  }

  private name(id: string) {
    return this.config?.imageTemplates.find(t => t.id === id)?.name ?? id;
  }

  setConfig(config: VisualNovelConfig) {
    this.config = config;
    const styleCheckbox = this.el<HTMLInputElement>('[data-allow-style-override]');
    if (styleCheckbox) {
      styleCheckbox.checked = Boolean(config.presentationRulesAllowStyleOverride);
    }
    for (const key of ['source', 'target']) {
      const select = this.el<HTMLSelectElement>(`[data-${key}]`), old = select.value;
      select.replaceChildren();
      for (const template of config.imageTemplates) {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name + (template.enabled ? '' : ' (disabled)');
        option.disabled = key === 'target' && !template.enabled;
        select.append(option);
      }
      if ([...select.options].some(o => o.value === old)) select.value = old;
      else if (old && this.dirty) {
        const missing = document.createElement('option');
        missing.value = old;
        missing.textContent = `Unavailable template (${old})`;
        missing.disabled = true;
        select.append(missing);
        select.value = old;
      } else if (key === 'target') {
        select.value = config.imageTemplates.find(t => t.enabled)?.id ?? '';
      }
    }
    this.renderList();
  }

  ensureLoaded() {
    if (!this.pending && (!this.catalog || this.loadedChat !== this.getChat())) {
      this.request({ action: 'list' });
    }
  }

  private request(action: Pick<PresentationRuleRequest, 'action'> & Partial<PresentationRuleRequest>) {
    if (this.destroyed || this.pending) return;
    if (action.action !== 'list' && !this.document()) {
      this.status('Refresh this scope before saving. Stored records will not be replaced.');
      return;
    }
    if (action.scope === 'chat' && !this.getChat()) {
      this.status('Open a chat before saving a chat preference.');
      return;
    }
    const id = `preference-${createUiId()}`, chat = this.getChat();
    const request = {
      ...action,
      type: 'vn_presentation_rules',
      version: 1,
      requestId: id,
      ...(chat ? { chatId: chat } : {}),
      ...(action.action === 'list' ? {} : { expectedRevision: this.document()!.revision })
    } as PresentationRuleRequest;

    this.pending = { id, chat, mutation: action.action !== 'list' };
    this.busy(true);
    this.status(action.action === 'list' ? 'Loading preferences…' : 'Saving rule…');

    this.timer = setTimeout(() => {
      if (this.pending?.id !== id) return;
      const mutation = this.pending.mutation;
      this.pending = null;
      this.catalog = null;
      this.busy(false);
      this.renderList();
      this.status(mutation ? 'Save status is unknown. Refresh to verify before trying again. Your draft is kept.' : 'Preferences took too long to load. You can refresh to try again.');
    }, 15000);

    try { this.send(request); }
    catch { this.error('Could not send the request. Refresh to verify saved state.', id); }
  }

  private busy(value: boolean) {
    this.el<HTMLFieldSetElement>('fieldset').disabled = value;
    this.el<HTMLSelectElement>('[data-scope]').disabled = value;
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-list] button,[data-new],[data-refresh],[data-pack],[data-test-scene]')) {
      button.disabled = value;
    }
  }

  receive(chat: string, requestId: string, raw: PresentationRuleCatalog): boolean {
    if (this.destroyed || !this.pending || this.pending.id !== requestId || this.pending.chat !== chat || this.getChat() !== chat) return false;
    const parsed = PresentationRuleCatalogSchema.safeParse(raw);
    if (!parsed.success) {
      this.error('Unsupported preference response. Stored records were preserved.', requestId);
      return false;
    }
    const mutation = this.pending.mutation;
    this.finish();
    this.catalog = parsed.data;
    this.loadedChat = chat;
    if (mutation && parsed.data[this.scope]) this.closeDraft();
    this.renderList();
    this.status(parsed.data.diagnostics.join('\n') || (mutation ? 'Rule saved. Applies to future turn preparations.' : 'Rules are up to date.'));

    window.dispatchEvent(new CustomEvent('lumiglyphics:presentation-rules-updated', {
      detail: { catalog: parsed.data, chatId: chat, scope: this.scope }
    }));
    return true;
  }

  error(text: string, requestId?: string) {
    if (!this.pending || requestId !== this.pending.id) return;
    this.finish();
    this.catalog = null;
    this.renderList();
    this.status(`${text}\nRefresh to verify saved state. Your draft is kept.`);
  }

  private finish() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = null;
    this.busy(false);
  }

  private renderList() {
    const list = this.el('[data-list]');
    list.replaceChildren();
    const doc = this.document();
    this.el<HTMLButtonElement>('[data-preference-save]').disabled = Boolean(this.pending) || !doc;

    if (!doc) {
      const p = document.createElement('p');
      p.textContent = 'Refresh to load this scope. Stored records are preserved.';
      list.append(p);
      return;
    }

    const count = document.createElement('small');
    count.textContent = `${doc.rules.length} / 48 rules · ${this.scope === 'chat' ? 'This chat' : 'All my chats'}`;
    list.append(count);

    if (!doc.rules.length) {
      const p = document.createElement('p');
      p.textContent = 'No rules in this scope. Add one or choose a remixable starter pack below.';
      list.append(p);
    }

    const allOrdered = [...(this.catalog?.chat?.rules ?? []), ...(this.catalog?.user?.rules ?? [])].sort(
      (a, b) => Number(a.scope === 'chat') - Number(b.scope === 'chat') || a.priority - b.priority || a.savedOrder - b.savedOrder || a.id.localeCompare(b.id)
    );

    for (const rule of [...doc.rules].sort((a, b) => b.priority - a.priority || b.savedOrder - a.savedOrder)) {
      const card = document.createElement('article');
      card.className = 'rule';
      const title = document.createElement('h4');
      title.textContent = rule.name;

      const scopeBadge = document.createElement('span');
      scopeBadge.className = `badge ${rule.scope === 'chat' ? 'badge-chat' : 'badge-user'}`;
      scopeBadge.textContent = rule.scope;
      title.append(scopeBadge);

      // Check conflict / shadowing
      const higherIndex = allOrdered.findIndex(r => r.id === rule.id);
      const isShadowed = allOrdered.slice(higherIndex + 1).some(higher =>
        higher.enabled &&
        higher.when.kind === rule.when.kind &&
        higher.then.kind === rule.then.kind
      );
      if (isShadowed) {
        const shadowBadge = document.createElement('span');
        shadowBadge.className = 'badge badge-conflict';
        shadowBadge.textContent = 'Shadowed';
        title.append(shadowBadge);
      }

      // Check inactive prerequisite
      if (rule.then.kind === 'prefer_style' && !this.config?.presentationRulesAllowStyleOverride) {
        const warnBadge = document.createElement('span');
        warnBadge.className = 'badge badge-warning';
        warnBadge.textContent = 'Style Override Off';
        title.append(warnBadge);
      }

      const description = document.createElement('small');
      description.textContent = `${describePresentationCondition(rule.when, id => this.name(id))} → ${describePresentationAction(rule.then, id => this.name(id))} · ${rule.enabled ? 'On' : 'Off'} · priority ${rule.priority}`;

      const row = document.createElement('div');
      row.className = 'row';
      for (const [label, action] of [
        ['Edit', () => this.begin(rule)],
        [rule.enabled ? 'Turn off' : 'Turn on', () => this.mutate({ action: 'toggle', scope: this.scope, id: rule.id, enabled: !rule.enabled })],
        ['Remove', () => {
          if (this.dirty) { this.status('Save or discard your draft before removing a rule.'); return; }
          if (card.querySelector('[data-confirm]')) return;
          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.dataset.confirm = '';
          confirmBtn.textContent = 'Confirm removal';
          confirmBtn.onclick = () => this.mutate({ action: 'delete', scope: this.scope, id: rule.id });
          row.append(confirmBtn);
        }]
      ] as const) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = Boolean(this.pending);
        button.onclick = action;
        row.append(button);
      }
      card.append(title, description, row);
      list.append(card);
    }
  }

  private mutate(action: Partial<PresentationRuleRequest> & Pick<PresentationRuleRequest, 'action'>) {
    if (this.dirty) {
      this.status('Save or discard your draft before changing saved rules.');
      return;
    }
    this.request(action);
  }

  private begin(rule?: PresentationRule) {
    if (this.pending) return;
    if (this.dirty) {
      this.status('Save or discard your current draft first.');
      return;
    }
    this.editingId = rule?.id ?? `rule-${createUiId()}`;
    this.el<HTMLFormElement>('form').hidden = false;
    this.el('[data-preference-heading]').textContent = rule ? 'Edit Scene Direction Rule' : 'New Scene Direction Rule';
    this.el<HTMLInputElement>('[data-preference-name]').value = rule?.name ?? '';

    const condition = rule?.when;
    if (condition) {
      if (condition.kind === 'subject') {
        this.el<HTMLSelectElement>('[data-condition]').value = condition.subjectKind;
        this.el<HTMLInputElement>('[data-subject-name]').value = condition.name;
        this.el<HTMLInputElement>('[data-partial-match]').checked = Boolean(condition.partialMatch);
      } else if (condition.kind === 'template') {
        this.el<HTMLSelectElement>('[data-condition]').value = 'template';
        this.el<HTMLSelectElement>('[data-source]').value = condition.templateId;
      } else if (['cast_present', 'speaker_name'].includes(condition.kind)) {
        this.el<HTMLSelectElement>('[data-condition]').value = condition.kind;
        this.el<HTMLInputElement>('[data-subject-name]').value = (condition as any).name ?? '';
      } else if (condition.kind === 'cast_count') {
        this.el<HTMLSelectElement>('[data-condition]').value = 'cast_count';
        this.el<HTMLSelectElement>('[data-cond-op]').value = condition.op;
        this.el<HTMLInputElement>('[data-cond-val]').value = String(condition.count);
      } else if (['time_of_day', 'weather', 'ambient', 'outfit_matches', 'document_revealed', 'shot_intent', 'prose_contains', 'rpg_state', 'tracker_field'].includes(condition.kind)) {
        this.el<HTMLSelectElement>('[data-condition]').value = condition.kind;
        this.el<HTMLInputElement>('[data-cond-val]').value = String((condition as any).value ?? (condition as any).pattern ?? (condition as any).outfit ?? (condition as any).documentKind ?? (condition as any).intent ?? '');
      } else {
        this.el<HTMLSelectElement>('[data-condition]').value = condition.kind;
      }
    } else {
      this.el<HTMLSelectElement>('[data-condition]').value = 'dialogue';
    }

    const action = rule?.then;
    if (action) {
      this.el<HTMLSelectElement>('[data-action]').value = action.kind;
      if (action.kind === 'prefer_template') this.el<HTMLSelectElement>('[data-target]').value = action.templateId;
      if (action.kind === 'prefer_aspect_ratio') this.el<HTMLSelectElement>('[data-ratio]').value = action.ratio;
      if (action.kind === 'prefer_cast_mode') this.el<HTMLSelectElement>('[data-cast-mode]').value = action.mode;
      if (action.kind === 'prefer_framing') this.el<HTMLSelectElement>('[data-framing]').value = action.framing;
      if (action.kind === 'limit_effects') this.el<HTMLSelectElement>('[data-effect-limit]').value = action.intensity;
      if (action.kind === 'limit_music') this.el<HTMLSelectElement>('[data-music-level]').value = action.level;
      if (action.kind === 'hold_background') this.el<HTMLSelectElement>('[data-hold-mode]').value = action.mode ?? 'stage_backdrop';
      if (action.kind === 'prefer_style') this.el<HTMLInputElement>('[data-style-id]').value = action.styleId;
    } else {
      this.el<HTMLSelectElement>('[data-action]').value = 'prefer_template';
    }

    this.el<HTMLInputElement>('[data-priority]').value = String(rule?.priority ?? 50);
    this.el<HTMLInputElement>('[data-preference-enabled]').checked = rule?.enabled ?? true;
    this.dirty = !rule;
    this.syncConditionFields();
    this.preview();
    this.ensureLoaded();
  }

  propose(target: string, condition: 'dialogue' | 'location_changed' | 'template' = 'dialogue', source?: string) {
    if (this.dirty || this.pending) {
      this.status('Save or discard your current draft first.');
      return;
    }
    this.begin();
    this.el<HTMLInputElement>('[data-preference-name]').value = `Prefer ${this.name(target)}`.slice(0, 80);
    this.el<HTMLSelectElement>('[data-target]').value = target;
    this.el<HTMLSelectElement>('[data-condition]').value = condition;
    this.syncConditionFields();
    if (source) this.el<HTMLSelectElement>('[data-source]').value = source;
    this.preview();
    this.status('Review this draft, then save. Existing pictures stay unchanged.');
  }

  private applyStarterPack(packKey: string) {
    if (this.dirty || this.pending) {
      this.status('Save or discard your current draft first.');
      return;
    }
    this.begin();
    switch (packKey) {
      case 'noir_rain':
        this.el<HTMLInputElement>('[data-preference-name]').value = 'Noir Rain: Moody Atmospheric Beat';
        this.el<HTMLSelectElement>('[data-condition]').value = 'weather';
        this.el<HTMLInputElement>('[data-cond-val]').value = 'rain';
        this.el<HTMLSelectElement>('[data-action]').value = 'limit_music';
        this.el<HTMLSelectElement>('[data-music-level]').value = 'quiet';
        break;
      case 'flashback':
        this.el<HTMLInputElement>('[data-preference-name]').value = 'Flashback Memory: Gentle Stage Tone';
        this.el<HTMLSelectElement>('[data-condition]').value = 'prose_contains';
        this.el<HTMLInputElement>('[data-cond-val]').value = 'remembered';
        this.el<HTMLSelectElement>('[data-action]').value = 'limit_effects';
        this.el<HTMLSelectElement>('[data-effect-limit]').value = 'gentle';
        break;
      case 'doc_focus':
        this.el<HTMLInputElement>('[data-preference-name]').value = 'Document Reveal: Auto-Render Clue';
        this.el<HTMLSelectElement>('[data-condition]').value = 'document_revealed';
        this.el<HTMLInputElement>('[data-cond-val]').value = 'any';
        this.el<HTMLSelectElement>('[data-action]').value = 'auto_render_document';
        break;
      case 'action_16_9':
        this.el<HTMLInputElement>('[data-preference-name]').value = 'Kinetic Action: Cinematic 16:9';
        this.el<HTMLSelectElement>('[data-condition]').value = 'shot_intent';
        this.el<HTMLInputElement>('[data-cond-val]').value = 'action';
        this.el<HTMLSelectElement>('[data-action]').value = 'prefer_aspect_ratio';
        this.el<HTMLSelectElement>('[data-ratio]').value = '16:9';
        break;
      case 'two_shot':
        this.el<HTMLInputElement>('[data-preference-name]').value = 'Intimate Dialogue: Dynamic Two-Shot';
        this.el<HTMLSelectElement>('[data-condition]').value = 'cast_count';
        this.el<HTMLSelectElement>('[data-cond-op]').value = 'eq';
        this.el<HTMLInputElement>('[data-cond-val]').value = '2';
        this.el<HTMLSelectElement>('[data-action]').value = 'prefer_template';
        this.el<HTMLSelectElement>('[data-target]').value = 'two-shot';
        break;
      case 'manga_climax':
        this.el<HTMLInputElement>('[data-preference-name]').value = 'Dramatic Climax: Multi-Panel Manga Page';
        this.el<HTMLSelectElement>('[data-condition]').value = 'shot_intent';
        this.el<HTMLInputElement>('[data-cond-val]').value = 'confrontation';
        this.el<HTMLSelectElement>('[data-action]').value = 'prefer_template';
        this.el<HTMLSelectElement>('[data-target]').value = 'manga-page';
        break;
    }
    this.syncConditionFields();
    this.preview();
    this.status('Starter pack loaded. Review the pre-filled fields, then save.');
  }

  private draft(): PresentationRuleDraft | null {
    const kind = this.el<HTMLSelectElement>('[data-condition]').value;
    const name = this.el<HTMLInputElement>('[data-preference-name]').value.trim();
    if (!name) {
      this.status('Rule name is required.');
      return null;
    }

    let when: RuleCondition;
    if (['npc', 'place', 'object'].includes(kind)) {
      when = {
        kind: 'subject',
        subjectKind: kind as 'npc' | 'place' | 'object',
        name: this.el<HTMLInputElement>('[data-subject-name]').value.trim(),
        ...(kind === 'place' ? { partialMatch: this.el<HTMLInputElement>('[data-partial-match]').checked } : {})
      };
    } else if (kind === 'template') {
      when = { kind: 'template', templateId: this.el<HTMLSelectElement>('[data-source]').value };
    } else if (kind === 'cast_present' || kind === 'speaker_name') {
      when = { kind, name: this.el<HTMLInputElement>('[data-subject-name]').value.trim() };
    } else if (kind === 'cast_count') {
      const parsedCount = Number(this.el<HTMLInputElement>('[data-cond-val]').value);
      when = { kind: 'cast_count', op: this.el<HTMLSelectElement>('[data-cond-op]').value as any, count: Number.isFinite(parsedCount) ? parsedCount : 1 };
    } else if (kind === 'time_of_day') {
      when = { kind: 'time_of_day', value: (this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'night') as any };
    } else if (kind === 'weather') {
      when = { kind: 'weather', value: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'rain' };
    } else if (kind === 'ambient') {
      when = { kind: 'ambient', value: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'rain' };
    } else if (kind === 'outfit_matches') {
      when = { kind: 'outfit_matches', outfit: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'cloak' };
    } else if (kind === 'document_revealed') {
      const val = this.el<HTMLInputElement>('[data-cond-val]').value.trim();
      when = { kind: 'document_revealed', ...(val && val !== 'any' ? { documentKind: val } : {}) };
    } else if (kind === 'shot_intent') {
      when = { kind: 'shot_intent', intent: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'action' };
    } else if (kind === 'prose_contains') {
      when = { kind: 'prose_contains', pattern: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'key' };
    } else if (kind === 'rpg_state') {
      when = { kind: 'rpg_state', key: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'combat' };
    } else if (kind === 'tracker_field') {
      when = { kind: 'tracker_field', field: this.el<HTMLInputElement>('[data-cond-val]').value.trim() || 'location' };
    } else {
      when = { kind } as any;
    }

    const actionKind = this.el<HTMLSelectElement>('[data-action]').value;
    let then: RuleAction;
    if (actionKind === 'prefer_template') {
      then = { kind: 'prefer_template', templateId: this.el<HTMLSelectElement>('[data-target]').value };
    } else if (actionKind === 'prefer_aspect_ratio') {
      then = { kind: 'prefer_aspect_ratio', ratio: this.el<HTMLSelectElement>('[data-ratio]').value as any };
    } else if (actionKind === 'prefer_cast_mode') {
      then = { kind: 'prefer_cast_mode', mode: this.el<HTMLSelectElement>('[data-cast-mode]').value as any };
    } else if (actionKind === 'prefer_framing') {
      then = { kind: 'prefer_framing', framing: this.el<HTMLSelectElement>('[data-framing]').value as any };
    } else if (actionKind === 'limit_effects') {
      then = { kind: 'limit_effects', intensity: this.el<HTMLSelectElement>('[data-effect-limit]').value as any };
    } else if (actionKind === 'limit_music') {
      then = { kind: 'limit_music', level: this.el<HTMLSelectElement>('[data-music-level]').value as any };
    } else if (actionKind === 'hold_background') {
      then = { kind: 'hold_background', mode: this.el<HTMLSelectElement>('[data-hold-mode]').value as any };
    } else if (actionKind === 'auto_render_document') {
      then = { kind: 'auto_render_document', render: true };
    } else if (actionKind === 'skip_image_generation') {
      then = { kind: 'skip_image_generation', skip: true };
    } else if (actionKind === 'prefer_style') {
      then = { kind: 'prefer_style', styleId: this.el<HTMLInputElement>('[data-style-id]').value.trim() || 'noir' };
    } else {
      then = { kind: 'prefer_template', templateId: 'portrait' };
    }

    const parsedPriority = Number(this.el<HTMLInputElement>('[data-priority]').value);
    const parsed = PresentationRuleDraftSchema.safeParse({
      id: this.editingId,
      name,
      enabled: this.el<HTMLInputElement>('[data-preference-enabled]').checked,
      priority: Number.isFinite(parsedPriority) ? parsedPriority : 50,
      when,
      then
    });

    if (!parsed.success) {
      this.status(parsed.error.issues[0]?.message ?? 'Check the rule fields.');
      return null;
    }
    return parsed.data;
  }

  private preview() {
    const rule = this.draft();
    if (!rule) {
      this.el('[data-preference-preview]').hidden = true;
      return;
    }
    const previewEl = this.el('[data-preference-preview]');
    previewEl.textContent = `${describePresentationCondition(rule.when, id => this.name(id))}\n↳ Action: ${describePresentationAction(rule.then, id => this.name(id))}\nScope: ${this.scope === 'chat' ? 'This chat' : 'All my chats'} · Priority: ${rule.priority} · ${rule.enabled ? 'Enabled' : 'Saved Off'}`;
    previewEl.hidden = false;
    this.el<HTMLButtonElement>('[data-preference-save]').disabled = Boolean(this.pending) || !this.document();
  }

  private runSceneSimulation() {
    const resultsEl = this.el('[data-sim-results]');
    resultsEl.hidden = false;
    resultsEl.replaceChildren();

    if (!this.currentTurnPlan || !this.currentTurnPlan.paragraphs.length) {
      resultsEl.innerHTML = `<strong>⚡ Scene Simulator</strong><p class="sim-missed">No active turn plan loaded to test against. Open or read a story turn to simulate live rule matching.</p>`;
      return;
    }

    const plan = this.currentTurnPlan;
    const allRules = [
      ...(this.catalog?.chat?.rules ?? []),
      ...(this.catalog?.user?.rules ?? [])
    ];

    const heading = document.createElement('strong');
    heading.textContent = `⚡ Scene Simulator (Turn: ${plan.paragraphs.length} paragraphs, ${plan.visualCues.length} visual cues)`;
    resultsEl.append(heading);

    for (let i = 0; i < plan.paragraphs.length; i++) {
      const pText = plan.paragraphs[i]?.text ?? '';
      const cue = plan.visualCues.find(c => c.paragraphIndex === i);
      const scene = [...plan.scenes].reverse().find(s => s.startParagraph <= i);

      const decision = evaluatePresentationRules({
        isDialogue: Boolean(plan.paragraphSpeakers[i]?.trim()),
        locationChanged: Boolean(scene && scene.startParagraph === i),
        isSceneOpening: i === 0,
        templateId: cue?.imageTemplate?.id ?? '',
        enabledTemplateIds: this.config?.imageTemplates.filter(t => t.enabled).map(t => t.id) ?? [],
        subjects: scene ? [{ kind: 'place', name: scene.environment.location }] : [],
        ...(scene?.environment.timeOfDay || scene?.environment.time ? { timeOfDay: (scene.environment.timeOfDay ?? scene.environment.time)! } : {}),
        ...(scene?.environment.weather ? { weather: scene.environment.weather } : {}),
        ...(scene?.ambient ? { ambient: scene.ambient } : {}),
        ...(scene?.cast ? { cast: scene.cast, castCount: scene.cast.length } : { castCount: 0 }),
        ...(plan.paragraphSpeakers[i] ? { speakerName: plan.paragraphSpeakers[i]! } : {}),
        paragraphText: pText,
        ...(plan.rpgState ? { rpgState: plan.rpgState as Record<string, unknown> } : {}),
        allowStyleOverride: this.config?.presentationRulesAllowStyleOverride === true
      }, allRules);

      const pBox = document.createElement('div');
      pBox.style.marginBlock = '6px';
      pBox.style.padding = '6px 8px';
      pBox.style.borderLeft = '3px solid #64748b';
      pBox.style.fontSize = '0.9em';

      const pTitle = document.createElement('div');
      pTitle.textContent = `¶${i + 1}: ${pText.slice(0, 70)}…`;
      pBox.append(pTitle);

      if (decision.matchedRuleIds.length > 0) {
        const fired = document.createElement('div');
        fired.className = 'sim-fired';
        fired.textContent = `🟢 Fired: ${decision.matchedRuleIds.length} rule(s) matched [${decision.matchedRuleIds.join(', ')}]`;
        pBox.append(fired);
        if (decision.preferredTemplateId) {
          const detail = document.createElement('div');
          detail.textContent = `   Template override: → ${this.name(decision.preferredTemplateId)}`;
          pBox.append(detail);
        }
        if (decision.preferredAspectRatio) {
          const detail = document.createElement('div');
          detail.textContent = `   Aspect ratio: → ${decision.preferredAspectRatio}`;
          pBox.append(detail);
        }
        if (decision.preferredStyleId) {
          const detail = document.createElement('div');
          detail.textContent = `   Style override: → ${decision.preferredStyleId}`;
          pBox.append(detail);
        }
      } else {
        const missed = document.createElement('div');
        missed.className = 'sim-missed';
        missed.textContent = `⚪ Missed: No direction rules matched conditions for this beat.`;
        pBox.append(missed);
      }
      resultsEl.append(pBox);
    }
  }

  private closeDraft() {
    this.dirty = false;
    this.editingId = '';
    this.el<HTMLFormElement>('form').hidden = true;
    this.el<HTMLButtonElement>('[data-preference-save]').disabled = true;
  }

  clear() {
    this.finish();
    this.catalog = null;
    this.loadedChat = '';
    this.closeDraft();
    this.status('');
    this.renderList();
  }

  private readonly onRulesUpdated = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail && detail.catalog && (detail.chatId === this.getChat() || detail.scope === 'user')) {
      this.catalog = detail.catalog;
      this.renderList();
    }
  };

  destroy() {
    this.destroyed = true;
    window.removeEventListener('lumiglyphics:presentation-rules-updated', this.onRulesUpdated);
    this.clear();
    this.host.remove();
  }
}
