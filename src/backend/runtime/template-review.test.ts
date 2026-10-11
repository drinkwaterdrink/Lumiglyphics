import { expect, test } from "bun:test";
import { ImageReviewGate, safeImageHistory } from "./image-review";
import { normalizeConfig } from "../../config";
import { resolveImageTemplate } from "../../shared/image-templates";
const input = { prompt: "old portrait", parameters: { resolvedReferenceImages: ["private bytes"], seed: 4 } };

test("reprepare retires old approval and dispatches only the new exact draft", async () => {
  const records: any[] = [];
  const gate = new ImageReviewGate(async record => { records.push(record); });
  const pending = gate.prepare("job", 0, input, { provider: "nanogpt", rebuildTemplate: async templateId => ({ request: { prompt: templateId, parameters: { seed: 4 } }, metadata: { provider: "nanogpt", referenceSummary: "No extension reference" } }) }, true, new AbortController().signal);
  await Promise.resolve();
  const oldId = records.at(-1).requestId;
  expect(await gate.reprepare(oldId, "environment")).toBe(true);
  const newId = records.at(-1).requestId;
  expect(newId).not.toBe(oldId);
  expect(gate.decide(oldId, "generate", {})).toBe(false);
  expect(gate.decide(newId, "generate", {})).toBe(true);
  expect((await pending).prompt).toBe("environment");
  expect(records.at(-1).requestId).toBe(newId);
});

test("approval and async reprepare have one winner and cancellation is final", async () => {
  const records: any[] = [];
  const gate = new ImageReviewGate(async record => { records.push(record); });
  let finish!: () => void;
  const controller = new AbortController();
  const pending = gate.prepare("job", 0, input, { provider: "nanogpt", rebuildTemplate: async () => { await new Promise<void>(resolve => { finish = resolve; }); return { request: { prompt: "new" }, metadata: { provider: "nanogpt" } }; } }, true, controller.signal);
  const observed = pending.catch(error => error);
  await Promise.resolve();
  const oldId = records.at(-1).requestId;
  const rebuild = gate.reprepare(oldId, "environment");
  expect(gate.decide(oldId, "generate", {})).toBe(false);
  await Promise.resolve(); await Promise.resolve();
  controller.abort(); finish();
  await expect(rebuild).rejects.toThrow();
  expect((await observed).name).toBe("AbortError");
  expect(records.at(-1).state).toBe("cancelled");
});

test("history retains validated compiled template provenance and legacy absence", async () => {
  const records: any[] = [];
  const gate = new ImageReviewGate(async record => { records.push(record); });
  const template = resolveImageTemplate(normalizeConfig({}), "environment").template;
  const imagePromptMetadata = { template, selectionReason: "New location", format: "description" as const, brief: { scene: "garden", subjects: "", action: "", composition: "wide", lighting: "sunlight", subjectMode: "none" as const, framing: "wide" as const, referencePolicy: "none" as const, sources: ["chat"], conflicts: [] }, trackerStatus: "not_found" as const };
  await gate.prepare("job", 0, input, { provider: "nanogpt", imagePromptMetadata }, false, new AbortController().signal);
  const history = safeImageHistory(records);
  expect(history[0]?.imagePromptMetadata?.template.id).toBe("environment");
  expect(history[0]?.parameters.resolvedReferenceImages).toBeUndefined();
  const { imagePromptMetadata: _, ...legacy } = records[0];
  expect(safeImageHistory([legacy])[0]?.imagePromptMetadata).toBeUndefined();
  expect(safeImageHistory([{ ...legacy, imagePromptMetadata: { ...imagePromptMetadata, brief: { ...imagePromptMetadata.brief, secret: "private" } } }])[0]?.imagePromptMetadata).toBeUndefined();
});
