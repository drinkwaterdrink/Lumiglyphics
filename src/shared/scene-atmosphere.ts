import type {TurnView} from '../protocol.js';
import type {AmbientEffect,SceneAtmosphereEntry,WorldAtmosphereSnapshot} from './contracts.js';
export type {SceneAtmosphereEntry,WorldAtmosphereSnapshot};
export type MusicTransitionPolicy='cue'|'location';
export type SceneLocation={paragraphIndex:number;location:string};
const locationKey=(value:string|null|undefined)=>{const key=value?.trim().replace(/\s+/g,' ').toLocaleLowerCase()||null;return key&&/^(unknown|unspecified|none|null|n\/a)$/.test(key)?null:key;};
export function locationForPosition(turn:TurnView,index:number):string|null{if(turn.sceneLocations){let location:string|null=null;for(const entry of turn.sceneLocations)if(Number.isInteger(entry.paragraphIndex)&&entry.paragraphIndex>=0&&entry.paragraphIndex<=index)location=entry.location.trim()||null;return location;}return turn.location?.trim()||null;}
export function atmosphereForPosition(turn:Pick<TurnView,'worldAtmosphere'>,index:number):WorldAtmosphereSnapshot|null {
  const entries = turn.worldAtmosphere;
  if (!entries?.length) return null;
  let current: WorldAtmosphereSnapshot | null = null;
  for (const entry of entries) {
    if (Number.isInteger(entry.paragraphIndex) && entry.paragraphIndex >= 0 && entry.paragraphIndex <= index) {
      current = {
        ...(current ?? {}),
        ...(entry.time !== undefined ? { time: entry.time } : {}),
        ...(entry.timeOfDay !== undefined ? { timeOfDay: entry.timeOfDay } : {}),
        ...(entry.date !== undefined ? { date: entry.date } : {}),
        ...(entry.temperature !== undefined ? { temperature: entry.temperature } : {}),
        ...(entry.weather !== undefined ? { weather: entry.weather } : {}),
        ...(entry.season !== undefined ? { season: entry.season } : {}),
        ...(entry.indoor !== undefined ? { indoor: entry.indoor } : {}),
        ...(entry.source !== undefined ? { source: entry.source } : {}),
      };
    }
  }
  if (!current) return null;
  const hasAny = Boolean(current.time || current.timeOfDay || current.date || current.temperature || current.weather);
  return hasAny ? current : null;
}
/** Replay recorded cues from the opening anchor, so backwards seeks use the same policy. */
export function musicTrackForPosition(input:{turn:TurnView;index:number;policy:MusicTransitionPolicy;openingTrack?:string|null;openingLocation?:string|null;manualTrack?:string|null}):string|null {
 if(input.manualTrack)return input.manualTrack;
 let track=input.openingTrack??null,location=locationKey(input.openingLocation),filled=Boolean(location&&track);
 const cues=new Map((input.turn.audioCues??[]).filter(c=>Number.isInteger(c.paragraphIndex)&&c.paragraphIndex>=0&&Boolean(c.bgmUrl||c.bgm)).map(c=>[c.paragraphIndex,c.bgmUrl||c.bgm]));
 for(let index=0;index<=Math.min(input.index,input.turn.paragraphs.length-1);index++){
  const nextLocation=locationKey(locationForPosition(input.turn,index));if(nextLocation!==location){location=nextLocation;filled=false;}
  const next=cues.get(index);if(next&&(input.policy==='cue'||!location||!filled)){track=next;filled=Boolean(location);}
 }return track;
}
/** Weather fallback only: never infer mood overlays or one-shot accents.
 * Structured weather only: never scan dialogue, names, lore or hypothetical story prose. */
