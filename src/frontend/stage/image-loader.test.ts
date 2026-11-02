import assert from "node:assert/strict";
import test from "node:test";

import {
  preloadAndDecodeVnImage,
  sceneImageUrlFor,
  sceneImageCandidatesFor,
  loadVnImageCandidates,
  type VnLoadableImage,
} from "./image-loader";

class FakeImage implements VnLoadableImage {
  src = "";
  decoding = "";
  complete = true;
  naturalWidth = 100;
  decodeCalls = 0;

  addEventListener(_type:"load"|"error",_listener:EventListener): void {}
  removeEventListener(_type:"load"|"error",_listener:EventListener): void {}

  async decode(): Promise<void> {
    this.decodeCalls += 1;
  }
}

test("scene images decode before the preload promise resolves", async () => {
  const image = new FakeImage();
  await preloadAndDecodeVnImage("scene.webp", () => image);

  assert.equal(image.src, "scene.webp");
  assert.equal(image.decoding, "async");
  assert.equal(image.decodeCalls, 1);
});

test("a failed cached image is rejected", async () => {
  const image = new FakeImage();
  image.naturalWidth = 0;

  await assert.rejects(
    preloadAndDecodeVnImage("broken.webp", () => image),
    /could not be loaded/,
  );
});


test("reader pictures load the same-origin persisted-image route when an imageId exists", () => {
  assert.equal(
    sceneImageUrlFor({ imageId: "abc 123", imageUrl: "https://provider.example/cdn/x.png" }),
    "/api/v1/images/abc%20123",
  );
});

test("host imageUrl is only a fallback when no imageId exists", () => {
  assert.equal(sceneImageUrlFor({ imageUrl: "/legacy.png" }), "/legacy.png");
  assert.equal(sceneImageUrlFor({ imageId: null, imageUrl: "" }), null);
});

test('cancelling a pending image rejects and removes load listeners',async()=>{
 const listeners=new Map<string,EventListener>();const image=new FakeImage();image.complete=false;
 image.addEventListener=(type:any,listener:any)=>{listeners.set(type,listener);};image.removeEventListener=(type:any)=>{listeners.delete(type);};
 const controller=new AbortController();const pending=preloadAndDecodeVnImage('slow.webp',()=>image,controller.signal);
 controller.abort();listeners.get('error')?.(new Event('error'));
 await assert.rejects(pending,/cancelled/i);assert.equal(listeners.size,0);
});

test('successful decode clears every image timer',async()=>{
 const timers=new Set<ReturnType<typeof setTimeout>>(),set=globalThis.setTimeout,clear=globalThis.clearTimeout;
 globalThis.setTimeout=((callback:any,ms:any,...args:any[])=>{const id=set(callback,ms,...args);timers.add(id);return id;}) as typeof setTimeout;
 globalThis.clearTimeout=((id:any)=>{timers.delete(id);clear(id);}) as typeof clearTimeout;
 try{await preloadAndDecodeVnImage('ready.webp',()=>new FakeImage());assert.equal(timers.size,0);}finally{for(const id of timers)clear(id);globalThis.setTimeout=set;globalThis.clearTimeout=clear;}
});

test('an already-cancelled load never assigns an image URL',async()=>{
 const image=new FakeImage(),controller=new AbortController();controller.abort();
 await assert.rejects(preloadAndDecodeVnImage('never.webp',()=>image,controller.signal),/cancelled/i);assert.equal(image.src,'');
});

test('selected display art takes precedence and failed references fall back once',async()=>{
 assert.deepEqual(sceneImageCandidatesFor({imageId:'saved',imageUrl:'/legacy',stageAsset:{displayImageUrl:'/selected'}}),['/selected','/api/v1/images/saved','/legacy']);
 const images:FakeImage[]=[];const url=await loadVnImageCandidates(['/failed','/failed','/ready'],()=>{const i=new FakeImage();if(!images.length)i.naturalWidth=0;images.push(i);return i;});assert.equal(url,'/ready');assert.equal(images.length,2);
});

test('cancelling decode does not start a fallback reference',async()=>{
 const controller=new AbortController();let created=0;const image=new FakeImage();image.decode=()=>new Promise(()=>{});
 const pending=loadVnImageCandidates(['/slow','/never'],()=>{created++;return image;},controller.signal);
 await Promise.resolve();controller.abort();await assert.rejects(pending,/cancelled/);assert.equal(created,1);
});
