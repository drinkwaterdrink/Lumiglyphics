'use strict';
// Isolated, in-memory design prototype. No host API, backend, persistence or paid work.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={view:'read',tab:'',detail:'',paragraph:0,saved:false,savedAt:0,approved:false,auto:false,textSize:matchMedia('(max-width:650px)').matches?20:23,motion:matchMedia('(prefers-reduced-motion:reduce)').matches,warm:false,draft:'',caption:'',autoTimer:null,toastTimer:null,opener:null,positions:new Map()};
const passages=[
 `<p>“I used to think every place worth finding was on a map.”</p><p class="narration">Mira rests a hand on the brass telescope. Beyond the glass, the sea is turning the color of ink.</p>`,
 `<p>“Then my father disappeared somewhere between the lines.”</p><p class="narration">She unfolds a <button class="entity-link" data-action="document">weathered star chart</button>. A small compass rose marks the edge of the coast.</p>`,
 `<p>“You kept your promise. Most people wouldn’t have come this far.”</p><p class="narration">For a moment, she looks at you instead of the horizon. Neither of you reaches for the map.</p>`,
 `<p>“There’s still time to turn back.”</p><p class="narration">Mira leaves the chart between you. Outside, the first light appears on the headland.</p>`
];
const views={story:{title:'Story',eyebrow:'THE WORLD, AS YOU KNOW IT',tabs:['People','Places','Documents','Moments'],note:'Sample discoveries, shown at the current reading position.'},artwork:{title:'Artwork',eyebrow:'YOUR SCENE, YOUR DIRECTION',tabs:['This scene','Library'],note:'Concept controls only. No images will be generated.'},history:{title:'History',eyebrow:'FIND YOUR PLACE AGAIN',tabs:['Conversation','Saved moments'],note:'Sample history only. No real chat data is connected.'},settings:{title:'Settings',eyebrow:'MAKE ROOM FOR YOUR STORY',tabs:['Reading','Look & sound','Setup'],note:'Preview settings apply to this page only.'},more:{title:'Your workspace',eyebrow:'EVERYTHING, ONE PLACE',tabs:[],note:'This is a design concept, separate from the working app.'}};
function toast(message){clearTimeout(state.toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;state.toastTimer=setTimeout(()=>$('#toast').hidden=true,4000)}
function stopAuto(){state.auto=false;clearTimeout(state.autoTimer);renderAuto()}
function renderAuto(){$('#auto').setAttribute('aria-pressed',String(state.auto));$('#auto').innerHTML=`${icon('play')} Auto <span class="auto-state">${state.auto?'on':'off'}</span>`}
function scheduleAuto(){clearTimeout(state.autoTimer);if(state.auto)state.autoTimer=setTimeout(()=>{if(state.paragraph<3){advance(1);scheduleAuto()}else{stopAuto();toast('Auto paused at your reply.')}},6500)}
function renderReader(){
 $('#passage').innerHTML=passages[state.paragraph];$('#counter').innerHTML=`${String(state.paragraph+1).padStart(2,'0')} <span>/ 04</span>`;$('#previous').disabled=state.paragraph===0;
 $('#continue').innerHTML=`${state.paragraph===3?'Your reply':'Continue'} ${icon('right')}`;
 $('#save-moment').setAttribute('aria-pressed',String(state.saved));$('#save-moment').setAttribute('aria-label',state.saved?'Moment saved; open saved moments':'Save this moment');
 $('#art-status').hidden=state.approved;
}
function advance(amount){state.paragraph=Math.max(0,Math.min(3,state.paragraph+amount));renderReader()}
function positionKey(){return `${state.view}:${state.tab}:${state.detail}`}
function saveScroll(){if(state.view!=='read')state.positions.set(positionKey(),$('#workspace-content').scrollTop)}
function updateNav(){$$('[data-view]').forEach(b=>{const active=b.dataset.view===state.view||(b.dataset.view==='more'&&matchMedia('(max-width:650px)').matches&&['history','settings'].includes(state.view));b.classList.toggle('selected',active);active?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')})}
function mobileReaderState(){const covered=state.view!=='read'&&matchMedia('(max-width:650px)').matches;$('#reader').inert=covered;covered?$('#reader').setAttribute('aria-hidden','true'):$('#reader').removeAttribute('aria-hidden')}
function openView(view,tab,opener=document.activeElement){
 if(view==='read'){closeWorkspace();return}saveScroll();stopAuto();if(state.view==='read'&&opener instanceof HTMLElement)state.opener=opener;
 state.view=view;state.tab=tab||views[view].tabs[0]||'';state.detail='';$('#workspace').hidden=false;
 if($('#app').classList.contains('focus'))setFocus(false);
 renderWorkspace();updateNav();mobileReaderState();$('#close-workspace').focus({preventScroll:true});
}
function closeWorkspace(){saveScroll();state.view='read';state.detail='';$('#workspace').hidden=true;updateNav();mobileReaderState();if(state.opener?.isConnected&&!state.opener.closest('[hidden]'))state.opener.focus({preventScroll:true});else $('[data-view=read]').focus({preventScroll:true})}
function showDetail(detail){saveScroll();state.detail=detail;renderWorkspace();$('#workspace-content .back-link')?.focus({preventScroll:true})}
function clearDetail(){saveScroll();state.detail='';renderWorkspace();$('#workspace-content button')?.focus({preventScroll:true})}
function setFocus(on){if(on&&state.view!=='read')closeWorkspace();$('#app').classList.toggle('focus',on);$('#focus-mode').setAttribute('aria-pressed',String(on));$('#leave-focus').hidden=!on;(on?$('#leave-focus'):$('#focus-mode')).focus({preventScroll:true})}
function renderWorkspace(){
 const config=views[state.view];$('#workspace-title').textContent=config.title;$('#workspace-eyebrow').textContent=config.eyebrow;$('#workspace-footnote').textContent=config.note;
 $('#panel-tabs').hidden=!config.tabs.length||Boolean(state.detail);
 $('#panel-tabs').innerHTML=config.tabs.map((tab,i)=>`<button role="tab" id="panel-tab-${i}" aria-controls="workspace-content" aria-selected="${state.tab===tab}" tabindex="${state.tab===tab?0:-1}" data-tab="${escapeHtml(tab)}">${tab}</button>`).join('');
 const content=$('#workspace-content');if(config.tabs.length&&!state.detail){content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',`panel-tab-${config.tabs.indexOf(state.tab)}`)}else{content.removeAttribute('role');content.removeAttribute('aria-labelledby')}
 content.innerHTML=state.detail?renderDetail():renderPanel();content.scrollTop=state.positions.get(positionKey())||0;
}
function personCard(){return `<p class="section-label">IN THIS SCENE</p><article class="character-card"><div class="character-row"><div class="character-avatar">M</div><div><h3>Mira Vale</h3><p>Cartographer · your traveling companion</p><span class="tag">Present</span></div></div><p>Searching the coast for the last place her father visited.</p><button class="card-link" data-action="person">Meet Mira ${icon('right')}</button></article><div class="source-note"><strong>A little less guessing.</strong>People who are mentioned aren’t automatically placed on stage. Here, presence is sample story data.</div><p class="section-label spaced">A QUIETER WORKSPACE</p><p class="intro">Characters, places, documents and saved moments live together. You don’t have to remember which floating menu held them.</p>`}
const momentQuotes=['“I used to think every place worth finding was on a map.”','“Then my father disappeared somewhere between the lines.”','“You kept your promise. Most people wouldn’t have come this far.”','“There’s still time to turn back.”'];
function moments(){return state.saved?`<p class="section-label">SAVED IN THIS PREVIEW</p><article class="list-card"><span class="tag">Your moment</span><p class="moment-quote">${momentQuotes[state.savedAt]}</p><p>The observatory · Mira Vale</p>${state.caption?`<p>${escapeHtml(state.caption)}</p>`:''}<button class="card-link" data-action="return-moment">Return to passage ${icon('right')}</button><button class="card-link" data-action="caption">Add a personal note ${icon('right')}</button></article><p class="intro">A bookmark and your annotation—not a new fact injected into the story. This proposed feature is illustrative.</p>`:`<div class="empty-state">Some passages stay with you.<br>Use the bookmark beside Mira’s name to save a sample moment here.</div>`}
function renderPanel(){
 if(state.view==='story'){
  if(state.tab==='People')return personCard();
  if(state.tab==='Places')return `<p class="section-label">CURRENT LOCATION</p><img class="photo" src="./assets/observatory.jpg" alt="Coastal observatory at dusk"><h3 class="detail-title">The observatory</h3><p class="intro">An old observatory above the coast. A brass telescope faces the headland.</p><div class="source-note"><strong>Established in this scene</strong>No inferred geography, routes or unexplored places.</div>`;
  if(state.tab==='Documents')return state.paragraph>=1?`<p class="section-label">DISCOVERED IN THIS SCENE</p><article class="list-card"><span class="tag">Document · revealed</span><h3 style="margin-top:12px">The weathered star chart</h3><p>A compass rose marks the edge of the coast.</p><button class="card-link" data-action="document">Open document ${icon('right')}</button></article>`:`<div class="empty-state">No documents discovered yet.<br>Continue the story to find the star chart. Later passages stay hidden.</div>`;
  return moments();
 }
 if(state.view==='artwork'){
  if(state.tab==='Library')return `<p class="section-label">AVAILABLE ARTWORK</p><img class="photo" src="./assets/observatory.jpg" alt="Saved observatory artwork"><h3 class="detail-title">The observatory</h3><p class="intro">One sample environment, reused in the concept. Browsing never requests new artwork.</p><span class="tag">Already available · no generation</span>`;
  return `<p class="intro">Keep reading while pictures are prepared. Review and recovery happen here, without taking over the story.</p><img class="photo" src="./assets/observatory.jpg" alt="Sample scene artwork awaiting review"><div class="status-label"><span class="attention-dot"></span>${state.approved?'Approved in this preview':'Ready for your review'}</div><h3 class="detail-title" style="margin-top:12px">The observatory</h3><p class="intro">Environment · evening · coastal interior</p><div class="stat-row"><span>Current display</span><span>Available sample artwork</span></div><div class="stat-row"><span>Source</span><span>Design concept illustration</span></div><div class="notice">Demonstration only. Approving changes a local UI state. It does not submit a request or spend credits.</div><div class="row-actions"><button class="quiet-action" data-action="brief">Inspect details</button><button class="primary-button" data-action="approve" ${state.approved?'disabled':''}>${state.approved?'Approved':'Approve preview'} ${icon('check')}</button></div>`;
 }
 if(state.view==='history'){
  if(state.tab==='Saved moments')return moments();
  return `<p class="intro">Your reading position, passages and pictures belong together—not in separate histories.</p><div class="history-entry"><div class="entry-time">CURRENT SCENE · CHAPTER TWO</div><h3>The observatory</h3><p>“I used to think every place worth finding was on a map.”</p><button data-action="return-start">Return to the opening passage →</button></div>${state.paragraph>=2?`<div class="history-entry"><div class="entry-time">PASSAGE THREE</div><h3>A promise kept</h3><p>“You kept your promise. Most people wouldn’t have come this far.”</p><button data-action="return-third">Return to this passage →</button></div>`:''}<div class="source-note"><strong>History, not a second timeline.</strong>This preview shows only sample passages you’ve reached. Real source versions and missing artwork would retain their own attribution.</div>`;
 }
 if(state.view==='settings'){
  if(state.tab==='Reading')return `<p class="intro">The essentials up front. Technical controls stay out of the reading experience.</p><p class="section-label">READING COMFORT <span class="tag" style="margin-left:5px">Preview only</span></p><div class="setting-group"><div class="setting-row"><div><span class="setting-label">Text size</span><span class="setting-description">Updates this reader immediately</span></div><div class="size-controls"><button data-action="smaller" aria-label="Decrease text size">−</button><output>${state.textSize}</output><button data-action="larger" aria-label="Increase text size">+</button></div></div><div class="setting-row"><div><span class="setting-label">Reduced motion</span><span class="setting-description">Keep the atmosphere, lose the movement</span></div><button class="switch" role="switch" aria-label="Reduced motion" aria-checked="${state.motion}" data-action="motion"></button></div></div><div class="list-card"><h3>Nothing gets lost.</h3><p>Reading preferences shouldn’t change your artwork, restart preparation or clear your reply.</p></div><button class="quiet-action full-width" data-action="reset-settings">Restore preview defaults</button>`;
  if(state.tab==='Look & sound')return `<p class="section-label">ATMOSPHERE</p><div class="setting-group"><div class="setting-row"><div><span class="setting-label">Warmer reading surface</span><span class="setting-description">A softer, amber-tinted dialogue panel</span></div><button class="switch" role="switch" aria-label="Warmer reading surface" aria-checked="${state.warm}" data-action="warm"></button></div></div><div class="list-card"><h3>One design. Different moods.</h3><p>Theme palettes change color and atmosphere—not where the controls live or how you get back.</p></div><div class="source-note"><strong>Sound demonstration</strong>The sound icon is a visual state preview. No soundtrack or voice service is connected.</div>`;
  return `<p class="intro">Provider connections and specialist tools get a dedicated setup space, separate from everyday reader preferences.</p><button class="menu-row" data-action="setup-info">${icon('settings')} Connections & capabilities ${icon('right')}</button><button class="menu-row" data-action="setup-info">${icon('art')} Generation & spending ${icon('right')}</button><button class="menu-row" data-action="setup-info">${icon('world')} Context & source policy ${icon('right')}</button><button class="menu-row" data-action="setup-info">${icon('info')} Advanced tools ${icon('right')}</button><div class="notice">These categories demonstrate the proposed hierarchy. They don’t edit your installed extension or expose real provider settings.</div>`;
 }
 return `<p class="intro">Frequent destinations stay one tap away. Everything else has a clear, labeled home.</p><button class="menu-row" data-go="history">${icon('history')} History ${icon('right')}</button><button class="menu-row" data-go="settings">${icon('settings')} Settings ${icon('right')}</button><button class="menu-row" data-action="search">${icon('search')} Find anything ${icon('right')}</button><button class="menu-row" data-action="help">${icon('info')} About this concept ${icon('right')}</button><button class="menu-row" data-action="exit">${icon('back')} Back to chat ${icon('right')}</button>`;
}
function renderDetail(){
 const back=`<button class="back-link" data-action="detail-back">${icon('back')} Back to ${state.tab.toLowerCase()||'workspace'}</button>`;
 if(state.detail==='person')return `${back}<div class="character-avatar" style="margin-bottom:18px">M</div><h3 class="detail-title">Mira Vale</h3><p class="intro">Cartographer · present in this scene</p><p class="section-label">WHAT YOU KNOW</p><div class="prose"><p>She is searching the coast for the last place her father visited.</p></div><div class="source-note"><strong>Sample source · scene setup</strong>Character facts here are authored demonstration data. A real implementation would link each claim to its eligible saved source.</div><div class="divider"></div><p class="section-label">KEEP STORY AND ART SEPARATE</p><p class="intro">Inspecting a character doesn’t automatically edit their appearance, generate a portrait or submit a reply.</p><button class="quiet-action full-width" data-action="ask-mira">Draft a question for Mira</button>`;
 if(state.detail==='document')return `${back}<span class="tag">Document · revealed in passage two</span><h3 class="detail-title" style="margin-top:18px">The weathered star chart</h3><div class="prose"><p>A small compass rose marks the edge of the coast.</p></div><div class="source-note"><strong>Only the visible fragment</strong>No other text is described in the sample passage. Missing contents remain unavailable.</div><button class="quiet-action full-width" data-action="return-document">Return to the discovery</button>`;
 if(state.detail==='brief')return `${back}<p class="section-label">PREPARED VISUAL BRIEF</p><h3 class="detail-title">A place, not a prompt wall.</h3><p class="intro">Start with the understandable ingredients. Keep technical detail available without making it the default.</p><div class="stat-row"><span>Subject</span><span>Coastal observatory</span></div><div class="stat-row"><span>Composition</span><span>Environment only</span></div><div class="stat-row"><span>Lighting</span><span>Blue hour, amber lamps</span></div><div class="stat-row"><span>People</span><span>None in this illustration</span></div><div class="source-note"><strong>Concept metadata</strong>This describes the included illustration, not a prepared request from the real image pipeline.</div><button class="quiet-action full-width" data-action="raw-prompt">View concept art direction</button>`;
 if(state.detail==='raw')return `${back}<p class="section-label">CONCEPT ART DIRECTION</p><p class="prose">An old coastal observatory at blue hour. Brass telescope, arched windows, dark teal sea and warm amber lamps. Painterly environmental illustration with no people or text.</p><div class="notice">A readable summary of the art direction—not an exact request log or provider settings.</div>`;
 if(state.detail==='caption')return `${back}<h3 class="detail-title">A note for yourself.</h3><p class="intro">Your interpretation belongs beside the source, not inside it.</p><label class="form-label" for="caption-input">Personal note</label><textarea id="caption-input" maxlength="500" placeholder="Why did this moment matter to you?">${escapeHtml(state.caption)}</textarea><button class="primary-button full-width" data-action="save-caption" style="margin-top:14px">Keep note in this preview ${icon('check')}</button>`;
 if(state.detail==='reply')return `${back}<p class="section-label">YOUR NEXT WORDS</p><h3 class="detail-title">Where do you go from here?</h3><p class="intro">Suggestions are editable intentions, not actions silently taken on your behalf.</p><div class="choice-list"><button data-draft="I promised I’d help you find him. Tell me where we go next.">“Tell me where we go next.”</button><button data-draft="I take a closer look at the compass rose on the star chart.">Examine the mark on the chart</button></div><label class="form-label" for="reply-draft">Your reply</label><textarea id="reply-draft" maxlength="3000" placeholder="Say or do something in your own words…">${escapeHtml(state.draft)}</textarea><p class="reply-hint">Local draft only. Nothing is sent to the host or an AI service.</p><button class="primary-button full-width" data-action="keep-draft">Keep draft ${icon('check')}</button>`;
 return back;
}
const actions={
 person:()=>{if(state.view!=='story')openView('story','People');showDetail('person')},
 document:()=>{if(state.paragraph<1){toast('Continue the story to discover this document.');return}if(state.view!=='story'||state.tab!=='Documents')openView('story','Documents');showDetail('document')},
 brief:()=>showDetail('brief'),'raw-prompt':()=>showDetail('raw'),'detail-back':clearDetail,
 approve:()=>{state.approved=true;renderReader();renderWorkspace();$$('.nav-dot').forEach(x=>x.hidden=true);toast('Sample artwork approved. No request was sent.')},
 'return-start':()=>{state.paragraph=0;renderReader();closeWorkspace()},
 'return-moment':()=>{state.paragraph=state.savedAt;renderReader();closeWorkspace()},
 'return-third':()=>{state.paragraph=2;renderReader();closeWorkspace()},
 'return-document':()=>{state.paragraph=1;renderReader();closeWorkspace()},
 caption:()=>showDetail('caption'),
 'save-caption':()=>{state.caption=$('#caption-input').value;state.detail='';renderWorkspace();toast('Personal note kept for this preview.')},
 'ask-mira':()=>{state.draft='Mira, what do you remember about the last place your father visited?';showDetail('reply')},
 'keep-draft':()=>{state.draft=$('#reply-draft').value;toast(state.draft.trim()?'Draft kept in this page. Nothing was submitted.':'Write a reply or choose a suggestion first.')},
 smaller:()=>{state.textSize=Math.max(16,state.textSize-1);applySettings()},larger:()=>{state.textSize=Math.min(30,state.textSize+1);applySettings()},
 motion:()=>{state.motion=!state.motion;applySettings()},warm:()=>{state.warm=!state.warm;applySettings()},
 'reset-settings':()=>{state.textSize=matchMedia('(max-width:650px)').matches?20:23;state.motion=matchMedia('(prefers-reduced-motion:reduce)').matches;state.warm=false;applySettings();toast('Preview preferences restored.')},
 'setup-info':()=>toast('Navigation example only. Real provider setup is not connected.'),
 search:()=>openSearch(),help:()=>$('#help-dialog').showModal(),exit:()=>toast('In the installed extension, this returns to chat. Your sample draft is kept here.')
};
function applySettings(){const focusAction=document.activeElement?.dataset.action;document.documentElement.style.setProperty('--story-size',`${state.textSize}px`);document.body.classList.toggle('reduced-motion',state.motion);document.body.classList.toggle('warm',state.warm);renderWorkspace();if(focusAction)$(`[data-action="${focusAction}"]`)?.focus({preventScroll:true})}
const commands=[{name:'Story · People',kind:'Workspace',go:()=>openView('story','People')},{name:'Story · Documents',kind:'Workspace',go:()=>openView('story','Documents')},{name:'Artwork · Review this scene',kind:'Workspace',go:()=>openView('artwork')},{name:'History · Conversation',kind:'Workspace',go:()=>openView('history')},{name:'Saved moments',kind:'Workspace',go:()=>openView('story','Moments')},{name:'Settings · Text size & motion',kind:'Settings',go:()=>openView('settings')},{name:'Settings · Look & sound',kind:'Settings',go:()=>openView('settings','Look & sound')},{name:'Focus reading',kind:'Action',go:()=>setFocus(true)},{name:'About the design concept',kind:'Help',go:()=>$('#help-dialog').showModal()}];
function renderCommands(){const term=$('#command-input').value.toLowerCase().trim();$('#command-results').innerHTML=commands.map((cmd,i)=>({...cmd,i})).filter(cmd=>cmd.name.toLowerCase().includes(term)).map(cmd=>`<button data-command="${cmd.i}">${cmd.name}<small>${cmd.kind} →</small></button>`).join('')||'<p class="intro" style="padding:14px">No matching menus. Try “artwork”, “text” or “story”.</p>'}
function openSearch(){renderCommands();$('#command-dialog').showModal();$('#command-input').focus()}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.view,undefined,b)));
$('#workspace').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tab){saveScroll();state.tab=b.dataset.tab;state.detail='';renderWorkspace();$(`[data-tab="${state.tab}"]`)?.focus({preventScroll:true})}
 else if(b.dataset.go)openView(b.dataset.go);
 else if(b.dataset.action)actions[b.dataset.action]?.();
 else if(b.dataset.draft){state.draft=b.dataset.draft;$('#reply-draft').value=state.draft;$('#reply-draft').focus()}
});
$('#panel-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=views[state.view].tabs;let i=tabs.indexOf(state.tab);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;e.preventDefault();saveScroll();state.tab=tabs[i];renderWorkspace();$(`[data-tab="${state.tab}"]`).focus()});
$('#workspace').addEventListener('input',e=>{if(e.target.id==='reply-draft')state.draft=e.target.value;if(e.target.id==='caption-input')state.caption=e.target.value});
$('#passage').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)actions[b.dataset.action]?.()});
$('#close-workspace').onclick=closeWorkspace;
$('#continue').onclick=()=>{if(state.paragraph<3){advance(1);scheduleAuto()}else{openView('story','People');showDetail('reply')}};
$('#previous').onclick=()=>{advance(-1);scheduleAuto()};
$('#speaker').onclick=actions.person;
$('#save-moment').onclick=()=>{if(state.saved){openView('story','Moments');return}state.saved=true;state.savedAt=state.paragraph;renderReader();toast('Sample moment saved. Find it in Story → Moments.')};
$('#art-status').onclick=()=>openView('artwork');$('#open-backlog').onclick=()=>openView('history');$('#open-search').onclick=openSearch;
$('#auto').onclick=()=>{if(state.auto)stopAuto();else{state.auto=true;renderAuto();scheduleAuto();toast('Auto preview on. Pauses when you open a panel or reach your reply.')}};
$('#focus-mode').onclick=()=>setFocus(!$('#app').classList.contains('focus'));$('#leave-focus').onclick=()=>setFocus(false);
$('#sound').onclick=()=>{const on=$('#sound').getAttribute('aria-pressed')!=='true';$('#sound').setAttribute('aria-pressed',String(on));$('#sound').setAttribute('aria-label',`Sound preview ${on?'on':'off'}`);toast('Visual preview only. No audio is connected.')};
$('#exit').onclick=actions.exit;$('#about').onclick=actions.help;$('#command-input').oninput=renderCommands;
$('#command-results').onclick=e=>{const button=e.target.closest('[data-command]');if(button){$('#command-dialog').close();commands[Number(button.dataset.command)].go()}};
$('#close-search').onclick=()=>$('#command-dialog').close();
$('#command-dialog form').addEventListener('submit',e=>{e.preventDefault();$('#command-results button')?.click()});
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if($('#command-dialog').open)$('#command-dialog').close();else if(!$('#help-dialog').open)openSearch();return}
 if(document.querySelector('dialog[open]'))return;
 if(e.key==='Escape'){if(state.detail){e.preventDefault();clearDetail()}else if(state.view!=='read'){e.preventDefault();closeWorkspace()}else if($('#app').classList.contains('focus'))setFocus(false);return}
 if(e.target.closest('input,textarea,button,a,[contenteditable=true]')||e.ctrlKey||e.metaKey||e.altKey||state.view!=='read')return;
 if(e.key==='ArrowRight'){e.preventDefault();$('#continue').click()}if(e.key==='ArrowLeft'){e.preventDefault();$('#previous').click()}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto()});
matchMedia('(max-width:650px)').addEventListener('change',()=>{updateNav();mobileReaderState()});
renderReader();renderAuto();document.body.classList.toggle('reduced-motion',state.motion);
