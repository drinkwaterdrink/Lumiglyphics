import {VN_OUTER_CSS} from "../src/frontend/theme/outer-css.js";
import {ImageLibrary} from '../src/frontend/image-library/library.js';
const skin=document.createElement('style');skin.textContent=VN_OUTER_CSS;document.head.append(skin);
const mount=document.createElement('div');mount.dataset.vnShell='';mount.dataset.vnPreset='lumiverse';mount.style.cssText='position:fixed;inset:0;';document.body.append(mount);
const exit=document.createElement('button');exit.textContent='Back to chat';exit.style.cssText='position:fixed;top:8px;right:8px;z-index:60;height:44px';document.body.append(exit);
const actions:any[]=[];let held=false;
const library=new ImageLibrary(mount,r=>actions.push(r),open=>{held=open;if(open)mount.dataset.vnHistoryOpen='true';else delete mount.dataset.vnHistoryOpen;});
library.setContext({chatId:'chat',messageId:'m1',swipeId:0,sourceFingerprint:'12345678',revision:0} as any,0);
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect width="400" height="700" fill="#273f58"/><circle cx="200" cy="280" r="100" fill="#e6bd62"/></svg>');
const page={entries:[{key:{chatId:'chat',assistantMessageId:'m1',swipeId:0,sourceFingerprint:'12345678',revision:0},jobId:'j1',imageId:'image1',paragraphIndex:0,createdAt:'2026-10-13T12:00:00.000Z',excerpt:'A quiet reading room.',role:'scene',template:'Manga page',prompt:'<script>not executable</script> A detailed page.',negativePrompt:'blur',model:'model',provider:'provider',available:true,thumbnailUrl:'/api/v1/images/image1?size=sm',imageUrl:'/api/v1/images/image1',versionLabel:'current'},{key:{chatId:'chat',assistantMessageId:'m0',swipeId:0,sourceFingerprint:'12345678',revision:0},jobId:'j2',imageId:'missing',paragraphIndex:0,createdAt:'2026-10-13T11:00:00.000Z',excerpt:'Earlier story.',role:'scene',available:false,versionLabel:'replaced'}],nextCursor:'1:0',notice:''};
(window as any).imageLibraryFixture={library,actions,page,get held(){return held;},image};

const history=document.createElement('button');history.textContent='History';history.style.cssText='position:fixed;bottom:0;left:0;z-index:1;height:44px';history.onclick=()=>library.open('story',history);document.body.append(history);
(window as any).imageLibraryFixture.mount=mount;
