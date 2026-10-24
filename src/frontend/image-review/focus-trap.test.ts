import {describe,expect,test} from 'bun:test';
import {installFakeDocument,FakeNode,FakeDocument} from '../stage/stage-test-dom.js';
import {isMobileWidth,MOBILE_CONTAINER_MAX_WIDTH_PX,trapFocusWithin} from './focus-trap.js';

function tabEvent(shiftKey:boolean):KeyboardEvent{
 let prevented=false;
 return {shiftKey,preventDefault(){prevented=true;},get defaultPrevented(){return prevented;}} as unknown as KeyboardEvent;
}

describe('F15 studio mobile focus trap',()=>{
 test('wraps Tab from the last focusable element back to the first',()=>{
  installFakeDocument();
  const container=new FakeNode('section');
  const first=new FakeNode('button');first.textContent='first';
  const middle=new FakeNode('button');middle.textContent='middle';
  const last=new FakeNode('button');last.textContent='last';
  const disabled=new FakeNode('button');disabled.disabled=true;
  const hiddenWrap=new FakeNode('div');hiddenWrap.hidden=true;hiddenWrap.setAttribute('hidden','');
  const hiddenButton=new FakeNode('button');hiddenWrap.append(hiddenButton);
  container.append(first,middle,last,disabled,hiddenWrap);
  const event=tabEvent(false);
  trapFocusWithin(container as unknown as HTMLElement,event,last as unknown as Element);
  expect(event.defaultPrevented).toBe(true);
  expect(FakeDocument.activeElement).toBe(first);
 });

 test('wraps Shift+Tab from the first element to the last',()=>{
  installFakeDocument();
  const container=new FakeNode('section');
  const first=new FakeNode('button');
  const last=new FakeNode('button');
  container.append(first,last);
  const event=tabEvent(true);
  trapFocusWithin(container as unknown as HTMLElement,event,first as unknown as Element);
  expect(event.defaultPrevented).toBe(true);
  expect(FakeDocument.activeElement).toBe(last);
 });

 test('does not intercept Tab while focus is in the middle of the trap',()=>{
  installFakeDocument();
  const container=new FakeNode('section');
  const first=new FakeNode('button');
  const middle=new FakeNode('button');
  const last=new FakeNode('button');
  container.append(first,middle,last);
  middle.focus();
  const event=tabEvent(false);
  trapFocusWithin(container as unknown as HTMLElement,event,middle as unknown as Element);
  expect(event.defaultPrevented).toBe(false);
  expect(FakeDocument.activeElement).toBe(middle);
 });

 test('isMobileWidth mirrors the 600px container breakpoint, zero width means closed',()=>{
  installFakeDocument();
  const node=new FakeNode('div') as unknown as Element; // fake rect reports 360px
  expect(isMobileWidth(node)).toBe(true);
  expect(MOBILE_CONTAINER_MAX_WIDTH_PX).toBe(600);
  const wide=new FakeNode('div') as unknown as Element;
  (wide as unknown as FakeNode).getBoundingClientRect=()=>({width:800,height:0,top:0,left:0,right:800,bottom:0});
  expect(isMobileWidth(wide)).toBe(false);
  const closed=new FakeNode('div') as unknown as Element;
  (closed as unknown as FakeNode).getBoundingClientRect=()=>({width:0,height:0,top:0,left:0,right:0,bottom:0});
  expect(isMobileWidth(closed)).toBe(false);
 });
});
