import type {DossierAnchor} from '../../shared/dossiers.js';
export function clearEntityAnchors(root:HTMLElement):void {
 const buttons=[...root.querySelectorAll<HTMLElement>('[data-entity-anchor]')];if(!buttons.length)return;
 for(const button of buttons)button.replaceWith(...button.childNodes);
 root.normalize();
}
/** Wrap single or adjacent inline-formatted text nodes per anchor without restructuring safe DOM. */
export function applyEntityAnchors(root:HTMLElement,anchors:readonly DossierAnchor[],open:(id:string,button:HTMLElement)=>void,preview:(id:string)=>string,isDocument?:(id:string)=>boolean):void {
 clearEntityAnchors(root);
 const doc=root.ownerDocument??(typeof document!=='undefined'?document:undefined);
 if(!doc||typeof doc.createTreeWalker!=='function')return;
 const walker=doc.createTreeWalker(root,typeof NodeFilter!=='undefined'?NodeFilter.SHOW_TEXT:4);
 const nodes:Array<{node:Text,start:number,end:number}>=[];let offset=0;
 while(walker.nextNode()){const node=walker.currentNode as Text;nodes.push({node,start:offset,end:offset+node.data.length});offset+=node.data.length;}
 for(const a of [...anchors].sort((a,b)=>b.start-a.start)) {
  const overlapping=nodes.filter(n=>n.end>a.start&&n.start<a.end&&n.node.data.length>0);
  if(!overlapping.length)continue;
  if(overlapping.some(n=>n.node.parentElement?.closest('a,code,button,[data-vn-text-fx]')))continue;
  const fullLabel=overlapping.map(n=>{
   const begin=Math.max(0,a.start-n.start),end=Math.min(n.node.length,a.end-n.start);
   return n.node.data.slice(begin,end);
  }).join('');
  if(!fullLabel)continue;
  for(let idx=overlapping.length-1;idx>=0;idx--) {
   const entry=overlapping[idx]!;
   const begin=Math.max(0,a.start-entry.start),end=Math.min(entry.node.length,a.end-entry.start);
   if(begin<0||end>entry.node.length||end<=begin)continue;
   const tail=entry.node.splitText(end),label=entry.node.splitText(begin);
   const button=doc.createElement('button');button.type='button';button.dataset.entityAnchor=a.entityId;
   if(isDocument?.(a.entityId)&&idx===overlapping.length-1)button.dataset.entityDoc='true';
   button.textContent=label.data;
   button.setAttribute('aria-label',`About ${fullLabel}`);button.setAttribute('aria-haspopup','dialog');button.title=preview(a.entityId);
   button.addEventListener('click',event=>{event.stopPropagation();open(a.entityId,button);});
   label.replaceWith(button);void tail;
  }
 }
}

export function protectedEntityRanges(root:HTMLElement):Array<[number,number]> {
 const doc=root.ownerDocument??(typeof document!=='undefined'?document:undefined);
 if(!doc||typeof doc.createTreeWalker!=='function')return [];
 const walker=doc.createTreeWalker(root,typeof NodeFilter!=='undefined'?NodeFilter.SHOW_TEXT:4);let offset=0;const result:Array<[number,number]>=[];
 while(walker.nextNode()){const node=walker.currentNode as Text,end=offset+node.length;if(node.parentElement?.closest('a,code,button,[data-vn-text-fx]'))result.push([offset,end]);offset=end;}
 return result;
}
