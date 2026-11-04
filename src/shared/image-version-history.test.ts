import {expect,test} from 'bun:test';
import {normalizeImageVersionHistory,archiveImageVersion} from './image-version-history.js';
const version=(n:number)=>({versionId:`v${n}`,imageId:`i${n}`,imageUrl:`/api/v1/images/i${n}`,timestamp:'2026-11-01T00:00:00Z'});
test('corrupt optional version history drops invalid entries without dropping valid neighbors',()=>{
  const history=normalizeImageVersionHistory({job:[version(1),null,{...version(2),imageUrl:'x" onerror="bad'},version(3)],bad:'invalid'});
  expect(history.job?.map(v=>v.versionId)).toEqual(['v1','v3']);
  expect(history.bad).toBeUndefined();
  expect(normalizeImageVersionHistory(null)).toEqual({});
});
test('history retains the latest 50 unique images in stable chronological order',()=>{
  const history=normalizeImageVersionHistory({job:Array.from({length:51},(_,i)=>version(i))});
  expect(history.job).toHaveLength(50);
  expect(history.job?.[0]?.versionId).toBe('v1');
  expect(history.job?.at(-1)?.versionId).toBe('v50');
  expect(archiveImageVersion(history,'job',version(50)).job).toHaveLength(50);
  expect(archiveImageVersion(history,'job',version(51)).job?.at(-1)?.versionId).toBe('v51');
});

test('malformed provenance keeps the image available without claiming verified restoration',()=>{
 const history=normalizeImageVersionHistory({job:[{...version(1),provenance:{version:1,job:{},cue:{},requestId:'bad'}}]});
 expect(history.job).toHaveLength(1);
 expect(history.job?.[0]?.provenance).toBeUndefined();
});
