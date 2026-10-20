import {NANOGPT_OUTPUT_CAPABILITIES} from "./model-output-catalogue.js";
import {ModelOutputCapabilitiesSchema} from "./model-output-capabilities.js";
import {expect,test} from 'bun:test';
import {parseOutputCapabilities,chooseModelOutput,assertCapabilityOutput} from './model-output-capabilities.js';

test('output metadata validates enumerated sizes and rejects unbounded or malformed values',()=>{
 expect(parseOutputCapabilities({resolutions:['1024*1024','720*1280'],aspect_ratio:['auto','9:16']})).toEqual({sizes:['1024*1024','720*1280'],ratios:['auto','9:16']});
 expect(parseOutputCapabilities({resolutions:['bad','0x1024','999999x999999']})).toBeUndefined();
 expect(parseOutputCapabilities({resolutions:Array(100).fill('1024x1024')})).toBeUndefined();
});
test('pixel enums use closest supported framing and never request arbitrary dimensions',()=>{
 const output={sizes:['1024*1024','1280*720','720*1280','1024*1536']};
 const chosen=chooseModelOutput(output,{size:'864x1536'},'9:16');
 expect(chosen.parameters.size).toBe('720*1280');expect(chosen.summary).toContain('9:16');
 expect(chooseModelOutput({sizes:['1024x1024']},{size:'864x1536'},'9:16').summary).toContain('1:1');
});
test('ratio-valued size fields and resolution tiers retain the actual API format',()=>{
 expect(chooseModelOutput({sizes:['1:1','9:16','16:9']},{size:'864x1536'},'9:16').parameters.size).toBe('9:16');
 const chosen=chooseModelOutput({sizes:['1k','2k','4k'],ratios:['auto','1:1','9:16']},{size:'864x1536'},'9:16');
 expect(chosen.parameters).toMatchObject({size:'1k',aspectRatio:'9:16',rawRequestOverride:{aspect_ratio:'9:16'}});
 expect(chooseModelOutput({sizes:['1k','2k'],ratios:['1:1','9:16']},{size:'2k'},'9:16').parameters.size).toBe('2k');
});
test('custom raw overrides are preserved and unsupported outgoing values block locally',()=>{
 const capabilities={sizes:['1k','2k'],ratios:['1:1','9:16']};
 const parameters={size:'1k',rawRequestOverride:'{"size":"8k"}'};
 expect(chooseModelOutput(capabilities,parameters,'9:16').parameters).toEqual(parameters);
 expect(()=>assertCapabilityOutput(capabilities,parameters)).toThrow('8k');
 expect(()=>assertCapabilityOutput(capabilities,{size:'1k',rawRequestOverride:{aspect_ratio:'4:1'}})).toThrow('ratio');
 expect(()=>assertCapabilityOutput(capabilities,{size:'1k',rawRequestOverride:{resolution:'8k'}})).toThrow('8k');
 expect(()=>assertCapabilityOutput(capabilities,{size:'2k',rawRequestOverride:'{"aspect_ratio":"9:16"}'})).not.toThrow();
});
test('inherited shapes and unknown formats are explained rather than fabricated',()=>{
 const chosen=chooseModelOutput({sizes:['auto']},{size:'864x1536'},'9:16');
 expect(chosen.parameters.size).toBe('auto');expect(chosen.summary).toContain('controls the shape');
});


test('bundled model outputs survive request-history validation without weakening the schema',()=>{
 for(const [id,value] of Object.entries(NANOGPT_OUTPUT_CAPABILITIES))expect(ModelOutputCapabilitiesSchema.safeParse(value).success,id).toBe(true);
});

test('raw nulls cannot hide unsupported outgoing fields behind valid visible values',()=>{
 const caps={sizes:['1k'],ratios:['9:16']};
 expect(()=>assertCapabilityOutput(caps,{size:'1k',rawRequestOverride:{size:null}})).toThrow('null');
 expect(()=>assertCapabilityOutput(caps,{size:'1k',aspectRatio:'9:16',rawRequestOverride:{aspect_ratio:null}})).toThrow('null');
});
