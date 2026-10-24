import {afterEach,beforeEach,describe,expect,test} from "bun:test";
import {FakeDocument,FakeNode,installFakeDocument} from "./stage-test-dom";
import {VnStage} from "./vn-stage";
import type {VnTurnInput} from "../store";

const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

describe("VnStage backlog cap and hidden-tab typewriter",()=>{
 let restore:()=>void;
 let stage:VnStage|null;

 beforeEach(()=>{
  restore=installFakeDocument();
  stage=null;
 });
 afterEach(()=>{
  stage?.destroy();
  (FakeDocument as unknown as Record<string,unknown>).visibilityState="visible";
  delete (FakeDocument as unknown as Record<string,unknown>).createTreeWalker;
  restore();
 });

 test("backlog retention is capped at 200 entries and drops the oldest",()=>{
  const s=new VnStage({mount:new FakeNode("div") as unknown as HTMLElement,textSpeed:0});
  stage=s;
  const api=s as unknown as {
   backlogEntries:Array<{text:string}>;
   recordBacklogAndRead(id:string,speaker:string|undefined,text:string,formatted:string):void;
  };
  for(let i=0;i<205;i+=1)api.recordBacklogAndRead(`p${i}`,"Mira",`Text ${i}`,"formatted");
  expect(api.backlogEntries).toHaveLength(200);
  expect(api.backlogEntries[0]!.text).toBe("Text 5");
  expect(api.backlogEntries[199]!.text).toBe("Text 204");
 });

 test("the typewriter does not advance while the tab is hidden, then catches up on return",async()=>{
  // Opt-in TreeWalker: the shared fake DOM defaults to instant rendering;
  // installing one forces the real interval-driven typewriter path.
  const doc=FakeDocument as unknown as Record<string,unknown>;
  doc.createTreeWalker=(root:FakeNode)=>({
   nextNode: (()=>{
    const texts:FakeNode[]=[];
    const walk=(node:FakeNode):void=>{for(const child of node.children){if(child.isText)texts.push(child);else walk(child);}};
    walk(root);
    let index=-1;
    return ()=>(++index<texts.length?texts[index]!:null);
   })(),
  });
  const s=new VnStage({mount:new FakeNode("div") as unknown as HTMLElement,textSpeed:10});
  stage=s;
  doc.visibilityState="hidden";
  const turn:VnTurnInput={
   mode:"standard",
   paragraphs:[{id:"p0",text:"Hidden tab sentence.",speaker:"Mira"}],
   choices:[],
  };
  s.loadTurn(turn);
  await wait(120);
  const dialogue=(s as unknown as {dialogueText:HTMLElement}).dialogueText as unknown as FakeNode;
  // Hidden: ticks are skipped, so the remainder span still holds the full text.
  expect(dialogue.querySelectorAll("[data-vn-typing-rest]").length).toBeGreaterThan(0);
  doc.visibilityState="visible";
  await wait(400);
  // Back in view: the reveal completes and the remainder span is removed.
  expect(dialogue.querySelectorAll("[data-vn-typing-rest]").length).toBe(0);
  expect(dialogue.textContent).toContain("Hidden tab sentence.");
  doc.createTreeWalker=undefined;
 });
});
