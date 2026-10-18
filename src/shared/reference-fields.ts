/** Shared labels and reader controls for extractive reference facts. These are
 * optional observations, never a checklist of facts the planner must invent. */
export const REFERENCE_FIELD_GROUPS = [
 {id:'overview',label:'Overview'},
 {id:'identity',label:'Identity & roles'},
 {id:'appearance',label:'Appearance'},
 {id:'relationships',label:'Connections'},
 {id:'behavior',label:'Behavior & stated goals'},
 {id:'setting',label:'Place & surroundings'},
 {id:'use',label:'Use & access'},
 {id:'history',label:'History & significance'},
 {id:'state',label:'Current state'},
] as const;

export const REFERENCE_FIELDS = [
 'description','appearance','outfit','condition',
 'role','affiliations','relationships','mannerisms','voice','statedGoals','history',
 'layout','routes','surroundings','customs','services','publicHistory','risks',
 'provenance','function','limits','access','revealedContents','owner','significance',
] as const;
export type ReferenceField = typeof REFERENCE_FIELDS[number];
type FieldGroup = typeof REFERENCE_FIELD_GROUPS[number]['id'];
export type ReferenceFieldInfo = {label:string;section:string;sectionLabel:string;living:boolean};
const fields:Record<ReferenceField,readonly [label:string,section:FieldGroup,living:boolean]> = {
 description:['Description','overview',false],
 appearance:['Appearance','appearance',false],
 outfit:['Outfit','state',true],
 condition:['Condition','state',true],
 role:['Role','identity',false],
 affiliations:['Affiliations','relationships',false],
 relationships:['Relationships','relationships',false],
 mannerisms:['Mannerisms','behavior',false],
 voice:['Voice','behavior',false],
 statedGoals:['Stated goals','behavior',false],
 history:['Known history','history',false],
 layout:['Layout','setting',false],
 routes:['Routes','setting',false],
 surroundings:['Surroundings','setting',false],
 customs:['Customs','setting',false],
 services:['Services','use',false],
 publicHistory:['Public history','history',false],
 risks:['Known risks','setting',false],
 provenance:['Provenance','history',false],
 function:['Function','use',false],
 limits:['Limits','use',false],
 access:['Access','use',false],
 revealedContents:['Revealed contents','use',false],
 owner:['Owner','state',true],
 significance:['Known significance','history',false],
};

/** Unknown legacy/presentation fields stay readable without becoming new
 * planner fields. Scene impressions are descriptive, not current entity state. */
export function referenceFieldInfo(field:string):ReferenceFieldInfo {
 if(field==='presence'||field==='location')return {label:field==='presence'?'Presence':'Location',section:'state',sectionLabel:'Current state',living:true};
 const entry=Object.hasOwn(fields,field)?fields[field as ReferenceField]:undefined;
 if(!entry) return {label:field==='impression'?'Impression':field.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/^./,s=>s.toUpperCase()),section:'overview',sectionLabel:'Overview',living:false};
 const [label,section,living]=entry;
 return {label,section,sectionLabel:REFERENCE_FIELD_GROUPS.find(group=>group.id===section)!.label,living};
}

const specificFields = {
 npc:new Set<string>(['role','affiliations','relationships','mannerisms','voice','statedGoals','history']),
 place:new Set<string>(['layout','routes','surroundings','customs','services','publicHistory','risks']),
 object:new Set<string>(['provenance','function','limits','access','revealedContents','owner','significance']),
};
/** All four original fields remain valid for every category. */
export function referenceFieldMatchesKind(field:ReferenceField,kind:'npc'|'place'|'object'):boolean {
 return field==='description'||field==='appearance'||field==='outfit'||field==='condition'||specificFields[kind].has(field);
}
