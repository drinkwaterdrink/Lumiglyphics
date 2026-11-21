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

test('Wave 1: supports all 6 lore fields, synonym coercion, 4-letter aliases, full-name splitting, Braille spaces, and cross-beat inheritance', () => {
  const paragraphs = [
    { text: 'You\u2800step\u2800into\u2800Marten\u2800House\u2800Lobby.\u2800Warm\u2800sconce\u2800light\u2800falls\u2800across\u2800crooked\u2800oak\u2800furniture\u2800and\u2800the\u2800smell\u2800of\u2800wet\u2800wool.' },
    { text: 'Naomi Vance shifts her laundry basket on her hip, a brass token swinging on a cord.' },
    { text: 'Her dry, clipped cadence cuts through the hallway hum.' },
    { text: 'Orin sets his tarnished pewter pen beside the desk.' },
  ];

  const extracted = normalizeStoryReferences([
    // 1. Place fields from MASTER_LORE_REFERENCE_PROMPT
    { kind: 'location', name: 'Marten House Lobby', paragraphIndex: 0, field: 'lighting', value: 'Warm sconce light', evidence: 'Warm sconce light falls across crooked oak furniture', extraField: 'ignored' },
    { kind: 'place', name: 'Marten House Lobby', paragraphIndex: 0, field: 'atmosphere', value: 'smell of wet wool', evidence: 'and the smell of wet wool.' },
    { kind: 'place', name: 'Marten House Lobby', paragraphIndex: 0, field: 'persistentElements', value: 'crooked oak furniture', evidence: 'Warm sconce light falls across crooked oak furniture' },
    // 2. Object fields + synonym coercion
    { kind: 'item', name: 'brass token', paragraphIndex: 1, field: 'material', value: 'brass', evidence: 'a brass token swinging on a cord.' },
    { kind: 'object', name: 'brass token', paragraphIndex: 1, field: 'colors', value: 'brass', evidence: 'a brass token swinging on a cord.' },
    { kind: 'object', name: 'tarnished pewter pen', paragraphIndex: 3, field: 'distinctiveFeatures', value: 'tarnished pewter', evidence: 'Orin sets his tarnished pewter pen beside the desk.' },
    // 3. Cross-beat pronoun inheritance + punctuation/conjunction variance on Naomi Vance
    { kind: 'npc', name: 'Naomi Vance', paragraphIndex: 2, field: 'voice', value: 'dry and clipped cadence', evidence: 'Her dry, clipped cadence cuts through the hallway hum.' },
    // 4. 4-letter name boundary check (Orin)
    { kind: 'npc', name: 'Orin Vance', paragraphIndex: 3, field: 'appearance', value: 'tarnished pewter pen', evidence: 'Orin sets his tarnished pewter pen beside the desk.' },
  ], paragraphs, { sourceIndexes: [0, 1, 1, 2] });

  expect(extracted.map((r) => `${r.kind}:${r.field}:${r.name}`)).toEqual([
    'place:lighting:Marten House Lobby',
    'place:atmosphere:Marten House Lobby',
    'place:persistentElements:Marten House Lobby',
    'object:materials:brass token',
    'object:colors:brass token',
    'object:distinctiveFeatures:tarnished pewter pen',
    'npc:voice:Naomi Vance',
    'npc:appearance:Orin Vance',
  ]);
});
