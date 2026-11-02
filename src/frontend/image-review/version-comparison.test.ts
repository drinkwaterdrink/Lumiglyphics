import {expect,test} from 'bun:test';
import {comparisonVersions} from './version-comparison.js';
const valid={versionId:'v',imageId:'i',imageUrl:'/api/v1/images/i',timestamp:'2026-11-02T00:00:00Z'};
test('comparison only accepts validated saved images and bounds history',()=>{expect(comparisonVersions([valid,{...valid,versionId:'bad',imageUrl:'javascript:evil()'}])).toEqual([valid]);expect(comparisonVersions(Array.from({length:80},(_,i)=>({...valid,versionId:String(i),imageId:String(i)}))).length).toBe(50);});
