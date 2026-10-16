import type {StoryDocument} from '../../shared/story-documents.js';
const kinds:Record<StoryDocument['kind'],string>={letter:'Letter',note:'Note',journal:'Journal',notice:'Notice',phone:'Phone messages',terminal:'Terminal'};
/** Literal text only. No HTML, remote assets, generation or story mutations. */
export function createDocumentReader(documentRecord:StoryDocument,back:()=>void,close:()=>void):HTMLElement{
 const panel=document.createElement('section');panel.dataset.vnDossierCard='';panel.dataset.vnDocumentReader='';panel.dataset.documentKind=documentRecord.kind;
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',`Read ${documentRecord.name}`);
 const header=document.createElement('header'),backButton=document.createElement('button'),title=document.createElement('h2'),closeButton=document.createElement('button');
 backButton.type=closeButton.type='button';backButton.textContent='‹';backButton.title='Back to item';backButton.setAttribute('aria-label','Back to item');backButton.onclick=back;
 title.textContent=documentRecord.name;closeButton.textContent='×';closeButton.title='Close document';closeButton.setAttribute('aria-label','Close document');closeButton.onclick=close;header.append(backButton,title,closeButton);
 const meta=document.createElement('p');meta.dataset.documentMeta='';meta.textContent=`${kinds[documentRecord.kind]} · Revealed story text`;
 const body=document.createElement('div');body.dataset.documentBody='';body.tabIndex=0;body.setAttribute('aria-label','Document text');
 for(const section of documentRecord.sections){const passage=document.createElement('section'),text=document.createElement('p'),source=document.createElement('small');text.textContent=section.text;source.textContent=`Story · paragraph ${section.paragraphIndex+1}`;passage.append(text,source);body.append(passage);}
 const footer=document.createElement('footer'),copy=document.createElement('button'),status=document.createElement('span');status.setAttribute('role','status');
 copy.type='button';copy.textContent='Copy text';copy.title='Copy revealed text';copy.setAttribute('aria-label','Copy revealed text');copy.onclick=async()=>{
  if(!panel.isConnected)return;
  try{await navigator.clipboard.writeText(documentRecord.sections.map(s=>s.text).join('\n\n'));if(panel.isConnected)status.textContent='Copied.';}
  catch{if(panel.isConnected)status.textContent='Copy unavailable. Select the text to copy it.';}
 };
 footer.append(copy,status);panel.append(header,meta,body,footer);return panel;
}
export const DOCUMENT_READER_CSS=`
[data-vn-document-reader]{display:flex;flex-direction:column;overflow:hidden;padding:16px;max-height:calc(100dvh - max(32px,env(safe-area-inset-top)) - max(32px,env(safe-area-inset-bottom)))}
[data-vn-document-reader] header{flex:none;gap:8px;border-bottom:1px solid var(--vn-panel-border,#666);padding-bottom:8px}
[data-vn-document-reader] header h2{flex:1;font-size:1.05em;line-height:1.3}
[data-vn-document-reader] header button{flex:none;min-width:44px;padding:8px;margin:0;font-size:1.3em}
[data-document-meta]{flex:none;font-size:.75em;opacity:.85;margin:10px 0}
[data-document-body]{min-height:0;overflow:auto;overscroll-behavior:contain;user-select:text;-webkit-user-select:text;cursor:text;touch-action:pan-y;line-height:1.65;font-size:max(16px,1em);padding:4px 8px 12px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 4%,transparent);border-radius:8px;overflow-wrap:anywhere}
[data-document-body] p{white-space:pre-wrap;margin:8px 0}
[data-document-body] section+section{border-top:1px solid var(--vn-panel-border,#666);margin-top:18px;padding-top:10px}
[data-document-body] small{display:block;font:inherit;font-size:.7em;opacity:.85}
[data-vn-document-reader][data-document-kind="terminal"] [data-document-body]{font-family:ui-monospace,monospace;line-height:1.5}
[data-vn-document-reader] footer{flex:none;display:flex;align-items:center;gap:12px;padding-top:8px;border-top:1px solid var(--vn-panel-border,#666)}
[data-vn-document-reader] footer button{margin:0;min-width:44px}[data-vn-document-reader] [role="status"]{font-size:.75em}
[data-document-body]:focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
`;
