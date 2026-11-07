import type { SpindleAPI } from "lumiverse-spindle-types";
import { z } from "zod";
import type { VisualNovelConfig } from "../../config.js";
import type { SceneState } from "../../shared/contracts.js";
import { POSE_EXPRESSION_CATALOGUE } from "../../shared/character.js";
import { getAudioCatalog, tokenizeText } from "./audio-catalog.js";

/** Caps per question. Candidates are chosen by relevance to the paragraph, not catalog order. */
export const SYSTEM_ONE_LIMITS = { paragraphs: 24, expressions: 16, music: 24, sounds: 24 } as const;
const RELEVANCE_STOPWORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "was", "were", "you", "are", "but", "not", "its", "their", "they", "them", "had", "has", "have", "she", "her", "his", "him"]);

const SEMANTIC_SYNONYMS: ReadonlyArray< readonly [RegExp, readonly string[]] > = [
  [/\b(?:furious|rage|raging|shouted|shouts|glared|glares|snarled|hostile|wrath)\b/i, ["angry", "frown", "scowl", "tense", "battle", "dramatic"]],
  [/\b(?:chuckled|chuckles|giggled|giggles|grinned|grins|warmly|cheerful|delighted|beamed)\b/i, ["smile", "happy", "laugh", "joy", "calm", "warm"]],
  [/\b(?:trembled|trembles|pale|shivered|shivers|dread|terrified|horrified|panicked|gasped)\b/i, ["afraid", "fear", "scared", "nervous", "shock", "suspense", "eerie"]],
  [/\b(?:blushed|blushes|flustered|cheeks|stammered|bashful)\b/i, ["embarrassed", "shy", "blush", "sweet", "romantic"]],
  [/\b(?:wept|weeps|sobbed|sobs|grief|mournful|heartbroken|tears)\b/i, ["sad", "cry", "tears", "sorrow", "melancholy"]],
  [/\b(?:blade|clash|combat|strike|slash|parry|ambush|duel|explosion)\b/i, ["battle", "action", "fight", "sword", "drums", "impact"]]
];
function relevanceWords(text: string): Set<string> {
  const base = new Set(tokenizeText(text).filter((word) => word.length >= 3 && !RELEVANCE_STOPWORDS.has(word)));
  for (const [pattern, extras] of SEMANTIC_SYNONYMS) {
    if (pattern.test(text)) for (const extra of extras) base.add(extra);
  }
  return base;
}

/**
 * Orders candidates by word overlap with the text (name and tags against the
 * paragraph). Ties keep catalog order, so with no overlap the result matches
 * the previous first-N behaviour. `always` ids are offered first when present.
 */
