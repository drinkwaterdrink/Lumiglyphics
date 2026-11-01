import {expect,test} from 'bun:test';
import {applyCastSuggestion,appearanceOriginLabel} from './cast-suggestions.js';
import type {CastSetupInput} from '../../shared/cast-art.js';
const draft:CastSetupInput={appearance:'black hair',aliases:['M'],anchors:[],outfits:[{id:'coat',name:'Coat',description:'blue coat'}],defaultOutfitId:'coat'};
const source:CastSetupInput={appearance:'silver hair',aliases:['m','Moon'],anchors:[],outfits:[{id:'coat',name:'Coat',description:'red coat'},{id:'new',name:'Uniform',description:'white uniform'}],defaultOutfitId:'new'};
test('appearance-only selection cannot replace aliases outfits or chosen default',()=>{
 const before=JSON.stringify(draft),next=applyCastSuggestion(draft,source,'appearance',()=> 'new-id');
 expect(next.setup).toEqual({...draft,appearance:'silver hair'});expect(JSON.stringify(draft)).toBe(before);
});
test('alias merge deduplicates without changing appearance or outfit guidance',()=>{
 const next=applyCastSuggestion(draft,source,'aliases',()=> 'new-id');
 expect(next.setup).toEqual({...draft,aliases:['M','Moon']});
});
test('outfit import retains same-name conflicts, preserves default and assigns fresh ids',()=>{
 const next=applyCastSuggestion(draft,source,'outfits',()=> 'new-id');
 expect(next.setup.outfits).toEqual([...draft.outfits,{id:'new-id',name:'Uniform',description:'white uniform'}]);
 expect(next.setup.defaultOutfitId).toBe('coat');expect(next.setup.appearance).toBe('black hair');
 expect(next.notices.join(' ')).toContain('Coat');
});
test('limits and empty descriptions do not silently replace existing guidance',()=>{
 const full={...draft,aliases:Array.from({length:16},(_,i)=>`Alias ${i}`),outfits:Array.from({length:7},(_,i)=>({id:`id${i}`,name:`Look ${i}`,description:'existing'})),defaultOutfitId:'id0'};
 expect(applyCastSuggestion(full,source,'aliases',()=> 'new-id').setup.aliases).toEqual(full.aliases);
 expect(applyCastSuggestion(full,source,'outfits',()=> 'new-id').setup.outfits).toEqual(full.outfits);
 expect(applyCastSuggestion(draft,{...source,appearance:''},'appearance',()=> 'new-id').setup.appearance).toBe(draft.appearance);
});
test('explicit appearance selection records its label while manual changes stop matching',()=>{
 const next=applyCastSuggestion(draft,source,'appearance',()=> 'new-id','Story reference · message-1');
 expect(next.setup.appearanceOrigin).toEqual({source:'Story reference · message-1',appearance:'silver hair'});
 expect(appearanceOriginLabel(next.setup)).toContain('Selected source: Story reference');
 expect(appearanceOriginLabel({...next.setup,appearance:'red hair'})).toContain('Saving will clear');
 expect(appearanceOriginLabel(draft)).toContain('not recorded');
 expect(applyCastSuggestion(next.setup,source,'aliases',()=> 'new-id','Other source').setup.appearanceOrigin).toEqual(next.setup.appearanceOrigin);
});
