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
  private metadata: ImagePromptMetadata | undefined;
  private readonly host: HTMLDivElement;
  constructor(mount: HTMLElement, private readonly onSave: (patch: Partial<VisualNovelConfig>) => void, private readonly onPreview: (template: ImageTemplateSnapshot) => void) {
    this.host = document.createElement("div");
    this.host.dataset.templateEditor = "";
    this.host.innerHTML = `<p>Choose the picture type below. Dynamic mode uses only the templates you check. Customize wording when you need finer control; held pictures keep their prepared prompts.</p>
      <label data-field><span>Default template</span><select name="defaultImageTemplateId" aria-label="Default template"></select></label>
      <label data-field><span>Prompt format</span><select name="imagePromptFormat" aria-label="Prompt format"><option value="description">Natural-language description</option><option value="tags">Comma-separated tags</option></select><small>Choose wording suited to your model. This changes formatting, not model capabilities.</small></label>
      <fieldset data-dynamic-templates><legend>Templates used by dynamic mode</legend><small>Checked templates are available when context selection is on. Unchecked templates can still be your default when it is off.</small><div data-template-choices></div></fieldset>
      <details data-template-customize><summary>Customize a template</summary><div data-template-fields>
      <label data-field><span>Template to edit</span><select data-template-picker aria-label="Template to edit"></select></label>
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
      </div></details><div data-actions><button type="button" data-save-templates>Save templates</button><button type="button" data-discard-templates>Discard template changes</button></div><p data-template-status role="status"></p>`;
    mount.append(this.host);
    this.el<HTMLSelectElement>("[data-template-picker]").onchange = () => { this.selected = this.el<HTMLSelectElement>("[data-template-picker]").value; this.renderFields(); };
    this.host.addEventListener("input", e => {
      const field = e.target as HTMLInputElement;
      const dynamicId = field.dataset.dynamicTemplate;
      const key = dynamicId ? "enabled" : field.dataset.t as keyof ImageTemplate | undefined;
      const template = dynamicId ? this.templates.find(t => t.id === dynamicId) : this.current();
      if (!key || !template) return;
      Object.assign(template, { [key]: field.type === "checkbox" ? field.checked : field.value });
      if (template.subjectMode !== "one") template.referencePolicy = "none";
      this.dirty = true; this.pending = "";
      this.status("Unsaved template changes. Save templates applies the whole catalog.");
      this.options(); this.preview();
      this.el<HTMLSelectElement>('[data-t="referencePolicy"]').value = this.current()!.referencePolicy;
      this.el<HTMLSelectElement>('[data-t="referencePolicy"]').disabled = this.current()?.subjectMode !== "one";
    });
    this.el<HTMLButtonElement>("[data-save-templates]").onclick = () => {
      try {
        const templates = validateImageTemplates(this.templates);
        if (this.config.dynamicImageTemplates && !templates.some(t => t.enabled)) throw new Error("Check at least one template for dynamic mode, or turn context selection off.");
        const defaultId = templates.some(t => t.id === this.config.defaultImageTemplateId) ? this.config.defaultImageTemplateId : templates[0]!.id;
        this.pending = JSON.stringify(templates);
        this.status("Saving templates…");
        this.onSave({ imageTemplates: templates, defaultImageTemplateId: defaultId });
      } catch (e) { this.pending = ""; this.status(e instanceof Error ? e.message : String(e)); }
    };
    this.el<HTMLButtonElement>("[data-discard-templates]").onclick = () => { this.dirty = false; this.pending = ""; this.setConfig(this.config); this.status("Template changes discarded."); };
    this.el<HTMLButtonElement>("[data-duplicate]").onclick = () => {
      const template = this.current(); if (!template || this.templates.length >= 32) { this.status("The catalog supports up to 32 templates."); return; }
      const copy = { ...template, id: `custom-${createUiId()}`, name: `${template.name.slice(0, 73)} (copy)` };
      this.templates.push(copy); this.selected = copy.id; this.dirty = true; this.pending = ""; this.options(); this.renderFields(); this.status("Duplicate created. Save templates to keep it.");
    };
    this.el<HTMLButtonElement>("[data-delete-template]").onclick = () => {
        if (this.selected === "manga-page" || this.selected === "ensemble") { this.status(`${this.current()?.name} is built in. Uncheck it in the dynamic list to keep it off.`); return; }
      if (this.templates.length <= 1) { this.status("Keep at least one template."); return; }
      this.templates = this.templates.filter(t => t.id !== this.selected); this.selected = this.templates[0]!.id; this.dirty = true; this.pending = ""; this.options(); this.renderFields(); this.status("Template removed from draft. Save templates to apply, or discard to restore.");
    };
  }
  private el<T extends HTMLElement>(selector: string): T { return this.host.querySelector<T>(selector)!; }
  private current(): ImageTemplate | undefined { return this.templates.find(t => t.id === this.selected); }
  private status(text: string): void { this.el<HTMLElement>("[data-template-status]").textContent = text; }
  private options(): void {
    for (const [selector, templates, value] of [["[data-template-picker]", this.templates, this.selected], ['[name="defaultImageTemplateId"]', this.config.imageTemplates, this.config.defaultImageTemplateId]] as const) {
      const select = this.el<HTMLSelectElement>(selector); select.replaceChildren();
      for (const template of templates) { const option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.append(option); }
      select.value = value;
    }
    this.renderChoices();
  }
  private renderChoices(): void {
    const list = this.el<HTMLElement>("[data-template-choices]");
    const focused = (document.activeElement as HTMLElement | null)?.dataset.dynamicTemplate
      ?? (this.host.getRootNode() as ShadowRoot).activeElement?.getAttribute("data-dynamic-template");
    list.replaceChildren();
    for (const template of this.templates) {
      const label = document.createElement("label"); label.dataset.check = "";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox";
      checkbox.dataset.dynamicTemplate = template.id; checkbox.checked = template.enabled;
      checkbox.setAttribute("aria-label", `${template.name} in dynamic mode`);
      const name = document.createElement("span"); name.textContent = template.name;
      label.append(checkbox, name); list.append(label);
      if (focused === template.id) checkbox.focus();
    }
  }
  private renderFields(): void {
    const template = this.current();
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
  setSaveError(error: string): void { if (this.pending) { this.pending = ""; this.status(`Could not save templates: ${error}. Your draft is retained.`); } }
  setConfig(config: VisualNovelConfig): void {
    this.config = { ...config, imageTemplates: upgradeImageTemplates(config.imageTemplates) };
    if (this.pending && this.pending === JSON.stringify(config.imageTemplates)) { this.pending = ""; this.dirty = false; this.status("Templates saved."); }
    if (!this.dirty) { this.templates = upgradeImageTemplates(config.imageTemplates).map(t => ({ ...t })); if (!this.current()) this.selected = this.templates[0]?.id ?? ""; }
    this.options(); this.el<HTMLSelectElement>('[name="imagePromptFormat"]').value = config.imagePromptFormat; this.renderFields();
  }
  destroy(): void { this.host.remove(); }
}
