/** Dissolve whole, already-loaded compatible portraits. The caller owns source,
 * outfit and reveal checks, and aborts this render before starting another one. */
export function swapCastPortrait(media:HTMLElement,image:HTMLImageElement,signal:AbortSignal,motionEnabled=true):void {
 if(signal.aborted)return;
 const prior=media.querySelector<HTMLImageElement>('[data-vn-cast-current]')??media.querySelector('img');
 image.dataset.vnCastCurrent='';
 const motion=media.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
 if(!prior||!motionEnabled||motion?.matches||typeof image.animate!=='function'){
  media.replaceChildren(image);
  return;
 }
 prior.removeAttribute('data-vn-cast-current');
 prior.setAttribute('aria-hidden','true');
 media.replaceChildren(prior,image);
 const animations:Animation[]=[];
 let settled=false;
 const settle=()=>{
  if(settled)return;
  settled=true;
  signal.removeEventListener('abort',settle);
  motion?.removeEventListener?.('change',onMotion);
  for(const animation of animations)animation.cancel();
  // Only mutate this render's media, never a card installed by a newer render.
  if(image.parentElement===media)media.replaceChildren(image);
 };
 const onMotion=(event:MediaQueryListEvent)=>{if(event.matches)settle();};
 signal.addEventListener('abort',settle,{once:true});
 motion?.addEventListener?.('change',onMotion);
 try {
  animations.push(prior.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out'}));
  animations.push(image.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'}));
  // Cancellation rejects finished; both paths settle and detach listeners.
  void Promise.all(animations.map(animation=>animation.finished)).then(settle,settle);
 }catch{
  // Older webviews can expose animate without supporting this effect.
  for(const animation of animations)void animation.finished.catch(()=>{});
  settle();
 }
}
