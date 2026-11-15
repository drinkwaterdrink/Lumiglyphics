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

 test('useHistoryEntry uses larger limit and Load older merges earlier replies and images without dropping existing ones',()=>{
  const restore=installFakeDocument();
  try{
   const requests:Array<any>=[];
   const library=new ImageLibrary(document.createElement('div'),(req)=>requests.push(req),()=>{});
   library.useHistoryEntry();
   library.setContext(turn({messageId:'m3'}),0);
   library.open('story');
   expect(requests).toHaveLength(1);
   expect(requests[0]!.limit).toBe(72);

   const key3={chatId:'chat-1',assistantMessageId:'m3',swipeId:0,sourceFingerprint:'fingerprint-3',revision:1};
   const key2={chatId:'chat-1',assistantMessageId:'m2',swipeId:0,sourceFingerprint:'fingerprint-2',revision:1};
   library.receive('chat-1',requests[0]!.requestId,{
    entries:[{key:key3,jobId:'j3',createdAt:'2026-10-13T12:00:00.000Z',messageNumber:3,paragraphIndex:0,role:'scene',versionLabel:'current',available:true,imageId:'img3',thumbnailUrl:'/api/v1/images/img3',imageUrl:'/api/v1/images/img3',excerpt:'Scene 3'}],
    replies:[{key:key3,messageNumber:3,versionLabel:'current',speaker:'Narrator',paragraphs:[{index:0,speaker:'Narrator',text:'Newest reply'}],truncated:false}],
    nextCursor:'1:0',notice:'',
   });

   const shadow=(library as any).root as ShadowRoot;
   const loadMore=shadow.querySelector('[data-load-more]') as HTMLButtonElement;
   expect(loadMore.hidden).toBe(false);
   loadMore.click();

   expect(requests).toHaveLength(2);
   expect(requests[1]!.cursor).toBe('1:0');
   library.receive('chat-1',requests[1]!.requestId,{
    entries:[{key:key2,jobId:'j2',createdAt:'2026-10-13T11:59:00.000Z',messageNumber:2,paragraphIndex:0,role:'scene',versionLabel:'current',available:true,imageId:'img2',thumbnailUrl:'/api/v1/images/img2',imageUrl:'/api/v1/images/img2',excerpt:'Scene 2'}],
    replies:[{key:key2,messageNumber:2,versionLabel:'current',speaker:'Narrator',paragraphs:[{index:0,speaker:'Narrator',text:'Older reply'}],truncated:false}],
    nextCursor:null,notice:'',
   });

   expect(shadow.querySelectorAll('[data-reply]')).toHaveLength(2);
   expect(shadow.querySelectorAll('[data-image-card]')).toHaveLength(2);
   expect(loadMore.hidden).toBe(true);
  }finally{restore();}
 });
});
