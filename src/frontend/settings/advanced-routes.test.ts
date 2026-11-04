import {expect,test} from 'bun:test';
import {renderAdvancedRoutes,type AdvancedRouteMarkup} from './advanced-routes';
function render(){
 const groups:{title:string;options:any}[]=[],pages:string[]=[];
 const markup:AdvancedRouteMarkup={group:(title,body,options={})=>{groups.push({title,options});return `<section data-test-group="${options.id??''}">${body}</section>`;},find:(label,keywords='')=>`data-find-label="${label}" data-find="${keywords}"`,more:html=>`<details><summary>More</summary>${html}</details>`,pageLink:id=>{pages.push(id);return `<a data-test-page="${id}">${id}</a>`;}};
 return {html:renderAdvancedRoutes(markup),groups,pages};
}
test('advanced routes retain every page, field name and navigation destination',()=>{
 const {html,pages}=render();expect(pages).toEqual(['parameters','filtering','css','storage','reset']);
 expect([...html.matchAll(/data-workspace-page="([^"]+)"/g)].map(match=>match[1])).toEqual(['filtering','parameters','css','storage','reset']);
 expect([...html.matchAll(/name="([^"]+)"/g)].map(match=>match[1])).toEqual(['ignoredTags','displayRegexRules','parserParameters','customCss','audioDirectory','debugLogging']);
});
test('technical edits keep explicit apply groups while Reset/Setup retain their own actions',()=>{
 const {html,groups}=render();expect(groups.map(group=>[group.options.id,group.options.apply??false])).toEqual([['filtering',true],['models',true],['css',true],['storage',true],['maintenance',false]]);
 expect(html).toContain('type="button" data-reset');expect(html).toContain('type="button" data-quiet data-show-setup');expect(html).not.toContain('type="submit"');
});
test('route copy retains filtering scope, diagnostics disclosure and custom-CSS limitations',()=>{
 const {html}=render();expect(html).toContain('The chat message is not edited.');expect(html).toContain('not from image planning');expect(html).toContain('Remote imports and URL fetches are removed.');expect(html).toContain('the raw planner response');expect(html).toContain('Your saved prompt presets and music folder are kept.');
});