export function rankByRelevance<T extends { id: string; name: string; tags: string[] }>(items: readonly T[], text: string, limit: number, always: readonly string[] = []): T[] {
  const words = relevanceWords(text);
  const scored = items.map((item, index) => {
    const score = [...relevanceWords(`${item.name} ${item.tags.join(" ")} ${item.id}`)].filter((word) => words.has(word)).length;
    return { item, index, score };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const picked: T[] = [];
  for (const id of always) {
    const hit = items.find((item) => item.id === id);
    if (hit && picked.length < limit) picked.push(hit);
  }
  for (const { item } of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
}

export type SystemOneCoverage = {
  paragraphs: { answered: number; total: number; submitted?:number; skipped?:number; truncated?:number; failed?:number };
  sceneAnswered?:boolean;
  reasons?:string[];
  expressions: { offered: number; total: number };
  bgm: { offered: number; total: number };
  sfx: { offered: number; total: number };
};

/** Diagnostics line, for example "paragraphs 24/30, bgm 24/120". */
export function formatSystemOneCoverage(coverage: SystemOneCoverage): string {
  return `paragraphs ${coverage.paragraphs.answered}/${coverage.paragraphs.total}, expressions ${coverage.expressions.offered}/${coverage.expressions.total}, bgm ${coverage.bgm.offered}/${coverage.bgm.total}, sfx ${coverage.sfx.offered}/${coverage.sfx.total}${coverage.paragraphs.submitted===undefined?'':`, submitted ${coverage.paragraphs.submitted}, skipped ${coverage.paragraphs.skipped}, truncated ${coverage.paragraphs.truncated}, failed ${coverage.paragraphs.failed}`}`;
}

export const SYSTEM_ONE_KEY = "system_one_api_key";

export function systemOneEndpoint(apiUrl: string): string {
  const base = new URL(apiUrl.trim());
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) {
    throw new Error("System One URL must use HTTPS or local HTTP");
  }
  if (base.username || base.password) throw new Error("System One URL cannot contain credentials");
  const path = base.pathname.replace(/\/+$/, "");
  base.pathname = path.endsWith("/v1/systemone") ? path : `${path.endsWith("/v1") ? path : `${path}/v1`}/systemone`;
  base.search = "";
  base.hash = "";
  return base.toString();
}

const Answer = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), choice: z.string(), confidence: z.number().min(0).max(1), probabilities: z.record(z.string(), z.number()) }),
  z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
]);
const Response = z.object({
  model: z.string(),
  answers: z.record(z.string(), Answer),
  usage: z.object({ input_tokens: z.number().nullable().optional(), output_tokens: z.number().nullable().optional() }).optional(),
});
type AnswerValue = z.infer<typeof Answer>;

export type SystemOneDecisions = {
  speakers: Map<number, string>;
  expressions: Map<number, string>;
  bgm: Map<number, string>;
  sfx: Map<number, string>;
  sceneChange: boolean;
  needsDescription: boolean;
  durationMs: number;
  inputTokens: number;
  /** Number of batched API requests made for this decision. */
  requests: number;
  coverage: SystemOneCoverage;
};

/** The Spindle CORS DTO carries no abort signal, so the deadline races the proxy. */
export const SYSTEM_ONE_TIMEOUT_MS = 15_000;

function systemOneTimeout(ms: number): Error {
  const error = new Error(`System One request timed out after ${ms} ms.`);
  error.name = "TimeoutError";
  return error;
}

/**
 * Race the CORS proxy call against a wall-clock deadline and the caller's
 * abort signal. The proxy request itself cannot be cancelled, so a late
 * response is simply discarded; planning must never wait on a hung endpoint.
 */
