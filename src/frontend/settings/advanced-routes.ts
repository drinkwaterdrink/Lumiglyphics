/** Stateless markup for Advanced settings. The panel retains route, draft,
 * validation, save/reset and event ownership; these selectors remain unchanged. */
export interface AdvancedRouteMarkup {
 group:(title:string,body:string,options?:{id?:string;apply?:boolean;help?:string;find?:string})=>string;
 find:(label:string,keywords?:string)=>string;
 more:(html:string)=>string;
 pageLink:(id:string)=>string;
}
export function renderAdvancedRoutes({group,find,more,pageLink}:AdvancedRouteMarkup):string {
 return `
            <p class="muted">Focused technical editors. Save each page explicitly; ordinary preferences save as you change them.</p>
            <div data-page-links>${['parameters','filtering','css','storage','reset'].map(id=>pageLink(id)).join('')}</div>
            <section data-workspace-page="filtering">${group("Text filtering", `
              <label data-field ${find("Ignored tags", "status inventory hide strip blocks filter")}><span>Ignored tags</span><input name="ignoredTags" type="text" placeholder="status, stats, system, inventory" /><small>Comma-separated tag names. Removes the whole matching block from dialogue and image planning.</small>${more("For example status, inventory, WORLD_VOICE. Multiline blocks are removed too. Recognized status blocks stay available as plain-text cards in Panels. The chat message is not edited.")}</label>
              <label data-field ${find("Display regex rules", "regex replace formatting dialogue pattern")}><span>Display regex rules</span><textarea name="displayRegexRules" spellcheck="false" placeholder="/§([^§]+)§/g => <em class=&quot;vn-transmission&quot;>$1</em>"></textarea><small>One rule per line: <code>/pattern/flags =&gt; replacement</code>. Dialogue formatting only.</small>${more("<code>pattern =&gt; replacement</code> also works. An empty replacement hides a match from dialogue, not from image planning. Only safe inline formatting renders here. For full HTML/SVG cards, open Panels in the novel view.")}</label>
            `, { id: "filtering", apply: true })}</section>
            <section data-workspace-page="parameters">${group("Models and parameters", `
              <div data-row>
                <label data-field ${find("Story reader parameters (JSON)", "planner parser json temperature parameters")}><span>Story reader parameters (JSON)</span><textarea name="parserParameters" spellcheck="false"></textarea></label>
              </div>
            `, { id: "models", apply: true })}</section>
            <section data-workspace-page="css">${group("Custom CSS", `
              <label data-field ${find("Theme CSS", "custom css style stylesheet")}><span>Theme CSS</span><textarea name="customCss" spellcheck="false"></textarea><small>Selectors beginning with data-vn are stable. Remote imports and URL fetches are removed.</small></label>
            `, { id: "css", apply: true, find: find("Custom CSS", "style stylesheet") })}</section>
            <section data-workspace-page="storage">${group("Storage and logs", `
              <label data-field ${find("Music storage folder", "audio directory folder scoped storage")}><span>Music storage folder</span><input name="audioDirectory" type="text" placeholder="audio" /><small>Folder inside the extension's scoped Lumiverse storage, scanned for music and sound effects.</small></label>
              <label data-check ${find("Verbose debug logging", "debug log console verbose")}><input name="debugLogging" type="checkbox" /><span>Verbose debug logging<small>Writes host events, planning, assets and anchoring to the Lumiverse log and browser console.</small>${more("While on, story text, the raw planner response and resolved character, wardrobe and environment state are written to the log.")}</span></label>
            `, { id: "storage", apply: true, find: "" })}</section>
            <section data-workspace-page="reset">${group("Reset and setup", `
              <div data-actions>
                <button type="button" data-reset>Reset defaults</button>
                <button type="button" data-quiet data-show-setup>Show setup guide</button>
              </div>
              <small>Reset returns every setting to its default and saves at once. Your saved prompt presets and music folder are kept.</small>
            `, { id: "maintenance", find: find("Reset defaults", "reset defaults setup guide onboarding start over") })}</section>
          `;
}