export function deriveWeatherAmbient(weather:unknown):AmbientEffect|null {
 if(typeof weather!=='string')return null;const text=weather.slice(0,2000).trim().toLowerCase().replace(/[_-]+/g,' ');
 // Negated, hypothetical, and ended weather must not start an overlay.
 if(/\b(no|not|without|chance|possible|possibly|forecast|stopped|ended|cleared|clearing|dry|sunny|previously|earlier|might|may|could|would|if|unlikely)\b/.test(text)||/^clear\b|\bclear\s+(?:sky|skies|weather|night|day|morning|evening)\b|\bafter\s+(?:the\s+)?(?:rain|storm|snow|fog|downpour|blizzard|sandstorm)\b/.test(text))return null;
 if(/\b(heavy rain(?:fall)?|downpour|rainstorm|thunderstorm|storm|stormy)\b/.test(text))return 'heavy_rain';
 if(/\b(snowstorm)\b/.test(text))return 'snowstorm';
 if(/\b(blizzard|whiteout|heavy snow|snow|snowfall|snowing|snowy|flurries)\b/.test(text))return 'snow';
 if(/\b(sandstorm|dust storm|desert storm)\b/.test(text))return 'sandstorm';
 if(/\b(aurora(?: borealis)?|northern lights)\b/.test(text))return 'aurora';
 if(/\b(rain|rainfall|raining|rainy|drizzle|drizzling|showers)\b/.test(text))return 'rain';
 if(/\b(fog|foggy|mist|misty)\b/.test(text))return 'fog';
 if(/\b(ash|ashes|embers|cinders|volcanic)\b/.test(text))return 'embers';
 if(/\b(cherry blossoms?|sakura|petals)\b/.test(text))return 'sakura';
 if(/\b(falling leaves|autumn leaves)\b/.test(text))return 'autumn_leaves';
 if(/\b(sunbeams?|god rays|dappled sunlight|crepuscular)\b/.test(text))return 'sunbeams';
 return null;
}
const weatherEffects=new Set<AmbientEffect>(['rain','heavy_rain','snow','snowstorm','fog']);
export const OUTDOOR_WEATHER_AMBIENTS:ReadonlySet<AmbientEffect>=new Set<AmbientEffect>([
 'rain','heavy_rain','snow','snowstorm','fog','autumn_leaves','sakura','shooting_stars','sandstorm','aurora'
]);
const OUTDOOR_LOCATION_RE=/\b(outside|outdoor|outdoors|exterior|open[- ]air|garden|terrace|balcony|courtyard|patio|veranda|porch|rooftop|street|alley|alleyway|road|path|trail|park|forest|woods|glade|clearing|meadow|field|beach|shore|coast|cliff|mountain|peak|bridge|harbor|harbour|dock|pier|plaza|square|market|graveyard|cemetery|camp|campsite|ruins|swamp|marsh|desert|dunes|tundra|glacier|deck|bow|stern)\b/;
const INTERIOR_LOCATION_RE=/\b(inside|indoor|indoors|interior|room|hall|hallway|corridor|foyer|lobby|lounge|parlor|parlour|study|den|restaurant|diner|bistro|bakery|bedroom|kitchen|bathroom|restroom|library|archive|cafe|café|coffee\s*shop|tavern|inn|pub|bar|saloon|house|home|apartment|flat|suite|penthouse|loft|dorm|dormitory|office|cubicle|shop|store|boutique|cabin|cottage|shack|hut|classroom|lecture\s*hall|lab|laboratory|workshop|studio|forge|smithy|temple|church|chapel|cathedral|cellar|basement|attic|vault|chamber|throne\s*room|ballroom|salon|clinic|hospital|ward|infirmary|prison|cell|dungeon|bunker|shelter|carriage|train\s*car|subway\s*car|elevator|cockpit|galley|quarters|tent|yurt|cave|cavern|grotto|tunnel|mine|sewer|bathhouse|sauna)\b/;
const stripWindowClauses=(description:string):string=>description.replace(/\b(?:outside|beyond|through|against|past|out)\s+(?:the\s+|a\s+)?(?:windows?|windowpanes?|panes?|glass|shutters?|curtains?|blinds)\b[^.;!\n]*/gi,' ');
export function isEnclosedInterior(location:string,description=''):boolean {
 const loc=location.slice(0,2000).toLowerCase(),desc=description.slice(0,4000).toLowerCase();
 if(/\b(?:inner\s+shrine|shrine\s+interior)\b/.test(loc))return true;
 const outdoor=OUTDOOR_LOCATION_RE.test(loc);
 return !outdoor&&(INTERIOR_LOCATION_RE.test(loc)||/^(?:inside|indoors|interior)\b/.test(desc.trim()));
}
export function allowsAmbientIndoors(ambient:AmbientEffect,location:string,description=''):boolean {
 if(!OUTDOOR_WEATHER_AMBIENTS.has(ambient))return true;
 const text=`${location} ${stripWindowClauses(description)}`.toLowerCase();
 if(ambient==='fog')return /\b(bathhouse|hot\s+spring|onsen|sauna|steam\s+room|boiler\s+room|steam[- ]filled|clouds?\s+of\s+steam|thick\s+steam|smoke[- ]filled|thick\s+smoke|heavy\s+smoke|incense\s+(?:haze|smoke)|fog\s+fills|mist\s+(?:fills|inside))\b/.test(text);
 return /\b(open[- ]air|roofless|no\s+roof|shattered\s+roof|collapsed\s+(?:roof|ceiling)|hole\s+in\s+the\s+(?:roof|ceiling))\b/.test(text);
}
export function inferContextualAmbient(input:{location:string;description?:string|null|undefined;lighting?:string|null|undefined;timeOfDay?:string|null|undefined;interior:boolean}):AmbientEffect|null {
 const loc=input.location.slice(0,2000).toLowerCase();
 const desc=stripWindowClauses((input.description??'').slice(0,4000)).toLowerCase();
 const light=(input.lighting??'').slice(0,1000).toLowerCase();
 const envText=`${loc} ${desc}`;
 const litText=`${loc} ${desc} ${light}`;
 if(/\b(underwater|beneath\s+the\s+(?:waves|surface|sea)|ocean\s+floor|seafloor|deep\s+sea|coral\s+reef|submerged)\b/.test(envText))return 'underwater_bubbles';
 if(/\b(bioluminescen\w*|glowing\s+spores?|luminous\s+spores?|glowing\s+mushrooms?|fungal\s+spores?)\b/.test(envText))return 'spores';
 if(/\b(fireflies|lightning\s+bugs?)\b/.test(envText))return 'fireflies';
 if(/\b(embers|flying\s+sparks|wildfire|burning\s+ruins|raging\s+inferno|blazing\s+forge|molten\s+lava)\b/.test(envText))return 'embers';
 if(/\b(sunbeams?|god\s+rays|shafts\s+of\s+(?:sunlight|light)|sunlight\s+streaming)\b/.test(litText))return 'sunbeams';
 if(!input.interior&&/\b(aurora(?: borealis)?|northern\s+lights)\b/.test(envText))return 'aurora';
 if(/\b(neon\s+(?:haze|lights?|signs?|lit)|holographic\s+haze|cyberpunk)\b/.test(litText))return 'neon_haze';
 if(input.interior&&!/\b(pitch\s+(?:black|dark)|unlit|extinguished|snuffed|dungeon)\b/.test(litText)&&/\b(fireplace|crackling\s+hearth|hearth\s+fire|roaring\s+fire|candlelit|candlelight|candelabra)\b/.test(litText))return 'candlelight_warmth';
 return null;
}
export function resolveSceneAmbient(input:{weather:unknown;location:string;description?:string|null|undefined;lighting?:string|null|undefined;timeOfDay?:string|null|undefined;respectEnclosure?:boolean;explicit?:AmbientEffect|null|undefined;previous?:{sameScene:boolean;ambient?:AmbientEffect|null|undefined;ambientSource?:'explicit'|'weather'|undefined}}):{ambient:AmbientEffect|null;ambientSource:'explicit'|'weather'} {
 const interior=isEnclosedInterior(input.location,input.description??'');
 const respect=Boolean(input.respectEnclosure);
 const isForbiddenIndoors=(effect:AmbientEffect|null|undefined):boolean=>Boolean(respect&&interior&&effect&&!allowsAmbientIndoors(effect,input.location,input.description??''));
 const fallbackContext=():AmbientEffect|null=>respect?inferContextualAmbient({location:input.location,description:input.description,lighting:input.lighting,timeOfDay:input.timeOfDay,interior}):null;
 if(input.explicit!==undefined){
  if(input.explicit!==null&&isForbiddenIndoors(input.explicit)){
   return {ambient:fallbackContext(),ambientSource:'weather'};
  }
  return {ambient:input.explicit,ambientSource:'explicit'};
 }
 const previous=input.previous;
 if(previous?.sameScene&&previous.ambient!==undefined&&(previous.ambientSource==='explicit'||(previous.ambientSource===undefined&&(previous.ambient===null||!weatherEffects.has(previous.ambient))))&&!isForbiddenIndoors(previous.ambient)){
  return {ambient:previous.ambient,ambientSource:'explicit'};
 }
 const weather=deriveWeatherAmbient(input.weather);
 if(weather&&(!interior||(respect&&allowsAmbientIndoors(weather,input.location,input.description??''))))return {ambient:weather,ambientSource:'weather'};
 return {ambient:fallbackContext(),ambientSource:'weather'};
}
