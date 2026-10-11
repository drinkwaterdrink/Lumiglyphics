import type { VisualNovelConfig } from "../../config.js";
import { BUILTIN_IMAGE_TEMPLATES, IMAGE_TEMPLATE_TOKENS, renderImageTemplate, templateSnapshot, validateImageTemplates, type ImageTemplate, type ImageTemplateSnapshot, type ImagePromptMetadata } from "../../shared/image-templates.js";

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
    this.host.innerHTML = `<p>Templates arrange the scene; shared style supplies reusable wording through {{style}}, {{suffix}} and {{negative}}. A template may omit these placeholders to use its own style or exclusions. Changes affect future preparations; held pictures keep their prepared prompts.</p>
      <label data-field><span>Default template</span><select name="defaultImageTemplateId" aria-label="Default template"></select></label>
      <label data-field><span>Prompt format</span><select name="imagePromptFormat" aria-label="Prompt format"><option value="description">Natural-language description</option><option value="tags">Comma-separated tags</option></select><small>Choose wording suited to your model. This changes formatting, not model capabilities.</small></label>
      <label data-field><span>Template to edit</span><select data-template-picker aria-label="Template to edit"></select></label>
      <label data-field><span>Template name</span><input type="text" data-t="name" aria-label="Template name" maxlength="80"></label>
      <label data-check><input type="checkbox" data-t="enabled" aria-label="Template enabled"><span>Available to the story reader</span></label>
      <label data-field><span>Category</span><select data-t="category" aria-label="Template category"><option value="portrait">Character portrait</option><option value="environment">Environment</option><option value="action">Story action</option><option value="detail">Detail / object</option><option value="custom">Custom</option></select></label>
      <label data-field><span>When to use</span><textarea data-t="useWhen" aria-label="When to use template" maxlength="1000"></textarea><small>The story reader uses this guidance when dynamic selection is enabled.</small></label>
      <div data-row><label data-field><span>Visible subjects</span><select data-t="subjectMode" aria-label="Visible subjects"><option value="one">One character</option><option value="none">No people</option></select></label><label data-field><span>Framing</span><select data-t="framing" aria-label="Framing"><option>portrait</option><option>upper body</option><option>full body</option><option>wide</option><option>close-up</option></select></label></div>
      <label data-field><span>Reference policy</span><select data-t="referencePolicy" aria-label="Reference policy"><option value="character">Use character reference when available</option><option value="none">No image references</option></select><small>No-people templates always omit character references.</small></label>
      <label data-field><span>Positive template</span><textarea data-t="positive" aria-label="Template positive prompt" maxlength="8000" spellcheck="false"></textarea></label>
      <label data-field><span>Negative template</span><textarea data-t="negative" aria-label="Template negative prompt" maxlength="8000" spellcheck="false"></textarea></label>
      <small>Placeholders: ${IMAGE_TEMPLATE_TOKENS.map(t => `{{${t}}}`).join(" · ")}. Scene, subjects, action, composition and lighting come from the visual brief. Style, suffix and negative come from shared settings.</small>
      <details><summary>Expanded prompt preview</summary><p data-preview-kind></p><pre data-template-preview style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit"></pre><small>Local preview only; opening this never requests an image. The held picture's Image prompts panel shows its actual prepared request.</small></details>
      <div data-actions><button type="button" data-duplicate>Duplicate template</button><button type="button" data-delete-template>Delete template</button><button type="button" data-add-manga>Add manga page</button></div>
      <div data-actions><button type="button" data-save-templates>Save templates</button><button type="button" data-discard-templates>Discard template changes</button></div><p data-template-status role="status"></p>`;
    mount.append(this.host);
    this.el<HTMLButtonElement>("[data-add-manga]").onclick = () => {
      const existing = this.templates.find(t => t.id === "manga-page");
      if (!existing) {
        if (this.templates.length >= 24) { this.status("The catalog supports up to 24 templates. Remove an unused template first."); return; }
        this.templates.push({ ...BUILTIN_IMAGE_TEMPLATES.find(t => t.id === "manga-page")! });
        this.dirty = true; this.pending = "";
      }
      this.selected = "manga-page"; this.options(); this.renderFields();
      this.status("Manga page selected. Enable it for the story reader, edit its wording, then save templates. It uses its own negatives; adjust shared style if it conflicts with manga. Each page uses one picture from your budget.");
    };
    this.el<HTMLSelectElement>("[data-template-picker]").onchange = () => { this.selected = this.el<HTMLSelectElement>("[data-template-picker]").value; this.renderFields(); };
    this.host.addEventListener("input", e => {
      const field = e.target as HTMLInputElement;
      const key = field.dataset.t as keyof ImageTemplate | undefined;
      const template = this.current();
      if (!key || !template) return;
      Object.assign(template, { [key]: field.type === "checkbox" ? field.checked : field.value });
      if (template.subjectMode === "none") template.referencePolicy = "none";
      this.dirty = true; this.pending = "";
      this.status("Unsaved template changes. Save templates applies the whole catalog.");
      this.options(); this.preview();
      this.el<HTMLSelectElement>('[data-t="referencePolicy"]').value = template.referencePolicy;
      this.el<HTMLSelectElement>('[data-t="referencePolicy"]').disabled = template.subjectMode === "none";
    });
    this.el<HTMLButtonElement>("[data-save-templates]").onclick = () => {
      try {
        const templates = validateImageTemplates(this.templates);
        if (!templates.some(t => t.enabled)) throw new Error("Enable at least one template.");
        const defaultId = templates.some(t => t.enabled && t.id === this.config.defaultImageTemplateId) ? this.config.defaultImageTemplateId : templates.find(t => t.enabled)!.id;
        this.pending = JSON.stringify(templates);
        this.status("Saving templates…");
        this.onSave({ imageTemplates: templates, defaultImageTemplateId: defaultId });
      } catch (e) { this.pending = ""; this.status(e instanceof Error ? e.message : String(e)); }
    };
    this.el<HTMLButtonElement>("[data-discard-templates]").onclick = () => { this.dirty = false; this.pending = ""; this.setConfig(this.config); this.status("Template changes discarded."); };
    this.el<HTMLButtonElement>("[data-duplicate]").onclick = () => {
      const template = this.current(); if (!template || this.templates.length >= 24) { this.status("The catalog supports up to 24 templates."); return; }
      const copy = { ...template, id: `custom-${crypto.randomUUID()}`, name: `${template.name.slice(0, 73)} (copy)` };
      this.templates.push(copy); this.selected = copy.id; this.dirty = true; this.pending = ""; this.options(); this.renderFields(); this.status("Duplicate created. Save templates to keep it.");
    };
    this.el<HTMLButtonElement>("[data-delete-template]").onclick = () => {
      if (this.templates.length <= 1) { this.status("Keep at least one template."); return; }
      this.templates = this.templates.filter(t => t.id !== this.selected); this.selected = this.templates[0]!.id; this.dirty = true; this.pending = ""; this.options(); this.renderFields(); this.status("Template removed from draft. Save templates to apply, or discard to restore.");
    };
  }
  private el<T extends HTMLElement>(selector: string): T { return this.host.querySelector<T>(selector)!; }
  private current(): ImageTemplate | undefined { return this.templates.find(t => t.id === this.selected); }
  private status(text: string): void { this.el<HTMLElement>("[data-template-status]").textContent = text; }
  private options(): void {
    for (const [selector, templates, value] of [["[data-template-picker]", this.templates, this.selected], ['[name="defaultImageTemplateId"]', this.config.imageTemplates.filter(t => t.enabled), this.config.defaultImageTemplateId]] as const) {
      const select = this.el<HTMLSelectElement>(selector); select.replaceChildren();
      for (const template of templates) { const option = document.createElement("option"); option.value = template.id; option.textContent = `${template.name}${template.enabled ? "" : " (disabled)"}`; select.append(option); }
      select.value = value;
    }
  }
  private renderFields(): void {
    const template = this.current();
    for (const field of this.host.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-t]")) {
      const value = template?.[field.dataset.t as keyof ImageTemplate];
      if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = Boolean(value); else field.value = String(value ?? "");
      field.disabled = !template;
    }
    this.el<HTMLSelectElement>('[data-t="referencePolicy"]').disabled = !template || template.subjectMode === "none";
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
        composition: `${template.framing}, ${template.subjectMode === "none" ? "without people" : "one visible character"}`, lighting: brief?.lighting ?? "Soft window light." };
      const output = renderImageTemplate(snapshot, values);
      const format = (text: string) => this.config.imagePromptFormat === "tags" ? text.replace(/[;\n]+/g, ", ") : text;
      this.el<HTMLElement>("[data-preview-kind]").textContent = brief ? "Preview using the latest prepared scene brief and saved shared style. Changing category may need a new story-reader focus." : "Sample scene preview with saved shared style. This is not a prepared image request.";
      this.el<HTMLElement>("[data-template-preview]").textContent = `Positive\n${format(output.prompt)}\n\nNegative\n${format(output.negativePrompt)}`;
      this.onPreview(snapshot);
    } catch { this.el<HTMLElement>("[data-template-preview]").textContent = "Fix the template fields to preview."; }
  }
  setPreviewMetadata(metadata?: ImagePromptMetadata): void { this.metadata = metadata; this.preview(); }
  setSaveError(error: string): void { if (this.pending) { this.pending = ""; this.status(`Could not save templates: ${error}. Your draft is retained.`); } }
  setConfig(config: VisualNovelConfig): void {
    this.config = config;
    if (this.pending && this.pending === JSON.stringify(config.imageTemplates)) { this.pending = ""; this.dirty = false; this.status("Templates saved."); }
    if (!this.dirty) { this.templates = config.imageTemplates.map(t => ({ ...t })); if (!this.current()) this.selected = this.templates[0]?.id ?? ""; }
    this.options(); this.el<HTMLSelectElement>('[name="imagePromptFormat"]').value = config.imagePromptFormat; this.renderFields();
  }
  destroy(): void { this.host.remove(); }
}
