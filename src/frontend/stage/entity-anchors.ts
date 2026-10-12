import type {DossierAnchor} from '../../shared/dossiers.js';
/** Wrap only one text node per anchor. Cross-formatting/links/code are omitted
 * rather than restructuring the safe renderer's DOM or changing visible text. */
export function clearEntityAnchors(root:HTMLElement):void {
 const buttons=[...root.querySelectorAll<HTMLElement>('[data-entity-anchor]')];if(!buttons.length)return;
 for(const button of buttons)button.replaceWith(...button.childNodes);
 root.normalize();
}
export function applyEntityAnchors(root:HTMLElement,anchors:readonly DossierAnchor[],open:(id:string,button:HTMLElement)=>void,preview:(id:string)=>string):void {
 clearEntityAnchors(root);
 const doc=root.ownerDocument,walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes:Array<{node:Text,start:number,end:number}>=[];let offset=0;
 while(walker.nextNode()){const node=walker.currentNode as Text;nodes.push({node,start:offset,end:offset+node.data.length});offset+=node.data.length;}
 for(const a of [...anchors].sort((a,b)=>b.start-a.start)) {
  const entry=nodes.find(n=>a.start>=n.start&&a.end<=n.end);if(!entry||entry.node.parentElement?.closest('a,code,button,[data-vn-text-fx]'))continue;
  const begin=a.start-entry.start,end=a.end-entry.start;if(begin<0||end>entry.node.length||end<=begin)continue;
  const tail=entry.node.splitText(end),label=entry.node.splitText(begin);
  const button=doc.createElement('button');button.type='button';button.dataset.entityAnchor=a.entityId;button.textContent=label.data;
  button.setAttribute('aria-label',`About ${label.data}`);button.setAttribute('aria-haspopup','dialog');button.title=preview(a.entityId);
  button.addEventListener('click',event=>{event.stopPropagation();open(a.entityId,button);});
  label.replaceWith(button);void tail;
 }
}

export function protectedEntityRanges(root:HTMLElement):Array<[number,number]> {
 const walker=root.ownerDocument.createTreeWalker(root,NodeFilter.SHOW_TEXT);let offset=0;const result:Array<[number,number]>=[];
 while(walker.nextNode()){const node=walker.currentNode as Text,end=offset+node.length;if(node.parentElement?.closest('a,code,button,[data-vn-text-fx]'))result.push([offset,end]);offset=end;}
 return result;
}
