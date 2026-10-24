import {test,expect} from 'bun:test';
import {preparedBrief} from './prepared-brief.js';
import {templateSnapshot} from '../../shared/image-templates.js';
import {DEFAULT_CONFIG} from '../../config.js';
import type {ImageRequestRecord} from '../../shared/image-review.js';
const record:ImageRequestRecord={requestId:'r',jobId:'j',paragraphIndex:0,state:'review',prompt:'portrait',negativePrompt:'blur',model:'model',provider:'nanogpt',connectionId:'c',parameters:{size:'1024x1024'},referenceSummary:'none',createdAt:'now',imagePromptMetadata:{template:templateSnapshot(DEFAULT_CONFIG.imageTemplates[0]!),selectionReason:'scene',format:'description',trackerStatus:'not_found',brief:{scene:'Library',subjects:'Mira with dark hair',action:'Reading a letter',composition:'By the window',lighting:'Cloudy daylight',subjectMode:'one',framing:'portrait',referencePolicy:'character',sources:['story'],conflicts:[]}}};
test('brief uses retained notes and never invents a style preset or missing scene',()=>{
 const view=preparedBrief(record);
 expect(view.rows.find(row=>row.label==='Subjects')?.value).toBe('Mira with dark hair');
 expect(view.rows.find(row=>row.label==='Moment')?.value).toBe('Reading a letter');
 expect(view.rows.some(row=>row.label==='Style preset')).toBe(false);
 expect(preparedBrief({...record,imagePromptMetadata:undefined} as any).rows).toEqual([]);
});
test('free text and parameter edits are identified without rewriting the saved brief',()=>{
 const view=preparedBrief(record,{prompt:'A different moment',negativePrompt:'',parameters:{size:'768x1344'}});
 expect(view.changed).toBe(true);expect(view.rows.find(row=>row.label==='Moment')?.value).toBe('Reading a letter');
 expect(view.output).toContain('768x1344');
 expect(record.parameters.size).toBe('1024x1024');
});
test('source strength, positive-only handling and square-only output remain explicit',()=>{
 const view=preparedBrief({...record,promptProfile:{version:1,family:'flux',maxCharacters:1200,source:'manual',providerLimit:3000,format:'description',negativeMode:'positive-only',guidance:'Family guidance.',output:{sizes:['768x768','1024x1024']},outputSource:'catalogue',outputManaged:true}});
 expect(view.compatibility.join(' ')).toContain('Manual');
 expect(view.compatibility.join(' ')).toContain('positive-only');
 expect(view.compatibility.join(' ')).toContain('square');
 expect(view.compatibility.join(' ')).toContain('catalogue');
});
test('raw output and unknown support never masquerade as managed model capabilities',()=>{
 const view=preparedBrief({...record,promptProfile:{version:1,family:'generic',maxCharacters:3000,source:'fallback',format:'description',negativeMode:'supported-or-unknown',guidance:'',output:{sizes:['1024x1024']},outputSource:'live',outputManaged:false}},{prompt:record.prompt,negativePrompt:record.negativePrompt,parameters:{rawRequestOverride:{api_key:'secret',size:'2048x2048'}}});
 expect(view.output).toContain('Custom');expect(JSON.stringify(view)).not.toContain('secret');
 expect(view.compatibility.join(' ')).toContain('unverified');
 expect(preparedBrief(undefined).rows).toEqual([]);
});
test('saved nearest-size decision remains attributed when draft output changes',()=>{
 const view=preparedBrief({...record,promptProfile:{version:1,family:'qwen',maxCharacters:3000,source:'live',format:'description',negativeMode:'supported-or-unknown',guidance:'',output:{sizes:['768x1344']},outputSource:'live',outputManaged:true,outputSummary:'Nearest supported portrait to 9:16: 768x1344.'}},{prompt:record.prompt,negativePrompt:record.negativePrompt,parameters:{size:'1024x1024'}});
 expect(view.compatibility.join(' ')).toContain('Saved output decision: Nearest supported portrait');
 expect(view.output).toBe('Size: 1024x1024');
});
