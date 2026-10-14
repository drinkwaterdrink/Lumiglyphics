import type {SpindleAPI} from 'lumiverse-spindle-types';
import {AssetJobSchema,TurnPlanSchema,type TurnKey} from '../../shared/contracts.js';
import {ImageLibraryArchiveSchema,ImageLibraryPageSchema,ImageLibraryRequestSchema,SavedLibraryImageSchema,type SavedLibraryImage,type ImageLibraryRequest,type ImageLibraryPage,type LibraryImageView} from '../../shared/image-library.js';
import type {StoredTurnRecord} from './storage.js';
import {fingerprintForMessage} from './planner.js';
import {safeImageHistory} from './image-review.js';

export const imageLibrarySegment=(value:string)=>encodeURIComponent(value).replaceAll('%','_');
const occurrence=(e:SavedLibraryImage)=>JSON.stringify([e.key,e.jobId,e.imageId]);
const sameKey=(a:TurnKey,b:TurnKey)=>a.chatId===b.chatId&&a.assistantMessageId===b.assistantMessageId&&String(a.swipeId??0)===String(b.swipeId??0)&&a.sourceFingerprint===b.sourceFingerprint&&a.revision===b.revision;
function collect(record:StoredTurnRecord):SavedLibraryImage[]{
 const entries:SavedLibraryImage[]=[];
 for(const job of record.jobs){
  if(!job.imageId||!['generated','browser_ready'].includes(job.status)||!sameKey(job.ownerTurnKey,record.plan.key))continue;
  const cue=[...record.plan.visualCues,...(record.plan.cacheCues??[])].find(c=>c.assetJobId===job.jobId);
  const request=job.provider==='cache'?undefined:(record.imageRequests??[]).filter(r=>r.jobId===job.jobId&&r.state==='approved'&&r.createdAt<=(job.generatedAt??record.updatedAt)).at(-1);
  const template=request?.imagePromptMetadata?.template??cue?.imageTemplate;
  const parsed=SavedLibraryImageSchema.safeParse({key:record.plan.key,imageId:job.imageId,jobId:job.jobId,paragraphIndex:job.paragraphIndex,createdAt:job.generatedAt??record.updatedAt,excerpt:(record.plan.paragraphs[job.paragraphIndex]?.text??'').slice(0,600),
   ...(record.source?{rawFingerprint:record.source.rawFingerprint}:{}),role:template?.category==='portrait'?'portrait':template?.category==='environment'?'background':'scene',...(template?{template:template.name}:{}),
   ...(request?{prompt:request.prompt,negativePrompt:request.negativePrompt,model:request.model,provider:request.provider}:{})});
  if(parsed.success)entries.push(parsed.data);
 }
 for(const [jobId,image] of Object.entries(record.previousImages??{})){
  if(entries.some(e=>e.imageId===image.imageId))continue;
  const job=record.jobs.find(j=>j.jobId===jobId);if(!job)continue;
  const parsed=SavedLibraryImageSchema.safeParse({key:record.plan.key,imageId:image.imageId,jobId,paragraphIndex:job.paragraphIndex,createdAt:record.updatedAt,excerpt:(record.plan.paragraphs[job.paragraphIndex]?.text??'').slice(0,600),role:'scene',legacyPrevious:true,...(record.source?{rawFingerprint:record.source.rawFingerprint}:{})});
  if(parsed.success)entries.push(parsed.data);
 }
 return entries;
}
/** Preserve unknown archives and original prompt attribution; never persist URLs/parameters/credentials. */
export function mergeImageLibrary(previous:StoredTurnRecord|undefined,next:StoredTurnRecord):unknown{
 const existing=previous?.imageLibrary??next.imageLibrary;
 const parsed=ImageLibraryArchiveSchema.safeParse(existing);
 if(existing!==undefined&&!parsed.success)return existing;
 const entries=parsed.success?[...parsed.data.entries]:[];let full=parsed.success&&parsed.data.full;
 const seen=new Set(entries.map(occurrence));
 const prior=parseRecord(previous),current=parseRecord(next);
 for(const candidate of [...(prior?collect(prior):[]),...(current?collect(current):[])]){
  const identity=occurrence(candidate);if(seen.has(identity))continue;
  // A legacy fallback may have lacked prompt attribution; keep the first known real completion.
  if(candidate.legacyPrevious&&entries.some(e=>e.imageId===candidate.imageId&&e.jobId===candidate.jobId))continue;
  if(entries.length>=128||JSON.stringify(entries).length+JSON.stringify(candidate).length>480000){full=true;continue;}
  entries.push(candidate);seen.add(identity);
 }
 return {version:1,entries,full,...(parsed.success&&parsed.data.incomplete?{incomplete:true}:{})};
}
function parseRecord(raw:unknown):StoredTurnRecord|null{
 if(!raw||typeof raw!=='object')return null;
 const r=raw as StoredTurnRecord,plan=TurnPlanSchema.safeParse(r.plan);if(!plan.success||!Array.isArray(r.jobs))return null;
 const previousImages:NonNullable<StoredTurnRecord['previousImages']>={};
 if(r.previousImages&&typeof r.previousImages==='object')for(const [id,value] of Object.entries(r.previousImages))if(value&&typeof value.imageId==='string'&&value.imageId.length<=256)previousImages[id]={imageId:value.imageId,imageUrl:''};
 const source=r.source?.version===2&&typeof r.source.rawFingerprint==='string'?r.source:undefined;
 const result={...r,previousImages,updatedAt:typeof r.updatedAt==='string'?r.updatedAt:plan.data.createdAt,plan:plan.data,jobs:r.jobs.flatMap(j=>{const parsed=AssetJobSchema.safeParse(j);return parsed.success?[parsed.data]:[];}),imageRequests:safeImageHistory(r.imageRequests??[])};
 delete result.source;if(source)result.source=source;return result;
}
/** Read-only pagination: at most 24 turn files and 24 verified images per request. */
export async function readImageLibraryPage(api:SpindleAPI,input:ImageLibraryRequest,user:string):Promise<ImageLibraryPage>{
 const request=ImageLibraryRequestSchema.parse(input);
 if(!await api.chats.get(request.chatId,user))throw new Error('This chat is unavailable.');
 const readMessages=async()=> (await api.chat.getMessages(request.chatId)).filter(m=>!m.is_user&&m.role!=='system');
 const messages=await readMessages();
 const signature=JSON.stringify(messages.map(m=>[m.id,m.swipe_id??0,fingerprintForMessage(m)]));
 const anchorIndex=messages.findIndex(m=>m.id===request.anchor.messageId);
 if(anchorIndex<0||Number(messages[anchorIndex]!.swipe_id??0)!==request.anchor.swipeId)throw new Error('The reading position changed. Refresh the library.');
 const prefix=`turns/${imageLibrarySegment(request.chatId)}/`;
 const anchorPath=`${prefix}${imageLibrarySegment(request.anchor.messageId)}/${imageLibrarySegment(String(request.anchor.swipeId))}.json`;
 const anchor=parseRecord(await api.userStorage.getJson(anchorPath,{fallback:null,userId:user}));
 const matchesMessage=(record:StoredTurnRecord,message:typeof messages[number])=>String(record.plan.key.swipeId??0)===String(message.swipe_id??0)&&(record.source?.rawFingerprint??record.plan.key.sourceFingerprint)===fingerprintForMessage(message);
 if(!anchor||anchor.plan.key.chatId!==request.chatId||anchor.plan.key.assistantMessageId!==request.anchor.messageId||anchor.plan.key.sourceFingerprint!==request.anchor.sourceFingerprint||!matchesMessage(anchor,messages[anchorIndex]!))throw new Error('The reading source changed. Refresh the library.');
 const listed=await api.userStorage.list(prefix,user);
 const listedSet=new Set(listed),byDirectory=new Map<string,string[]>();
 for(const path of listed){if(!path.startsWith(prefix)||path.length>1200)continue;const slash=path.lastIndexOf('/'),directory=path.slice(0,slash+1);if(!/^[^/]+\.json$/.test(path.slice(slash+1)))continue;const paths=byDirectory.get(directory)??[];paths.push(path);byDirectory.set(directory,paths);}
 const eligible=request.range==='read'?messages.slice(0,anchorIndex+1):messages;
 const sources=eligible.flatMap((message,index)=>{
  const messagePrefix=`${prefix}${imageLibrarySegment(message.id)}/`;
  const active=`${messagePrefix}${imageLibrarySegment(String(message.swipe_id??0))}.json`;
  const paths=request.versions==='active'?(listedSet.has(active)?[active]:[]):byDirectory.get(messagePrefix)??[];
  return paths.map(path=>({path,message,index}));
 }).sort((a,b)=>(request.order==='newest'?b.index-a.index:a.index-b.index)||a.path.localeCompare(b.path)).slice(0,10000);
 const [start,skip]=(request.cursor??'0:0').split(':').map(Number);let file=start!,entrySkip=skip!,scanned=0;
 const entries:LibraryImageView[]=[];const notices=new Set<string>();
 if(listed.length>10000)notices.add('The scan is limited to 10,000 saved turn files.');
 while(file<sources.length&&entries.length<24&&scanned<24){
  const source=sources[file]!;scanned++;
  let record:StoredTurnRecord|null=null;
  try{record=parseRecord(await api.userStorage.getJson(source.path,{fallback:null,userId:user}));}catch{notices.add('Some saved replies could not be read.');}
  if(!record||record.plan.key.chatId!==request.chatId||record.plan.key.assistantMessageId!==source.message.id||source.path!==`${prefix}${imageLibrarySegment(record.plan.key.assistantMessageId)}/${imageLibrarySegment(String(record.plan.key.swipeId??0))}.json`){file++;entrySkip=0;continue;}
  const rawFingerprint=fingerprintForMessage(source.message);
  const active=String(record.plan.key.swipeId??0)===String(source.message.swipe_id??0)&&(record.source?.rawFingerprint??record.plan.key.sourceFingerprint)===rawFingerprint;
  const archive=ImageLibraryArchiveSchema.safeParse(record.imageLibrary);
  if(record.imageLibrary!==undefined&&!archive.success)notices.add('An unsupported saved history was preserved; only recoverable current pictures are shown.');
  if(archive.success&&archive.data.full)notices.add('A reply reached its saved-history limit; some older replacements may be unavailable.');
  if(archive.success&&archive.data.incomplete)notices.add('An earlier saved record could not be recovered; its missing image references are unavailable.');
  const candidates=[...(archive.success?archive.data.entries:[]),...collect(record)];
  const first=new Map<string,SavedLibraryImage>();for(const candidate of candidates)if(!first.has(occurrence(candidate)))first.set(occurrence(candidate),candidate);
  const unique=[...first.values()].filter(e=>e.key.chatId===request.chatId&&e.key.assistantMessageId===source.message.id);
  const rows=unique.flatMap(e=>{
   if(request.role!=='all'&&e.role!==request.role)return [];
   if(request.templateQuery&&!e.template?.toLocaleLowerCase().includes(request.templateQuery.toLocaleLowerCase()))return [];
   const sameVersion=active&&e.key.sourceFingerprint===record.plan.key.sourceFingerprint&&e.key.revision===record.plan.key.revision;
   const current=sameVersion&&record.jobs.some(j=>j.jobId===e.jobId&&(j.imageId===e.imageId||(!['generated','browser_ready'].includes(j.status)&&record.previousImages?.[j.jobId]?.imageId===e.imageId)));
   if(request.versions==='active'&&!sameVersion)return [];
   if(sameVersion&&!current&&!request.includeReplaced)return [];
   if(request.range==='read'&&source.message.id===request.anchor.messageId&&(e.paragraphIndex>request.anchor.paragraphIndex|| (sameVersion&&e.key.sourceFingerprint!==request.anchor.sourceFingerprint)))return [];
   return [{...e,messageNumber:source.index+1,versionLabel:(sameVersion?(current?'current':'replaced'):'alternate') as LibraryImageView['versionLabel']}];
  }).sort((a,b)=>request.order==='newest'?b.createdAt.localeCompare(a.createdAt):a.createdAt.localeCompare(b.createdAt));
  let i=entrySkip;
  for(;i<rows.length&&entries.length<24;i++){
   const row=rows[i]!;let thumbnailUrl:string|undefined;
   try{const image=await api.images.get(row.imageId,{userId:user,specificity:'sm'});if(image&&['image/png','image/jpeg','image/webp','image/avif','image/gif'].includes(image.mime_type)&&image.url.startsWith('/api/v1/images/')&&!image.url.includes('\\'))thumbnailUrl=image.url;}catch{/* unavailable stays visible */}
   entries.push({...row,available:!!thumbnailUrl,...(thumbnailUrl?{thumbnailUrl,imageUrl:`/api/v1/images/${encodeURIComponent(row.imageId)}`}:{})});
  }
  if(i<rows.length){entrySkip=i;break;}
  file++;entrySkip=0;
 }
 const currentMessages=await readMessages();
 const currentAnchor=parseRecord(await api.userStorage.getJson(anchorPath,{fallback:null,userId:user}));
 if(signature!==JSON.stringify(currentMessages.map(m=>[m.id,m.swipe_id??0,fingerprintForMessage(m)]))||!currentAnchor||!sameKey(anchor.plan.key,currentAnchor.plan.key))throw new Error('The story changed while loading. Refresh the library.');
 return ImageLibraryPageSchema.parse({entries,nextCursor:file<sources.length?`${file}:${entrySkip}`:null,notice:[...notices].join(' ')});
}
