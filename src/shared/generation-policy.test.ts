import {test,expect} from 'bun:test';
import {automaticGenerationAllowed} from './generation-policy.js';
test('automatic dispatch requires an open view and enabled generation with data saver off',()=>{for(const viewOpen of [false,true])for(const generateImages of [false,true])for(const dataSaverMode of [false,true])expect(automaticGenerationAllowed({viewOpen,generateImages,dataSaverMode})).toBe(viewOpen&&generateImages&&!dataSaverMode);});
