import {BUFFERED_TTS_TIMING} from './transport.js';
import type {SpeechCursor} from './controller.js';
export type SpeechTimingCapability='none'|'sentence'|'word';
export type SpeechPlaybackCursor=Pick<SpeechCursor,'chatId'|'messageId'|'sourceFingerprint'|'paragraphIndex'> & {swipeId:number;revision:number};
/** Buffered audio has a media clock, but no evidence mapping time to text offsets. */
export type SpeechPlaybackProgress={cursor:SpeechPlaybackCursor;elapsedSeconds:number;durationSeconds:number|null;timing:'none'};
export function speechPlaybackProgress(cursor:SpeechCursor,elapsed:number,duration?:number):SpeechPlaybackProgress{
 const knownDuration=typeof duration==='number'&&Number.isFinite(duration)&&duration>0?duration:null;
 const time=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
 return {cursor:{chatId:cursor.chatId,messageId:cursor.messageId,sourceFingerprint:cursor.sourceFingerprint,paragraphIndex:cursor.paragraphIndex,swipeId:cursor.swipeId??0,revision:cursor.revision??0},elapsedSeconds:knownDuration===null?time:Math.min(time,knownDuration),durationSeconds:knownDuration,timing:BUFFERED_TTS_TIMING};
}
export function progressForCursor(progress:SpeechPlaybackProgress|null,cursor:SpeechCursor|null):SpeechPlaybackProgress|null{
 if(!progress||!cursor)return null;const key=progress.cursor;
 return key.chatId===cursor.chatId&&key.messageId===cursor.messageId&&key.sourceFingerprint===cursor.sourceFingerprint&&key.paragraphIndex===cursor.paragraphIndex&&key.swipeId===(cursor.swipeId??0)&&key.revision===(cursor.revision??0)?progress:null;
}
export function audioProgressFraction(progress:SpeechPlaybackProgress):number|null{return progress.durationSeconds===null?null:Math.max(0,Math.min(1,progress.elapsedSeconds/progress.durationSeconds));}
/** Attribute-only highlight: never split, wrap or replace prose/anchors/selection. */
export class ParagraphReadAlong {
 private paragraphId='';private index=-1;
 constructor(private readonly target:HTMLElement){}
 setParagraph(id:string,index:number):void{if(id!==this.paragraphId||index!==this.index)this.clear();this.paragraphId=id;this.index=index;}
 update(progress:SpeechPlaybackProgress|null):boolean{const active=Boolean(progress&&progress.cursor.paragraphIndex===this.index&&this.paragraphId===`${progress.cursor.sourceFingerprint}:${this.index}`);if(active)this.target.dataset.vnSpeechSpeaking='true';else this.clear();return active;}
 clear():void{delete this.target.dataset.vnSpeechSpeaking;}
}
