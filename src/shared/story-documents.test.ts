import {test,expect} from 'bun:test';
import {normalizeStoryDocuments,validateStoryDocuments,visibleStoryDocuments} from './story-documents.js';
const paragraphs=[{text:'The sealed letter lies on the desk.'},{text:'The sealed letter reads: Meet me at dawn.'},{text:'The sealed letter continues: Bring the blue key.'}];
const proposal={name:'sealed letter',kind:'letter',paragraphIndex:0,sections:[{paragraphIndex:1,text:'Meet me at dawn.',evidence:paragraphs[1]!.text},{paragraphIndex:2,text:'Bring the blue key.',evidence:paragraphs[2]!.text}]};
test('literal document passages preserve exact text and reveal incrementally',()=>{
 const docs=normalizeStoryDocuments([proposal],paragraphs);
 expect(docs).toHaveLength(1);
 expect(visibleStoryDocuments(docs,0)[0]?.sections).toEqual([]);
 expect(visibleStoryDocuments(docs,1)[0]?.sections.map(s=>s.text)).toEqual(['Meet me at dawn.']);
 expect(visibleStoryDocuments(docs,2)[0]?.sections).toHaveLength(2);
 expect(visibleStoryDocuments(docs,1)[0]?.sections).toHaveLength(1);
 expect(visibleStoryDocuments(docs,-1)).toEqual([]);
});
test('invented, unclassified, earlier and ambiguous contents fail closed',()=>{
 expect(normalizeStoryDocuments([{...proposal,sections:[{...proposal.sections[0],text:'The secret password is 123.'}]}],paragraphs)[0]?.sections).toEqual([]);
 expect(normalizeStoryDocuments([{...proposal,visibility:'private'}],paragraphs)).toEqual([]);
 expect(normalizeStoryDocuments([{...proposal,sections:[{...proposal.sections[0],paragraphIndex:0}]}],paragraphs)[0]?.sections).toEqual([]);
 expect(normalizeStoryDocuments([{...proposal,paragraphIndex:2}],paragraphs)[0]?.sections).toHaveLength(1);
 const repeated=[{text:'letter says: A. letter says: A.'}];
 expect(normalizeStoryDocuments([{name:'letter',kind:'letter',paragraphIndex:0,sections:[{paragraphIndex:0,text:'A.',evidence:'letter says: A.'}]}],repeated)[0]?.sections).toEqual([]);
 expect(normalizeStoryDocuments({bad:true},paragraphs)).toEqual([]);
});
test('saved offsets are revalidated against actual source; missing text stays missing',()=>{
 const docs=normalizeStoryDocuments([proposal],paragraphs);
 expect(validateStoryDocuments(docs,paragraphs)).toEqual(docs);
 const removed=paragraphs.map(p=>({text:p.text.replace('Meet me at dawn.','Nothing remains.')}));
 expect(validateStoryDocuments(docs,removed)[0]?.sections.map(s=>s.text)).toEqual(['Bring the blue key.']);
 expect(validateStoryDocuments(docs,[{text:'A blank table.'}])).toEqual([]);
 expect(validateStoryDocuments([{...docs[0],sections:[{...docs[0]!.sections[0],start:0}]}],paragraphs)[0]?.sections).toEqual([]);
 expect(normalizeStoryDocuments([{...proposal,sections:[]}],paragraphs)[0]?.sections).toEqual([]);
});
test('Unicode, literal hostile markup, bounded long text and duplicate records',()=>{
 const body='灯台 🌙 <script>alert(1)</script>\nKeep  two spaces.';
 const ps=[{text:`phone shows: ${body}`}];
 const p={name:'phone',kind:'phone',paragraphIndex:0,sections:[{paragraphIndex:0,text:body,evidence:ps[0]!.text}]};
 const docs=normalizeStoryDocuments([p,p],ps);
 expect(docs).toHaveLength(1);expect(docs[0]!.sections[0]!.text).toBe(body);
 expect(ps[0]!.text.slice(docs[0]!.sections[0]!.start,docs[0]!.sections[0]!.end)).toBe(body);
 expect(normalizeStoryDocuments([{...p,sections:[{...p.sections[0],text:'a'.repeat(6001)}]}],ps)[0]?.sections).toEqual([]);
 expect(normalizeStoryDocuments(Array.from({length:30},(_,i)=>({...p,name:`phone${i}`})),[{text:Array.from({length:30},(_,i)=>`phone${i}`).join(' ')}]).length).toBeLessThanOrEqual(12);
});

test('journals, phone conversations and terminals keep exact passages without markup execution',()=>{
 for(const kind of ['journal','phone','terminal','note','notice'] as const){
  const text='From: Mira\nMeet me at 09:30.\n> access denied';
  const ps=[{text:`The ${kind} displays: ${text}`}];
  const docs=normalizeStoryDocuments([{name:kind,kind,paragraphIndex:0,sections:[{paragraphIndex:0,text,evidence:ps[0]!.text}]}],ps);
  expect(docs[0]?.kind).toBe(kind);expect(docs[0]?.sections[0]?.text).toBe(text);
 }
});