async function boundedSystemOne<T>(operation:()=>Promise<T>,timeoutMs:number,signal?:AbortSignal,onDispatch?:()=>void):Promise<T>{
  const cancelled=()=>{const error=new Error('System One request cancelled.');error.name='AbortError';return error;};
  if(signal?.aborted)throw cancelled();
  let timer:ReturnType<typeof setTimeout>|undefined;let abort=()=>{};
  const stop=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(systemOneTimeout(timeoutMs)),timeoutMs);abort=()=>reject(cancelled());signal?.addEventListener('abort',abort,{once:true});});
  try{if(signal?.aborted)throw cancelled();onDispatch?.();return await Promise.race([operation(),stop]);}
  finally{if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
async function boundedCors(spindle:SpindleAPI,endpoint:string,init:{method:'POST';headers:Record<string,string>;body:string},timeoutMs:number,signal?:AbortSignal,onDispatch?:()=>void):Promise<{status:number;body:string}>{
  return boundedSystemOne(()=>spindle.cors(endpoint,init) as Promise<{status:number;body:string}>,timeoutMs,signal,onDispatch);
}

/** A missing answer means "no change detected" — never invent a scene cut. */
function noulTripped(answer: AnswerValue | undefined, threshold: number): boolean {
  return answer?.type === "noul" && answer.noul > threshold;
}

function chosen(answer: AnswerValue | undefined, allowed: Set<string>, threshold: number): string | null {
  if (answer?.type !== "choice" || answer.confidence < threshold || !allowed.has(answer.choice)) return null;
  return answer.choice;
}

export async function decidePresentation(
  spindle: SpindleAPI,
  input: { paragraphs: Array<{ index: number; text: string }>; previousScene: SceneState | null; names: string[]; personaName?: string; config: VisualNovelConfig; userId?: string; signal?: AbortSignal; timeoutMs?: number; onDispatch?:()=>void; onResponse?:(usage:{input_tokens?:number|null|undefined;output_tokens?:number|null|undefined})=>void },
): Promise<SystemOneDecisions | null> {
  if (input.config.systemOneMode === "off") return null;
  const started=Date.now(),deadline=started+Math.max(1,input.timeoutMs??SYSTEM_ONE_TIMEOUT_MS);
  const key = await boundedSystemOne(()=>spindle.enclave.get(SYSTEM_ONE_KEY,input.userId),Math.max(1,deadline-Date.now()),input.signal).catch(error=>{if(error instanceof Error&&error.name==='TimeoutError')throw systemOneTimeout(input.timeoutMs??SYSTEM_ONE_TIMEOUT_MS);throw error;});
  if (!key) return null;
  const model = input.config.systemOneModel.trim();
  if (!model) throw new Error("System One model is missing");
  const endpoint = systemOneEndpoint(input.config.systemOneApiUrl);

  const names = [...new Set(["Narrator", ...(input.personaName ? [input.personaName] : []), ...input.names].filter(Boolean))].slice(0, 32);
  const audio = getAudioCatalog();
  const poseById = new Map(POSE_EXPRESSION_CATALOGUE.map((pose) => [pose.id, pose]));
  const poseCandidates = POSE_EXPRESSION_CATALOGUE.map((pose) => ({ id: pose.id, name: pose.id.replace(/_/g, " "), tags: pose.suffix.split(/,\s*/) }));
  // Candidates per paragraph: ranked by relevance to that paragraph's text.
  const offered = new Map<number, { expressions: Set<string>; bgm: Set<string>; sfx: Set<string> }>();
  const offeredCounts = { expressions: 0, bgm: 0, sfx: 0 };
  const questions: Record<string, unknown> = {};
  // Reuse is safe only when the scene questions can see every paragraph in full.
  const completeSceneView = input.paragraphs.length <= 7 && input.paragraphs.every((paragraph) => paragraph.text.length <= 3000);
  if (input.previousScene && completeSceneView) {
    questions.scene_change = { type: "noul", instructions: "Does the target response explicitly move to a different physical location, make a major time jump, or replace the visible environment? A speaker change alone is not a scene change." };
    questions.needs_description = { type: "noul", instructions: "Does the target response add a visible location, wardrobe, appearance, prop, or action not represented in the previous scene?" };
  }
  for (const paragraph of input.paragraphs.slice(0, SYSTEM_ONE_LIMITS.paragraphs)) {
    const index = paragraph.index;
    const poses = rankByRelevance(poseCandidates, paragraph.text, SYSTEM_ONE_LIMITS.expressions, ["idle"]);
    const music = rankByRelevance(audio.bgm, paragraph.text, SYSTEM_ONE_LIMITS.music);
    const sounds = rankByRelevance(audio.sfx, paragraph.text, SYSTEM_ONE_LIMITS.sounds);
    offered.set(index, { expressions: new Set(poses.map((pose) => pose.id)), bgm: new Set(music.map((entry) => entry.id)), sfx: new Set(sounds.map((entry) => entry.id)) });
    offeredCounts.expressions = Math.max(offeredCounts.expressions, poses.length);
    offeredCounts.bgm = Math.max(offeredCounts.bgm, music.length);
    offeredCounts.sfx = Math.max(offeredCounts.sfx, sounds.length);
    questions[`speaker_${index}`] = { type: "choice", instructions: `Who speaks or owns paragraph ${index}? Choose Narrator for omniscient narration; choose unknown when the text does not identify a speaker.`, criteria: Object.fromEntries([...names, "unknown"].map((name) => [name, name === "unknown" ? "The speaker cannot be determined" : name === "Narrator" ? "Omniscient narration rather than a named speaker" : `The paragraph is spoken or owned by ${name}`])) };
    questions[`expression_${index}`] = { type: "choice", instructions: `Which expression should the on-screen companion show as a reaction to paragraph ${index}?`, criteria: Object.fromEntries(poses.map((pose) => [pose.id, poseById.get(pose.id)?.suffix ?? pose.id])) };
    if (music.length) questions[`bgm_${index}`] = { type: "choice", instructions: `Should background music change at paragraph ${index}?`, criteria: { keep_current: "No music change", ...Object.fromEntries(music.map((entry) => [entry.id, `${entry.name}; ${entry.tags.join(", ")}`])) } };
    if (sounds.length) questions[`sfx_${index}`] = { type: "choice", instructions: `Is a sound effect clearly called for at paragraph ${index}?`, criteria: { none: "No sound effect", ...Object.fromEntries(sounds.map((entry) => [entry.id, `${entry.name}; ${entry.tags.join(", ")}`])) } };
  }
  const paragraphs = input.paragraphs.slice(0, SYSTEM_ONE_LIMITS.paragraphs);
  const serialize=(batch:typeof paragraphs,sceneQuestions:boolean)=>{
    const batchQuestions:Record<string,unknown>=sceneQuestions&&questions.scene_change?{scene_change:questions.scene_change,needs_description:questions.needs_description}:{};
    for(const paragraph of batch)for(const prefix of ['speaker','expression','bgm','sfx']){const name=`${prefix}_${paragraph.index}`;if(questions[name])batchQuestions[name]=questions[name];}
    return JSON.stringify({model,state:{previousScene:input.previousScene?{environment:input.previousScene.environment,character:input.previousScene.character,attire:input.previousScene.attire}:null,paragraphs:batch.map(p=>({index:p.index,text:p.text.slice(0,3000)}))},questions:batchQuestions});
  };
  const fits=(body:string)=>new TextEncoder().encode(body).length<=65536;
  const sceneQuestions=completeSceneView&&fits(serialize(paragraphs,true));
  const batches:Array<{paragraphs:typeof paragraphs;body:string}>=[];
  const reasons=new Set<string>();const skipped=new Set<number>(),submitted=new Set<number>(),failed=new Set<number>();
  let pending:typeof paragraphs=[];
  const flush=()=>{if(pending.length){batches.push({paragraphs:pending,body:serialize(pending,sceneQuestions)});pending=[];}};
  // Preflight every body before ANY request. A large earlier candidate never starts paid siblings then rejects locally.
  for(const paragraph of paragraphs){const next=[...pending,paragraph];if(next.length>7||!fits(serialize(next,sceneQuestions)))flush();if(!fits(serialize([paragraph],sceneQuestions))){skipped.add(paragraph.index);reasons.add('byte-budget');continue;}pending.push(paragraph);}
  flush();if(input.paragraphs.length>paragraphs.length)reasons.add('paragraph-budget');
  const truncated=paragraphs.filter(p=>p.text.length>3000);if(truncated.length)reasons.add('paragraph-text-budget');
  const parsedBatches:Array<z.infer<typeof Response>>=[];let nextBatch=0,requests=0,lastError:unknown=null;
  const run=async()=>{while(nextBatch<batches.length){
    if(input.signal?.aborted){const e=new Error('System One request cancelled.');e.name='AbortError';throw e;}
    const batch=batches[nextBatch++]!;const remaining=deadline-Date.now();
    if(remaining<=0){batch.paragraphs.forEach(p=>skipped.add(p.index));reasons.add('deadline');lastError=systemOneTimeout(input.timeoutMs??SYSTEM_ONE_TIMEOUT_MS);continue;}
    try{
      const response=await boundedCors(spindle,endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:batch.body},remaining,input.signal,()=>{requests++;batch.paragraphs.forEach(p=>submitted.add(p.index));input.onDispatch?.();});
      if(response.status<200||response.status>=300)throw new Error(`System One request failed (${response.status})`);
      const raw=JSON.parse(response.body);const reported=z.object({input_tokens:z.number().finite().nonnegative().nullable().optional(),output_tokens:z.number().finite().nonnegative().nullable().optional()}).safeParse(raw?.usage);if(reported.success)input.onResponse?.(reported.data);
      const parsed=Response.parse(raw);
      // A sibling cannot answer questions it was never sent.
      const expected=JSON.parse(batch.body).questions as Record<string,unknown>;
      parsed.answers=Object.fromEntries(Object.entries(parsed.answers).filter(([name])=>Object.hasOwn(expected,name)));
      parsedBatches.push(parsed);
    }catch(error){if(input.signal?.aborted)throw error;lastError=error instanceof Error&&error.name==='TimeoutError'?systemOneTimeout(input.timeoutMs??SYSTEM_ONE_TIMEOUT_MS):error;batch.paragraphs.forEach(p=>failed.add(p.index));reasons.add(error instanceof Error&&error.name==='TimeoutError'?'deadline':'batch-failed');}
  }};
  await Promise.all(Array.from({length:Math.min(2,batches.length)},()=>run()));
  if(requests&&!parsedBatches.length)throw lastError??new Error('System One returned no valid response.');
  const answers = Object.assign({}, ...parsedBatches.map((batch) => batch.answers)) as Record<string, AnswerValue>;
  const speakers = new Map<number, string>();
  const expressions = new Map<number, string>();
  const bgm = new Map<number, string>();
  const sfx = new Map<number, string>();
  for (const paragraph of paragraphs) {
    const candidates = offered.get(paragraph.index);
    if (!candidates) continue;
    const speaker = chosen(answers[`speaker_${paragraph.index}`], new Set(names), 0.65);
    if (speaker) speakers.set(paragraph.index, speaker);
    const expression = chosen(answers[`expression_${paragraph.index}`], candidates.expressions, 0.6);
    if (expression) expressions.set(paragraph.index, expression);
    const track = chosen(answers[`bgm_${paragraph.index}`], new Set(["keep_current", ...candidates.bgm]), 0.7);
    if (track && track !== "keep_current") bgm.set(paragraph.index, track);
    const effect = chosen(answers[`sfx_${paragraph.index}`], new Set(["none", ...candidates.sfx]), 0.7);
    if (effect && effect !== "none") sfx.set(paragraph.index, effect);
  }
  const scene = answers.scene_change;
  const description = answers.needs_description;
  return {
    speakers, expressions, bgm, sfx,
    // Fail closed: a missing/malformed answer never invents a scene cut or
    // forces a prose re-description; explicit high noul values still do.
    sceneChange: noulTripped(scene, 0.2),
    needsDescription: noulTripped(description, 0.2),
    durationMs: Date.now() - started,
    inputTokens: parsedBatches.reduce((total, batch) => total + (batch.usage?.input_tokens ?? 0), 0),
    requests,
    coverage: {
      paragraphs: { answered:paragraphs.filter(p=>['speaker','expression','bgm','sfx'].filter(prefix=>questions[`${prefix}_${p.index}`]).every(prefix=>{const key=`${prefix}_${p.index}`,answer=answers[key],question=questions[key] as {criteria?:Record<string,string>};return answer?.type==='choice'&&Object.hasOwn(question.criteria??{},answer.choice)&&answer.confidence>=(prefix==='speaker'?.65:prefix==='expression'?.6:.7);})).length,total:input.paragraphs.length,submitted:submitted.size,skipped:input.paragraphs.length-submitted.size,truncated:truncated.filter(p=>submitted.has(p.index)).length,failed:failed.size },
      sceneAnswered:sceneQuestions&&answers.scene_change?.type==='noul'&&answers.needs_description?.type==='noul',reasons:[...reasons],
      expressions: { offered: offeredCounts.expressions, total: POSE_EXPRESSION_CATALOGUE.length },
      bgm: { offered: offeredCounts.bgm, total: audio.bgm.length },
      sfx: { offered: offeredCounts.sfx, total: audio.sfx.length },
    },
  };
}
