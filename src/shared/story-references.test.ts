import { test, expect } from 'bun:test';
import { normalizeStoryReferences } from './story-references.js';
const paragraphs = [{text:'Mira carries the black key.'},{text:'The Lantern House has blue shutters.'}];
const reference = {kind:'object',name:'the black key',paragraphIndex:0,field:'description',value:'black key',evidence:'Mira carries the black key.'} as const;
test('reference proposals require exact visible evidence at their reveal paragraph',()=>{
 expect(normalizeStoryReferences([reference],paragraphs)).toEqual([reference]);
 expect(normalizeStoryReferences([{...reference,paragraphIndex:1}],paragraphs)).toEqual([]);
 expect(normalizeStoryReferences([{...reference,value:'a cursed key'}],paragraphs)).toEqual([]);
 expect(normalizeStoryReferences([{...reference,field:'secret'}],paragraphs)).toEqual([]);
 expect(normalizeStoryReferences([{...reference,name:'imaginary'}],paragraphs)).toEqual([]);
});
test('malformed optional proposals are nonfatal and bounded',()=>{
 expect(normalizeStoryReferences({invalid:true},paragraphs)).toEqual([]);
 expect(normalizeStoryReferences([null,reference],paragraphs)).toEqual([reference]);
 expect(normalizeStoryReferences(Array(200).fill(reference),paragraphs)).toHaveLength(1);
});

test('collects optional descriptive profiles for people, places and objects from exact visible quotes',()=>{
 const profiles = [
  {kind:'npc',name:'Mira',fields:['role','affiliations','relationships','mannerisms','voice','statedGoals','history','appearance']},
  {kind:'place',name:'Lantern House',fields:['layout','routes','surroundings','customs','services','publicHistory','risks']},
  {kind:'object',name:'Black Key',fields:['provenance','function','limits','access','revealedContents','owner','condition','significance']},
 ] as const;
 const proposals = profiles.flatMap(profile=>profile.fields.map(field=>({kind:profile.kind,name:profile.name,paragraphIndex:0,field,value:`known ${field}`,evidence:`${profile.name}: known ${field}.`})))
 const text=proposals.map(r=>r.evidence).join(' ');
 expect(normalizeStoryReferences(proposals,[{text}])).toEqual(proposals);
 expect(normalizeStoryReferences(proposals.map(r=>({...r,value:`inferred ${r.field}`})),[{text}])).toEqual([]);
});

test('richer profiles retain old fields and reject private or unrelated field categories',()=>{
 const text='Mira: silver coat.';
 const base={kind:'npc',name:'Mira',paragraphIndex:0,value:'silver coat',evidence:text};
 expect(normalizeStoryReferences(['description','appearance','outfit','condition'].map(field=>({...base,field})),[{text}])).toHaveLength(4);
 expect(normalizeStoryReferences(['secret','hiddenMotives','unreadContents','revealedContents','layout'].map(field=>({...base,field})),[{text}])).toEqual([]);
});

test('bounds distinct richer proposals without making malformed enrichment fatal',()=>{
 const proposals=Array.from({length:40},(_,index)=>({kind:'npc',name:'Mira',paragraphIndex:0,field:'role',value:`role ${index}`,evidence:`Mira: role ${index}.`}));
 expect(normalizeStoryReferences([null,...proposals],[{text:proposals.map(r=>r.evidence).join(' ')}])).toHaveLength(32);
});
