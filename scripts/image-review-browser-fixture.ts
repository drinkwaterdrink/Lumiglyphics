import { DEFAULT_CONFIG } from "../src/config.js";
import { ImageStudio } from "../src/frontend/image-review/studio.js";
import type { TurnView } from "../src/protocol.js";
const mount = document.createElement("div");
Object.assign(mount.style, { position: "relative", width: "100vw", height: "100vh", background: "#161824" });
document.body.append(mount);
const actions: unknown[] = [];
const studio = new ImageStudio(mount, (request) => actions.push(request), (enabled) => actions.push({ reviewImages: enabled }));
const turn: TurnView = {
  chatId: "chat", messageId: "message", swipeId: 0, sourceFingerprint: "fingerprint", revision: 0, speaker: "Mira", paragraphs: ["A quiet library."], choices: [], status: "ready",
  assets: [{ jobId: "job", cueId: "cue", paragraphIndex: 0, status: "generating" }],
  imageRequests: [{ requestId: "request", jobId: "job", paragraphIndex: 0, state: "review", prompt: "original <script>hello</script>", negativePrompt: "blurry", model: "model-a", provider: "nanogpt", connectionId: "nano", parameters: { seed: 1 }, referenceSummary: "No reference", createdAt: "2026-10-10T00:00:00.000Z" }]
};
studio.setTurn(turn);
(window as any).imageFixture = { actions, studio, turn, config: DEFAULT_CONFIG };
