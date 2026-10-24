import {afterEach,describe,expect,test} from 'bun:test';
import {installFakeDocument} from './stage-test-dom.js';
import {PanelDock} from './panel-dock.js';
import type {PanelArtifact} from '../../shared/panels.js';
import type {TurnView} from '../../protocol.js';

function installDomShims(): () => void {
 const restore=installFakeDocument();
 const g=globalThis as Record<string,unknown>;
 const storage=new Map<string,string>();
 g.localStorage={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);},removeItem:(k:string)=>{storage.delete(k);}};
 class FakeCustomEvent{constructor(public type:string,public detail?:unknown){}}
 g.CustomEvent=FakeCustomEvent;
 g.window={innerHeight:800,addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}};
 g.DOMParser=class{parseFromString(html:string){return {head:{innerHTML:''},body:{innerHTML:html},querySelectorAll:()=>[]};}};
 return restore;
}

function turn(overrides:{messageId?:string;sourceFingerprint?:string;panels:PanelArtifact[];paragraphs?:string[]}):TurnView{
 return {
  chatId:'chat-1',messageId:overrides.messageId??'m1',swipeId:0,
  sourceFingerprint:overrides.sourceFingerprint??'fp1',revision:1,speaker:'Narrator',
  paragraphs:overrides.paragraphs??['p0','p1','p2','p3'],panels:overrides.panels,
 } as unknown as TurnView;
}
const card=(id:string,paragraphIndex:number,extra:Partial<PanelArtifact>={}):PanelArtifact=>({
 id,title:`Card ${id}`,html:`<div>${id}</div>`,paragraphIndex,...extra,
});

describe('PanelDock F10 render thrashing',()=>{
 afterEach(()=>{/* shims restored per test */});

 test('candidate rows are built once per turn and only hidden toggles on cursor advance',()=>{
  const restore=installDomShims();
  try{
   const dock=new PanelDock(document.createElement('div'));
   const early=card('c0',0),late=card('c1',2);
   dock.setTurn(turn({panels:[early,late]}),0);
   const internals=dock as unknown as {candidateRows:Map<string,HTMLElement>;launcher:HTMLElement};
   const row0=internals.candidateRows.get('c0')!,row1=internals.candidateRows.get('c1')!;
   expect(row0.hidden).toBe(false);
   expect(row1.hidden).toBe(true);
   expect(internals.launcher.textContent).toBe('Panels · 1');
   // Advancing paragraphs must not rebuild any row.
   dock.setCursor(1);
   expect(internals.candidateRows.get('c0')).toBe(row0);
   expect(internals.candidateRows.get('c1')).toBe(row1);
   expect(row1.hidden).toBe(true);
   dock.setCursor(2);
   expect(internals.candidateRows.get('c1')).toBe(row1);
   expect(row1.hidden).toBe(false);
   expect(internals.launcher.textContent).toBe('Panels · 2');
   dock.destroy();
  }finally{restore();}
 });

 test('a follow pin keeps one iframe across turns; srcdoc changes only when the html changes',()=>{
  const restore=installDomShims();
  try{
   const dock=new PanelDock(document.createElement('div'));
   const v1=card('live',0,{followKey:'simtracker:hp',html:'<div>v1</div>'});
   dock.setTurn(turn({panels:[v1]}),0);
   (dock as unknown as {pin:(c:PanelArtifact,follow:boolean)=>void}).pin(v1,true);
   const internals=dock as unknown as {frames:Map<string,{iframe:{srcdoc:string};htmlHash:string}>;nodes:Map<string,HTMLElement>};
   const key='follow:simtracker:hp';
   const firstFrame=internals.frames.get(key)!.iframe;
   const firstSrcdoc=firstFrame.srcdoc;
   expect(firstSrcdoc).toContain('v1');
   // Same content, newer turn/fingerprint: no iframe recreation, no srcdoc rewrite.
   const sameContent={...v1};
   dock.setTurn(turn({messageId:'m2',sourceFingerprint:'fp2',panels:[sameContent]}),0);
   expect(internals.frames.get(key)!.iframe).toBe(firstFrame);
   expect(internals.frames.get(key)!.iframe.srcdoc).toBe(firstSrcdoc);
   // New content for the same follow key: the iframe element survives, only its document changes.
   const v2={...v1,html:'<div>v2</div>'};
   dock.setTurn(turn({messageId:'m3',sourceFingerprint:'fp3',panels:[v2]}),0);
   expect(internals.frames.get(key)!.iframe).toBe(firstFrame);
   expect(internals.frames.get(key)!.iframe.srcdoc).toContain('v2');
   expect(internals.frames.get(key)!.iframe.srcdoc).not.toBe(firstSrcdoc);
   expect(internals.nodes.has(key)).toBe(true);
   dock.destroy();
  }finally{restore();}
 });

 test('switching chats drops the old pins nodes; a new chat rebuilds from storage',()=>{
  const restore=installDomShims();
  try{
   const dock=new PanelDock(document.createElement('div'));
   const snap=card('snap',0);
   dock.setTurn(turn({panels:[snap]}),0);
   (dock as unknown as {pin:(c:PanelArtifact,follow:boolean)=>void}).pin(snap,false);
   const internals=dock as unknown as {nodes:Map<string,HTMLElement>};
   expect(internals.nodes.size).toBe(1);
   const next=turn({panels:[card('other',0)]}) as TurnView;
   (next as {chatId:string}).chatId='chat-2';
   dock.setTurn(next,0);
   expect(internals.nodes.size).toBe(0);
   dock.destroy();
  }finally{restore();}
 });

 test('F15 the 24px resize glyph exposes a 44px-class invisible touch target',()=>{
  const restore=installDomShims();
  try{
   const dock=new PanelDock(document.createElement('div'));
   const style=(dock as unknown as {root:ShadowRoot}).root.querySelector('style')!;
   expect(style.textContent).toMatch(/\.resize::after\{content:"";position:absolute;inset:-10px\}/);
   expect(style.textContent).toMatch(/@media\(pointer:coarse\)\{\.resize::after\{inset:-12px\}\}/);
   dock.destroy();
  }finally{restore();}
 });

 test('a snapshot pin node survives paragraph cursor changes untouched',()=>{
  const restore=installDomShims();
  try{
   const dock=new PanelDock(document.createElement('div'));
   const snap=card('snap',0);
   dock.setTurn(turn({panels:[snap]}),0);
   (dock as unknown as {pin:(c:PanelArtifact,follow:boolean)=>void}).pin(snap,false);
   const internals=dock as unknown as {nodes:Map<string,HTMLElement>};
   const key='snapshot:m1:';
   const pinKey=[...internals.nodes.keys()].find(k=>k.startsWith(key))!;
   const node=internals.nodes.get(pinKey)!;
   dock.setCursor(1);dock.setCursor(2);dock.setCursor(3);
   expect(internals.nodes.get(pinKey)).toBe(node);
   dock.destroy();
  }finally{restore();}
 });
});
