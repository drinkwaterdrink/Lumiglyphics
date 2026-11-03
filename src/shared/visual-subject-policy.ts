type SubjectMode='none'|'one'|'ensemble';
type SubjectTemplate={subjectMode:SubjectMode;category?:string|undefined;intent?:string|undefined};
/** Semantic subject policy only. It does not select pixel positions, names or appearance DNA. */
export function visualSubjectPolicy(input:{intent?:string|undefined;mode?:SubjectMode;template?:SubjectTemplate|undefined;presentation?:string|undefined;members?:readonly {name:string}[]|undefined;subjectText?:string|undefined}):{mode:SubjectMode|null;count:number|null;page:boolean;layeredPortrait:boolean}{
 const mode=input.mode??input.template?.subjectMode??null;
 const page=input.intent==='manga-page'||input.presentation==='page'||input.template?.intent==='manga-page';
 let count:number|null=mode==='none'?0:mode==='one'?1:null;
 if(mode==='ensemble'){
  if(input.members)count=input.members.length;
  else {const lines=(input.subjectText??'').split(/\r?\n/).filter(line=>/^\s*[^:]+:/.test(line));count=lines.length||null;}
 }
 return {mode,count,page,layeredPortrait:!page&&mode==='one'&&input.template?.category==='portrait'};
}
