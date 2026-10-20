import { compactImageRequest } from './image-review.js';
import {resolveImagePromptProfile} from '../../shared/image-prompt-profile.js';
import { describe, expect, test } from "bun:test";
import { ImageReviewGate, applyImageEdits, safeImageParameters, safeImageHistory } from "./image-review.js";

const request = { connection_id: "nano", prompt: "original", negativePrompt: "blurry", model: "model-a", parameters: { seed: 12, width: 1024 }, owner_chat_id: "chat", userId: "alice" };
const meta = { provider: "nanogpt", connectionRevision: 3 };

describe("image request review", () => {
  test("holds without dispatch and claims exactly the edited request once", async () => {
    const records: any[] = [];
    const gate = new ImageReviewGate(async (record) => { records.push(record); });
    const pending = gate.prepare("job", 0, request, meta, true, new AbortController().signal);
    await Promise.resolve();
    expect(records.at(-1).state).toBe("review");
    const id = records.at(-1).requestId;
    expect(gate.decide(id, "generate", { prompt: "edited", negativePrompt: "text", parameters: { seed: 99 } })).toBe(true);
    expect(gate.decide(id, "generate", { prompt: "duplicate" })).toBe(false);
    const approved = await pending;
    expect(approved.prompt).toBe("edited");
    expect(approved.parameters).toEqual({ seed: 99, width: 1024 });
    expect(request.prompt).toBe("original");
    expect(records.at(-1).state).toBe("approved");
    expect(records.at(-1).prompt).toBe("edited");
  });

  test("automatic mode records the final request without waiting", async () => {
    const records: any[] = [];
    const gate = new ImageReviewGate(async (record) => { records.push(record); });
    expect((await gate.prepare("job", 0, request, meta, false, new AbortController().signal)).prompt).toBe("original");
    expect(records.at(-1).state).toBe("prepared");
  });

  test("skip and cancellation release pending approvals without a usable request", async () => {
    const records: any[] = [];
    const gate = new ImageReviewGate(async (record) => { records.push(record); });
    const controller = new AbortController();
    const pending = gate.prepare("job", 0, request, meta, true, controller.signal);
    const observed = pending.catch((error) => error);
    await Promise.resolve();
    controller.abort();
    expect((await observed).name).toBe("AbortError");
    expect(gate.decide(records[0].requestId, "generate", {})).toBe(false);
    const skipped = gate.prepare("job2", 1, request, meta, true, new AbortController().signal);
    const skipError = skipped.catch((error) => error);
    await Promise.resolve();
    gate.decide(records.at(-1).requestId, "skip", {});
    expect((await skipError).name).toBe("AbortError");
    expect(records.at(-1).state).toBe("skipped");
  });

  test("redacts credentials and binary references and forbids reserved overrides", () => {
    expect(safeImageParameters({ seed: 1, api_key: "secret", referenceImages: ["data:image/png;base64,abc"], nested: { authorization: "secret", quality: "high" } })).toEqual({ seed: 1, nested: { quality: "high" } });
    expect(() => applyImageEdits(request, { parameters: { referenceImages: ["evil"] } })).toThrow();
    expect(() => applyImageEdits(request, { prompt: " " })).toThrow();
    expect(() => applyImageEdits(request, { parameters: JSON.parse('{"__proto__":{"x":1}}') })).toThrow();
    expect(safeImageParameters({ resolvedSourceImages: [{ data: "small-base64", mimeType: "image/png" }], image_size: "2K" })).toEqual({ image_size: "2K" });
    expect(() => applyImageEdits(request, { parameters: { resolvedSourceImages: [{ data: "injected" }] } })).toThrow();
  });

  test("structured captions remain consistent with edited positive and negative text", () => {
    const edited = applyImageEdits({ ...request, parameters: { v4_prompt: { caption: { base_caption: "old", char_captions: [] } }, v4_negative_prompt: { caption: { base_caption: "old negative", char_captions: [] } } } }, { prompt: "new", negativePrompt: "new negative" });
    expect((edited.parameters as any).v4_prompt.caption.base_caption).toBe("new");
    expect((edited.parameters as any).v4_negative_prompt.caption.base_caption).toBe("new negative");
  });
  test("omitted values never become replacement parameters", () => {
    const input = { ...request, parameters: { note: "x".repeat(5000), seed: 4 } };
    const visible = safeImageParameters(input.parameters);
    expect(visible).toEqual({ seed: 4 });
    expect(applyImageEdits(input, { parameters: visible }).parameters?.note).toBe(input.parameters.note);
    const nested = { ...request, parameters: { imageConfig: { image_size: "2K" }, options: { referenceImages: ["opaque-reference"], seed: 4 } } };
    const safe = safeImageParameters(nested.parameters);
    expect(safe.imageConfig).toEqual({ image_size: "2K" });
    expect((applyImageEdits(nested, { parameters: safe }).parameters as any).options.referenceImages).toEqual(["opaque-reference"]);
  });
  test("history is bounded and retains active drafts before large older attempts", () => {
    const base = { requestId: "waiting", jobId: "job", paragraphIndex: 0, state: "review", prompt: "x".repeat(32000), negativePrompt: "y".repeat(32000), model: "model", provider: "nanogpt", connectionId: "nano", parameters: { api_key: "secret", seed: 4 }, referenceSummary: "none", createdAt: "now" };
    const history = safeImageHistory([base, ...Array.from({ length: 20 }, (_, index) => ({ ...base, state: "approved", requestId: String(index) })), { state: "review", parameters: null }]);
    expect(history.some((record) => record.requestId === "waiting")).toBe(true);
    expect(JSON.stringify(history).length).toBeLessThan(512100);
    expect(history[0]?.parameters).toEqual({ seed: 4 });
    expect(safeImageHistory(Array.from({ length: 50 }, (_, index) => ({ ...base, prompt: "short", negativePrompt: "short", requestId: String(index) })))).toHaveLength(32);
  });
});

