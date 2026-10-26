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
  expect(shell.querySelectorAll('[data-reader-destination]').map(n=>n.getAttribute('aria-label'))).toEqual(['Read','World Lens','Art Studio','History','Settings','Workspace']);
  expect(shell.querySelector('[data-aperture-iris-dialog]')?.getAttribute('aria-label')).toBe('APERTURE navigation');
  expect(shell.querySelectorAll('[data-aperture-action]').map(n=>n.getAttribute('data-aperture-action'))).toEqual(['previous','history','lens','cast','settings','next']);
  expect(shell.querySelector('[data-workspace-close]')?.getAttribute('aria-label')).toBe('Close workspace and return to reader');
 });
 test('full-screen routes cover the reader at every viewport and expose a complete menu surface',()=>{
  shell.dataset.vnAperture='true';workspace.open('settings');expect((reader as unknown as {inert:boolean}).inert).toBe(true);expect(reader.getAttribute('aria-hidden')).toBe('true');
  expect(shell.querySelector('[data-workspace-footer]')?.getAttribute('aria-label')).toBe(null);
  expect(shell.querySelectorAll('[data-workspace-world],[data-workspace-art],[data-workspace-history],[data-workspace-settings],[data-workspace-read],[data-workspace-navigate]').length).toBe(6);
  workspace.close(false);expect((reader as unknown as {inert:boolean}).inert).toBe(false);expect(reader.getAttribute('aria-hidden')).toBe(null);
  workspace.open('settings');shell.querySelector('[data-workspace-navigate]')!.click();expect(workspace.destination).toBe('more');
  expect(shell.querySelectorAll('[data-more-action]').map(n=>n.getAttribute('data-more-action'))).toEqual(['lens','cast','artwork','library','history','panels','voice','settings','search','focus','backToChat']);
  expect(shell.querySelector('[data-iris-action="workspace"]')?.textContent).toContain('Workspace');
  workspace.close(false);
 });
 test('speech controls open only on demand inside the unified voice surface',()=>{
  const speech=new FakeNode('div');workspace.attachSpeechDock(el(speech));workspace.setSpeechAvailable(true);workspace.setActions({voice:open=>calls.push(`voice:${open}`)});
  expect(speech.parentNode).toBe(shell.querySelector('[data-voice-controls]'));expect(speech.dataset.vnSpeechEmbedded).toBe('true');
  const button=shell.querySelector('[data-reader-voice]')!;button.click();expect(shell.querySelector('[data-reader-voice-panel]')!.hidden).toBe(false);expect(shell.dataset.vnVoiceOpen).toBe('true');
  button.click();expect(shell.querySelector('[data-reader-voice-panel]')!.hidden).toBe(true);expect(calls).toEqual(['voice:true','voice:false']);
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
 test('APERTURE focus keeps a direct Iris restore action',()=>{
  shell.dataset.vnAperture='true';workspace.setFocus(true);const iris=shell.querySelector('[data-aperture-iris]')!;
  expect(iris.getAttribute('aria-label')).toBe('Show navigation');iris.click();
  expect(shell.dataset.vnReadingFocus).toBe('false');expect(iris.getAttribute('aria-label')).toBe('Open APERTURE navigation');
 });
 test('the real host exit moves into and back out of the full-screen workspace',()=>{
  const owner=new FakeNode('main'),content=new FakeNode('div'),exit=new FakeNode('button');exit.dataset.vnExit='';owner.append(content,exit);
  const screen=new ReaderWorkspace(el(owner),el(content),()=>{},()=>content.focus());owner.dataset.vnAperture='true';screen.open('history');
  expect(exit.parentNode).toBe(owner.querySelector('[data-workspace-heading]'));screen.close(false);
  expect(exit.parentNode).toBe(owner.querySelector('[data-reader-header-actions]'));screen.destroy();
 });
 test('attention clears and destruction restores the owner before removing chrome',()=>{
  const tool=new FakeNode('div');shell.append(tool);workspace.register('history',{element:el(tool),enter:()=>{},leave:()=>calls.push('leave')});workspace.setAttention(2);expect(shell.querySelector('[data-reader-attention]')!.textContent).toBe('2');workspace.setAttention(0);expect(shell.querySelector('[data-reader-attention]')!.hidden).toBe(true);
  workspace.open('history');workspace.destroy();workspace.destroy();expect(tool.parentNode).toBe(shell);expect(shell.querySelector('[data-vn-navigation]')).toBeNull();expect(calls.filter(c=>c==='leave')).toHaveLength(1);workspace.open('history');expect(workspace.isOpen()).toBe(false);
 });
 test('the real stage pauses Auto/Skip, blocks advance and preserves cursor and reply on Settings',()=>{
  const mount=new FakeNode('div');const stage=new VnStage({mount:el(mount),textSpeed:0});
  stage.loadTurn({mode:'standard',paragraphs:[{id:'1',text:'First.'},{id:'2',text:'Second.'}],choices:[]});stage.restoreReplyDraft('Unsent reply');stage.toggleAutoPlay(true);stage.toggleSkip(true);stage.workspace.open('settings');
  (stage as unknown as {advance():void}).advance();expect(stage.getState().currentParagraphIndex).toBe(0);expect(stage.getState().draft).toBe('Unsent reply');
  const state=stage as unknown as {isAutoPlay:boolean;isSkipping:boolean};expect(state.isAutoPlay).toBe(false);expect(state.isSkipping).toBe(false);
  stage.setApertureMode(true);expect((stage.panelMount.querySelector('[data-vn-theme-host]') as unknown as {inert:boolean}).inert).toBe(true);
  stage.setApertureMode(false);expect((stage.panelMount.querySelector('[data-vn-theme-host]') as unknown as {inert:boolean}).inert).toBe(false);
  stage.suspend();expect(stage.workspace.isOpen()).toBe(false);stage.destroy();
 });
});
