import {expect,test} from 'bun:test';
import {promptProtection} from './prompt-protection.js';
import {createPromptAnchors,expandPromptAnchors} from './prompt-anchors.js';

const metadata=(subjects:string,subjectMode='ensemble')=>({brief:{subjects,subjectMode}} as any);
test('immutable cast anchors preserve cross-mentioned names and every owned fact without paraphrase validation',()=>{
 const subjects='Mira Vale: silver hair, blue coat, standing beside Jon Reed\nJon Reed: black hair, grey jacket';
 const locks=promptProtection(subjects,metadata(subjects),true),anchors=createPromptAnchors(subjects,locks);
 expect(anchors.entries).toHaveLength(2);
 const expanded=expandPromptAnchors(`${anchors.entries[1]!.token} Near the doorway: ${anchors.entries[0]!.token}`,anchors);
 expect(expanded.usedAnchors).toBe(true);expect(expanded.prompt).toContain('Mira Vale: silver hair, blue coat, standing beside Jon Reed');
 expect(expanded.prompt).toContain('Jon Reed: black hair, grey jacket');
});
test('missing, duplicated, negative-field and fabricated anchors are rejected explicitly',()=>{
 const subjects='Mira: silver hair\nJon: black hair';
 const a=createPromptAnchors(subjects,promptProtection(subjects,metadata(subjects),true));
 expect(()=>expandPromptAnchors(a.entries[0]!.token,a)).toThrow('missing');
 expect(()=>expandPromptAnchors(a.entries.map(e=>e.token).join(' ')+a.entries[0]!.token,a)).toThrow('once');
 expect(()=>expandPromptAnchors(a.entries.map(e=>e.token).join(' ')+' [[LG_CAST_99_99]]',a)).toThrow('Unknown');
 expect(()=>expandPromptAnchors('Scene',a,a.entries[0]!.token)).toThrow('negative');
 expect(()=>expandPromptAnchors(a.entries.map(e=>e.token).join(' ')+' [[LG_CAST_0_]]',a)).toThrow('Malformed');
});
test('anchors respect current edits, deduplicate locks and never restore removed metadata facts',()=>{
 const source='One visible woman; silver hair, green eyes, blue coat; Wearing blue coat';
 const current='One visible woman; black hair, green eyes, blue coat.';
 const locks=promptProtection(current,metadata(source,'one'),true),a=createPromptAnchors(current,locks);
 const result=expandPromptAnchors(a.entries[0]!.token+'; black hair.',a);
 expect(result.prompt).not.toContain('silver');expect(result.prompt.match(/blue coat/g)).toHaveLength(1);
 expect(result.prompt).toContain('green eyes');expect(result.prompt).toContain('black hair');
});
test('marker namespace avoids collisions with literal scene text',()=>{
 const text='[[LG_CAST_0_0]] silver hair';
 const a=createPromptAnchors(text,{exact:'silver hair',facts:[],subjects:[],minimumCharacters:11});
 expect(a.entries[0]!.token).not.toBe('[[LG_CAST_0_0]]');
 expect(a.expandedCharacters).toBe(11);
});

test('ensemble locks do not restore a removed fact just because another person now has it',()=>{
 const source='Mira: silver hair, blue coat\nJon: black hair, grey jacket';
 const current='Mira: red hair, blue coat\nJon: silver hair, grey jacket';
 const locks=promptProtection(current,metadata(source),true);
 expect(locks.subjects.find(s=>s.name==='Mira')?.facts).not.toContain('silver hair');
 expect(locks.subjects.find(s=>s.name==='Jon')?.facts).not.toContain('black hair');
 expect(locks.subjects.find(s=>s.name==='Mira')?.facts).toContain('red hair');
 expect(locks.subjects.find(s=>s.name==='Jon')?.facts).toContain('silver hair');
});
