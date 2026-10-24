import { templateSnapshot, type ImagePromptMetadata } from "../src/shared/image-templates.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import {sharedStyleSnapshot} from '../src/shared/shared-style-snapshot.js';
import { ImageStudio } from "../src/frontend/image-review/studio.js";
import type { TurnView } from "../src/protocol.js";
import { VnStage } from '../src/frontend/stage/vn-stage.js';
const mount = document.createElement("div");
Object.assign(mount.style, { position: "relative", width: "100vw", height: "100vh", background: "#161824" });
document.body.append(mount);
const actions: unknown[] = [];
const visibility:boolean[]=[];
const stage = new VnStage({ mount, textSpeed: 0, exitLabel: 'Back to chat',onReviewImages:()=>studio.open(),onReroll:()=>{actions.push({type:'fixture_retry'});} });
stage.loadTurn({ mode: 'standard', paragraphs: [{ id: 'paragraph', text: 'A quiet library.', speaker: 'Mira' }], choices: [] });
const studio = new ImageStudio(stage.panelMount, (request) => actions.push(request), (enabled) => actions.push({ reviewImages: enabled }),open=>{visibility.push(open);if(open)stage.workspace.open('artwork');else stage.workspace.toolClosed('artwork');});
stage.workspace.register('artwork',{element:studio.getElement(),hideAtHome:true,enter:()=>studio.open(),leave:()=>studio.close()});
const turn: TurnView = {
  chatId: "chat", messageId: "message", swipeId: 0, sourceFingerprint: "fingerprint", revision: 0, speaker: "Mira", paragraphs: ["A quiet library."], choices: [], status: "ready",
  assets: [{ jobId: "job", cueId: "cue", paragraphIndex: 0, status: "generating" }],
  imageRequests: [{ requestId: "request", jobId: "job", paragraphIndex: 0, state: "review", prompt: "original <script>hello</script>", negativePrompt: "blurry", model: "model-a", provider: "nanogpt", connectionId: "nano", parameters: { seed: 1 }, referenceSummary: "No reference", createdAt: "2026-10-10T00:00:00.000Z" }]
};
const metadata: ImagePromptMetadata = { template: templateSnapshot(DEFAULT_CONFIG.imageTemplates[0]!), selectionReason: "A quiet character reaction", format: "description", trackerStatus: "detected", trackerSourceMessageId: "tracker-message", brief: { scene: "Library", subjects: "One character", action: "Looking through the window", composition: "portrait", lighting: "Window light", subjectMode: "one", framing: "portrait", referencePolicy: "character", sources: ["Saved appearance override", "Story scene"], conflicts: ["Saved identity retained"] } };
studio.setTurn(turn);
(window as any).imageFixture = { actions, visibility,stage, studio, turn, config: DEFAULT_CONFIG, metadata,sharedStyleSnapshot };
