import {expect,test} from 'bun:test';
import {resumeCardModel} from './resume-card.js';
import type {TurnView} from '../../protocol.js';
const turn={chatId:'c',messageId:'m',swipeId:0,sourceFingerprint:'abcdef12345678',revision:3,status:'ready',paragraphs:['Previously revealed','Current unseen','Future secret'],speaker:'Mira',location:'Cafe'} as TurnView;
const saved={version:1,key:{chatId:'c',assistantMessageId:'m',swipeId:0,sourceFingerprint:'abcdef12345678',revision:2},paragraphIndex:1};
test('resume uses the previous revealed excerpt and exact recorded cursor',()=>{
 const card=resumeCardModel(saved,turn)!;expect(card.paragraphIndex).toBe(1);expect(card.excerpt).toBe('Previously revealed');expect(card.speaker).toBe('Mira');expect(card.location).toBe('Cafe');expect(JSON.stringify(card)).not.toContain('Current unseen');expect(JSON.stringify(card)).not.toContain('Future secret');
});
test('stale, future, empty and unavailable cursors cannot create a resume card',()=>{
 for(const next of [{...turn,swipeId:1},{...turn,sourceFingerprint:'edit'},{...turn,chatId:'other'},{...turn,revision:1},{...turn,status:'planning'},{...turn,paragraphs:[]}])expect(resumeCardModel(saved,next as TurnView)).toBeNull();
 expect(resumeCardModel({...saved,paragraphIndex:0},turn)).toBeNull();expect(resumeCardModel({...saved,paragraphIndex:90},turn)).toBeNull();expect(resumeCardModel({bad:true},turn)).toBeNull();
});
test('excerpt is bounded plain text and cannot include an injected element',()=>{const card=resumeCardModel(saved,{...turn,paragraphs:['<script>secret()</script><b>Read</b> '+ 'a'.repeat(1000),'Current']})!;expect(card.excerpt.length).toBeLessThanOrEqual(240);expect(card.excerpt).not.toContain('<');expect(card.excerpt).not.toContain('secret');});
