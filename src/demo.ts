import { VnStage } from "./frontend/stage/index.js";
import { isThemePresetId } from "./frontend/theme/presets.js";
import { APERTURE_ASSETS } from "./frontend/theme/aperture-assets.js";
import { buildPresentationTimeline } from "./backend/runtime/presentation-timeline.js";
import { VisualNovelSettingsPanel } from "./frontend/settings/panel.js";
import { DEFAULT_CONFIG } from "./config.js";
import { applyVisualConfigToStage } from "./frontend/host/controller.js";
import { normalizeTooltipPreferences } from "./shared/dossiers.js";
import type { TurnKey } from "./shared/contracts.js";
import type { PresentationEntity } from "./shared/presentation-entities.js";

document.body.classList.add("theme-dark");
document.documentElement.dataset.apertureMode = "dark";

const mount = document.querySelector<HTMLElement>("#preview");
if (!mount) throw new Error("Preview mount is missing.");

const query = new URLSearchParams(location.search);
const mode = query.get("mode") === "standard" ? "standard" : "cyoa";
const requestedPreset = query.get("preset");
const themePreset = isThemePresetId(requestedPreset) ? requestedPreset : "lumiverse";

const key: TurnKey = { chatId: "A", assistantMessageId: "m", swipeId: 0, sourceFingerprint: "abcdef12345678", revision: 0 };
const entities: PresentationEntity[] = [
  {
    id: "tibold",
    kind: "npc",
    name: "Tibold",
    aliases: ["Master Scribe"],
    firstParagraph: 0,
    facts: [
      { id: "f1", entityId: "tibold", field: "Height", value: "5'11\"", visibility: "observed", source: { provider: "story", recordId: "r1", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f2", entityId: "tibold", field: "Build", value: "Broad", visibility: "observed", source: { provider: "story", recordId: "r2", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f3", entityId: "tibold", field: "Hair", value: "Dark brown", visibility: "observed", source: { provider: "story", recordId: "r3", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f4", entityId: "tibold", field: "Identifying mark", value: "Facial scar", visibility: "observed", source: { provider: "story", recordId: "r4", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f5", entityId: "tibold", field: "Knowledge", value: "Upper tunnels", visibility: "observed", source: { provider: "story", recordId: "r5", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f6", entityId: "tibold", field: "Behavior", value: "Avoids direct light", visibility: "observed", source: { provider: "story", recordId: "r6", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f7", entityId: "tibold", field: "Role", value: "Master Scribe", visibility: "observed", source: { provider: "story", recordId: "r7", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } },
      { id: "f8", entityId: "tibold", field: "Rank", value: "Senior Cave Raider", visibility: "observed", source: { provider: "story", recordId: "r8", chatId: "A", messageId: "m", sourceFingerprint: "abcdef12345678", observedAt: "2026-10-24T00:00:00Z" }, revealedAt: { key, paragraphIndex: 0 } }
    ]
  },
  { id: "kithall", kind: "place", name: "Kit Hall", aliases: ["Main Training Hall"], firstParagraph: 0, facts: [] },
  { id: "caveraiders", kind: "npc", name: "Cave Raiders", aliases: ["Guild"], firstParagraph: 0, facts: [] },
  { id: "spear", kind: "object", name: "Spear", aliases: ["Weapon"], firstParagraph: 0, facts: [] }
];

const presentation = {
  version: 1 as const,
  snapshots: buildPresentationTimeline({
    key,
    paragraphCount: 4,
    entities,
    baseline: { tibold: { presence: "present" } },
    deltas: [],
    beats: [
      { paragraphIndex: 0, speakerEntityId: "tibold", drawableEntityId: "tibold", locationId: "kithall" },
      { paragraphIndex: 3, speakerEntityId: "tibold", drawableEntityId: "tibold", locationId: "kithall" }
    ]
  }),
  documents: []
};

let rerollCounter = 0;

const stage = new VnStage({
  mount,
  themePreset,
  userCss: "",
  onAdvance: () => {},
  onChoice: async (choice) => {
    stage.setActivity(`Selected: ${choice.label}`, "success");
  },
  onSubmit: async (text) => {
    stage.setActivity(`Submitted: ${text}`, "loading");
  },
  onReroll: () => {
    rerollCounter++;
  },
  onSwipe: () => {
    rerollCounter++;
  },
  onExit: () => stage.setActivity("Exit would restore Lumiverse chat.", "warning"),
});

stage.setTooltipPreferences(normalizeTooltipPreferences({
  enabled: true,
  detail: "expanded",
  maxFactsPerEntity: 12,
  linking: "all-known",
  actionsEnabled: true,
  categories: { npcs: true, locations: true, objects: true },
  fieldGroups: { identity: true, status: true, traits: true, relationships: true, inventory: true, overview: true, state: true },
  rememberReferences: true,
  maxLinksPerParagraph: 12
}));

stage.loadTurn({
  mode,
  initialParagraphIndex: 3,
  presentation,
  paragraphs: [
    { id: "p0", speaker: "NARRATOR", text: "The recruits crossed an archway into a cold corridor. Their footsteps echoed against the high stone walls." },
    { id: "p1", speaker: "NARRATOR", text: "Three coils of hemp rope hit the stone bench in succession—thud, thud, thud—each one measured and squared off against the others." },
    { id: "p2", speaker: "TIBOLD", text: "The cave raider regarded the line of recruits with a measured, unwelcoming stare." },
    { id: "p3", speaker: "TIBOLD", text: "“If the records are incomplete, we must say so plainly,” Tibold murmurs, not lifting his quill from the vellum. “History forgives ignorance far more easily than false certainty.”" }
  ],
  choices: [
    { id: "inspect", label: "Inspect records", value: "Inspect the records on the desk." },
    { id: "observe", label: "Observe recruits", value: "Step back and observe the new recruits." },
    { id: "speak", label: "Address Tibold", value: "Address Master Scribe Tibold directly." }
  ]
});

void stage.setSceneImage({ url: APERTURE_ASSETS.tiboldScene, requestId: "kit-hall-scene", alt: "Kit Hall · Tibold at his desk" });

stage.setCastTurn({
  chatId: key.chatId,
  messageId: key.assistantMessageId,
  swipeId: typeof key.swipeId === "number" ? key.swipeId : 0,
  sourceFingerprint: key.sourceFingerprint,
  revision: key.revision,
  speaker: "TIBOLD",
  paragraphs: [],
  choices: [],
  status: "ready",
  assets: [
    {
      jobId: "tibold-portrait",
      cueId: "tibold-cue",
      paragraphIndex: 0,
      status: "browser_ready",
      stageAsset: { sceneId: "scene-1", role: "portrait", character: "Tibold", attire: "Cave Raider Attire" },
      imageUrl: APERTURE_ASSETS.tiboldPortrait
    },
    {
      jobId: "kit-hall-bg",
      cueId: "kit-hall-cue",
      paragraphIndex: 0,
      status: "browser_ready",
      stageAsset: { sceneId: "scene-1", role: "background", character: "Kit Hall" },
      imageUrl: APERTURE_ASSETS.hallScene
    },
    {
      jobId: "cave-raiders-art",
      cueId: "cave-raiders-cue",
      paragraphIndex: 0,
      status: "browser_ready",
      stageAsset: { sceneId: "scene-1", role: "scene", character: "Cave Raiders" },
      imageUrl: APERTURE_ASSETS.studyScene
    },
    {
      jobId: "spear-art",
      cueId: "spear-cue",
      paragraphIndex: 0,
      status: "browser_ready",
      stageAsset: { sceneId: "scene-1", role: "scene", character: "Spear" },
      imageUrl: APERTURE_ASSETS.tiboldScene
    }
  ]
}, 3);

// Wire Settings Panel into Stage Workspace
const config = structuredClone(DEFAULT_CONFIG);
config.readerPreferences.theme = "dark";
const settingsMount = document.createElement("div");
const settingsPanel = new VisualNovelSettingsPanel({
  mount: settingsMount,
  onSave: (patch) => {
    Object.assign(config, patch);
    applyVisualConfigToStage(stage, config);
  },
  onOpenPreview: () => {},
  onRefreshConnections: () => {}
});
settingsPanel.setConfig(config);

stage.workspace.register("settings", {
  element: settingsPanel.getElement(),
  hideAtHome: true,
  enter: () => { settingsPanel.getElement().dataset.vnWorkspaceTool = "settings"; },
  leave: () => { settingsPanel.leaveWorkspace(); delete settingsPanel.getElement().dataset.vnWorkspaceTool; },
  back: () => settingsPanel.backWithinWorkspace()
});
stage.workspace.onSettingsPage = page => settingsPanel.openPage(page, { focus: true });

Object.assign(globalThis, {
  __visualNovelPreview: stage,
  __settingsPanel: settingsPanel,
  stage
});
