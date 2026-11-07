import type {TurnView} from '../protocol.js';
import type {AmbientEffect} from './contracts.js';
export type MusicTransitionPolicy='cue'|'location';
export type SceneLocation={paragraphIndex:number;location:string};
const locationKey=(value:string|null|undefined)=>{const key=value?.trim().replace(/\s+/g,' ').toLocaleLowerCase()||null;return key&&/^(unknown|unspecified|none|null|n\/a)$/.test(key)?null:key;};
export function locationForPosition(turn:TurnView,index:number):string|null{if(turn.sceneLocations){let location:string|null=null;for(const entry of turn.sceneLocations)if(Number.isInteger(entry.paragraphIndex)&&entry.paragraphIndex>=0&&entry.paragraphIndex<=index)location=entry.location.trim()||null;return location;}return turn.location?.trim()||null;}
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
 if(/\b(no|not|without|chance|possible|possibly|forecast|stopped|ended|cleared|clearing|dry|sunny|previously|earlier|might|may|could|would|if|unlikely)\b/.test(text)||/^clear\b|\bclear\s+(?:sky|skies|weather|night|day|morning|evening)\b|\bafter\s+(?:the\s+)?(?:rain|storm|snow|fog|downpour|blizzard)\b/.test(text))return null;
 if(/\b(heavy rain(?:fall)?|downpour|rainstorm|thunderstorm|storm|stormy)\b/.test(text))return 'heavy_rain';
 if(/\b(snow|snowfall|snowing|snowy|blizzard|flurries)\b/.test(text))return 'snow';
 if(/\b(rain|rainfall|raining|rainy|drizzle|drizzling|showers)\b/.test(text))return 'rain';
 if(/\b(fog|foggy|mist|misty)\b/.test(text))return 'fog';return null;
}
const weatherEffects=new Set<AmbientEffect>(['rain','heavy_rain','snow','fog']);
export function resolveSceneAmbient(input:{weather:unknown;location:string;description?:string;explicit?:AmbientEffect|null|undefined;previous?:{sameScene:boolean;ambient?:AmbientEffect|null|undefined;ambientSource?:'explicit'|'weather'|undefined}}):{ambient:AmbientEffect|null;ambientSource:'explicit'|'weather'} {
 if(input.explicit!==undefined)return {ambient:input.explicit,ambientSource:'explicit'};
 const previous=input.previous;
 if(previous?.sameScene&&previous.ambient!==undefined&&(previous.ambientSource==='explicit'||(previous.ambientSource===undefined&&(previous.ambient===null||!weatherEffects.has(previous.ambient)))))return {ambient:previous.ambient,ambientSource:'explicit'};
 const location=input.location.slice(0,2000).toLowerCase(),description=(input.description??'').slice(0,4000).toLowerCase();
 const outdoor=/\b(outside|outdoor|outdoors|exterior|garden|terrace|balcony|courtyard|rooftop|street|park|forest|beach)\b/.test(location);
 const interior=!outdoor&&(/\b(inside|indoor|indoors|interior|room|hall|lounge|restaurant|bedroom|kitchen|bathroom|library|cafe|tavern|house|office|shop|cabin)\b/.test(location)||/^(?:inside|indoors|interior)\b/.test(description.trim()));
 return {ambient:interior?null:deriveWeatherAmbient(input.weather),ambientSource:'weather'};
}
