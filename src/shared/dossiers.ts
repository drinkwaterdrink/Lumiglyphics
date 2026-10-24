import {z} from 'zod';
import {REFERENCE_FIELD_GROUPS,referenceFieldInfo} from './reference-fields.js';
import {referenceHistoryFor,type ReferenceHistory,type HistoricalReference} from './reference-history.js';
import {samePresentationTurn,type PresentationSnapshot,type PresentationEntity,type EntityFact} from './presentation-entities.js';
const OverrideSchema=z.object({chatId:z.string().min(1).max(256),kind:z.enum(['npc','place','object']),name:z.string().min(1).max(256),suppressed:z.boolean().default(false),pinned:z.boolean().default(false),note:z.string().max(600).default('')}).strict();
export const TooltipPreferencesSchema=z.object({enabled:z.boolean().default(false),rememberReferences:z.boolean().default(true),actionsEnabled:z.boolean().default(false),categories:z.object({npcs:z.boolean().default(true),locations:z.boolean().default(true),objects:z.boolean().default(true)}).default({npcs:true,locations:true,objects:true}),fieldGroups:z.record(z.string(),z.boolean()).default({}),detail:z.enum(['brief','standard','expanded']).default('brief'),linking:z.enum(['important','all-known','menu-only']).default('important'),maxLinksPerParagraph:z.number().int().min(1).max(6).default(3),maxFactsPerEntity:z.number().int().min(1).max(32).default(8),maxFactChars:z.number().int().min(80).max(1200).default(320),overrides:z.array(OverrideSchema).max(64).default([])});
export type TooltipPreferences=z.infer<typeof TooltipPreferencesSchema>;
export function normalizeTooltipPreferences(value:unknown):TooltipPreferences {
 const input=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const categories=input.categories&&typeof input.categories==='object'?input.categories as Record<string,unknown>:{};
 const groups=input.fieldGroups&&typeof input.fieldGroups==='object'?input.fieldGroups as Record<string,unknown>:{};
 const fieldGroups=Object.fromEntries(REFERENCE_FIELD_GROUPS.map(group=>[group.id,groups[group.id]!==false]));
 const overrides=Array.isArray(input.overrides)?input.overrides.slice(0,64).flatMap(v=>{const p=OverrideSchema.safeParse(v);return p.success?[p.data]:[];}):[];
 return {enabled:input.enabled===true,rememberReferences:input.rememberReferences!==false,actionsEnabled:input.actionsEnabled===true,categories:{npcs:categories.npcs!==false,locations:categories.locations!==false,objects:categories.objects!==false},fieldGroups,detail:input.detail==='expanded'||input.detail==='standard'?input.detail:'brief',linking:input.linking==='menu-only'?'menu-only':input.linking==='all-known'?'all-known':'important',maxLinksPerParagraph:typeof input.maxLinksPerParagraph==='number'&&Number.isFinite(input.maxLinksPerParagraph)?Math.max(1,Math.min(6,Math.round(input.maxLinksPerParagraph))):3,maxFactsPerEntity:typeof input.maxFactsPerEntity==='number'&&Number.isFinite(input.maxFactsPerEntity)?Math.max(1,Math.min(32,Math.round(input.maxFactsPerEntity))):8,maxFactChars:typeof input.maxFactChars==='number'&&Number.isFinite(input.maxFactChars)?Math.max(80,Math.min(1200,Math.round(input.maxFactChars))):320,overrides};
}
export function entityOverride(prefs:TooltipPreferences,chatId:string,entity:Pick<PresentationEntity,'kind'|'name'>) {return prefs.overrides.find(o=>o.chatId===chatId&&o.kind===entity.kind&&o.name===entity.name);}
export function eligibleEntities(entities:readonly PresentationEntity[],prefs:TooltipPreferences,chatId=''):PresentationEntity[] {
 if(!prefs.enabled)return [];
 return entities.filter(e=>prefs.categories[e.kind==='npc'?'npcs':e.kind==='place'?'locations':'objects']&&!entityOverride(prefs,chatId,e)?.suppressed);
}
export type DossierAnchor={start:number;end:number;entityId:string};
/** Exact explicit names/aliases only; Unicode word boundaries and ambiguous
 * aliases are conservative. Offsets are UTF-16, never HTML replacement offsets. */
