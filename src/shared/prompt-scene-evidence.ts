export type SceneEvidence={field:'action'|'composition';text:string};
type SceneFields=Partial<Record<SceneEvidence['field'],string>>;
const word=(value:string)=>/[\p{L}\p{N}_]/u.test(value);
function containsWording(prompt:string,text:string):boolean{
 let from=0,index:number;
 while((index=prompt.indexOf(text,from))!==-1){
  const before=index?prompt[index-1]!:'';
  const after=prompt[index+text.length]??'';
  if(!(word(text[0]!)&&word(before))&&!(word(text.at(-1)!)&&word(after)))return true;
  from=index+1;
 }
 return false;
}
/** A bounded literal match, never authority to restore removed metadata or proof
 * of meaning. Long fields are skipped, not clipped into misleading fragments. */
export function retainedSceneEvidence(prompt:string,brief?:SceneFields):SceneEvidence[]{
 const evidence:SceneEvidence[]=[];
 for(const field of ['action','composition'] as const){
  const text=brief?.[field]?.trim();
  if(text&&text.length>=12&&text.length<=400&&containsWording(prompt,text))evidence.push({field,text});
 }
 return evidence;
}
export function changedSceneEvidence(evidence:readonly SceneEvidence[],prompt:string):SceneEvidence[]{
 return evidence.filter(entry=>!containsWording(prompt,entry.text));
}
