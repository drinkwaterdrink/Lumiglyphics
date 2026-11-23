import { setupVisualNovelFrontend } from "../src/frontend/host/controller.js";
import { VnStage } from "../src/frontend/stage/vn-stage.js";
import { FullscreenLightbox } from "../src/frontend/stage/fullscreen-lightbox.js";
import { normalizeConfig } from "../src/config.js";
import type { TurnView } from "../src/protocol.js";

let activeChat = "A";
let receive: (message: unknown) => void = () => {};
let toggle: () => void = () => {};
let stage!: VnStage;
const sent: any[] = [];
const loreApplications: Array<Parameters<VnStage['setStoryDna']>[0]> = [];
const events = new Map<string, Set<(payload: unknown) => void>>();
const load = VnStage.prototype.loadTurn;
VnStage.prototype.loadTurn = function (turn) { stage = this; return load.call(this, turn); };
const setLore = VnStage.prototype.setStoryDna;
VnStage.prototype.setStoryDna = function (view) { loreApplications.push(view); setLore.call(this, view); };
const config = normalizeConfig({ textSpeed: 0, autoEnter: false, speech: { enabled: false }, generateImages: false, skipMode: "all" });
const header = document.createElement("div"); document.body.append(header);
const ctx: any = {
  getActiveChat: () => ({ chatId: activeChat, characterId: "card" }),
  messages: { getLatestMessageId: () => "m" },
  dom: { findMessageElement: () => null },
  ui: {
    mountApp: ({ className }: {className:string}) => {
      const root = document.createElement("div"); root.className = className; document.body.append(root);
      return { root, setVisible: (visible:boolean) => { root.hidden = !visible; }, destroy: () => root.remove() };
    },
    mount: () => header,
    registerComponentOverride: () => ({ destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, onClick: (callback:()=>void) => { toggle = callback; return () => {}; }, destroy() {} }),
  },
  onBackendMessage: (callback: typeof receive) => { receive = callback; return () => {}; },
  events: { on: (name:string, callback:(payload:unknown)=>void) => {
    const listeners = events.get(name) ?? new Set(); listeners.add(callback); events.set(name,listeners); return () => listeners.delete(callback);
  } },
  sendToBackend: (message:unknown) => sent.push(message), ready() {},
};
function turn(chatId=activeChat, revision=0, overrides:Partial<TurnView>={}): TurnView {
  return { chatId, messageId:"m", swipeId:0, sourceFingerprint:"abcdef12345678", revision, speaker:"Mira", paragraphs:["First paragraph", "Second paragraph", "Third paragraph", "Fourth paragraph", "Fifth paragraph", "Sixth paragraph"], paragraphSpeakers:["Mira","Mira","Mira","Mira","Mira","Mira"], choices:[], assets:[], status:"ready", ...overrides };
}
const cleanup = setupVisualNovelFrontend(ctx);
function state(view:TurnView|null, chatId=activeChat, requestId=sent.filter(m=>m.type==='vn_get_state').at(-1)?.requestId) {
  receive({type:"vn_state",chatId,config,turn:view,requestId});
}
Object.assign(window,{hostFixture:{
  sent, config, turn, loreApplications, receive:(message:unknown)=>receive(message), state,
  open:()=>toggle(), stage:()=>stage,
  revoke:(permission:string)=>{for(const handler of events.get('PERMISSION_CHANGED')??[])handler({permission,granted:false});},
  permissionListeners:()=>events.get('PERMISSION_CHANGED')?.size??0,
  mountNestedLightboxTrigger: () => {
    const host = document.createElement('div');
    const wrapper = document.createElement('div');
    host.attachShadow({ mode: 'open' }).append(wrapper);
    const opener = document.createElement('button');
    opener.textContent = 'Open nested artwork';
    wrapper.attachShadow({ mode: 'open' }).append(opener);
    document.body.append(host);
    opener.onclick = () => FullscreenLightbox.open({ src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' });
  },
  changeChat:(chatId:string)=>{activeChat=chatId;for(const handler of events.get('CHAT_SWITCHED')??[])handler({chatId});},
  cleanup,
}});
