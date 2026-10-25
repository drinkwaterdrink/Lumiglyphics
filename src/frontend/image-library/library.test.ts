import {describe,expect,test} from 'bun:test';
import {installFakeDocument} from '../stage/stage-test-dom.js';
import {ImageLibrary,sameLibraryContext,type LibraryContext} from './library.js';
import type {TurnView} from '../../protocol.js';

function turn(overrides:Partial<TurnView>={}):TurnView{
 return {
  chatId:'chat-1',messageId:'m1',swipeId:0,sourceFingerprint:'fp1',revision:1,
  speaker:'Narrator',paragraphs:['p0'],...overrides,
 } as TurnView;
}

describe('F13 library change detection',()=>{
 test('sameLibraryContext compares the five primitive fields without serialization',()=>{
  const a:LibraryContext={chatId:'c',messageId:'m',swipeId:0,sourceFingerprint:'fp',revision:2};
  const identical:LibraryContext={...a};
  expect(sameLibraryContext(a,identical)).toBe(true);
  expect(sameLibraryContext(a,{...a,revision:3})).toBe(false);
  expect(sameLibraryContext(a,{...a,messageId:'m2'})).toBe(false);
  expect(sameLibraryContext(a,{...a,swipeId:1})).toBe(false);
  expect(sameLibraryContext(a,{...a,sourceFingerprint:'fp2'})).toBe(false);
  expect(sameLibraryContext(a,{...a,chatId:'c2'})).toBe(false);
  expect(sameLibraryContext(null,null)).toBe(true);
  expect(sameLibraryContext(a,null)).toBe(false);
  expect(sameLibraryContext(null,a)).toBe(false);
 });

 test('setContext reloads only when a context field or the cursor actually changes',()=>{
  const restore=installFakeDocument();
  try{
   const requests:Array<{anchor:{messageId:string;paragraphIndex:number}}>=[];
   const library=new ImageLibrary(document.createElement('div'),(req)=>requests.push(req as never),()=>{});
   library.setContext(turn(),0);
   library.openWorkspace();
   expect(requests).toHaveLength(1);
   expect(requests[0]!.anchor.messageId).toBe('m1');
   expect(requests[0]!.anchor.paragraphIndex).toBe(0);
   // New object, identical content: no reload.
   library.setContext(turn(),0);
   expect(requests).toHaveLength(1);
   // Cursor move: reload with the new paragraph anchor.
   library.setContext(turn(),2);
   expect(requests).toHaveLength(2);
   expect(requests[1]!.anchor.paragraphIndex).toBe(2);
   // A turn revision/message change: reload anchored at the new message.
   library.setContext(turn({messageId:'m2',sourceFingerprint:'fp2',revision:2}),2);
   expect(requests).toHaveLength(3);
   expect(requests[2]!.anchor.messageId).toBe('m2');
  }finally{restore();}
 });
});
