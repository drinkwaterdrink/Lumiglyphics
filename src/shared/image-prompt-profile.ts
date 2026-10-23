import {z} from 'zod';
import {NANOGPT_PROMPT_CAPABILITIES} from './image-prompt-capabilities.js';
import {ModelOutputCapabilitiesSchema,type ModelOutputCapabilities} from './model-output-capabilities.js';
import {NANOGPT_OUTPUT_CAPABILITIES} from './model-output-catalogue.js';

export const PROMPT_STORAGE_MAX = 65000;
export const ImagePromptProfileSchema = z.object({
 version:z.literal(1), family:z.enum(['flux','qwen','anima','z-image','grok','gpt-image','nano-banana','seedream','minimax','muse','novelai','generic']),
 maxCharacters:z.number().int().min(256).max(50000),
 source:z.enum(['live','catalogue','fallback','manual']),
 providerLimit:z.number().int().min(256).max(50000).optional(),
 format:z.enum(['description','tags','hybrid']), negativeMode:z.enum(['supported-or-unknown','positive-only']),
 guidance:z.string().max(2400), manualBudget:z.number().int().min(256).max(50000).optional(),
 output:ModelOutputCapabilitiesSchema.optional(),outputSource:z.enum(['live','catalogue']).optional(),outputSummary:z.string().max(1024).optional(),outputManaged:z.boolean().optional(),
}).strict();
export type ImagePromptProfile=z.infer<typeof ImagePromptProfileSchema>;
export type PromptProfileSettings={automaticImagePromptSettings?:boolean;imagePromptBudgetOverride?:boolean;imagePromptBudget?:number;imagePromptFormat?:'description'|'tags'};
export function parsePromptCapabilities(value:unknown):Map<string,number>{
 const result=new Map<string,number>();
 const data=(value as {data?:unknown})?.data;
 if(!Array.isArray(data)||data.length>2000)return result;
 for(const item of data){
  const id=item?.id,p=item?.supported_parameters,n=p?.max_prompt_characters;
  if(typeof id==='string'&&id.length<=256&&Number.isInteger(n)&&n>=256&&n<=50000&&p?.prompt_length?.status==='known'&&['utf16_code_units','unicode_code_points'].includes(p.prompt_length.unit))result.set(id,n);
 }
 return result;
}
function family(model:string,provider:string):ImagePromptProfile['family']{
 if(provider==='novelai')return 'novelai';
 if(/(?:^|[\s/_.-])flux(?:[\s/_.-]|\d|$)/.test(model))return 'flux';
 if(/qwen/.test(model))return 'qwen';if(/anima(?:[\s/_.-]|$)/.test(model))return 'anima';
 if(/z[\s_-]?image/.test(model))return 'z-image';if(/grok|imagine/.test(model))return 'grok';
 if(/gpt[\s_-]?image|chat[\s_-]?gpt|dall[\s_-]?e/.test(model))return 'gpt-image';
 if(/nano[\s_-]?banana|gemini.*image/.test(model))return 'nano-banana';
 if(/see[\s_-]?dream/.test(model))return 'seedream';if(/minimax/.test(model))return 'minimax';
 if(/muse/.test(model))return 'muse';return 'generic';
}
const guidance:Record<ImagePromptProfile['family'],string>={
 flux:'Use direct visual descriptions: medium, named subjects and action first, then explicit spatial relationships, setting, lighting and framing. Avoid repetitive quality tags and contradictory instructions. Adapt negative constraints into positive visual intent when the endpoint lacks negative prompting.',
 qwen:'Use clear descriptive language. Associate each named subject with its own appearance and position. State count, spatial relationships, action and any approved exact lettering explicitly; keep scene and style instructions coherent.',
 anima:'Use concise lowercase visual tags with spaces, followed by descriptive captions where useful. Bind each character name to their own appearance, clothing and action. Do not invent score tags or force quality tags onto an unknown variant. Keep lettering brief and only use approved dialogue.',
 'z-image':'Use focused natural-language visual direction: primary subject and action first, appearance and materials next, then composition and lighting. Avoid long repetitive quality/exclusion lists, unsupported weights and contradictory style adjectives.',
 grok:'Use a coherent visual description with explicit subject, action, framing, atmosphere and desired medium. Put essential identity and scene constraints early; avoid invented provider-specific weighting syntax.',
 'gpt-image':'Describe the desired image clearly, with subject identity, action, composition and rendering style separated conceptually. For ensemble or manga, explicitly associate appearances and actions and preserve only supplied exact lettering.',
 'nano-banana':'Use clear scene and composition descriptions, naming what each reference controls when references exist. Preserve each subject identity and wardrobe separately. Specify changes and visual relationships concretely; never claim a reference exists when none was supplied.',
 seedream:'Use descriptive visual direction with subjects and action first, followed by composition, medium, lighting and material detail. Keep each character appearance attached to that character; preserve supplied lettering exactly.',
 minimax:'Describe a single evidenced scene with explicit subject, action, location, framing and style. Prefer useful visual facts over repeated quality terms. Do not assume unsupported sampler or weighting controls.',
 muse:'Use clear, concise scene descriptions and preserve established appearances and spatial relationships. Exact Muse variant capabilities are unverified; do not invent special syntax or sampler settings.',
 novelai:'Use version-aware tag syntax and existing native weighting. Keep subject identities distinct. Native tokenizer limits are separate from this character ceiling; do not label character counts as tokens.',
 generic:'Use clear visual descriptions with principal subject and action first. Preserve identity, wardrobe, scene and composition. Model-specific syntax and tokenizer limits are unverified.',
};
export function resolveImagePromptProfile(provider:string|null|undefined,model:string|null|undefined,settings:PromptProfileSettings={},live?:ReadonlyMap<string,number>,liveOutputs?:ReadonlyMap<string,ModelOutputCapabilities>):ImagePromptProfile{
 const p=provider?.trim().toLowerCase()??'',id=model?.trim()??'',f=family(id.toLowerCase(),p),auto=settings.automaticImagePromptSettings!==false;
 const liveLimit=p==='nanogpt'?live?.get(id):undefined;
 const providerLimit=liveLimit??(p==='nanogpt'?Object.hasOwn(NANOGPT_PROMPT_CAPABILITIES,id)?NANOGPT_PROMPT_CAPABILITIES[id]:undefined:undefined);
 const budget=typeof settings.imagePromptBudget==='number'&&Number.isFinite(settings.imagePromptBudget)?settings.imagePromptBudget:3000;
 const manual=settings.imagePromptBudgetOverride?Math.min(50000,Math.max(256,Math.trunc(budget))):undefined;
 const maximum=Math.min(manual??(auto?providerLimit??3000:3000),providerLimit??50000);
 const liveOutput=p==='nanogpt'?liveOutputs?.get(id):undefined;
 const output=auto&&p==='nanogpt'?(liveOutput??(Object.hasOwn(NANOGPT_OUTPUT_CAPABILITIES,id)?NANOGPT_OUTPUT_CAPABILITIES[id]:undefined)):undefined;
 return {version:1,family:f,maxCharacters:maximum,source:manual!==undefined?'manual':auto&&providerLimit!==undefined?liveLimit!==undefined?'live':'catalogue':'fallback',
  ...(providerLimit!==undefined?{providerLimit}:{}),...(manual!==undefined?{manualBudget:manual}:{}),
  format:!auto?settings.imagePromptFormat??'description':f==='novelai'?'tags':f==='anima'?'hybrid':'description',
  ...(output?{output,outputSource:liveOutput?'live' as const:'catalogue' as const}:{}),
  negativeMode:auto&&p==='nanogpt'&&(/^z-image-turbo(?:-lora|-image-to-image)?$/.test(id)||(Boolean(output)&&/^flux-2-/.test(id))||/^blackforestlabs\/flux-3\/(?:klein|pro|dev)(?:\/|$)/.test(id)||/^black-forest-labs\/flux-3\/(?:text-to-image|edit)$/.test(id))?'positive-only':'supported-or-unknown',
  guidance:auto?guidance[f]:`Keep the user's ${settings.imagePromptFormat??'description'} prompt format and weighting syntax.`,};
}
export function promptProfileSummary(profile:ImagePromptProfile):string{
 const source=profile.source==='manual'?'Manual budget':profile.source==='fallback'?profile.providerLimit!==undefined?`Conservative ceiling; published limit ${profile.providerLimit.toLocaleString()}`:'Conservative fallback; endpoint limit unknown':profile.source==='live'?'Live provider metadata':'Verified catalogue snapshot';
 return `${profile.family} · ${profile.format} · ${profile.maxCharacters.toLocaleString()} combined characters · ${source}${profile.manualBudget&&profile.manualBudget>profile.maxCharacters?`; requested ${profile.manualBudget.toLocaleString()}, capped by provider`:''}${profile.negativeMode==='positive-only'?' · positive-only endpoint':''}.`;
}
