import {TEXT_EFFECT_LETTER_ATTRIBUTE} from './text-effects.js';

/**
 * Typewriter bookkeeping. Untyped text sits in a `[data-vn-typing-rest]`
 * sibling span (visibility hidden, still in the layout) and untyped effect
 * letters carry `[data-vn-typing-pending]`, so line breaks never move while
 * a paragraph types out.
 */
export const TYPEWRITER_REST_ATTRIBUTE = "data-vn-typing-rest";
export const TYPEWRITER_PENDING_ATTRIBUTE = "data-vn-typing-pending";

type TypewriterNode = {
  node: Text;
  fullText: string;
  /** The effect-letter span that owns this text node, if any. */
  letter: Element | null;
  /** Hidden span holding this node's untyped remainder, while typing. */
  rest: HTMLElement | null;
};

/** Owns reveal DOM/cursor state only. The stage retains timers, source lifecycle,
 * hidden-tab gating, audio policy and reading-completion side effects. */
export class TypewriterController {
 private textNodes:TypewriterNode[]=[];
 private nodeIdx=0;
 private charIdx=0;
 private pauseTicks=0;
 reset():void{this.textNodes=[];this.nodeIdx=0;this.charIdx=0;this.pauseTicks=0;}
 prepare(root:HTMLElement):boolean {
  this.reset();
  if(typeof document.createTreeWalker!=='function')return false;
  const filter=typeof NodeFilter!=='undefined'?NodeFilter.SHOW_TEXT:4;
  const walker=document.createTreeWalker(root,filter);
  let node:Node|null;
  while((node=walker.nextNode())){
   const parent=node.parentNode as Element|null;
   const fullText=node.textContent??'';
   // A text-effect letter is one grapheme: reveal it in one step.
   const letter=parent&&typeof parent.hasAttribute==='function'&&parent.hasAttribute(TEXT_EFFECT_LETTER_ATTRIBUTE)?parent:null;
   this.textNodes.push({node:node as Text,fullText,letter,rest:null});
  }
  if(!this.textNodes.length||this.textNodes.every(item=>!item.fullText))return false;
  // Lay the whole paragraph out first and hide what is not typed yet, so
  // line breaks are final from the first letter: a word that will not fit
  // starts on the next line instead of jumping there half-typed. Untyped
  // text stays in the layout as a visibility-hidden sibling span; effect
  // letters keep their text and carry a pending attribute.
  for(const item of this.textNodes){
   if(!item.fullText)continue;
   if(item.letter){item.letter.setAttribute(TYPEWRITER_PENDING_ATTRIBUTE,'');continue;}
   const rest=document.createElement('span');
   rest.setAttribute(TYPEWRITER_REST_ATTRIBUTE,'');rest.setAttribute('aria-hidden','true');rest.textContent=item.fullText;
   item.node.textContent='';item.node.parentNode?.insertBefore(rest,item.node.nextSibling);item.rest=rest;
  }
  return true;
 }
 complete():void {
  for(const item of this.textNodes){item.node.textContent=item.fullText;item.rest?.remove();item.rest=null;item.letter?.removeAttribute(TYPEWRITER_PENDING_ATTRIBUTE);}
  this.reset();
 }
 /** Returns true on the completion tick; callbacks delegate audio eligibility to the stage. */
 step(smartPacing:boolean,onReveal:(char:string,effectLetter:boolean)=>void):boolean {
  if(this.pauseTicks>0){this.pauseTicks--;return false;}
  // Reveal one character per tick. Node boundaries (many with split
  // effect letters) cost no extra tick, and surrogate pairs stay whole.
  while(this.nodeIdx<this.textNodes.length){
   const current=this.textNodes[this.nodeIdx]!;
   if(this.charIdx<current.fullText.length){
    if(current.letter){current.letter.removeAttribute(TYPEWRITER_PENDING_ATTRIBUTE);this.charIdx=current.fullText.length;onReveal(current.fullText,true);return false;}
    const previous=this.charIdx,code=current.fullText.codePointAt(this.charIdx)??0;
    this.charIdx+=code>0xffff?2:1;
    const char=current.fullText.slice(previous,this.charIdx);
    current.node.textContent=current.fullText.slice(0,this.charIdx);
    if(current.rest){if(this.charIdx<current.fullText.length)current.rest.textContent=current.fullText.slice(this.charIdx);else{current.rest.remove();current.rest=null;}}
    if(smartPacing){if(char===','||char===';')this.pauseTicks=2;else if(char==='.'||char==='!'||char==='?')this.pauseTicks=4;else if(char==='—'||char==='…'||char===':')this.pauseTicks=5;}
    onReveal(char,false);return false;
   }
   this.nodeIdx++;this.charIdx=0;
  }
  return true;
 }
}
