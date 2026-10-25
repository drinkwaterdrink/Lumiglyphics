import { SETTINGS_PAGES } from '../settings/routes.js';

export type ReaderDestination = 'story' | 'artwork' | 'history' | 'settings';
export type ReaderWorkspaceAction = 'previous' | 'next' | 'history' | 'lens' | 'cast' | 'settings' | 'panels' | 'voice' | 'artwork' | 'library' | 'backToChat';
export type ReaderWorkspaceActions = Partial<Record<ReaderWorkspaceAction, () => void>>;
export interface WorkspaceSurface {
  element: HTMLElement;
  /** Hide legacy launchers at home; native host Settings remains available. */
  hideAtHome?: boolean;
  /** Enter/leave change visibility only; the owner retains drafts and request state. */
  enter: () => void;
  leave: () => void;
  back?: () => boolean;
}
const destinations: ReadonlyArray<{ id: ReaderDestination; label: string; icon: string; hint: string }> = [
  { id: 'story', label: 'World Lens', icon: 'world', hint: 'Source-aware people, places & revealed documents' },
  { id: 'artwork', label: 'Art Studio', icon: 'art', hint: 'Review, replace & inspect real story pictures' },
  { id: 'history', label: 'History', icon: 'history', hint: 'Earlier passages & saved pictures' },
  { id: 'settings', label: 'Settings', icon: 'settings', hint: 'Every preference, in one place' },
];
const paths: Record<string, string> = {
  read: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
  world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  art: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  history: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  back: '<path d="m14 6-6 6 6 6M8 12h13"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  focus: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  panels: '<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="5" rx="1"/><rect x="13" y="11" width="8" height="9" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/>',
  voice: '<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>',
  cast: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
};
export const readerIcon = (name: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.read}</svg>`;

/** One navigation owner; tool owners still own their data and operations.
 * No story text, model requests or configuration copies are kept here. */
export class ReaderWorkspace {
  private readonly nav: HTMLElement;
  private readonly header: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly content: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly more: HTMLElement;
  private readonly dock: HTMLElement;
  private readonly iris: HTMLDialogElement;
  private readonly irisButton: HTMLButtonElement;
  private readonly search: HTMLDialogElement;
  private readonly input: HTMLInputElement;
  private readonly results: HTMLElement;
  private readonly abort = new AbortController();
  private readonly tools = new Map<ReaderDestination, WorkspaceSurface>();
  private current: ReaderDestination | 'more' | null = null;
  private changing = false;
  private destroyed = false;
  private opener: HTMLElement | null = null;
  private readonly homes = new Map<HTMLElement, {parent: Node; next: Node | null}>();
  private readonly scroll = new Map<ReaderDestination, number>();
  private actions: ReaderWorkspaceActions = {};
  private readonly media: MediaQueryList | undefined;
  private readonly onMedia = (): void => this.syncReader();
  private readonly onViewportResize = (): void => this.syncViewport();
  onSettingsPage: ((page: string) => void) | undefined;

  constructor(private readonly shell: HTMLElement, private readonly reader: HTMLElement,
    private readonly pause: () => void, private readonly focusReader: () => void) {
    shell.dataset.vnReaderFirst = 'true';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<nav data-vn-navigation aria-label="Reader navigation">
      <span data-vn-navigation-brand aria-label="Lumiglyphics">✧</span>
      <button type="button" data-reader-destination="read" aria-label="Read" aria-current="page">${readerIcon('read')}<span>Read</span></button>
      ${destinations.map(d => `<button type="button" data-reader-destination="${d.id}" aria-label="${d.label}" aria-expanded="false">${readerIcon(d.icon)}<span>${d.label}</span>${d.id === 'artwork' ? '<span data-reader-attention hidden></span>' : ''}</button>`).join('')}
      <button type="button" data-reader-destination="more" aria-label="More" aria-expanded="false">${readerIcon('more')}<span>More</span></button>
    </nav>
    <header data-vn-reader-header><div><span data-vn-reader-wordmark>LUMIGLYPHICS</span><span data-reader-caption>Visual novel</span></div><div data-reader-header-actions>
      <button type="button" data-reader-panels aria-label="Open Panels" title="Open pinned panels">${readerIcon('panels')}<span>Panels</span></button>
      <button type="button" data-reader-voice aria-label="Voice and TTS" title="Voice and TTS">${readerIcon('voice')}<span>Voice</span></button>
      <button type="button" data-reader-artwork aria-label="Open Art Studio" title="Open Art Studio">${readerIcon('art')}<span>Art Studio</span></button>
      <button type="button" data-aperture-iris aria-label="Open APERTURE navigation" aria-expanded="false" title="Open navigation">${readerIcon('more')}<span>Navigate</span></button>
      <button type="button" data-reader-search aria-label="Find menus and settings" title="Find menus and settings (Ctrl/Command K)">${readerIcon('search')}<span>Find menus</span><kbd>⌘ K</kbd></button>
      <button type="button" data-reader-focus aria-label="Focus reading" aria-pressed="false" title="Focus reading">${readerIcon('focus')}<span>Focus</span></button></div></header>
    <aside data-vn-workspace hidden aria-label="Reader workspace" tabindex="-1">
      <header data-workspace-heading><div><p data-workspace-subtitle></p><h2 data-workspace-title></h2></div><button type="button" data-workspace-close aria-label="Close workspace and return to reader">${readerIcon('close')}</button></header>
      <div data-workspace-content></div>
    </aside>
    <nav data-aperture-dock aria-label="Reader controls">
      <button type="button" data-aperture-action="previous" aria-label="Previous passage" title="Previous passage">${readerIcon('back')}</button>
      <button type="button" data-aperture-action="history" aria-label="History" title="History">${readerIcon('history')}<span>History</span></button>
      <button type="button" data-aperture-action="lens" aria-label="World Lens" title="World Lens">${readerIcon('world')}<span>Lens</span></button>
      <button type="button" data-aperture-action="cast" aria-label="Cast and Folios" title="Cast and Folios">${readerIcon('cast')}<span>Cast</span></button>
      <button type="button" data-aperture-action="settings" aria-label="Settings" title="Settings">${readerIcon('settings')}</button>
      <button type="button" data-aperture-action="next" aria-label="Next passage" title="Next passage">${readerIcon('back')}</button>
    </nav>
    <dialog data-aperture-iris-dialog aria-label="APERTURE navigation"><form method="dialog"><header><div><p>APERTURE</p><h2>Choose a space</h2></div><button type="submit" aria-label="Close navigation">${readerIcon('close')}</button></header></form>
      <div data-iris-grid>
        <button type="button" data-iris-action="lens">${readerIcon('world')}<span><b>World Lens</b><small>Revealed people, places, objects & documents</small></span></button>
        <button type="button" data-iris-action="cast">${readerIcon('cast')}<span><b>Cast / Folios</b><small>Character facts grounded in the story</small></span></button>
        <button type="button" data-iris-action="artwork">${readerIcon('art')}<span><b>Art Studio</b><small>Review, replace, queue & inspect artwork</small></span></button>
        <button type="button" data-iris-action="library">${readerIcon('history')}<span><b>Image Library</b><small>Browse saved story pictures</small></span></button>
        <button type="button" data-iris-action="history">${readerIcon('read')}<span><b>History</b><small>Read earlier passages</small></span></button>
        <button type="button" data-iris-action="panels">${readerIcon('panels')}<span><b>Panels</b><small>Show or capture pinned cards</small></span></button>
        <button type="button" data-iris-action="voice">${readerIcon('voice')}<span><b>Voice / TTS</b><small>Optional paragraph speech</small></span></button>
        <button type="button" data-iris-action="settings">${readerIcon('settings')}<span><b>Settings</b><small>All existing routes and preferences</small></span></button>
        <button type="button" data-iris-action="backToChat">${readerIcon('back')}<span><b>Back to Chat</b><small>Leave the reader using host navigation</small></span></button>
      </div><p data-iris-note>Close returns to this passage. Back to Chat leaves the reader.</p>
    </dialog>
    <dialog data-reader-command aria-label="Find menus and settings"><form method="dialog"><header><h2>Find your way</h2><button type="submit" aria-label="Close menu search">${readerIcon('close')}</button></header></form><label>${readerIcon('search')}<input type="search" maxlength="120" placeholder="Search menus and settings…" aria-label="Search menus and settings" autocomplete="off"></label><div data-reader-command-results></div><p>Navigation only. Searching never starts generation.</p></dialog>`;
    shell.append(...Array.from(wrapper.childNodes));
    const q = <T extends Element>(s: string) => shell.querySelector<T>(s)!;
    this.nav = q('[data-vn-navigation]'); this.header = q('[data-vn-reader-header]');
    this.panel = q('[data-vn-workspace]'); this.content = q('[data-workspace-content]');
    this.dock = q('[data-aperture-dock]'); this.iris = q<HTMLDialogElement>('[data-aperture-iris-dialog]'); this.irisButton = q<HTMLButtonElement>('[data-aperture-iris]');
    this.title = q('[data-workspace-title]'); this.subtitle = q('[data-workspace-subtitle]');
    this.closeButton = q('[data-workspace-close]'); this.search = q('[data-reader-command]');
    this.input = q('[data-reader-command] input'); this.results = q('[data-reader-command-results]');
    this.more = document.createElement('div'); this.more.dataset.readerMore = '';
    for (const d of destinations) {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = `${readerIcon(d.icon)}<span>${d.label}<small>${d.hint}</small></span>`;
      b.addEventListener('click', () => this.open(d.id, b)); this.more.append(b);
    }
    const note = document.createElement('p'); note.textContent = 'Close returns to this passage. Back to chat leaves the reader.'; this.more.append(note);
    const signal = this.abort.signal;
    this.nav.addEventListener('click', event => {
      const b = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-reader-destination]') : null;
      if (!b) return;
      const id = b.dataset.readerDestination;
      if (id === 'read') this.close(); else if (id === 'more') this.openMore(b);
      else if (destinations.some(d => d.id === id)) this.open(id as ReaderDestination, b);
    }, {signal});
    this.closeButton.addEventListener('click', () => this.close(), {signal});
    this.irisButton.addEventListener('click', () => this.openIris(), {signal});
    this.iris.addEventListener('cancel', () => this.irisButton.setAttribute('aria-expanded', 'false'), {signal});
    this.iris.addEventListener('close', () => this.irisButton.setAttribute('aria-expanded', 'false'), {signal});
    this.iris.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-iris-action]') : null;
      if (!button) return;
      event.preventDefault(); this.iris.close(); this.irisButton.setAttribute('aria-expanded', 'false');
      this.runAction(button.dataset.irisAction as ReaderWorkspaceAction);
    }, {signal});
    this.dock.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-aperture-action]') : null;
      if (button) this.runAction(button.dataset.apertureAction as ReaderWorkspaceAction);
    }, {signal});
    q('[data-reader-panels]').addEventListener('click', () => this.runAction('panels'), {signal});
    q('[data-reader-voice]').addEventListener('click', () => this.runAction('voice'), {signal});
    q('[data-reader-artwork]').addEventListener('click', () => this.runAction('artwork'), {signal});
    q('[data-reader-focus]').addEventListener('click', () => this.setFocus(this.shell.dataset.vnReadingFocus !== 'true'), {signal});
    q('[data-reader-search]').addEventListener('click', () => this.openSearch(), {signal});
    this.input.addEventListener('input', () => this.renderSearch(), {signal});
    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); this.results.querySelector<HTMLButtonElement>('button')?.click(); }
      if (event.key === 'ArrowDown') { event.preventDefault(); this.results.querySelector<HTMLButtonElement>('button')?.focus(); }
    }, {signal});
    shell.addEventListener('keydown', event => this.keydown(event), {signal, capture: true});
    this.results.addEventListener('keydown',event=>{
      if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
      const buttons=Array.from(this.results.querySelectorAll<HTMLButtonElement>('button'));
      const index=buttons.indexOf(event.target as HTMLButtonElement);
      if(index<0)return;event.preventDefault();
      buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
    },{signal});
    this.panel.addEventListener('click', event => event.stopPropagation(), {signal});
    this.panel.addEventListener('wheel', event => event.stopPropagation(), {signal, passive: true});
    this.media = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 760px)') : undefined;
    this.media?.addEventListener?.('change', this.onMedia);
    window.visualViewport?.addEventListener('resize',this.onViewportResize,{signal});
    window.visualViewport?.addEventListener('scroll',this.onViewportResize,{signal});
    window.addEventListener('resize',this.onViewportResize,{signal});
    this.syncViewport();this.syncReader();
  }

  setActions(actions: ReaderWorkspaceActions): void { this.actions = { ...actions }; }

  private openIris(): void {
    if (this.destroyed || this.iris.open || typeof this.iris.showModal !== 'function') return;
    this.pause(); this.irisButton.setAttribute('aria-expanded', 'true'); this.iris.showModal();
    this.iris.querySelector<HTMLButtonElement>('[data-iris-action]')?.focus();
  }

  private runAction(action: ReaderWorkspaceAction): void {
    if (action === 'previous') {
      this.reader.shadowRoot?.querySelector<HTMLButtonElement>('[data-vn-control="previous"]')?.click(); return;
    }
    if (action === 'next') {
      this.reader.shadowRoot?.querySelector<HTMLButtonElement>('[data-vn-continue]')?.click(); return;
    }
    if (action === 'history') {
      this.reader.shadowRoot?.querySelector<HTMLButtonElement>('[data-vn-control="log"]')?.click(); return;
    }
    if (action === 'lens' || action === 'cast') {
      if (this.actions[action]) this.actions[action]!(); else this.open('story'); return;
      return;
    }
    if (action === 'settings') { this.open('settings'); return; }
    if (action === 'artwork') { this.open('artwork'); return; }
    if (action === 'library') {
      if (this.actions.library) this.actions.library(); else this.open('history');
      return;
    }
    if (action === 'backToChat') {
      if (this.actions.backToChat) this.actions.backToChat();
      else this.shell.querySelector<HTMLButtonElement>('[data-vn-exit]')?.click();
      return;
    }
    if (action === 'panels') {
      if (this.actions.panels) this.actions.panels();
      else this.shell.querySelector<HTMLElement>('[data-vn-panel-layer]')?.shadowRoot?.querySelector<HTMLButtonElement>('.launcher')?.click();
      return;
    }
    if (action === 'voice') {
      if (this.actions.voice) this.actions.voice();
      else { this.open('settings'); this.onSettingsPage?.('speech'); }
    }
  }

  register(id: ReaderDestination, surface: WorkspaceSurface): void {
    this.tools.set(id, surface);
    surface.element.dataset.vnWorkspaceTool = id;
    if(surface.hideAtHome)surface.element.hidden=true;
  }
  get destination(): ReaderDestination | 'more' | null { return this.current; }
  isOpen(): boolean { return this.current !== null; }
  private rememberHome(element: HTMLElement): void {
    if (element.parentNode && !this.homes.has(element)) this.homes.set(element, {parent: element.parentNode, next: element.nextSibling});
  }
  private release(): void {
    const old = this.current;
    if (old && old !== 'more') {
      this.scroll.set(old, this.content.scrollTop);
      const tool = this.tools.get(old);
      tool?.leave();
      if(tool?.hideAtHome)tool.element.hidden=true;
      if (tool) { const home = this.homes.get(tool.element); if (home) home.parent.insertBefore(tool.element, home.next?.parentNode === home.parent ? home.next : null); }
    }
    this.content.replaceChildren();
  }
  open(id: ReaderDestination, trigger?: HTMLElement): void {
    if (this.destroyed || this.changing || this.current === id) return;
    if(this.shell.dataset.vnReadingFocus === 'true') this.setFocus(false);
    this.changing = true;
    try {
      this.pause(); this.opener = trigger ?? this.nav.querySelector<HTMLElement>(`[data-reader-destination="${id}"]`);
      this.release(); this.current = id;
      const d = destinations.find(d => d.id === id)!;
      this.title.textContent = d.label; this.subtitle.textContent = d.hint;
      this.panel.hidden = false; this.shell.dataset.vnWorkspace = id;
      const tool = this.tools.get(id);
      if (tool) { this.rememberHome(tool.element); this.content.append(tool.element); tool.element.hidden=false;tool.enter(); }
      else { const empty = document.createElement('p'); empty.dataset.workspaceEmpty = ''; empty.textContent = id === 'settings' ? 'Settings are available in the host’s Lumiglyphics settings tab.' : 'There is nothing available here at this reading position yet.'; this.content.append(empty); }
      this.content.scrollTop = this.scroll.get(id) ?? 0;
      this.syncReader(); this.closeButton.focus({preventScroll:true});
    } finally { this.changing = false; }
  }
  /** A tool's own close button should close its workspace, not a different destination. */
  toolClosed(id: ReaderDestination): void { if (!this.changing && this.current === id) this.close(); }
  private openMore(trigger: HTMLElement): void {
    if (this.destroyed || this.changing) return;
    this.changing = true;
    try { this.pause(); this.opener = trigger; this.release(); this.current = 'more'; this.title.textContent = 'Your workspace'; this.subtitle.textContent = 'Everything has a place'; this.content.append(this.more); this.panel.hidden = false; this.shell.dataset.vnWorkspace = 'more'; this.syncReader(); this.closeButton.focus({preventScroll:true}); }
    finally { this.changing = false; }
  }
  close(restoreFocus = true): void {
    if (this.changing || !this.current) return;
    this.changing = true;
    try { this.release(); this.current = null; this.panel.hidden = true; delete this.shell.dataset.vnWorkspace; this.syncReader();
      if (restoreFocus) { if (this.opener?.isConnected && this.opener.getClientRects().length && !this.opener.closest('[hidden]')) this.opener.focus({preventScroll:true}); else this.focusReader(); }
      this.opener = null;
    } finally { this.changing = false; }
  }
  setFocus(enabled: boolean): void {
    this.close(false); this.shell.dataset.vnReadingFocus = String(enabled);
    const b = this.header.querySelector<HTMLButtonElement>('[data-reader-focus]')!;
    b.setAttribute('aria-pressed', String(enabled)); b.setAttribute('aria-label', enabled ? 'Show navigation' : 'Focus reading'); b.title = enabled ? 'Show navigation' : 'Focus reading';
    b.querySelector('span')!.textContent = enabled ? 'Show navigation' : 'Focus';
    this.focusReader();
  }
  setCaption(text: string): void { this.header.querySelector<HTMLElement>('[data-reader-caption]')!.textContent = text || 'Visual novel'; }
  setAttention(count: number): void {
    const badge = this.nav.querySelector<HTMLElement>('[data-reader-attention]')!;
    badge.hidden = count <= 0; badge.textContent = String(count); badge.setAttribute('aria-label', `${count} pictures need review`);
    const button=this.nav.querySelector('[data-reader-destination="artwork"]')!;
    if(count>0)button.setAttribute('aria-description',`${count} picture${count===1?'':'s'} need${count===1?'s':''} review`);else button.removeAttribute('aria-description');
  }
  private syncViewport():void {
    const viewport=window.visualViewport;
    if(!viewport){this.shell.style.setProperty('--reader-keyboard-inset','0px');return;}
    const rect=this.shell.getBoundingClientRect(),scale=rect.height>0?this.shell.clientHeight/rect.height:1;
    this.shell.style.setProperty('--reader-keyboard-inset',`${Math.max(0,rect.bottom-viewport.height-viewport.offsetTop)*scale}px`);
  }
  suspend():void {if(this.search.open)this.search.close();this.close(false);}
  private syncReader(): void {
    const covered = this.isOpen() && Boolean(this.media?.matches);
    this.reader.inert = covered;
    for(const element of this.shell.querySelectorAll<HTMLElement>('[data-vn-panel-layer],[data-vn-speech-dock]'))element.inert=covered;
    if (covered) this.reader.setAttribute('aria-hidden', 'true'); else this.reader.removeAttribute('aria-hidden');
    for (const b of this.nav.querySelectorAll<HTMLElement>('[data-reader-destination]')) {
      const active = b.dataset.readerDestination === (this.current ?? 'read') || b.dataset.readerDestination === 'more' && this.media?.matches && (this.current === 'settings' || this.current === 'history');
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      if (b.dataset.readerDestination !== 'read') b.setAttribute('aria-expanded', String(active));
    }
  }
  private keydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    // Native confirmations/search own their Escape and focus handling.
    if (path.some(node => node instanceof Element && node.tagName === 'DIALOG' && node.hasAttribute('open'))) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); event.stopPropagation(); this.openSearch(); return; }
    if(event.key==='Tab'&&this.current){this.wrapFocus(event,path[0]);return;}
    if (event.key !== 'Escape') return;
    if (this.current) { event.preventDefault(); event.stopPropagation(); const tool = this.current !== 'more' ? this.tools.get(this.current) : undefined; if (!tool?.back?.()) this.close(); }
    else if (this.shell.dataset.vnReadingFocus === 'true') { event.preventDefault(); event.stopPropagation(); this.setFocus(false); }
  }
  private wrapFocus(event:KeyboardEvent,active:EventTarget|undefined):void {
    const stops:HTMLElement[]=[];
    const visit=(root:HTMLElement|ShadowRoot):void=>{
      for(const element of root.querySelectorAll<HTMLElement>('*')){
        if(element.inert||element.closest('[inert],[hidden]'))continue;
        if(element.matches('button,input,select,textarea,summary,a[href],[tabindex]')&&element.tabIndex>=0&&!element.matches(':disabled')&&element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden'&&(!element.closest('details:not([open])')||element.tagName==='SUMMARY'))stops.push(element);
        if(element.shadowRoot)visit(element.shadowRoot);
      }
    };
    visit(this.shell);
    if(event.shiftKey&&!stops.includes(active as HTMLElement)){event.preventDefault();this.closeButton.focus({preventScroll:true});}
    else if(event.shiftKey&&active===stops[0]){event.preventDefault();stops.at(-1)?.focus();}
    else if(!event.shiftKey&&active===stops.at(-1)){event.preventDefault();stops[0]?.focus();}
  }
  openSearch(): void {
    if (this.destroyed || typeof this.search.showModal !== 'function' || this.search.open) return;
    this.pause(); this.input.value = ''; this.renderSearch(); this.search.showModal(); this.input.focus();
  }
  private renderSearch(): void {
    this.results.replaceChildren();
    const commands: Array<{label: string; hint: string; keywords?: string; action: () => void}> = destinations.map(d => ({label: d.label, hint: d.hint, action: () => this.open(d.id)}));
    if (this.onSettingsPage) for (const page of SETTINGS_PAGES) commands.push({label: `Settings · ${page.title}`, hint: page.description, keywords: page.id==='appearance'?'resize resizing text box dialogue opacity scale size themes overlay image-first':page.id==='reading'?'auto autoplay speed skip tooltips references':page.id==='css'?'stylesheet theme custom styling':page.id==='connections'?'setup providers api model services':page.id==='speech'?'voice audio tts playback':'', action: () => { this.open('settings'); this.onSettingsPage?.(page.id); }});
    commands.push({label: 'Focus reading', hint: 'Hide navigation; Escape restores it', action: () => this.setFocus(true)});
    const term = this.input.value.trim().toLocaleLowerCase();
    for (const cmd of commands.filter(c => `${c.label} ${c.hint} ${c.keywords??""}`.toLocaleLowerCase().includes(term))) {
      const b = document.createElement('button'); b.type = 'button'; const title = document.createElement('span'), hint = document.createElement('small'); title.textContent = cmd.label; hint.textContent = cmd.hint; b.append(title, hint);
      b.onclick = () => { this.search.close(); cmd.action(); }; this.results.append(b);
    }
    if (!this.results.childElementCount) { const p = document.createElement('p'); p.textContent = 'No matching menus. Try “text”, “images” or “connections”.'; this.results.append(p); }
  }
  destroy(): void {
    if(this.destroyed)return;
    this.close(false); if (this.search.open) this.search.close(); this.destroyed = true;
    this.abort.abort(); this.media?.removeEventListener?.('change', this.onMedia); this.reader.inert = false; this.reader.removeAttribute('aria-hidden');
    for(const element of this.shell.querySelectorAll<HTMLElement>('[data-vn-panel-layer],[data-vn-speech-dock]'))element.inert=false;
    this.nav.remove(); this.header.remove(); this.panel.remove(); this.dock.remove(); this.iris.remove(); this.search.remove(); this.tools.clear(); this.homes.clear();
  }
}
