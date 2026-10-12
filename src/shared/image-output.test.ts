import {test,expect} from 'bun:test';
import {normalizeConfig} from '../config.js';
import {IMAGE_OUTPUT_RATIOS} from './image-output.js';
test('all ratios persist and invalid or legacy config retains connection defaults',()=>{
 for(const ratio of IMAGE_OUTPUT_RATIOS)expect(normalizeConfig({imageOutputAspectRatio:ratio}).imageOutputAspectRatio).toBe(ratio);
 expect(normalizeConfig({imageOutputAspectRatio:'invalid'}).imageOutputAspectRatio).toBe('default');
 expect(normalizeConfig({}).imageOutputAspectRatio).toBe('default');
 expect(normalizeConfig({}).collectEntityReferences).toBe(false);
});