test('oversize automatic requests are held for editing, and cannot be approved over 3000',async()=>{
 const records:any[]=[];const gate=new ImageReviewGate(async r=>{records.push(r);});
 const controller=new AbortController();const pending=gate.prepare('limit-job',0,{prompt:'x'.repeat(3111)},{provider:'nanogpt'},false,controller.signal);
 await Promise.resolve();expect(records[0]?.state).toBe('review');
 expect(()=>gate.decide(records[0]!.requestId,'generate',{prompt:'x'.repeat(3001)})).toThrow('3,000');
 expect(gate.decide(records[0]!.requestId,'generate',{prompt:'Detailed silver-haired character in an observatory.'})).toBe(true);
 expect((await pending).prompt).toContain('silver-haired');
});

test('combined oversize automatic requests hold even when each field fits',async()=>{
 const records:any[]=[]; const gate=new ImageReviewGate(async r=>{records.push(r);});
 const pending=gate.prepare('combined',0,{prompt:'x'.repeat(2800),negativePrompt:'y'.repeat(201)},{provider:'nanogpt'},false,new AbortController().signal);
 await Promise.resolve();expect(records[0]?.state).toBe('review');
 expect(()=>gate.decide(records[0]!.requestId,'generate',{})).toThrow('Combined');
 expect(gate.decide(records[0]!.requestId,'generate',{negativePrompt:'y'.repeat(200)})).toBe(true);
 expect((await pending).negativePrompt?.length).toBe(200);
});

test('negative dedupe alone preserves repeated positive emphasis verbatim',()=>{
 const prompt='Important identity.\n'.repeat(140);const request={prompt,negativePrompt:'blur, '.repeat(100)};
 const compact=compactImageRequest(request);
 expect(compact.prompt).toBe(prompt);expect(compact.negativePrompt).toBe('blur');
});


test('frozen model budgets survive history and enforce small and large approvals',async()=>{
 const profile=resolveImagePromptProfile('nanogpt','unknown',{imagePromptBudgetOverride:true,imagePromptBudget:6000});
 const records:any[]=[];const gate=new ImageReviewGate(async r=>{records.push(r);});
 const prompt='Unique identity and material detail. '.repeat(130);
 const pending=gate.prepare('large',0,{prompt,promptProfile:profile},{provider:'nanogpt'},true,new AbortController().signal);
 await Promise.resolve();expect(records[0].prompt).toBe(prompt);
 expect(safeImageHistory(records)[0]?.promptProfile?.maxCharacters).toBe(6000);
 expect(()=>gate.decide(records[0].requestId,'generate',{negativePrompt:'y'.repeat(2000)})).toThrow('6,000');
 gate.decide(records[0].requestId,'generate',{});expect((await pending).prompt).toBe(prompt);
 const small=resolveImagePromptProfile('nanogpt','z-image-turbo');
 const next=gate.prepare('small',0,{prompt:'x'.repeat(1300),promptProfile:small},{provider:'nanogpt'},false,new AbortController().signal);
 await Promise.resolve();const record=records.at(-1);expect(record.state).toBe('review');
 expect(()=>gate.decide(record.requestId,'generate',{})).toThrow('1,200');
 gate.decide(record.requestId,'generate',{prompt:'A traveller.'});await next;
});

test('positive-only endpoints hold negative constraints for adaptation instead of discarding them',async()=>{
 const profile=resolveImagePromptProfile('nanogpt','blackforestlabs/flux-3/klein/text-to-image');
 const records:any[]=[];const gate=new ImageReviewGate(async r=>{records.push(r);});
 const pending=gate.prepare('positive',0,{prompt:'A quiet station.',negativePrompt:'crowds',promptProfile:profile},{provider:'nanogpt'},false,new AbortController().signal);
 await Promise.resolve();expect(records[0].negativePrompt).toBe('crowds');
 expect(()=>gate.decide(records[0].requestId,'generate',{})).toThrow('positive-only');
 gate.decide(records[0].requestId,'generate',{prompt:'An empty quiet station.',negativePrompt:''});await pending;
});
