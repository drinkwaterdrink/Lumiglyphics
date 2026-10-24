import {expect,test} from 'bun:test';
import {assertPromptProtection,promptProtection,type PromptProtection} from './prompt-protection.js';

const metadata=(subjects:string,subjectMode:'ensemble'|'one'='ensemble')=>({brief:{subjects,subjectMode}}) as any;

test('F6: facts kept despite attached commas, colons, periods and full-width punctuation',()=>{
 const source='red dress, blue coat, silver hairpin';
 const prompt='a red dress, blue coat: silver hairpin。 night street';
 const locks=promptProtection(prompt,metadata(source,'one'),true);
 expect(locks.facts.map(f=>f)).toContain('red dress');
 expect(locks.facts).toContain('blue coat');
 expect(locks.facts).toContain('silver hairpin');
 expect(()=>assertPromptProtection(prompt,locks)).not.toThrow();
});

test('F6: a fact that only appears inside a larger word is not treated as present',()=>{
 // "cat ear" must not match "cat earrings": boundary-safe token matching.
 const locks=promptProtection('cat earrings glinting',metadata('cat ear','one'),true);
 expect(locks.facts).toEqual([]);
 const manual:PromptProtection={exact:'',facts:['cat ear'],subjects:[],minimumCharacters:7};
 expect(()=>assertPromptProtection('cat earrings glinting',manual)).toThrow(/omitted or changed/);
 expect(()=>assertPromptProtection('a cat ear, visible',manual)).not.toThrow();
});

test('F6: fact tokens must appear contiguously and in order',()=>{
 const manual:PromptProtection={exact:'',facts:['red wool dress'],subjects:[],minimumCharacters:14};
 expect(()=>assertPromptProtection('red dress made of wool',manual)).toThrow(/omitted or changed/);
 expect(()=>assertPromptProtection('wearing a red wool dress, indoors',manual)).not.toThrow();
});

test('non-compact single-subject mode protects the exact source phrase',()=>{
 const source='One visible woman; silver hair, green eyes';
 expect(promptProtection(source,metadata(source,'one'),false).exact).toBe(source);
 const dropped=promptProtection('completely different text',metadata(source,'one'),false);
 expect(dropped.exact).toBe('');
 expect(()=>assertPromptProtection('completely different text',{exact:source,facts:[],subjects:[],minimumCharacters:source.length}))
   .toThrow(/protected identity/);
});

test('ensemble: punctuation-attached facts validate per named subject',()=>{
 const source='Mira Vale: silver hair, blue coat\nJon Reed: black hair, grey jacket';
 const locks=promptProtection(source,metadata(source),true);
 const rewritten='Mira Vale: silver hair, blue coat,\nJon Reed: black hair, grey jacket.';
 expect(()=>assertPromptProtection(rewritten,locks)).not.toThrow();
});

test('ensemble: a fact moved onto the other cast member is rejected',()=>{
 const source='Mira: silver hair, blue coat\nJon: black hair, grey jacket';
 const locks=promptProtection(source,metadata(source),true);
 const swapped='Mira: black hair, grey jacket\nJon: silver hair, blue coat';
 expect(()=>assertPromptProtection(swapped,locks)).toThrow(/assigned to another person/);
});

test('ensemble: a missing cast member is rejected even when every fact survives elsewhere',()=>{
 const source='Mira: silver hair\nJon: black hair';
 const locks=promptProtection(source,metadata(source),true);
 expect(()=>assertPromptProtection('Mira: silver hair, black hair nearby',locks)).toThrow(/cast member was omitted/);
});

test('ensemble build keeps facts present under the owning subject and drops absent ones',()=>{
 const source='Mira: silver hair, blue coat\nJon: black hair, grey jacket';
 const current='Mira: silver hair, red scarf\nJon: black hair, grey jacket,';
 const locks=promptProtection(current,metadata(source),true);
 const mira=locks.subjects.find(s=>s.name==='Mira')!;
 const jon=locks.subjects.find(s=>s.name==='Jon')!;
 expect(mira.facts).toContain('silver hair');
 expect(mira.facts).not.toContain('blue coat');
 expect(jon.facts).toEqual(expect.arrayContaining(['black hair','grey jacket']));
});

test('empty or absent subject metadata yields an empty lock',()=>{
 expect(promptProtection('anything',undefined,true)).toEqual({exact:'',facts:[],subjects:[],minimumCharacters:0});
 expect(promptProtection('anything',metadata('   ','one'),true)).toEqual({exact:'',facts:[],subjects:[],minimumCharacters:0});
});
