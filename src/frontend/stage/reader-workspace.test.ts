import {afterEach,beforeEach,describe,expect,test} from 'bun:test';
import {ReaderWorkspace} from './reader-workspace.js';
import {FakeNode,installFakeDocument,FakeDocument} from './stage-test-dom.js';
import {VnStage} from './vn-stage.js';

describe('reader-first same-instance workspace',()=>{
 let restore:()=>void;
 let shell:FakeNode,reader:FakeNode,workspace:ReaderWorkspace;
 const el=(node:FakeNode)=>node as unknown as HTMLElement;
 const calls:string[]=[];
 beforeEach(()=>{restore=installFakeDocument();shell=new FakeNode('main');reader=new FakeNode('div');shell.append(reader);calls.length=0;workspace=new ReaderWorkspace(el(shell),el(reader),()=>calls.push('pause'),()=>reader.focus());});
 afterEach(()=>{workspace.destroy();restore();});
 test('navigation labels separate reading destinations from the protected exit',()=>{
  expect(shell.querySelector('[data-vn-navigation]')?.getAttribute('aria-label')).toBe('Reader navigation');
  expect(shell.querySelectorAll('[data-reader-destination]').map(n=>n.getAttribute('aria-label'))).toEqual(['Read','Story','Artwork','History','Settings','More']);
  expect(shell.querySelector('[data-workspace-close]')?.getAttribute('aria-label')).toBe('Close workspace and return to reader');
 });
 test('moves the original tool and restores its exact home, siblings and local draft',()=>{
  const home=new FakeNode('div'),tool=new FakeNode('div'),after=new FakeNode('span'),draft=new FakeNode('textarea');draft.value='Unsent wording';tool.append(draft);home.append(tool,after);shell.append(home);
  workspace.register('artwork',{element:el(tool),hideAtHome:true,enter:()=>calls.push('enter'),leave:()=>calls.push('leave')});
  expect(tool.hidden).toBe(true);workspace.open('artwork');
  expect(tool.parentNode).toBe(shell.querySelector('[data-workspace-content]'));expect(tool.hidden).toBe(false);expect(calls).toEqual(['pause','enter']);
  workspace.close(false);expect(home.children).toEqual([tool,after]);expect(tool.hidden).toBe(true);expect(draft.value).toBe('Unsent wording');expect(calls).toEqual(['pause','enter','leave']);
 });
 test('same route is idempotent and a recursive visibility callback cannot open two tools',()=>{
  const a=new FakeNode('div'),b=new FakeNode('div');shell.append(a,b);
  workspace.register('artwork',{element:el(a),enter:()=>{calls.push('art');workspace.open('artwork');},leave:()=>workspace.toolClosed('artwork')});
  workspace.register('history',{element:el(b),enter:()=>calls.push('history'),leave:()=>{}});
  workspace.open('artwork');workspace.open('artwork');expect(calls).toEqual(['pause','art']);workspace.open('history');expect(workspace.destination).toBe('history');expect(calls).toEqual(['pause','art','pause','history']);expect(a.parentNode).toBe(shell);
 });
 test('a stale close callback cannot close another destination',()=>{
  workspace.open('settings');workspace.toolClosed('artwork');expect(workspace.destination).toBe('settings');workspace.toolClosed('settings');expect(workspace.isOpen()).toBe(false);expect(FakeDocument.activeElement).toBe(reader);
 });
 test('route scroll and home ownership survive repeated navigation',()=>{
  const tool=new FakeNode('div');shell.append(tool);workspace.register('settings',{element:el(tool),enter:()=>{},leave:()=>{}});
  workspace.open('settings');shell.querySelector('[data-workspace-content]')!.scrollTop=287;workspace.close(false);workspace.open('settings');expect(shell.querySelector('[data-workspace-content]')!.scrollTop).toBe(287);workspace.close(false);expect(tool.parentNode).toBe(shell);
 });
 test('focus reading has an explicit reversible state and opening a workspace restores navigation',()=>{
  workspace.setFocus(true);expect(shell.dataset.vnReadingFocus).toBe('true');expect(shell.querySelector('[data-reader-focus]')!.getAttribute('aria-label')).toBe('Show navigation');workspace.open('history');expect(shell.dataset.vnReadingFocus).toBe('false');expect(workspace.destination).toBe('history');
 });
 test('attention clears and destruction restores the owner before removing chrome',()=>{
  const tool=new FakeNode('div');shell.append(tool);workspace.register('history',{element:el(tool),enter:()=>{},leave:()=>calls.push('leave')});workspace.setAttention(2);expect(shell.querySelector('[data-reader-attention]')!.textContent).toBe('2');workspace.setAttention(0);expect(shell.querySelector('[data-reader-attention]')!.hidden).toBe(true);
  workspace.open('history');workspace.destroy();workspace.destroy();expect(tool.parentNode).toBe(shell);expect(shell.querySelector('[data-vn-navigation]')).toBeNull();expect(calls.filter(c=>c==='leave')).toHaveLength(1);workspace.open('history');expect(workspace.isOpen()).toBe(false);
 });
 test('the real stage pauses Auto/Skip, blocks advance and preserves cursor and reply on Settings',()=>{
  const mount=new FakeNode('div');const stage=new VnStage({mount:el(mount),textSpeed:0});
  stage.loadTurn({mode:'standard',paragraphs:[{id:'1',text:'First.'},{id:'2',text:'Second.'}],choices:[]});stage.restoreReplyDraft('Unsent reply');stage.toggleAutoPlay(true);stage.toggleSkip(true);stage.workspace.open('settings');
  (stage as unknown as {advance():void}).advance();expect(stage.getState().currentParagraphIndex).toBe(0);expect(stage.getState().draft).toBe('Unsent reply');
  const state=stage as unknown as {isAutoPlay:boolean;isSkipping:boolean};expect(state.isAutoPlay).toBe(false);expect(state.isSkipping).toBe(false);stage.suspend();expect(stage.workspace.isOpen()).toBe(false);stage.destroy();
 });
});