export function linkEntityMentions(text:string,entities:readonly PresentationEntity[],prefs:TooltipPreferences,chatId='',limit=prefs.maxLinksPerParagraph,protectedRanges:readonly (readonly [number,number])[]=[],excludedEntityIds:ReadonlySet<string>=new Set()):DossierAnchor[] {
 if(prefs.linking==='menu-only'||text.length>20000||limit<=0)return [];
 const eligible=eligibleEntities(entities,prefs,chatId).filter(e=>!excludedEntityIds.has(e.id)||entityOverride(prefs,chatId,e)?.pinned);
 const owners=new Map<string,Set<string>>();
 for(const e of entities)for(const name of [e.name,...e.aliases]){const ids=owners.get(name)??new Set<string>();ids.add(e.id);owners.set(name,ids);}
 const excluded=[...protectedRanges,...[...text.matchAll(/`[^`]*`|\[[^\]]*\]\([^)]*\)/g)].map(m=>[m.index!,m.index!+m[0].length] as const)];
 const candidates:Array<DossierAnchor&{pinned:boolean}>=[];
 for(const e of eligible)for(const name of [e.name,...e.aliases]) {
  if(owners.get(name)?.size!==1||/^(?:he|she|they|it|you|we|i|him|her|them)$/i.test(name))continue;
  let start=text.indexOf(name),scanned=0;
  while(start>=0&&scanned++<12) {
   const end=start+name.length, before=Array.from(text.slice(Math.max(0,start-2),start)).at(-1)??'',after=Array.from(text.slice(end,end+2))[0]??'';
   if(!/[\p{L}\p{N}_]/u.test(before)&&!/[\p{L}\p{N}_]/u.test(after)&&!excluded.some(([a,b])=>start>=a!&&start<b!))candidates.push({start,end,entityId:e.id,pinned:entityOverride(prefs,chatId,e)?.pinned===true});
   start=text.indexOf(name,end);
  }
 }
 candidates.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.start-b.start||b.end-a.end);
 const selected:DossierAnchor[]=[];const linked=new Set<string>();
 for(const {pinned:_,...a} of candidates) {
  if(linked.has(a.entityId)||selected.some(b=>a.start<b.end&&a.end>b.start))continue;
  selected.push(a);linked.add(a.entityId);if(selected.length>=Math.min(6,limit))break;
 }
 return limit<=0?[]:selected.sort((a,b)=>a.start-b.start);
}
export type ReaderDossier={entity:PresentationEntity;facts:EntityFact[];state:Record<string,string>;earlier?:HistoricalReference[]};
export function selectReaderDossier(id:string,snapshot:PresentationSnapshot,detail:TooltipPreferences['detail'],fieldGroups:Record<string,boolean>={},maxFacts?:number):ReaderDossier|null {
 const entity=snapshot.entities.find(e=>e.id===id&&e.firstParagraph<=snapshot.at.paragraphIndex);if(!entity)return null;
 const facts=entity.facts.filter(f=>f.entityId===id&&f.visibility==='observed'&&f.source.chatId===snapshot.at.key.chatId&&f.source.messageId===snapshot.at.key.assistantMessageId&&f.source.sourceFingerprint===snapshot.at.key.sourceFingerprint&&f.revealedAt&&samePresentationTurn(f.revealedAt.key,snapshot.at.key)&&f.revealedAt.paragraphIndex<=snapshot.at.paragraphIndex);
 const latest=new Map<string,EntityFact>();for(const f of facts)latest.set(f.field,f);
 const limit=detail==='brief'?1:detail==='standard'?Math.max(1,Math.min(32,maxFacts??4)):32;
 const visible=[...latest.values()].filter(fact=>fieldGroups[referenceFieldInfo(fact.field).section]!==false).slice(0,limit);
 const state=Object.fromEntries(Object.entries(snapshot.stateByEntity[id]??{}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
 if(state.location)state.location=snapshot.entities.find(e=>e.id===state.location)?.name??state.location;
 const visibleState=Object.fromEntries(Object.entries(state).filter(([field])=>fieldGroups.state!==false&&fieldGroups[referenceFieldInfo(field).section]!==false));
 return {entity:{...entity,facts:visible},facts:visible,state:detail==='brief'?{}:visibleState};
}

export type ReferenceKind='all'|PresentationEntity['kind'];
function earlierEntries(snapshot:PresentationSnapshot,prefs:TooltipPreferences,history:ReferenceHistory|undefined):HistoricalReference[]{
 if(!prefs.enabled||!prefs.rememberReferences)return [];
 return (referenceHistoryFor(history,snapshot.at.key)?.entries??[]).filter(entry=>prefs.categories[entry.reference.kind==='npc'?'npcs':entry.reference.kind==='place'?'locations':'objects']&&prefs.fieldGroups[referenceFieldInfo(entry.reference.field).section]!==false&&!entityOverride(prefs,snapshot.at.key.chatId,entry.reference)?.suppressed);
}
export function dossierWithHistory(dossier:ReaderDossier,snapshot:PresentationSnapshot,prefs:TooltipPreferences,history:ReferenceHistory|undefined):ReaderDossier {
 const limit=prefs.detail==='brief'?1:prefs.detail==='standard'?Math.max(1,Math.min(32,prefs.maxFactsPerEntity??4)):32;
 const earlier=earlierEntries(snapshot,prefs,history).filter(e=>e.reference.kind===dossier.entity.kind&&e.reference.name===dossier.entity.name).slice(0,limit);
 return {...dossier,...(earlier.length?{earlier}:{})};
}
export function referenceEntriesWithHistory(snapshot:PresentationSnapshot,prefs:TooltipPreferences,history:ReferenceHistory|undefined){
 const current=referenceEntries(snapshot,prefs),seen=new Set(current.map(e=>JSON.stringify([e.entity.kind,e.entity.name])));
 const previous:ReturnType<typeof referenceEntries>=[];
 for(const [index,entry] of earlierEntries(snapshot,prefs,history).entries()){
  const {kind,name}=entry.reference,identity=JSON.stringify([kind,name]);if(seen.has(identity))continue;seen.add(identity);
  const entity:PresentationEntity={id:`earlier:${index}`,kind,name,aliases:[],firstParagraph:0,facts:[]};
  previous.push({entity,pinned:entityOverride(prefs,snapshot.at.key.chatId,entity)?.pinned===true,current:false,label:'Previously observed'});
 }
 return [...current,...previous].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Number(b.current)-Number(a.current)||a.entity.name.localeCompare(b.entity.name));
}
export function selectEarlierDossier(id:string,snapshot:PresentationSnapshot,prefs:TooltipPreferences,history:ReferenceHistory|undefined):ReaderDossier|null{
 const entry=referenceEntriesWithHistory(snapshot,prefs,history).find(e=>e.entity.id===id&&id.startsWith('earlier:'));if(!entry)return null;
 return dossierWithHistory({entity:entry.entity,facts:[],state:{}},snapshot,prefs,history);
}
export function referenceEntries(snapshot:PresentationSnapshot,prefs:TooltipPreferences,query='',kind:ReferenceKind='all'){
 const search=query.trim().toLocaleLowerCase().slice(0,160),chatId=snapshot.at.key.chatId;
 return eligibleEntities(snapshot.entities,prefs,chatId).filter(entity=>entity.firstParagraph<=snapshot.at.paragraphIndex&&(kind==='all'||entity.kind===kind)&&(!search||[entity.name,...entity.aliases].some(name=>name.toLocaleLowerCase().includes(search)))).map(entity=>{
  const state=snapshot.stateByEntity[entity.id]??{};
  const location=state.location?snapshot.entities.find(e=>e.kind==='place'&&(e.id===state.location||e.name.toLocaleLowerCase()===state.location!.toLocaleLowerCase())):undefined;
  const elsewhere=!!(location&&snapshot.locationId&&location.id!==snapshot.locationId);
  const current=entity.id===snapshot.locationId||snapshot.presentEntityIds.includes(entity.id)&&state.presence!=='absent'&&!elsewhere;
  const label=entity.kind==='place'?(current?'Current location':'Known location'):entity.kind==='npc'?(state.presence==='absent'?'Not in this scene':elsewhere?'Elsewhere':current?'In this scene':'Known character'):'Known item';
  return {entity,pinned:entityOverride(prefs,chatId,entity)?.pinned===true,current,label};
 }).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Number(b.current)-Number(a.current)||a.entity.name.localeCompare(b.entity.name));
}
