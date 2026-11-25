import { sceneLook, type ReaderPreferences } from '../../shared/reader-preferences.js';
import type { RehearsalCommand, RehearsalLook } from '../../shared/rehearsal-presets.js';

export type RehearsalScene = {
  text: string;
  speaker: string;
  art: string | null;
  fit: 'contain' | 'cover';
  portraits: { url: string; name: string; active: boolean }[];
  effectCap: 'off' | 'gentle' | 'full';
  tint: string;
};

export const REHEARSAL_CSS = `
[data-scene-rehearsal]{padding:0 10px 8px;border-radius:10px;border:1px solid var(--vn-shell-border,#456);min-width:0;overflow-wrap:anywhere}
[data-scene-rehearsal]>summary{min-height:44px;align-content:center;font-weight:650;cursor:pointer;color:var(--vn-shell-accent,#85d9fa)}
[data-rehearsal-preview]{position:relative;isolation:isolate;display:grid;min-height:200px;align-content:end;border-radius:8px;overflow:hidden;background:linear-gradient(165deg,#202b3b,#0c121c)}
[data-rehearsal-art],[data-rehearsal-light]{position:absolute;inset:0;width:100%;height:100%;z-index:-2}
[data-rehearsal-art]{object-fit:var(--rehearsal-fit,cover);transform-origin:50% 45%}
[data-rehearsal-light]{z-index:-1;background:linear-gradient(155deg,var(--rehearsal-tint,transparent),transparent 75%)}
[data-rehearsal-art][data-camera=full]{animation:rehearsal-drift 14s ease-in-out infinite alternate;--rehearsal-scale:1.10}
[data-rehearsal-art][data-camera=gentle]{animation:rehearsal-drift 22s ease-in-out infinite alternate;--rehearsal-scale:1.04}
@keyframes rehearsal-drift{from{transform:scale(1)}to{transform:scale(var(--rehearsal-scale))}}
@media(prefers-reduced-motion:reduce){[data-rehearsal-art][data-camera]{animation:none}}
[data-rehearsal-cast]{display:flex;gap:4px;justify-content:center}
[data-rehearsal-cast] img{min-width:0;max-width:34%;height:clamp(48px,15vh,145px);object-fit:contain;opacity:.82}
[data-rehearsal-cast] img[data-active]{opacity:1;filter:drop-shadow(0 0 10px var(--vn-shell-accent,#85d9fa))}
[data-rehearsal-caption]{margin:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(207,227,244,.38);color:white;background:rgb(14 23 37 / var(--rehearsal-opacity));text-shadow:0 1px 4px #000}
[data-rehearsal-caption] p{margin:4px 0 0;font:1em/1.55 Georgia,serif;max-height:8em;overflow:auto;white-space:pre-wrap}
[data-rehearsal-fields]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}
[data-rehearsal-fields] label{min-width:0;display:grid;gap:4px}
[data-scene-rehearsal] input,[data-scene-rehearsal] select{min-width:0;width:100%;box-sizing:border-box;min-height:44px;font:inherit}
[data-scene-rehearsal] input[type=checkbox]{width:22px}
[data-scene-rehearsal] [role=status]:empty{display:none}
`;

export class SceneRehearsal {
  readonly element = document.createElement('details');
  private preferences: ReaderPreferences | null = null;
  private pending = false;
  private epoch = 0;

  constructor(private readonly send: (command: RehearsalCommand, finish: (prefs?: ReaderPreferences, error?: string) => void) => void) {
    this.element.dataset.sceneRehearsal = '';
    this.element.hidden = true;
  }

  reset(): void {
    this.epoch++;
    this.pending = false;
    this.preferences = null;
    this.element.open = false;
    this.element.hidden = true;
    this.element.ontoggle = null;
    this.element.replaceChildren();
  }

  setScene(scene: RehearsalScene, preferences: ReaderPreferences): void {
    this.reset();
    this.preferences = preferences;
    const summary = document.createElement('summary');
    summary.textContent = 'Scene rehearsal';
    this.element.append(summary);
    this.element.hidden = false;
    this.element.ontoggle = () => {
      if (!this.element.open) return;
      this.build(scene, preferences);
    };
  }

