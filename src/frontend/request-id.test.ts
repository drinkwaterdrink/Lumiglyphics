import {test,expect} from 'bun:test';
import {createUiId} from './request-id.js';
test('uses native UUIDs where available',()=>{
 expect(createUiId({randomUUID:()=> 'native-id'})).toBe('native-id');
});
test('non-security UI IDs remain distinct without a secure-context crypto API',()=>{
 const ids=Array.from({length:100},()=>createUiId(null));
 expect(new Set(ids).size).toBe(ids.length);
 for(const id of ids)expect(id).toMatch(/^[a-zA-Z0-9-]{1,64}$/);
 expect(createUiId({})).toMatch(/^lg-/);
});
