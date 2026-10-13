import { VisualNovelSettingsPanel, type SettingsPanelOptions } from "../src/frontend/settings/panel.js";
import { SpeechSettingsSection } from "../src/frontend/speech/settings-ui.js";
import { DEFAULT_CONFIG, type VisualNovelConfig } from "../src/config.js";
import { normalizeSpeechSettings } from "../src/speech-config.js";

// A tiny in-page host: applies patches like the real controller, records every
// call, and acknowledges saves so the panel can show "Saved".
const mount = document.createElement("div");
Object.assign(mount.style, { position: "relative", minHeight: "100vh", background: "#08090d" });
document.body.append(mount);

const query = new URL(location.href).searchParams;
const memory = new Map<string, string>();
const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } };
if (query.has("setupDone")) memory.set("cue.visual-novel.setup-done", "1");

const fixture = {
  config: { ...DEFAULT_CONFIG, imageParameters: { steps: 28 }, customCss: "[data-vn-dialogue] { opacity: .9; }", ignoredTags: "status, inventory" } as VisualNovelConfig,
  patches: [] as Array<Partial<VisualNovelConfig>>,
  ackMode: (query.get("ack") ?? "sync") as "sync" | "manual",
  previews: 0,
  refreshes: 0,
  scans: [] as string[],
  placeActions: [] as unknown[],
  castActions: [] as unknown[],
  savedSystemOneKeys: [] as string[],
  clearedSystemOneKeys: 0,
  panel: null as VisualNovelSettingsPanel | null,
  speechPatches: [] as unknown[],
  speechListings: 0,
  /** Destroys and rebuilds the panel on the same storage, like reopening the settings tab. */
  remount: () => {},
  storage: null as unknown,
};
const panelOptions: SettingsPanelOptions = {
  mount,
  setupStorage: storage,
  onSave: (patch) => {
    fixture.patches.push(patch);
    fixture.config = { ...fixture.config, ...patch };
    panel.setConfig(fixture.config);
    if (fixture.ackMode === "sync") queueMicrotask(() => panel.setSaveStatus({ kind: "saved" }));
  },
  onOpenPreview: () => { fixture.previews += 1; },
  onRefreshConnections: () => { fixture.refreshes += 1; },
  getChatId: () => 'context-chat',
  onCastGallery:(chatId,requestId,offset)=>panel.setCastGallery(chatId,requestId,{offset,total:13,images:[{id:'supplied',name:'Aleister.png',url:'/api/v1/images/supplied?size=sm'}]}),
  onCastArt:(chatId,requestId,action)=>{
    fixture.castActions.push(action);
    const library={version:1 as const,characters:action.action==='reset'||action.action==='forget'?[]:[{entityId:'aleister',name:'Aleister',artRevision:1,description:'Dark hair, blue coat',preferredVariantId:action.action==='select'?'v':null,variants:[{id:'v',imageId:'saved-art',description:'Dark hair, blue coat',requestFingerprint:'scene-v2:123456789',appearanceFingerprint:'look:123456789',approved:true as const,createdAt:'2026-10-12T00:00:00Z',...(action.action==='supply'?{displayImageId:action.imageId!}:{})}]}]};
    panel.setCastArt(chatId,requestId,library);
  },
  onLocationArt:(chatId,requestId,action)=>{
    fixture.placeActions.push(action);
    const library={version:1 as const,locations:action.action==='reset'||action.action==='forget'?[]:[{entityId:'observatory',name:'Observatory',artRevision:1,description:'Brass telescope',preferredVariantId:action.action==='select'?'v':null,variants:[{id:'v',imageId:'saved-art',requestFingerprint:'scene-v2:123456789',environmentFingerprint:'env:123456789',approved:true as const,createdAt:'2026-10-12T00:00:00Z'}]}]};
    panel.setLocationArt(chatId,requestId,library);
  },
  onRefreshContextSources: (chatId,requestId) => { panel.setContextSourceReport({chatId,requestId,sources:[{provider:'lumibooks',status:'available',recordCount:3,publicFactCount:0,updatedAt:Date.now(),freshness:'current_reference'},{provider:'lumiscript',status:'disabled',recordCount:0,publicFactCount:0,updatedAt:null,freshness:'unknown'}]}); },
  onSaveSystemOneKey: (key) => { fixture.savedSystemOneKeys.push(key); panel.setSystemOneKeyStatus(true); },
  onClearSystemOneKey: () => { fixture.clearedSystemOneKeys += 1; panel.setSystemOneKeyStatus(false); },
  onScanAudio: (directory) => { fixture.scans.push(directory); return { bgmCount: 3, sfxCount: 12 }; },
  onImportAudio: () => {},
};
let panel = new VisualNovelSettingsPanel(panelOptions);
// Mount the speech section inside the Voice section, like the controller does.
let speech: SpeechSettingsSection | null = null;
function mountSpeech(): void {
  speech = new SpeechSettingsSection({
    mount: panel.voiceMount(),
    onSave: (next) => { fixture.speechPatches.push(next); speech?.setConfig(normalizeSpeechSettings(next)); },
    listProfiles: async () => { fixture.speechListings += 1; return []; },
    listVoices: async () => [],
    getChatId: () => "chat-1",
  });
  speech.setConfig(normalizeSpeechSettings({}));
}
if (!query.has("noSpeech")) mountSpeech();
fixture.panel = panel;
fixture.storage = memory;
fixture.remount = () => {
  speech?.destroy();
  panel.destroy();
  panel = new VisualNovelSettingsPanel(panelOptions);
  fixture.panel = panel;
  if (!query.has("noSpeech")) mountSpeech();
  panel.setConfig(fixture.config);
};
if (query.has("card")) fixture.config = { ...fixture.config, useNativeCardImages: true, themePreset: "midnight-noir" };
panel.setConfig(fixture.config);
if (!query.has("noCatalog")) {
  panel.setConnectionCatalog("planner", { status: "ready", options: [
    { id: "text-1", name: "Studio text", provider: "OpenAI", model: "gpt-4o-mini", isDefault: true },
    { id: "text-2", name: "Local text", provider: "Ollama", model: "llama3", isDefault: false },
  ] });
  panel.setConnectionCatalog("image", { status: "ready", options: [
    { id: "img-1", name: "Studio images", provider: "Stability", model: "sd3", isDefault: false },
  ] });
}
Object.assign(window, { settingsFixture: fixture });
