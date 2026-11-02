export interface VnLoadableImage {
  src: string;
  decoding?: string;
  complete: boolean;
  naturalWidth: number;
  addEventListener(
    type: "load" | "error",
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener(type: "load" | "error", listener: EventListener): void;
  decode?: () => Promise<void>;
}

export type VnImageFactory = () => VnLoadableImage;

const IMAGE_LOAD_TIMEOUT_MS = 15_000;
const IMAGE_DECODE_TIMEOUT_MS = 4_000;

const imageCancelled=():Error=>{const e=new Error('Image loading cancelled.');e.name='AbortError';return e;};
const checkImageSignal=(signal?:AbortSignal)=>{if(signal?.aborted)throw imageCancelled();};
const waitForImageLoad=(image:VnLoadableImage,url:string,signal?:AbortSignal):Promise<void>=>new Promise((resolve,reject)=>{
 let settled=false;
 const cleanup=()=>{clearTimeout(timer);image.removeEventListener('load',onLoad as EventListener);image.removeEventListener('error',onError as EventListener);signal?.removeEventListener('abort',onAbort);};
 const finish=(error?:Error)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve();};
 const onLoad=()=>finish(),onError=()=>finish(new Error('The scene image could not be loaded.'));
 const onAbort=()=>{finish(imageCancelled());image.src='';};
 const timer=setTimeout(()=>{finish(new Error('The scene image timed out while loading.'));image.src='';},IMAGE_LOAD_TIMEOUT_MS);
 image.addEventListener('load',onLoad as EventListener,{once:true});image.addEventListener('error',onError as EventListener,{once:true});signal?.addEventListener('abort',onAbort,{once:true});
 if(signal?.aborted){onAbort();return;}
 try{image.src=url;if(image.complete){if(image.naturalWidth>0)onLoad();else onError();}}catch{onError();}
});

/** Loads and decodes an image before the visible scene points at its URL. */
export const preloadAndDecodeVnImage=async(url:string,createImage:VnImageFactory=()=>new Image(),signal?:AbortSignal):Promise<void>=>{
 checkImageSignal(signal);if(!url.trim())throw new Error('A scene image URL is required.');
 const image=createImage();image.decoding='async';await waitForImageLoad(image,url,signal);checkImageSignal(signal);
 let timer:ReturnType<typeof setTimeout>|undefined;let abort=()=>{};
 try{
  const decode=image.decode?.();if(decode){
   const limit=new Promise<void>((resolve,reject)=>{timer=setTimeout(resolve,IMAGE_DECODE_TIMEOUT_MS);abort=()=>{image.src='';reject(imageCancelled());};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
   await Promise.race([decode,limit]);
  }
 }catch(error){
  // Decoding is an optional performance hint; do not fail an already-loaded image.
  if(signal?.aborted)throw imageCancelled();
 }finally{if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 checkImageSignal(signal);
};

/** Try compatible references once each. Supersession stops the entire chain. */
export async function loadVnImageCandidates(candidates:readonly string[],createImage?:VnImageFactory,signal?:AbortSignal):Promise<string>{
 let last:unknown=new Error('No usable image reference is available.');
 for(const url of [...new Set(candidates.map(c=>c.trim()).filter(Boolean))]){checkImageSignal(signal);try{await preloadAndDecodeVnImage(url,createImage,signal);return url;}catch(error){checkImageSignal(signal);last=error;}}
 throw last;
}

export const sceneImageCandidatesFor = (asset: { imageId?: string | null; imageUrl?: string | null; stageAsset?:{displayImageUrl?:string|null} }): string[] => {
  const candidates: string[] = [];
  if(asset.stageAsset?.displayImageUrl?.trim())candidates.push(asset.stageAsset.displayImageUrl.trim());
  if (asset.imageId) {
    const canonical=`/api/v1/images/${encodeURIComponent(asset.imageId)}`;if(!candidates.includes(canonical))candidates.push(canonical);
  }
  if (asset.imageUrl && asset.imageUrl.trim()) {
    const trimmed = asset.imageUrl.trim();
    if (!candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  }
  return candidates;
};

/**
 * URL the reader loads for a generated picture. The persisted-image route is
 * same-origin and authenticated, matching the artwork library and cast art.
 * Host-supplied `imageUrl` values are not verified from the browser (they can
 * be cross-origin or unreachable), so they are only a fallback when no
 * `imageId` exists.
 */
export const sceneImageUrlFor = (asset: { imageId?: string | null; imageUrl?: string | null }): string | null => {
  return sceneImageCandidatesFor(asset)[0] ?? null;
};
