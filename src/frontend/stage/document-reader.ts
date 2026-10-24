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
[data-vn-document-reader]{display:flex;flex-direction:column;overflow:hidden;padding:16px;max-height:calc(100dvh - max(32px,env(safe-area-inset-top)) - max(32px,env(safe-area-inset-bottom)));transition:background .22s ease,border-color .22s ease}
[data-vn-document-reader] header{flex:none;gap:8px;border-bottom:1px solid var(--vn-panel-border,#666);padding-bottom:8px}
[data-vn-document-reader] header h2{flex:1;font-size:1.05em;line-height:1.3}
[data-vn-document-reader] header button{flex:none;min-width:44px;padding:8px;margin:0;font-size:1.3em}
[data-document-meta]{flex:none;font-size:.75em;opacity:.85;margin:10px 0;letter-spacing:.04em;text-transform:uppercase}
[data-document-body]{min-height:0;overflow:auto;overscroll-behavior:contain;user-select:text;-webkit-user-select:text;cursor:text;touch-action:pan-y;line-height:1.68;font-size:max(16px,1em);padding:12px 14px 16px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 4%,transparent);border-radius:10px;overflow-wrap:anywhere;border:1px solid color-mix(in srgb,var(--vn-panel-border,#666) 45%,transparent)}
[data-document-body] p{white-space:pre-wrap;margin:8px 0}
[data-document-body] section+section{border-top:1px solid var(--vn-panel-border,#666);margin-top:18px;padding-top:10px}
[data-document-body] small{display:block;font:inherit;font-size:.7em;opacity:.85;margin-top:4px}
[data-vn-document-reader][data-document-kind="letter"] [data-document-body],
[data-vn-document-reader][data-document-kind="note"] [data-document-body]{font-family:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;background:linear-gradient(180deg,color-mix(in srgb,#e8d5b5 12%,var(--vn-panel-solid,#171b26)),color-mix(in srgb,#c8a97e 8%,var(--vn-panel-solid,#171b26)));border-color:color-mix(in srgb,#d6b588 38%,var(--vn-panel-border,#666));box-shadow:inset 0 1px 0 rgba(255,244,224,.08)}
[data-vn-document-reader][data-document-kind="journal"] [data-document-body]{font-family:"Iowan Old Style",Georgia,serif;background:repeating-linear-gradient(180deg,transparent 0,transparent 27px,color-mix(in srgb,var(--vn-accent,#9ec6f0) 8%,transparent) 28px),color-mix(in srgb,#d8c3a5 7%,var(--vn-panel-solid,#171b26));border-left:3px solid color-mix(in srgb,#d69e5c 55%,var(--vn-accent,#9ec6f0))}
[data-vn-document-reader][data-document-kind="notice"] [data-document-body]{border:2px double color-mix(in srgb,var(--vn-accent,#9ec6f0) 45%,var(--vn-panel-border,#666));padding:16px}
[data-vn-document-reader][data-document-kind="phone"] [data-document-body]{font-family:system-ui,-apple-system,sans-serif;background:color-mix(in srgb,#0b101b 75%,var(--vn-panel-solid,#171b26));border-radius:16px;padding:14px}
[data-vn-document-reader][data-document-kind="phone"] [data-document-body] section{background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 14%,rgba(255,255,255,.04));border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 26%,transparent);border-radius:14px 14px 14px 4px;padding:10px 12px;margin-top:10px}
[data-vn-document-reader][data-document-kind="terminal"] [data-document-body]{font-family:ui-monospace,"Cascadia Mono","Fira Code",monospace;line-height:1.55;background:linear-gradient(180deg,rgba(8,20,16,.88),rgba(5,14,11,.94));color:#9ef5c2;border-color:rgba(82,214,145,.36);box-shadow:inset 0 0 24px rgba(16,185,129,.08)}
[data-vn-document-reader] footer{flex:none;display:flex;align-items:center;gap:12px;padding-top:8px;border-top:1px solid var(--vn-panel-border,#666)}
[data-vn-document-reader] footer button{margin:0;min-width:44px}[data-vn-document-reader] [role="status"]{font-size:.75em}
[data-document-body]:focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
`;