  private build(scene: RehearsalScene, preferences: ReaderPreferences): void {
    const view = document.createElement('div');
    view.dataset.rehearsalPreview = '';
    view.style.setProperty('--rehearsal-fit', scene.fit);
    const art = document.createElement('img');
    art.dataset.rehearsalArt = '';
    art.alt = '';
    art.hidden = !scene.art;
    const empty = document.createElement('p');
    empty.className = 'dir-empty';
    empty.textContent = 'No saved artwork is visible at this passage.';
    empty.hidden = Boolean(scene.art);
    art.onerror = () => { art.hidden = true; empty.hidden = false; };
    if (scene.art) art.src = scene.art;
    const light = document.createElement('div');
    light.dataset.rehearsalLight = '';
    const cast = document.createElement('div');
    cast.dataset.rehearsalCast = '';
    for (const portrait of scene.portraits) {
      const image = document.createElement('img');
      image.src = portrait.url;
      image.alt = portrait.name;
      image.toggleAttribute('data-active', portrait.active);
      image.onerror = () => { image.hidden = true; };
      cast.append(image);
    }
    const caption = document.createElement('div');
    caption.dataset.rehearsalCaption = '';
    const speaker = document.createElement('strong');
    speaker.textContent = scene.speaker;
    const text = document.createElement('p');
    text.textContent = scene.text;
    text.tabIndex = 0;
    caption.append(speaker, text);
    view.append(art, light, cast, caption);

    const camera = document.createElement('select');
    for (const [value, label] of [['off', 'Still'], ['gentle', 'Gentle drift'], ['full', 'Cinematic']]) {
      camera.add(new Option(label, value));
    }
    const lighting = document.createElement('input');
    lighting.type = 'checkbox';
    const opacity = document.createElement('input');
    opacity.type = 'range';
    opacity.min = '0';
    opacity.max = '1';
    opacity.step = '0.01';
    const name = document.createElement('input');
    name.placeholder = 'Evening read';
    name.maxLength = 48;
    const presets = document.createElement('select');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const fields = document.createElement('div');
    fields.dataset.rehearsalFields = '';
    const addField = (label: string, control: HTMLElement) => {
      const item = document.createElement('label');
      control.setAttribute('aria-label', label);
      item.append(label, control);
      fields.append(item);
    };
    addField('Camera move', camera);
    addField('Atmospheric lighting', lighting);
    addField('Caption opacity', opacity);
    addField('Saved presentation', presets);
    addField('Preset name', name);

    const look = (): RehearsalLook => ({
      camera: camera.value as RehearsalLook['camera'], lighting: lighting.checked, captionOpacity: opacity.valueAsNumber,
    });
    const repaint = () => {
      const settings = look();
      const movement = scene.effectCap === 'off' ? 'off'
        : scene.effectCap === 'gentle' && settings.camera === 'full' ? 'gentle' : settings.camera;
      art.dataset.camera = this.element.open ? movement : 'off';
      view.style.setProperty('--rehearsal-tint', settings.lighting && scene.effectCap !== 'off' ? scene.tint : 'transparent');
      caption.style.setProperty('--rehearsal-opacity', String(settings.captionOpacity));
    };
    const setLook = (settings: RehearsalLook) => {
      camera.value = settings.camera;
      lighting.checked = settings.lighting;
      opacity.value = String(settings.captionOpacity);
      repaint();
    };
    const controls = document.createElement('div');
    controls.className = 'dir-row';
    const addButton = (label: string, action: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dir-pill';
      button.textContent = label;
      button.onclick = action;
      controls.append(button);
      return button;
    };
    const updateOptions = (focusName = presets.value) => {
      const choices = this.preferences?.rehearsalPresets ?? [];
      presets.replaceChildren(new Option('Select a preset', ''), ...choices.map(preset => new Option(preset.name, preset.name)));
      if (choices.some(preset => preset.name === focusName)) presets.value = focusName;
    };
    const syncControls = () => {
      save.disabled = this.pending || !name.value.trim();
      apply.disabled = remove.disabled = this.pending || !presets.value;
    };
    const send = (command: RehearsalCommand, success: string) => {
      if (this.pending) return;
      const epoch = this.epoch;
      this.pending = true;
      status.textContent = 'Saving presentation…';
      syncControls();
      this.send(command, (current, error) => {
        if (epoch !== this.epoch) return;
        this.pending = false;
        if (current) {
          this.preferences = current;
          updateOptions(command.action === 'save' ? command.preset.name : presets.value);
        }
        status.textContent = error || success;
        syncControls();
      });
    };
    const save = addButton('Save preset', () => send({ action: 'save', preset: { name: name.value.trim(), ...look() } }, 'Preset saved.'));
    const apply = addButton('Apply selected preset', () => send({ action: 'apply', name: presets.value }, 'Preset applied to the reader.'));
    const remove = addButton('Remove selected preset', () => send({ action: 'remove', name: presets.value }, 'Preset removed.'));
    presets.onchange = () => {
      const picked = this.preferences?.rehearsalPresets?.find(preset => preset.name === presets.value);
      if (picked) { setLook(picked); name.value = picked.name; }
      syncControls();
    };
    name.oninput = syncControls;
    camera.onchange = lighting.onchange = opacity.oninput = repaint;
    this.element.ontoggle = repaint;
    this.element.append(empty, view, fields, controls, status);
    updateOptions();
    setLook(sceneLook(preferences));
    syncControls();
  }
}
