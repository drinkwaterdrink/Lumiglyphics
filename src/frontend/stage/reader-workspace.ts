import { SETTINGS_PAGES } from '../settings/routes.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';

export type ReaderDestination = 'story' | 'artwork' | 'history' | 'settings';
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
  { id: 'story', label: 'Story', icon: 'world', hint: 'People, places & revealed documents' },
  { id: 'artwork', label: 'Artwork', icon: 'art', hint: 'Review, replace & inspect pictures' },
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
  private readonly search: HTMLDialogElement;
  private readonly input: HTMLInputElement;
  private readonly results: HTMLElement;
  private readonly apertureOverlay: HTMLElement;
  private readonly routeBar: HTMLElement;
  private readonly routeName: HTMLElement;
  private readonly routeStep: HTMLElement;
  private readonly abort = new AbortController();
  private readonly tools = new Map<ReaderDestination, WorkspaceSurface>();
  private current: ReaderDestination | 'more' | null = null;
  private changing = false;
  private destroyed = false;
  private opener: HTMLElement | null = null;
  private readonly homes = new Map<HTMLElement, {parent: Node; next: Node | null}>();
  private readonly scroll = new Map<ReaderDestination, number>();
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
    <header data-vn-reader-header class="reader-topbar">
      <button type="button" class="round-ghost" data-aperture-open aria-label="Open APERTURE navigation" title="Open APERTURE navigation">${APERTURE_ICONS.menu}</button>
      <div class="reading-heading" style="padding-left:4px">
        <strong data-reader-caption-strong>Chapter IV</strong>
        <small data-reader-caption-small data-reader-caption>Visual novel</small>
      </div>
      <div data-reader-header-actions class="topbar-actions" style="display:flex;align-items:center;gap:5px;margin-left:auto">
        <button type="button" class="round-ghost" data-action="panels-toggle" title="Panels" aria-label="Open Panels">${APERTURE_ICONS.panel}</button>
        <button type="button" class="round-ghost" data-action="voice-toggle" title="Voice controls" aria-label="Voice controls">${APERTURE_ICONS.speaker}</button>
        <button type="button" class="round-ghost" data-action="studio-toggle" title="Art Studio" aria-label="Open Art Studio">${APERTURE_ICONS.image}</button>
        <button type="button" class="round-ghost" data-action="chat-exit" title="Back to chat" aria-label="Back to Lumiverse chat">${APERTURE_ICONS.chat}</button>
        <button type="button" class="round-ghost" data-reader-search aria-label="Find menus and settings" title="Find menus and settings (Ctrl/Command K)" style="display:none">${readerIcon('search')}<span style="display:none">Find menus</span><kbd style="display:none">⌘ K</kbd></button>
        <button type="button" class="round-ghost" data-reader-focus aria-label="Focus reading" aria-pressed="false" title="Focus reading" style="display:none">${readerIcon('focus')}<span style="display:none">Focus</span></button>
      </div>
    </header>
    <aside data-vn-workspace hidden aria-label="Reader workspace" tabindex="-1">
      <header data-workspace-heading><div><p data-workspace-subtitle></p><h2 data-workspace-title></h2></div><button type="button" data-workspace-close aria-label="Close workspace and return to reader">${readerIcon('close')}</button></header>
      <div data-workspace-content></div>
    </aside>
    <div class="route-bar" hidden aria-label="Quick navigation bar">
      <div>
        <div class="route-name">WORKSPACE</div>
        <div class="route-step">CHAPTER IV / YOUR WORLD</div>
      </div>
      <div class="route-actions">
        <button type="button" data-route-bar-action="read" aria-label="Return to reading">${APERTURE_ICONS.book}</button>
        <button type="button" data-route-bar-action="settings" class="dock-settings" aria-label="Open extension settings" title="Extension settings">${APERTURE_ICONS.settings}<span>Settings</span></button>
        <button type="button" data-route-bar-action="menu" class="menu-key">${APERTURE_ICONS.spark} Navigate</button>
      </div>
    </div>
    <nav class="aperture-overlay" id="apertureNav" aria-label="APERTURE navigation" aria-hidden="true">
      <div class="aperture-content">
        <div class="aperture-top">
          <div class="aperture-word">LUMIGLYPHICS / APERTURE <div style="font-size:10px;letter-spacing:0;margin-top:6px;font-weight:400;opacity:.65">The world is one tap away</div></div>
          <button type="button" class="aperture-close" data-action="aperture-close" aria-label="Close navigation">${APERTURE_ICONS.close}</button>
        </div>
        <div class="aperture-title">Where to<br><i>next?</i></div>
        <div class="aperture-links">
          <button type="button" data-aperture-route="read" class="aperture-link"><span class="number">01</span><span>Read</span>${APERTURE_ICONS.book}</button>
          <button type="button" data-aperture-route="world" class="aperture-link"><span class="number">02</span><span>World Lens</span>${APERTURE_ICONS.world}</button>
          <button type="button" data-aperture-route="character" class="aperture-link"><span class="number">03</span><span>Character folio</span>${APERTURE_ICONS.cast}</button>
          <button type="button" data-aperture-route="studio" class="aperture-link"><span class="number">04</span><span>Art studio</span>${APERTURE_ICONS.image}</button>
          <button type="button" data-aperture-route="library" class="aperture-link"><span class="number">05</span><span>Image library</span>${APERTURE_ICONS.grid}</button>
          <button type="button" data-aperture-route="history" class="aperture-link"><span class="number">06</span><span>History</span>${APERTURE_ICONS.history}</button>
          <button type="button" data-aperture-route="settings" class="aperture-link"><span class="number">07</span><span>Settings</span>${APERTURE_ICONS.settings}</button>
          <button type="button" data-aperture-route="workspace" class="aperture-link"><span class="number">08</span><span>Workspace</span>${APERTURE_ICONS.layers}</button>
          <button type="button" data-aperture-route="chat" class="aperture-link"><span class="number">→</span><span>Back to Lumiverse chat</span>${APERTURE_ICONS.chat}</button>
        </div>
        <div class="aperture-foot"><span>CHAPTER IV</span><span>EVERY DETAIL HAS A PLACE</span></div>
      </div>
    </nav>
    <dialog data-reader-command aria-label="Find menus and settings"><form method="dialog"><header><h2>Find your way</h2><button type="submit" aria-label="Close menu search">${readerIcon('close')}</button></header></form><label>${readerIcon('search')}<input type="search" maxlength="120" placeholder="Search menus and settings…" aria-label="Search menus and settings" autocomplete="off"></label><div data-reader-command-results></div><p>Navigation only. Searching never starts generation.</p></dialog>`;
    shell.append(...Array.from(wrapper.childNodes));
    const q = <T extends Element>(s: string) => shell.querySelector<T>(s)!;
    this.nav = q('[data-vn-navigation]'); this.header = q('[data-vn-reader-header]');
    this.panel = q('[data-vn-workspace]'); this.content = q('[data-workspace-content]');
    this.title = q('[data-workspace-title]'); this.subtitle = q('[data-workspace-subtitle]');
    this.closeButton = q('[data-workspace-close]'); this.search = q('[data-reader-command]');
    this.input = q('[data-reader-command] input'); this.results = q('[data-reader-command-results]');
    this.apertureOverlay = q('.aperture-overlay');
    this.routeBar = q('.route-bar');
    this.routeName = q('.route-bar .route-name');
    this.routeStep = q('.route-bar .route-step');

    this.more = document.createElement('div'); this.more.dataset.readerMore = '';
    this.renderWorkspaceDestinations();

    const signal = this.abort.signal;
    this.nav.addEventListener('click', event => {
      const b = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-reader-destination]') : null;
      if (!b) return;
      const id = b.dataset.readerDestination;
      if (id === 'read') this.close(); else if (id === 'more') this.openMore(b);
      else if (destinations.some(d => d.id === id)) this.open(id as ReaderDestination, b);
    }, {signal});
    this.closeButton.addEventListener('click', () => this.close(), {signal});
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

    // Topbar Actions
    q('[data-action="panels-toggle"]')?.addEventListener('click', () => {
      const panelLayer = this.shell.querySelector<HTMLElement>('[data-vn-panel-layer]');
      if (panelLayer) {
        panelLayer.dispatchEvent(new CustomEvent("lumiglyphics:panels-toggle", { bubbles: true }));
      }
    }, {signal});
    q('[data-action="voice-toggle"]')?.addEventListener('click', () => {
      const speechHost = this.shell.querySelector<HTMLElement>('.vn-speech-dock') || this.shell.querySelector<HTMLElement>('lumiglyphics-speech-dock') || this.shell.querySelector<HTMLElement>('[data-dock]');
      if (speechHost) {
        speechHost.dispatchEvent(new CustomEvent("lumiglyphics:speech-toggle", { bubbles: true }));
      }
    }, {signal});
    q('[data-action="studio-toggle"]')?.addEventListener('click', () => {
      this.open('artwork');
    }, {signal});
    q('[data-action="chat-exit"]')?.addEventListener('click', () => {
      this.shell.querySelector<HTMLButtonElement>('[data-vn-exit]')?.click();
    }, {signal});

    // APERTURE Navigation triggers
    const openMenuBtn = q('[data-aperture-open]');
    openMenuBtn.addEventListener('click', () => this.toggleAperture(true), {signal});
    const closeMenuBtn = q('[data-action="aperture-close"]');
    closeMenuBtn.addEventListener('click', () => this.toggleAperture(false), {signal});

    this.routeBar.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-route-bar-action]') : null;
      if (!target) return;
      const act = target.dataset.routeBarAction;
      if (act === 'read') this.close();
      else if (act === 'settings') this.open('settings');
      else if (act === 'menu') this.toggleAperture();
    }, {signal});

    this.apertureOverlay.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-aperture-route]') : null;
      if (!link) return;
      const route = link.dataset.apertureRoute;
      this.toggleAperture(false);
      if (route === 'read') this.close();
      else if (route === 'world' || route === 'character') this.open('story');
      else if (route === 'studio' || route === 'library') this.open('artwork');
      else if (route === 'history') this.open('history');
      else if (route === 'settings') this.open('settings');
      else if (route === 'workspace') this.openMore(link);
      else if (route === 'chat') {
        const exit = shell.querySelector<HTMLButtonElement>('[data-vn-exit]');
        if (exit) exit.click(); else this.close();
      }
    }, {signal});

    this.media = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 760px)') : undefined;
    this.media?.addEventListener?.('change', this.onMedia);
    window.visualViewport?.addEventListener('resize',this.onViewportResize,{signal});
    window.visualViewport?.addEventListener('scroll',this.onViewportResize,{signal});
    window.addEventListener('resize',this.onViewportResize,{signal});
    this.syncViewport();this.syncReader();
  }

  private renderWorkspaceDestinations(): void {
    this.more.replaceChildren();
    const heroCard = document.createElement('div');
    heroCard.className = 'workspace-scene-card';
    heroCard.innerHTML = `<div class="micro">CURRENT SCENE</div>
      <h2 class="workspace-scene-title">Kit Hall</h2>
      <p class="workspace-scene-sub">Chapter IV · Current passage</p>
      <button type="button" class="btn workspace-scene-cta">Resume reading <span>→</span></button>
      <div class="workspace-scene-orbit" aria-hidden="true"></div>`;
    heroCard.querySelector('button')?.addEventListener('click', () => this.close());

    const sectionHead = document.createElement('div');
    sectionHead.className = 'section-head';
    sectionHead.style.cssText = 'margin:20px 0 10px;font-weight:650;font-size:12px;';
    sectionHead.innerHTML = `Your destinations <span class="dim" style="opacity:0.75;font-size:10px;">EXPLORE YOUR STORY</span>`;

    const destGroup = document.createElement('div');
    destGroup.className = 'settings-menu';
    for (const d of destinations) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'settings-row';
      b.innerHTML = `${readerIcon(d.icon)}<span><b>${d.label}</b><small>${d.hint}</small></span>`;
      b.addEventListener('click', () => this.open(d.id, b));
      destGroup.append(b);
    }
    const note = document.createElement('p');
    note.style.cssText = 'font-size:10px;color:#8ba198;margin-top:20px;';
    note.textContent = 'Close returns to this passage. Back to chat leaves the reader.';
    this.more.append(heroCard, sectionHead, destGroup, note);
  }

  toggleAperture(forceOpen?: boolean): void {
    const isOpen = forceOpen !== undefined ? forceOpen : !this.apertureOverlay.classList.contains('open');
    if (isOpen) {
      this.apertureOverlay.classList.add('open');
    } else {
      this.apertureOverlay.classList.remove('open');
    }
    this.apertureOverlay.setAttribute('aria-hidden', String(!isOpen));
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
      this.title.textContent = id === 'story' ? 'World Lens' : d.label; this.subtitle.textContent = d.hint;
      this.panel.hidden = false; this.shell.dataset.vnWorkspace = id;
      this.panel.dataset.surface = id;
      this.routeBar.hidden = false;
      this.routeName.textContent = (id === 'story' ? 'World Lens' : d.label).toUpperCase();
      this.routeStep.textContent = 'CHAPTER IV / YOUR WORLD';
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
    try {
      this.pause(); this.opener = trigger; this.release(); this.current = 'more';
      this.title.textContent = 'Your workspace'; this.subtitle.textContent = 'Everything has a place';
      this.content.append(this.more);
      this.panel.hidden = false;
      this.shell.dataset.vnWorkspace = 'more';
      this.panel.dataset.surface = 'workspace';
      this.routeBar.hidden = false;
      this.routeName.textContent = 'WORKSPACE';
      this.routeStep.textContent = 'CHAPTER IV / YOUR WORLD';
      this.syncReader();
      this.closeButton.focus({preventScroll:true});
    }
    finally { this.changing = false; }
  }
  close(restoreFocus = true): void {
    if (this.changing || !this.current) return;
    this.changing = true;
    try {
      this.release(); this.current = null; this.panel.hidden = true; delete this.shell.dataset.vnWorkspace;
      this.routeBar.hidden = true;
      this.toggleAperture(false);
      this.syncReader();
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
  setCaption(text: string): void {
    const el = this.header.querySelector<HTMLElement>('[data-reader-caption]');
    const strong = this.header.querySelector<HTMLElement>('[data-reader-caption-strong]');
    if (text.includes("·")) {
      const parts = text.split("·").map(s => s.trim());
      if (strong) strong.textContent = parts[0] || 'Chapter IV';
      if (el) el.textContent = parts.slice(1).join(' · ');
    } else {
      if (strong) strong.textContent = text || 'Chapter IV';
      if (el) el.textContent = 'Visual novel';
    }
  }
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
    if ((event.key === 'm' || event.key === 'M') && !event.ctrlKey && !event.metaKey && !path.some(n => n instanceof Element && ['INPUT','TEXTAREA','SELECT'].includes(n.tagName))) {
      event.preventDefault(); this.toggleAperture(); return;
    }
    if (event.key !== 'Escape') return;
    if (this.apertureOverlay.classList.contains('open')) { event.preventDefault(); this.toggleAperture(false); return; }
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
    if(event.shiftKey&&active===stops[0]){event.preventDefault();stops.at(-1)?.focus();}
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
    this.nav.remove(); this.header.remove(); this.panel.remove(); this.search.remove(); this.apertureOverlay.remove(); this.routeBar.remove(); this.tools.clear(); this.homes.clear();
  }
}
