import {createUiId} from '../request-id.js';
import { sharedStyleWarnings } from "../../shared/image-styles.js";
import type { VisualNovelConfig } from "../../config.js";
import { IMAGE_TEMPLATE_TOKENS, renderImageTemplate, templateSnapshot, upgradeImageTemplates, validateImageTemplates, type ImageTemplate, type ImageTemplateSnapshot, type ImagePromptMetadata } from "../../shared/image-templates.js";

/** Catalog drafts are separate from the panel's existing shared-style drafts. */
export class ImageTemplateEditor {
  private config!: VisualNovelConfig;
  private templates: ImageTemplate[] = [];
  private selected = "";
  private dirty = false;
  private pending = "";
  private leaveAfterSave: (() => void) | undefined;
  private navigation: (() => void) | undefined;
  private metadata: ImagePromptMetadata | undefined;
  private readonly host: HTMLDivElement;
  constructor(mount: HTMLElement, private readonly onSave: (patch: Partial<VisualNovelConfig>) => void, private readonly onPreview: (template: ImageTemplateSnapshot) => void) {
    this.host = document.createElement("div");
    this.host.dataset.templateEditor = "";
    this.host.innerHTML = `<style>
      [data-template-editor]{min-width:0;overflow-wrap:anywhere}
      [data-template-editor] [hidden]{display:none!important}
      [data-template-editor] [data-template-choices]{display:grid;gap:0}
      [data-template-editor] [data-template-list]{display:grid;gap:16px}
      [data-template-editor] [data-template-row]{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border-bottom:1px solid var(--set-border,var(--lumiverse-border,#5556));padding:8px 0}
      [data-template-editor] [data-open-template]{text-align:start;display:grid;gap:4px;min-width:0;white-space:normal;background:transparent;color:inherit;border:0;padding:8px 0}
      [data-template-editor] [data-open-template] small{font-size:1em;font-weight:400;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--set-muted,inherit)}
      [data-template-editor] [data-template-dynamic-control]{display:grid;justify-items:center;gap:4px;min-width:44px;min-height:44px;padding:8px;cursor:pointer;font-size:1em}
      [data-template-editor] input[type=checkbox]{width:24px;height:24px;min-height:24px}
      [data-template-editor] [data-template-fields]{display:grid;gap:16px;min-width:0}
      [data-template-editor] [data-template-fields] [data-field]{min-width:0}
      [data-template-editor] button,[data-template-editor] select,[data-template-editor] input:not([type=checkbox]),[data-template-editor] summary{min-height:44px;font:inherit}
      [data-template-editor] input,[data-template-editor] select,[data-template-editor] textarea{max-width:100%;min-width:0;box-sizing:border-box}
      [data-template-editor] textarea{font:inherit;min-height:8em;resize:vertical}
      [data-template-editor] [data-template-heading]{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      [data-template-editor] [data-template-heading] h3{margin:0;font-size:1.125em}
      [data-template-editor] [data-template-save-actions]{display:flex;flex-wrap:wrap;gap:8px;padding:16px 0}
      [data-template-editor] [data-template-navigation]{padding:16px;border:1px solid var(--set-border,var(--lumiverse-border,#5556));border-radius:12px;background:var(--set-field,var(--lumiverse-bg-elevated,#202127));color:inherit;margin-block:16px}
      [data-template-editor] [data-template-navigation] [data-actions]{display:flex;gap:8px;flex-wrap:wrap}
      [data-template-editor] [data-template-default]{font-size:1em;color:var(--set-accent,var(--lumiverse-primary,#aebeff))}
      [data-template-editor] [aria-invalid=true]{outline:2px solid var(--set-danger,var(--lumiverse-danger,#d76f79));outline-offset:2px}
      @container (max-width:420px){[data-template-editor] [data-row]{display:grid;grid-template-columns:minmax(0,1fr)}}
    </style>
    <section data-template-list aria-label="Template catalog"><p>Choose a template to edit its wording. Dynamic mode uses only included templates; the default remains a separate choice. Changes affect future preparations.</p>
      <label data-field><span>Default template</span><select name="defaultImageTemplateId" aria-label="Default template"></select></label>
      <label data-field><span>Prompt format</span><select name="imagePromptFormat" aria-label="Prompt format"><option value="description">Natural-language description</option><option value="tags">Comma-separated tags</option></select><small>Used when Automatic model settings is off. Automatic mode supplies model-specific wording guidance; templates and shared styles stay editable.</small></label>
      <div data-dynamic-templates><h3>Templates</h3><p>Included templates are available for selection from story context. Open a name to customize it.</p><div data-template-choices></div></div></section>
      <section data-template-detail hidden aria-label="Template editor"><div data-template-heading><button type="button" data-template-back>← Templates</button><h3 data-template-title></h3></div><p data-template-summary></p><p>Individual template wording uses the saved shared style through placeholders. To change one prepared picture, use its Image prompts panel.</p><div data-template-fields>
      <label data-field><span>Template name</span><input type="text" data-t="name" aria-label="Template name" maxlength="80"></label>
      <details data-template-composition><summary>Composition and context guidance</summary><div data-template-fields><label data-field><span>Category</span><select data-t="category" aria-label="Template category"><option value="portrait">Character portrait</option><option value="environment">Environment</option><option value="action">Story action</option><option value="detail">Detail / object</option><option value="custom">Custom</option></select></label>
      <label data-field><span>When to use</span><textarea data-t="useWhen" aria-label="When to use template" maxlength="1000"></textarea><small>The story reader uses this guidance when dynamic selection is enabled.</small></label>
      <div data-row><label data-field><span>Visible subjects</span><select data-t="subjectMode" aria-label="Visible subjects"><option value="one">One character</option><option value="none">No people</option><option value="ensemble">Everyone in the scene, including persona</option></select><small>Ensemble uses named scene appearances. A single portrait reference is omitted to avoid applying one face to everyone.</small></label><label data-field><span>Framing</span><select data-t="framing" aria-label="Framing"><option>portrait</option><option>upper body</option><option>full body</option><option>wide</option><option>close-up</option></select></label></div>
      <label data-field><span>Output shape</span><select data-t="outputAspectRatio" aria-label="Template output shape"><option value="connection">Use connection settings</option><option value="9:16">Tall portrait (9:16)</option></select><small>Generation → Generated image shape applies across templates. With template defaults, known models use supported sizes: Anima and Qwen Turbo keep portrait framing; Klein uses square output. Explicit parameters and model support can limit the result.</small></label>
      <label data-field><span>Reference policy</span><select data-t="referencePolicy" aria-label="Reference policy"><option value="character">Use character reference when available</option><option value="none">No image references</option></select><small>No-people templates always omit character references.</small></label>
      </div></details><label data-field><span>Positive template</span><textarea data-t="positive" aria-label="Template positive prompt" maxlength="8000" spellcheck="false"></textarea></label>
      <label data-field><span>Negative template</span><textarea data-t="negative" aria-label="Template negative prompt" maxlength="8000" spellcheck="false"></textarea></label>
      <details><summary>Placeholder guide</summary><small>Placeholders: ${IMAGE_TEMPLATE_TOKENS.map(t => `{{${t}}}`).join(" · ")}. Scene, subjects, action, composition and lighting come from the visual brief. Style, suffix and negative come from shared settings. Omit a shared placeholder to use independent wording.</small></details>
      <details><summary>Expanded prompt preview</summary><p data-preview-kind></p><pre data-template-preview style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit"></pre><small>Local preview only; opening this never requests an image. The held picture's Image prompts panel shows its actual prepared request.</small></details>
      <div data-actions><button type="button" data-duplicate>Duplicate template</button><button type="button" data-delete-template>Delete template</button></div>
      </div></section><div data-template-save-actions hidden><button type="button" data-primary data-save-templates>Save templates</button><button type="button" data-discard-templates>Discard template changes</button></div><p data-template-status role="status" aria-live="polite"></p>
      <section data-template-navigation hidden role="alertdialog" aria-modal="false" aria-label="Unsaved template changes"><p>Save template changes before leaving?</p><p>Your changes apply to this template catalog. Stay to keep editing.</p><div data-actions><button type="button" data-template-leave-save>Save and leave</button><button type="button" data-template-leave-discard>Discard and leave</button><button type="button" data-template-stay>Stay</button></div></section>`;
    mount.append(this.host);
    this.el<HTMLButtonElement>("[data-template-back]").onclick = () => this.showList();
    this.host.addEventListener("input", e => {
      const field = e.target as HTMLInputElement;
      const dynamicId = field.dataset.dynamicTemplate;
      const key = dynamicId ? "enabled" : field.dataset.t as keyof ImageTemplate | undefined;
      const template = dynamicId ? this.templates.find(t => t.id === dynamicId) : this.current();
      if (!key || !template) return;
      Object.assign(template, { [key]: field.type === "checkbox" ? field.checked : field.value });
      if (template.subjectMode !== "one") template.referencePolicy = "none";
      this.markChanged();
      this.status("Unsaved template changes. Save templates applies the whole catalog.");
      this.options(); this.preview();
      this.el<HTMLSelectElement>('[data-t="referencePolicy"]').value = this.current()!.referencePolicy;
      this.el<HTMLSelectElement>('[data-t="referencePolicy"]').disabled = this.current()?.subjectMode !== "one";
    });
    this.el<HTMLButtonElement>("[data-save-templates]").onclick = () => this.saveTemplates();
    this.el<HTMLButtonElement>("[data-discard-templates]").onclick = () => this.discard();
    this.el<HTMLButtonElement>("[data-template-leave-save]").onclick = () => { this.leaveAfterSave = this.navigation; this.saveTemplates(); };
    this.el<HTMLButtonElement>("[data-template-leave-discard]").onclick = () => { const navigate = this.navigation; this.discard(); navigate?.(); };
    this.el<HTMLButtonElement>("[data-template-stay]").onclick = () => this.cancelNavigation();
    this.el<HTMLElement>("[data-template-navigation]").addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); this.cancelNavigation(); } });
    this.el<HTMLButtonElement>("[data-duplicate]").onclick = () => {
      const template = this.current(); if (!template || this.templates.length >= 32) { this.status("The catalog supports up to 32 templates."); return; }
      const copy = { ...template, id: `custom-${createUiId()}`, name: `${template.name.slice(0, 73)} (copy)` };
      this.templates.push(copy); this.selected = copy.id; this.markChanged(); this.options(); this.renderFields(); this.status("Duplicate created. Save templates to keep it.");
    };
    this.el<HTMLButtonElement>("[data-delete-template]").onclick = () => {
        if (this.selected === "manga-page" || this.selected === "ensemble") { this.status(`${this.current()?.name} is built in. Uncheck it in the dynamic list to keep it off.`); return; }
      if (this.templates.length <= 1) { this.status("Keep at least one template."); return; }
      this.templates = this.templates.filter(t => t.id !== this.selected); this.selected = this.templates[0]!.id; this.markChanged(); this.options(); this.showList(); this.renderFields(); this.status("Template removed from draft. Save templates to apply, or discard to restore.");
    };
  }
  private el<T extends HTMLElement>(selector: string): T { return this.host.querySelector<T>(selector)!; }
  private current(): ImageTemplate | undefined { return this.templates.find(t => t.id === this.selected); }
  private status(text: string): void { this.el<HTMLElement>("[data-template-status]").textContent = text; }
  private markChanged(): void {
    this.dirty = true; this.pending = ""; this.leaveAfterSave = undefined;
    this.el<HTMLElement>("[data-template-save-actions]").hidden = false;
    this.clearValidation();
  }
  private clearValidation(): void { for (const field of this.host.querySelectorAll<HTMLElement>("[data-t]")) field.removeAttribute("aria-invalid"); }
  private saveTemplates(): void {
    this.clearValidation();
    try {
      const templates = validateImageTemplates(this.templates);
      if (!templates.length) throw new Error("Keep at least one template.");
      if (this.config.dynamicImageTemplates && !templates.some(t => t.enabled)) throw new Error("Include at least one template for dynamic mode, or turn context selection off.");
      const defaultId = templates.some(t => t.id === this.config.defaultImageTemplateId) ? this.config.defaultImageTemplateId : templates[0]!.id;
      this.pending = JSON.stringify(templates);
      this.status("Saving templates…");
      this.onSave({ imageTemplates: templates, defaultImageTemplateId: defaultId });
    } catch (error) {
      this.pending = ""; this.leaveAfterSave = undefined;
      const issues = (error as { issues?: { path: PropertyKey[]; message: string }[] })?.issues;
      const issue = issues?.[0];
      if (issue) {
        const template = this.templates[Number(issue.path[0])];
        if (template) { this.selected = template.id; this.showEditor(); }
        const key = String(issue.path[1] ?? "");
        const field = this.host.querySelector<HTMLElement>(`[data-t="${key.replace(/[^a-zA-Z]/g, "")}"]`);
        const guidance = field?.closest<HTMLDetailsElement>("[data-template-composition]");
        if (guidance) guidance.open = true;
        field?.setAttribute("aria-invalid", "true"); field?.focus();
        this.status(`${template?.name || "Template"}: ${key ? `${key} — ` : ""}${issue.message} Your draft is retained.`);
      } else this.status(`${error instanceof Error ? error.message : String(error)} Your draft is retained.`);
    }
  }
  private discard(): void {
    this.dirty = false; this.pending = ""; this.cancelNavigation();
    this.clearValidation(); this.setConfig(this.config); this.status("Template changes discarded.");
  }
  private cancelNavigation(): void {
    this.navigation = undefined; this.leaveAfterSave = undefined;
    this.el<HTMLElement>("[data-template-navigation]").hidden = true;
  }
  /** The shell calls this before leaving the workspace; internal browsing shares its catalog draft. */
  guardNavigation(navigate: () => void): boolean {
    if (!this.dirty) { navigate(); return true; }
    this.navigation = navigate; this.leaveAfterSave = undefined;
    this.el<HTMLElement>("[data-template-navigation]").hidden = false;
    this.el<HTMLButtonElement>("[data-template-stay]").focus();
    return false;
  }
  private showList(): void {
    this.el<HTMLElement>("[data-template-list]").hidden = false;
    this.el<HTMLElement>("[data-template-detail]").hidden = true;
    this.options();
    this.host.querySelector<HTMLButtonElement>(`[data-open-template="${this.selected}"]`)?.focus();
  }
  private showEditor(): void {
    this.el<HTMLElement>("[data-template-list]").hidden = true;
    this.el<HTMLElement>("[data-template-detail]").hidden = false;
    this.renderFields();
    this.el<HTMLInputElement>('[data-t="name"]').focus();
  }
  private options(): void {
    for (const [selector, templates, value] of [[ '[name="defaultImageTemplateId"]', this.config.imageTemplates, this.config.defaultImageTemplateId]] as const) {
      const select = this.el<HTMLSelectElement>(selector); select.replaceChildren();
      for (const template of templates) { const option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.append(option); }
      select.value = value;
    }
    this.renderChoices();
    this.renderSummary();
  }
  private renderChoices(): void {
    const list = this.el<HTMLElement>("[data-template-choices]");
    const focused = (document.activeElement as HTMLElement | null)?.dataset.dynamicTemplate
      ?? (this.host.getRootNode() as ShadowRoot).activeElement?.getAttribute("data-dynamic-template");
    list.replaceChildren();
    for (const template of this.templates) {
      const row = document.createElement("div"); row.dataset.templateRow = template.id;
      const open = document.createElement("button"); open.type = "button"; open.dataset.openTemplate = template.id;
      const name = document.createElement("strong"); name.textContent = template.name || "Unnamed template";
      const purpose = document.createElement("small"); purpose.textContent = template.useWhen || "Custom template wording.";
      open.append(name, purpose);
      if (template.id === this.config.defaultImageTemplateId) { const badge = document.createElement("span"); badge.dataset.templateDefault = ""; badge.textContent = "Default"; open.append(badge); }
      open.onclick = () => { this.selected = template.id; this.showEditor(); };
      const label = document.createElement("label"); label.dataset.templateDynamicControl = "";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox";
      checkbox.dataset.dynamicTemplate = template.id; checkbox.checked = template.enabled;
      checkbox.setAttribute("aria-label", `${template.name} in dynamic mode`);
      const state = document.createElement("span"); state.textContent = template.enabled ? "Included" : "Off";
      label.append(checkbox, state); row.append(open, label); list.append(row);
      if (focused === template.id) checkbox.focus();
    }
  }
  private renderSummary(): void {
    const template = this.current();
    this.el<HTMLElement>("[data-template-title]").textContent = template?.name || "Template";
    this.el<HTMLElement>("[data-template-summary]").textContent = `${template?.enabled ? "Included in dynamic selection" : "Not included in dynamic selection"}${template?.id === this.config.defaultImageTemplateId ? " · Saved default" : ""}. Template ID: ${template?.id ?? ""}.`;
  }
  private renderFields(): void {
    const template = this.current();
    this.renderSummary();
    for (const field of this.host.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-t]")) {
      const value = template?.[field.dataset.t as keyof ImageTemplate];
      if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = Boolean(value); else field.value = String(value ?? (field.dataset.t === "outputAspectRatio" ? "connection" : ""));
      field.disabled = !template;
    }
    this.el<HTMLSelectElement>('[data-t="referencePolicy"]').disabled = !template || template.subjectMode !== "one";
    this.preview();
  }
  private preview(): void {
    const template = this.current(); if (!template) return;
    try {
      const snapshot = templateSnapshot(template);
      const brief = this.metadata?.brief;
      const values = { style: this.config.promptPrefix, suffix: this.config.promptSuffix, negative: this.config.negativePrompt,
        scene: brief?.scene ?? "A quiet library in late afternoon.", subjects: template.subjectMode === "none" ? "" : brief?.subjects ?? "One visible character with silver hair and a red coat.",
        action: template.subjectMode === "none" ? (template.category === "detail" ? "An old brass key on a wooden table." : "") : brief?.action ?? "Looking toward a rain-streaked window.",
        composition: `${template.framing}, ${template.subjectMode === "none" ? "without people" : template.subjectMode === "ensemble" ? "all listed scene characters, including persona" : "one visible character"}`, lighting: brief?.lighting ?? "Soft window light." };
      const output = renderImageTemplate(snapshot, values);
      const format = (text: string) => this.config.imagePromptFormat === "tags" ? text.replace(/[;\n]+/g, ", ") : text;
      this.el<HTMLElement>("[data-preview-kind]").textContent = brief ? "Preview using the latest prepared scene brief and saved shared style. Changing category may need a new story-reader focus." : "Sample scene preview with saved shared style. This is not a prepared image request.";
      this.el<HTMLElement>("[data-template-preview]").textContent = `Positive\n${format(output.prompt)}\n\nNegative\n${format(output.negativePrompt)}${sharedStyleWarnings(template, values.style, values.suffix, values.negative).map(w => `\n\nNote: ${w}`).join("")}`;
      this.onPreview(snapshot);
    } catch { this.el<HTMLElement>("[data-template-preview]").textContent = "Fix the template fields to preview."; }
  }
  setPreviewMetadata(metadata?: ImagePromptMetadata): void { this.metadata = metadata; this.preview(); }
  setSaveError(error: string): void { if (this.pending) { this.pending = ""; this.leaveAfterSave = undefined; this.status(`Could not save templates: ${error}. Your draft is retained.`); } }
  setConfig(config: VisualNovelConfig): void {
    this.config = { ...config, imageTemplates: upgradeImageTemplates(config.imageTemplates) };
    let navigate: (() => void) | undefined;
    if (this.pending && this.pending === JSON.stringify(config.imageTemplates)) { this.pending = ""; this.dirty = false; this.status("Templates saved."); navigate = this.leaveAfterSave; this.cancelNavigation(); }
    if (!this.dirty) { this.templates = upgradeImageTemplates(config.imageTemplates).map(t => ({ ...t })); if (!this.current()) this.selected = this.templates[0]?.id ?? ""; }
    this.options(); this.el<HTMLSelectElement>('[name="imagePromptFormat"]').value = config.imagePromptFormat;
    this.el<HTMLElement>("[data-template-save-actions]").hidden = !this.dirty;
    if (!this.dirty) this.renderFields(); else this.preview();
    navigate?.();
  }
  destroy(): void { this.host.remove(); }
}
