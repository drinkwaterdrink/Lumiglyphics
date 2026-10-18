import './reading-browser-fixture.js';
import {TooltipSettingsPanel} from '../src/frontend/settings/tooltips.js';
const settings=new TooltipSettingsPanel(prefs=>{(window as any).referenceSettings.saved=prefs;});
settings.host.hidden=true;document.body.append(settings.host);
Object.assign(window,{referenceSettings:{settings,saved:null}});
