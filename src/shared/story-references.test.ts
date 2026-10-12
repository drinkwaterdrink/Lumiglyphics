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
