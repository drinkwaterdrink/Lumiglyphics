import {afterEach,beforeEach,expect,test} from 'bun:test';
import {FakeDocument,FakeNode,installFakeDocument} from './stage-test-dom';
import {TypewriterController,TYPEWRITER_REST_ATTRIBUTE,TYPEWRITER_PENDING_ATTRIBUTE} from './typewriter-controller';
let restore:()=>void;
beforeEach(()=>{restore=installFakeDocument();});
afterEach(()=>{delete (FakeDocument as any).createTreeWalker;restore();});
const setup=(text:string)=>{
 const host=new FakeNode('div'),node=FakeDocument.createTextNode(text);host.appendChild(node);
 (FakeDocument as any).createTreeWalker=()=>{const nodes=[node];return {nextNode:()=>nodes.shift()??null};};
 const controller=new TypewriterController();expect(controller.prepare(host as any)).toBe(true);
 return {host,node,controller};
};
test('keeps the full remainder in layout and reveals surrogate pairs in one tick',()=>{
 const {host,node,controller}=setup('A👋B');const sounds:string[]=[];
 const sound=(text:string)=>sounds.push(text);
 expect(host.querySelector(`[${TYPEWRITER_REST_ATTRIBUTE}]`)?.textContent).toBe('A👋B');
 expect(node.textContent).toBe('');
 expect(controller.step(false,sound)).toBe(false);expect(node.textContent).toBe('A');
 controller.step(false,sound);expect(node.textContent).toBe('A👋');
 controller.step(false,sound);expect(node.textContent).toBe('A👋B');
 expect(host.querySelector(`[${TYPEWRITER_REST_ATTRIBUTE}]`)).toBeNull();
 expect(controller.step(false,sound)).toBe(true);expect(sounds).toEqual(['A','👋','B']);
});
test('preserves punctuation pause counts and allows live smart-pacing changes',()=>{
 const {node,controller}=setup(',B');const sounds:string[]=[];
 controller.step(true,text=>sounds.push(text));expect(node.textContent).toBe(',');
 controller.step(false,()=>{});controller.step(false,()=>{});expect(node.textContent).toBe(',');
 controller.step(false,text=>sounds.push(text));expect(node.textContent).toBe(',B');expect(sounds).toEqual([',','B']);
});
test('a split effect letter is one reveal step including a joined emoji',()=>{
 const host=new FakeNode('div'),letter=new FakeNode('span'),node=FakeDocument.createTextNode('👩‍🚀');letter.setAttribute('data-vn-text-fx-ch','');letter.appendChild(node);host.appendChild(letter);
 (FakeDocument as any).createTreeWalker=()=>{const nodes=[node];return {nextNode:()=>nodes.shift()??null};};
 const controller=new TypewriterController();controller.prepare(host as any);
 expect(letter.hasAttribute(TYPEWRITER_PENDING_ATTRIBUTE)).toBe(true);const sounds:any[]=[];
 expect(controller.step(true,(char,effect)=>sounds.push([char,effect]))).toBe(false);
 expect(letter.hasAttribute(TYPEWRITER_PENDING_ATTRIBUTE)).toBe(false);expect(node.textContent).toBe('👩‍🚀');
 expect(sounds).toEqual([['👩‍🚀',true]]);expect(controller.step(true,()=>{})).toBe(true);
});
test('completion removes remainder nodes and reset forgets detached text without mutating it',()=>{
 const {host,node,controller}=setup('Keep this exact text.');controller.step(false,()=>{});controller.complete();
 expect(node.textContent).toBe('Keep this exact text.');expect(host.querySelector(`[${TYPEWRITER_REST_ATTRIBUTE}]`)).toBeNull();
 const next=setup('Unrelated draft');next.controller.reset();next.controller.complete();expect(next.node.textContent).toBe('');
});
test('node boundaries have no extra pause or sound and whitespace is passed to the owning audio policy',()=>{
 const host=new FakeNode('div'),nodes=['','A',' ','B'].map(text=>FakeDocument.createTextNode(text));for(const node of nodes)host.appendChild(node);
 (FakeDocument as any).createTreeWalker=()=>{const queue=[...nodes];return {nextNode:()=>queue.shift()??null};};
 const controller=new TypewriterController();controller.prepare(host as any);const sounds:string[]=[];
 for(let i=0;i<3;i++)expect(controller.step(false,text=>sounds.push(text))).toBe(false);
 expect(sounds).toEqual(['A',' ','B']);expect(controller.step(false,()=>{})).toBe(true);
});
test('missing tree walker and empty paragraphs finish immediately without DOM rewriting',()=>{
 const controller=new TypewriterController(),host=new FakeNode('div');host.textContent='Keep';
 expect(controller.prepare(host as any)).toBe(false);expect(host.textContent).toBe('Keep');
 (FakeDocument as any).createTreeWalker=()=>({nextNode:()=>null});expect(controller.prepare(host as any)).toBe(false);
});
