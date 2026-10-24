import {z} from 'zod';
import type {VisualNovelConfig} from '../config.js';
import type {ImageTemplate} from './image-templates.js';
import {BUILTIN_SHARED_STYLES} from './image-styles.js';

const FieldSchema=z.object({text:z.string().max(4000),characters:z.number().int().nonnegative(),shortened:z.boolean(),positiveOccurrences:z.number().int().min(0).max(1000),negativeOccurrences:z.number().int().min(0).max(1000)}).strict().refine(field=>field.characters>=field.text.length&&field.shortened===(field.characters>field.text.length),'Inconsistent style snapshot length.');
export const SharedStyleSnapshotSchema=z.object({version:z.literal(1),presetId:z.string().max(256).nullable(),presetName:z.string().max(160).nullable(),matchesPreset:z.boolean().nullable(),prefix:FieldSchema,suffix:FieldSchema,negative:FieldSchema}).strict();
export type SharedStyleSnapshot=z.infer<typeof SharedStyleSnapshotSchema>;

/** Display-only preparation evidence. Never infer a legacy selection or change
 * actual prompt strings to fit the bounded snapshot. */
export function sharedStyleSnapshot(config:VisualNovelConfig,template:Pick<ImageTemplate,'positive'|'negative'>):SharedStyleSnapshot{
 const presetId=config.selectedSharedStyleId??null;
 const preset=presetId?[...config.promptPresets,...BUILTIN_SHARED_STYLES].find(preset=>preset.id===presetId):undefined;
 const field=(text:string,token:string)=>({text:text.slice(0,4000),characters:text.length,shortened:text.length>4000,
  positiveOccurrences:template.positive.split(`{{${token}}}`).length-1,negativeOccurrences:template.negative.split(`{{${token}}}`).length-1});
 return {version:1,presetId,presetName:preset&&preset.name.length<=160?preset.name:null,
  matchesPreset:preset?config.promptPrefix===preset.positive&&config.negativePrompt===preset.negative&&(preset.suffix===undefined||config.promptSuffix===preset.suffix):null,
  prefix:field(config.promptPrefix,'style'),suffix:field(config.promptSuffix,'suffix'),negative:field(config.negativePrompt,'negative')};
}
