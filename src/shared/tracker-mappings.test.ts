import {test,expect} from 'bun:test';
import {TrackerMappingsSchema,normalizeTrackerMappings,readMappedTrackerValues} from './tracker-mappings.js';
test('mapping paths are bounded data paths, never expressions or inherited properties',()=>{
 expect(TrackerMappingsSchema.safeParse({identity:['custom.look'],attire:[],sceneState:[],world:[]}).success).toBe(true);
 for(const path of ['__proto__.x','constructor.name','custom[0]','{{macro}}','custom..look'])expect(TrackerMappingsSchema.safeParse({identity:[path]}).success).toBe(false);
 expect(readMappedTrackerValues({custom:{look:'silver hair',nested:{secret:'hidden'}}},['custom.look','custom.nested'])).toEqual(['silver hair']);
 expect(readMappedTrackerValues(Object.create({look:'inherited'}),['look'])).toEqual([]);
 expect(normalizeTrackerMappings({identity:['custom.look','constructor.name','custom.look']})).toEqual({identity:['custom.look'],attire:[],sceneState:[],world:[]});
});

test('mapping migration is forgiving and bounded while editor validation is strict',()=>{
 expect(normalizeTrackerMappings(null)).toEqual({identity:[],attire:[],sceneState:[],world:[]});
 expect(normalizeTrackerMappings({identity:Array.from({length:20},(_,i)=>`field${i}`)}).identity).toHaveLength(6);
 expect(TrackerMappingsSchema.safeParse({identity:Array(7).fill('custom.look')}).success).toBe(false);
 expect(TrackerMappingsSchema.safeParse({identity:['a.b.c.d.e.f.g']}).success).toBe(false);
 expect(readMappedTrackerValues({custom:{tags:['silver','silver',null,{secret:'hidden'},'braids']}},['custom.tags'])).toEqual(['silver','braids']);
});
