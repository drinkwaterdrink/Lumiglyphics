import {createUiId} from '../request-id.js';
import { ContextSourceReportSchema, normalizeContextSources, type ContextSourcesConfig, type ContextSourceReport } from '../../shared/context-sources.js';

export class ContextSourcesPanel {
  readonly host=document.createElement('div');
  private config=normalizeContextSources({});
  private pending='';
  private report:ContextSourceReport|null=null;
  private endpointDirty=false;
  private chat='';
  private timeout:ReturnType<typeof setTimeout>|undefined;
  constructor(private save:(config:ContextSourcesConfig)=>void,private request:(chatId:string,requestId:string)=>void,private getChatId:()=>string) {
    this.host.dataset.contextSources='';
    this.host.innerHTML='<label data-check><input type="checkbox" data-books><span>Read LumiBooks reference status<small>Optional codex connection. Disabled records and files stay excluded. Current codex data does not establish what was known in an earlier paragraph.</small></span></label><details><summary>LumiScript reference endpoint</summary><label>Published endpoint<input type="text" data-endpoint placeholder="lumiscript.story-tracker.state" maxlength="200" autocomplete="off" spellcheck="false"></label><small>Optional advanced integration. Requires a script publishing the versioned Lumiglyphics context format; arbitrary script state is not accepted. Leave blank to disable.</small><button type="button" data-save-endpoint>Save endpoint</button><p data-endpoint-error role="status"></p></details><button type="button" data-refresh>Refresh source status</button><p data-source-status role="status"></p><small>Reads local published data only. No generation or writes to companion extensions. SimTracker visual context keeps using its existing toggle above; Warp remains on the existing game/panel bridge. Imported facts are not used in prompts or paragraph history by this status panel.</small>';
    this.host.addEventListener('change',e=>e.stopPropagation());
    this.host.addEventListener('input',e=>e.stopPropagation());
    this.el<HTMLInputElement>('[data-books]').onchange=()=>{this.config={...this.config,lumibooks:this.el<HTMLInputElement>('[data-books]').checked};this.invalidate();this.save(this.config);};
    this.el<HTMLInputElement>('[data-endpoint]').oninput=()=>{this.endpointDirty=true;};
    this.el<HTMLButtonElement>('[data-save-endpoint]').onclick=()=>{
      const value=this.el<HTMLInputElement>('[data-endpoint]').value.trim();const normalized=normalizeContextSources({...this.config,lumiscriptEndpoint:value});
      this.el<HTMLElement>('[data-endpoint-error]').textContent=value && !normalized.lumiscriptEndpoint ? 'Use a published lumiscript.<script-slug>.<channel> endpoint.' : '';
      if(value && !normalized.lumiscriptEndpoint)return;
      this.endpointDirty=false;this.config=normalized;this.invalidate();this.save(this.config);
    };
    this.el<HTMLButtonElement>('[data-refresh]').onclick=()=>{
      this.chat=this.getChatId();if(!this.chat){this.el<HTMLElement>('[data-source-status]').textContent='Open a chat before checking its sources.';return;}
      this.clearTimeout();this.pending=createUiId();this.report=null;this.render();
      this.timeout=setTimeout(()=>this.fail(),4000);this.request(this.chat,this.pending);
    };
    this.render();
  }
  private el<T extends HTMLElement>(selector:string):T{return this.host.querySelector<T>(selector)!;}
  private clearTimeout():void{if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;}
  private invalidate():void{this.clearTimeout();this.pending='';this.report=null;this.render();}
  setConfig(config:ContextSourcesConfig):void {
    const normalized=normalizeContextSources(config);
    if(JSON.stringify(normalized)!==JSON.stringify(this.config) || this.chat!==this.getChatId()){this.config=normalized;this.chat=this.getChatId();this.invalidate();}
    this.el<HTMLInputElement>('[data-books]').checked=this.config.lumibooks;
    if(!this.endpointDirty)this.el<HTMLInputElement>('[data-endpoint]').value=this.config.lumiscriptEndpoint;
  }
  receive(value:unknown):void {
    const parsed=ContextSourceReportSchema.safeParse(value);
    if(!parsed.success || parsed.data.requestId!==this.pending || parsed.data.chatId!==this.getChatId())return;
    this.clearTimeout();this.pending='';this.report=parsed.data;this.render();
  }
  fail(requestId?:string):void{if(!this.pending||(requestId&&requestId!==this.pending))return;this.clearTimeout();this.pending='';this.el<HTMLElement>('[data-source-status]').textContent='Source status is unavailable. Refresh to try again.';this.el<HTMLButtonElement>('[data-refresh]').disabled=false;}
  clear():void{this.chat=this.getChatId();this.invalidate();}
  destroy():void{this.clearTimeout();this.pending='';this.host.remove();}
  private render():void {
    this.el<HTMLButtonElement>('[data-refresh]').disabled=Boolean(this.pending);
    const labels={lumibooks:'LumiBooks',lumiscript:'LumiScript'};
    this.el<HTMLElement>('[data-source-status]').textContent=this.pending ? 'Checking optional sources…' : this.report ? this.report.sources.map(s=>`${labels[s.provider]}: ${s.status.replaceAll('_',' ')}${s.status==='available'?` · ${s.recordCount} reference records · ${s.freshness==='stale'?'older snapshot':'current reference'} · ${s.publicFactCount} explicitly public facts`:''}`).join('\n') : 'Sources have not been checked for this chat. Refresh after changing a source or wiping companion data.';
    this.el<HTMLElement>('[data-source-status]').style.whiteSpace='pre-line';
  }
}
