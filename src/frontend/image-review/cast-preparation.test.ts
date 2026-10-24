import {expect,test} from 'bun:test';
import {castPreparation} from './cast-preparation.js';
import {templateSnapshot} from '../../shared/image-templates.js';
import {DEFAULT_CONFIG} from '../../config.js';
import type {ImageRequestRecord} from '../../shared/image-review.js';
const record:ImageRequestRecord={requestId:'r',jobId:'j',paragraphIndex:0,state:'review',prompt:'portrait',negativePrompt:'',model:'model',provider:'p',connectionId:'c',parameters:{},referenceSummary:'none',createdAt:'now',imagePromptMetadata:{template:templateSnapshot(DEFAULT_CONFIG.imageTemplates[0]!),selectionReason:'scene',format:'description',trackerStatus:'detected',brief:{scene:'library',subjects:'One character; silver hair; red coat',action:'Reading',composition:'portrait',lighting:'day',subjectMode:'one',framing:'portrait',referencePolicy:'character',sources:['tracker','saved appearance'],conflicts:['Saved appearance wins.'],subjectPreparation:{name:'Mira',identity:'silver hair',identitySource:'saved appearance',attire:'red coat',attireSource:'picture cue',direction:'smiling',shortened:false,subjectsInPositive:true,subjectsInNegative:false}}}};
test('cast projection distinguishes identity outfit direction and prepared block',()=>{
 const view=castPreparation(record);
 expect(view.rows.find(row=>row.label==='Identity before outfit')?.value).toBe('silver hair');
 expect(view.rows.find(row=>row.label==='Outfit')?.value).toBe('red coat');
 expect(view.rows.find(row=>row.label==='Prepared subject block')?.value).toBe(record.imagePromptMetadata!.brief.subjects);
 expect(view.rows.find(row=>row.label==='Conflicts / preparation notes')?.value).toBe('Saved appearance wins.');
});
test('missing sources and omitted subject tokens are explicit rather than inferred',()=>{
 const legacy=structuredClone(record);delete legacy.imagePromptMetadata!.brief.subjectPreparation;
 expect(castPreparation(legacy).notes.join(' ')).toContain('cannot be reconstructed');
 const omitted=structuredClone(record);omitted.imagePromptMetadata!.brief.subjectPreparation!.subjectsInPositive=false;
 expect(castPreparation(omitted).notes.join(' ')).toContain('omits {{subjects}}');
 expect(castPreparation(undefined).rows).toEqual([]);
 const environment=structuredClone(record);environment.imagePromptMetadata!.brief.subjectMode='none';
 expect(castPreparation(environment).rows).toEqual([]);
});
