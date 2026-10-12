import { describe, expect, test } from 'bun:test';
import { normalizeConfig } from '../../config.js';
import { templateSnapshot } from '../../shared/image-templates.js';
import { correctVisualSubject, SubjectCorrectionSchema } from './subject-resolution.js';

const templates = normalizeConfig({}).imageTemplates;
const cue = { cueId:'cue',paragraphIndex:0,sceneId:'scene',sceneRevision:0,kind:'flattened_scene' as const,action:null,expression:null,promptDelta:'',assetJobId:'job',character: 'Rookhaven Academy', resolvedIdentity: '', resolvedAttire: 'old coat', imageTemplate: templateSnapshot(templates[0]!) };
const registry = { aleister: { id: 'aleister', name: 'Aleister', aliases: [], tags: 'black hair, brown eyes', subjectCategory: 'male' as const } };
describe('picture subject correction', () => {
 test('uses the selected person and clears the previous wardrobe', () => {
  const result = correctVisualSubject(cue, {kind:'character',name:'Aleister',saveAppearance:false}, registry, templates);
  expect(result.character).toBe('Aleister'); expect(result.resolvedIdentity).toBe('black hair, brown eyes'); expect(result.resolvedAttire).toBeNull(); expect(result.subjectCategory).toBe('male');
 });
 test('a new name cannot borrow a known appearance', () => {
  expect(() => correctVisualSubject(cue, {kind:'character',name:'Rasha',saveAppearance:false}, registry, templates)).toThrow('appearance');
 });
 test('manual appearance is picture-only unless explicitly saved', () => {
  const result = correctVisualSubject(cue, {kind:'character',name:'Rasha',appearance:'silver hair, green eyes',saveAppearance:false}, registry, templates);
  expect(result.resolvedIdentity).toBe('silver hair, green eyes'); expect(registry.aleister.tags).toBe('black hair, brown eyes');
 });
 test('nonhuman subjects work without gender invention', () => {
  expect(correctVisualSubject(cue, {kind:'character',name:'Dragon',appearance:'silver scales, blue eyes',saveAppearance:false}, {}, templates).resolvedIdentity).toContain('scales');
 });
 test('environment correction bypasses character appearance', () => {
  const environment = templates.find(t=>t.subjectMode==='none')!;
  const result = correctVisualSubject(cue, {kind:'environment',templateId:environment.id}, {}, templates);
  expect(result.imageTemplate?.subjectMode).toBe('none'); expect(result.character).toBeNull(); expect(result.resolvedIdentity).toBe('');
 });
 test('cannot turn a portrait template into a no-people request', () => {
  expect(() => correctVisualSubject(cue,{kind:'environment',templateId:templates[0]!.id},{},templates)).toThrow('no people');
 });
 test('rejects malformed or unbounded actions', () => {
  expect(SubjectCorrectionSchema.safeParse({kind:'character',name:'X',saveAppearance:'yes'}).success).toBe(false);
  expect(SubjectCorrectionSchema.safeParse({kind:'character',name:'x'.repeat(300),saveAppearance:false}).success).toBe(false);
 });
});


test('compiled correction cannot retain the previous subject direction',()=>{
 const old={...cue,visualDescription:'Mira in a silver dress raises her hand',action:'Mira adjusts her silver dress',visualFocus:'Mira'};
 const corrected=correctVisualSubject(old,{kind:'character',name:'Aleister',saveAppearance:false},registry,templates);
 expect(corrected.visualDescription).toBe('');expect(corrected.action).toBeNull();expect(corrected.visualFocus).toBe('');
});


test('explicit appearance can repair an incorrect saved subject class',()=>{
 const result=correctVisualSubject(cue,{kind:'character',name:'Alex',appearance:'male, black hair, blue eyes',saveAppearance:false},{alex:{id:'alex',name:'Alex',aliases:[],tags:'black hair, blue eyes',subjectCategory:'female'}},templates);
 expect(result.subjectCategory).toBe('male');
});
