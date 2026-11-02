import {CharacterFolio} from '../src/frontend/stage/character-folio.js';
import {createEmptyCharacterDNA,type CharacterDNALibrary} from '../src/shared/character-dna.js';
import {applyDnaChanges} from '../src/shared/character-dna-workflow.js';
import {APERTURE_THEME_CSS} from '../src/frontend/theme/aperture-theme.js';
const style=document.createElement('style');style.textContent=APERTURE_THEME_CSS;document.head.append(style);document.body.className='theme-dark';document.body.style.height='100dvh';
const dna=createEmptyCharacterDNA('Nadine Pruitt');dna.avatarUrl='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#365b67"/></svg>');
let library:CharacterDNALibrary={version:2,revision:0,characters:{[dna.id]:dna},deleted:{}};
const proposal:any={id:'p',characterId:dna.id,baseRevision:0,changes:[{path:'build.gender',value:'woman',classification:'inferred',sourceRefs:['s']},{path:'hair.color',value:'auburn',classification:'generated',sourceRefs:[]}],evidence:[{id:'s',source:'Story',text:'Nadine enters. She greets Darby.',kind:'context'}],statuses:[{source:'Story',status:'available'}]};
const folio=new CharacterFolio({onSaveDNA:c=>{library.characters[c.id]=structuredClone(c);library.revision!++;folio.setLibrary(structuredClone(library),true,{id:c.id,updatedAt:c.lastUpdated});},onAutoFillDNA:()=>queueMicrotask(()=>folio.setProposal(proposal)),onApplyDNA:(_id,fields)=>{library.characters[dna.id]=applyDnaChanges(library.characters[dna.id]!,proposal.changes.filter((c:any)=>fields.includes(c.path)));library.revision!++;folio.setLibrary(structuredClone(library));},onDeleteDNA:c=>{library.deleted![c.id]=c;delete library.characters[c.id];library.revision!++;folio.setLibrary(structuredClone(library));},onRestoreDNA:id=>{library.characters[id]=library.deleted![id]!;delete library.deleted![id];library.revision!++;folio.setLibrary(structuredClone(library));}});
document.body.append(folio.element);folio.setContext('chat');folio.syncFromTurn({paragraphs:['Nadine arrives.'],subjectCandidates:['Nadine Pruitt'],assets:[]} as any);folio.setLibrary(structuredClone(library));folio.enter();

Object.assign(window,{dnaFixture:{get library(){return library;},refresh:(incoming:CharacterDNALibrary)=>{library=structuredClone(incoming);folio.setLibrary(structuredClone(library),false);},folio}});
