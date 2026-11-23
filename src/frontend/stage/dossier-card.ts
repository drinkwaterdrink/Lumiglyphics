import { FullscreenLightbox } from './fullscreen-lightbox.js';
import { createDocumentReader, populateDocumentArtStage, formatDocumentDisplayTitle, type DocumentReaderOptions } from './document-reader.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';
import { html } from '../dom/html.js';
import { renderEntityStockIcon } from './entity-icons.js';
import type { StoryDocument, StoryDocumentKind } from '../../shared/story-documents.js';
import type { LocationArtAction, LocationArtLibrary } from '../../shared/stage-assets.js';
import { InteractionTray } from './interaction-tray.js';
import type { InteractionDraft, DraftMergeMode } from '../../shared/scene-interactions.js';
import { entityOverride, type ReferenceKind, type referenceEntries, type ReaderDossier, type TooltipPreferences } from '../../shared/dossiers.js';
import { referenceFieldInfo, REFERENCE_FIELD_GROUPS } from '../../shared/reference-fields.js';
import {
  createItemId,
  createLocationId,
  deriveShortAliases,
  findMatchingItem,
  findMatchingLocation,
  formatItemDNAForImagePrompt,
  formatLocationDNAForImagePrompt,
  type ItemDNA,
  type LocationDNA,
  type StoryDnaRequester,
  type StoryAutofillField,
  type StoryAutofillProposal,
  type StoryDNASet,
  type StoryDocumentLedgerEntry,
  type ThoughtCabinetEntry,
} from '../../shared/story-dna.js';

export interface DossierVisualContext {
  imageUrl?: string;
  imageCaption?: string;
  isPresent?: boolean;
  isActiveLocation?: boolean;
  locationName?: string;
  presentCharacters?: Array<{ id: string; name: string }>;
  summarySnippet?: string;
  anchors?: string[];
  connectedLocations?: string[];
  onSelectEntity?: (id: string, trigger: HTMLElement) => void;
}

export interface DossierSceneHubContext {
  activeLocationId?: string | undefined;
  activeLocationName?: string | undefined;
  locationImageUrl?: string | undefined;
  locationDna?: LocationDNA | undefined;
  presentCast: Array<{
    id: string;
    name: string;
    imageUrl?: string | undefined;
    present?: boolean | undefined;
    dnaId?: string | undefined;
    wardrobeStates?: Record<string, string> | undefined;
    activeWardrobeKey?: string | undefined;
    activeOutfit?: string | undefined;
  }>;
  activeItems: Array<{ id: string; name: string; imageUrl?: string | undefined }>;
  onSelectWardrobe?: ((charIdOrName: string, key: string, outfit: string) => void) | undefined;
  sceneDocuments?: StoryDocument[] | undefined;
  hiddenOverrides?: ReadonlyArray<{ kind: 'npc' | 'place' | 'object'; name: string }> | undefined;
  onUnhideOverride?: ((kind: 'npc' | 'place' | 'object', name: string) => void) | undefined;
  actionsEnabled?: boolean | undefined;
  onDraftAction?: ((text: string) => void) | undefined;
  onJumpToMessage?: ((messageId: string) => void) | undefined;
}

const VALID_DOC_KINDS = new Set<StoryDocumentKind>([
  'flyer', 'letter', 'note', 'journal', 'map', 'poster',
  'receipt', 'notice', 'newspaper', 'pamphlet', 'phone', 'terminal',
]);

function normalizeDocKind(raw: string): StoryDocumentKind {
  return VALID_DOC_KINDS.has(raw as StoryDocumentKind) ? (raw as StoryDocumentKind) : 'note';
}

function ledgerEntryToStoryDocument(entry: StoryDocumentLedgerEntry): StoryDocument {
  return {
    id: entry.id,
    name: entry.name,
    kind: normalizeDocKind(entry.kind),
    paragraphIndex: entry.observations?.[0]?.paragraphIndex ?? entry.sections?.[0]?.paragraphIndex ?? 0,
    aliases: entry.aliases ?? [],
    ...(entry.visualDetails ? { visualDetails: entry.visualDetails } : {}),
    ...(entry.observations ? {
      observations: entry.observations.map((o) => ({
        paragraphIndex: o.paragraphIndex,
        ...(o.summary ? { summary: o.summary } : {}),
        ...(o.visualDetails ? { visualDetails: o.visualDetails } : {}),
        ...(o.material ? { material: o.material } : {}),
        ...(o.condition ? { condition: o.condition } : {}),
        evidence: o.evidence,
      })),
    } : {}),
    sections: (entry.sections ?? []).map((s) => ({
      paragraphIndex: s.paragraphIndex,
      start: 0,
      end: s.text.length,
      text: s.text,
    })),
  };
}

function entityInitials(name: string): string {
  const parts = name.trim().split(/[\s·\-]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function fallbackSvgForKind(kind: 'npc' | 'place' | 'object', name: string): string {
  const initials = entityInitials(name).replace(/[<>&"']/g, '');
  if (kind === 'npc') {
    return `<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><defs><linearGradient id="vnNpcGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(158,198,240,0.32)"/><stop offset="100%" stop-color="rgba(20,26,42,0.92)"/></linearGradient></defs><rect width="120" height="140" rx="14" fill="url(#vnNpcGrad)"/><circle cx="60" cy="48" r="22" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/><path d="M24 126c4-24 20-38 36-38s32 14 36 38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/><text x="60" y="54" text-anchor="middle" fill="currentColor" font-size="16" font-weight="700" opacity="0.9">${initials}</text></svg>`;
  }
  if (kind === 'place') {
    return `<svg viewBox="0 0 320 130" aria-hidden="true" focusable="false"><defs><linearGradient id="vnPlaceGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(110,168,230,0.28)"/><stop offset="100%" stop-color="rgba(14,20,34,0.95)"/></linearGradient></defs><rect width="320" height="130" rx="14" fill="url(#vnPlaceGrad)"/><circle cx="256" cy="36" r="16" fill="rgba(255,230,170,0.22)"/><path d="M0 105 L68 58 L128 92 L198 44 L272 88 L320 64 L320 130 L0 130 Z" fill="rgba(255,255,255,0.1)"/><path d="M0 116 L96 74 L168 104 L244 66 L320 96 L320 130 L0 130 Z" fill="rgba(255,255,255,0.14)"/></svg>`;
  }
  return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><linearGradient id="vnItemGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(232,190,116,0.28)"/><stop offset="100%" stop-color="rgba(20,24,38,0.94)"/></linearGradient></defs><rect width="120" height="120" rx="14" fill="url(#vnItemGrad)"/><polygon points="60,20 94,60 60,100 26,60" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.34)" stroke-width="1.5"/><circle cx="60" cy="60" r="12" fill="rgba(255,255,255,0.2)"/></svg>`;
}

const MAP_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [18, 14],
  [62, 22],
  [15, 52],
  [60, 58],
  [38, 36],
  [78, 40],
  [26, 72],
  [68, 74]
];

export class DossierCard {
  readonly host = document.createElement('div');
  private returnFocus: HTMLElement | null = null;
  private trayReturn: (() => void) | null = null;
  private trayRender: (() => void) | null = null;
  private query = '';
  private category: ReferenceKind | 'document' = 'all';
  private scope = 'all';
  private selectedEntityId: string | null = null;
  private hubView: 'scene' | 'atlas' = 'scene';
  private perspectiveFilter = 'all';
  private perspectivesOpen = false;
  private linkMode = false;
  private linkSourceId: string | null = null;
  private storyDna: StoryDNASet = { locations: {}, items: {}, revision: 0 };
  private storyDnaRequester: StoryDnaRequester | null = null;
  private storyDnaError: string | null = null;
  private locationArtLibrary: LocationArtLibrary = { version: 1, locations: [] };
  private locationArtRequester: ((action: LocationArtAction) => void) | null = null;
  private sceneHubContext: DossierSceneHubContext | null = null;
  private activeDossierContext: {
    dossier: ReaderDossier;
    prefs: TooltipPreferences;
    chatId: string;
    trigger: HTMLElement;
    actions?: Parameters<DossierCard['open']>[4];
    storyDocument?: StoryDocument | undefined;
    visual?: DossierVisualContext | undefined;
  } | null = null;
  private awaitingDnaSync = false;
  private folioOpener: ((characterName: string) => void) | null = null;
  private documentOptionsResolver: ((docId: string) => DocumentReaderOptions) | null = null;
  private activeDocumentRecord: StoryDocument | null = null;

  setFolioOpener(fn: (characterName: string) => void): void {
    this.folioOpener = fn;
  }

  setDocumentOptionsResolver(fn: (docId: string) => DocumentReaderOptions): void {
    this.documentOptionsResolver = fn;
  }

  setLocationArtLibrary(library: LocationArtLibrary): void {
    this.locationArtLibrary = library;
    if (this.activeDossierContext?.dossier.entity.kind === 'place' && this.isOpen()) {
      const ctx = this.activeDossierContext;
      this.open(ctx.dossier, ctx.prefs, ctx.chatId, ctx.trigger, ctx.actions, ctx.storyDocument, ctx.visual);
    }
  }

  setLocationArtRequester(fn: (action: LocationArtAction) => void): void {
    this.locationArtRequester = fn;
  }

  private getCombinedDocuments(): Array<{ doc: StoryDocument; customNote?: string | undefined; inCurrentTurn: boolean }> {
    const byKey = new Map<string, { doc: StoryDocument; customNote?: string | undefined; inCurrentTurn: boolean }>();
    for (const d of this.sceneHubContext?.sceneDocuments ?? []) {
      const key = d.name.trim().toLowerCase() || d.id;
      const ledgerMatch = this.storyDna.documents?.[d.id]
        ?? Object.values(this.storyDna.documents ?? {}).find((l) => l.name.trim().toLowerCase() === key);
      byKey.set(key, {
        doc: d,
        customNote: ledgerMatch?.customNotes,
        inCurrentTurn: true,
      });
    }
    for (const entry of Object.values(this.storyDna.documents ?? {})) {
      const key = entry.name.trim().toLowerCase() || entry.id;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        doc: ledgerEntryToStoryDocument(entry),
        customNote: entry.customNotes,
        inCurrentTurn: false,
      });
    }
    return [...byKey.values()];
  }

  openDocument(storyDocument: StoryDocument, back: () => void, trigger?: HTMLElement): void {
    if (trigger) this.returnFocus = trigger;
    this.activeDocumentRecord = storyDocument;
    const opts = this.documentOptionsResolver?.(storyDocument.id) ?? {};
    const ledgerEntry = this.storyDna.documents?.[storyDocument.id]
      ?? Object.values(this.storyDna.documents ?? {}).find((l) => l.name.trim().toLowerCase() === storyDocument.name.trim().toLowerCase());
    const mergedOpts: DocumentReaderOptions = {
      ...opts,
      ...(opts.customNote !== undefined ? {} : ledgerEntry?.customNotes ? { customNote: ledgerEntry.customNotes } : {}),
      ...(opts.onQuoteInReply ? {} : this.sceneHubContext?.onDraftAction ? {
        onQuoteInReply: (quote: string) => {
          this.activeDocumentRecord = null;
          this.close();
          this.sceneHubContext?.onDraftAction?.(quote);
        },
      } : {}),
    };
    const reader = createDocumentReader(
      storyDocument,
      () => {
        if (this.host.hidden || reader.parentElement !== this.host) return;
        this.activeDocumentRecord = null;
        back();
      },
      () => {
        if (!this.host.hidden && reader.parentElement === this.host) {
          this.activeDocumentRecord = null;
          this.close();
        }
      },
      mergedOpts,
    );
    if (this.host.dataset.vnWorkspaceTool) reader.removeAttribute('aria-modal');
    this.documentState(true);
    this.host.replaceChildren(reader);
    this.host.hidden = false;
    reader.querySelector<HTMLElement>('button')?.focus();
  }

  refreshDocumentStage(documentId: string): void {
    if (this.host.hidden || !this.activeDocumentRecord || this.activeDocumentRecord.id !== documentId) return;
    const reader = this.host.querySelector<HTMLElement>('[data-vn-document-reader]');
    const stage = reader?.querySelector<HTMLElement>('[data-document-art-stage]');
    if (!reader || reader.dataset.vnDocId !== documentId || !stage) return;
    const opts = this.documentOptionsResolver?.(documentId) ?? {};
    populateDocumentArtStage(stage, this.activeDocumentRecord, opts);
  }

  setStoryDna(storyDna: StoryDNASet): void {
    this.storyDna = storyDna;
    this.storyDnaError = null;
    if (this.awaitingDnaSync && this.activeDossierContext && this.isOpen()) {
      this.awaitingDnaSync = false;
      const ctx = this.activeDossierContext;
      this.open(ctx.dossier, ctx.prefs, ctx.chatId, ctx.trigger, ctx.actions, ctx.storyDocument, ctx.visual);
      return;
    }
    if (!this.activeDossierContext && !this.activeDocumentRecord && this.isOpen() && this.trayRender) {
      this.trayRender();
      return;
    }
    const statusEl = this.host.querySelector<HTMLElement>('[data-story-dna-status]');
    if (statusEl) {
      statusEl.textContent = 'Saved Story DNA synced.';
      statusEl.hidden = false;
    }
  }

  setStoryDnaRequester(fn: StoryDnaRequester): void {
    this.storyDnaRequester = fn;
  }

  setStoryDnaError(error: string): void {
    this.storyDnaError = error;
    this.awaitingDnaSync = false;
    const itemArtBtn = this.host.querySelector<HTMLButtonElement>('[data-generate-item-art]');
    if (itemArtBtn) {
      itemArtBtn.disabled = false;
      itemArtBtn.textContent = '✨ Generate Item Art';
    }
    const autofillBtn = this.host.querySelector<HTMLButtonElement>('[data-story-dna-autofill]');
    if (autofillBtn) {
      autofillBtn.disabled = false;
    }
    const statusEl = this.host.querySelector<HTMLElement>('[data-story-dna-status]');
    if (statusEl) {
      statusEl.textContent = error;
      statusEl.hidden = false;
    }
  }

  setSceneHubContext(ctx: DossierSceneHubContext | null): void {
    this.sceneHubContext = ctx;
  }

  constructor(
    mount: HTMLElement,
    private closeCallback: () => void = () => {},
    private update: (entity: ReaderDossier['entity'], patch: { suppressed?: boolean; pinned?: boolean; note?: string; factEdits?: Record<string, string | null> }) => boolean = () => false,
    private documentState: (open: boolean) => void = () => {}
  ) {
    this.host.dataset.vnDossier = '';
    this.host.hidden = true;
    this.host.addEventListener('click', event => {
      event.stopPropagation();
      if (event.target === this.host) this.close();
    });
    this.host.addEventListener('pointerdown', event => event.stopPropagation());
    this.host.addEventListener('wheel', event => event.stopPropagation());
    this.host.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
      if (event.key === 'Tab' && !this.host.dataset.vnWorkspaceTool) {
        const focusable = [...this.host.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,[tabindex]')].filter(
          e => e.getClientRects().length > 0 &&
               (!e.closest('details:not([open])') || e.tagName === 'SUMMARY') &&
               (e.tabIndex >= 0 || e.tagName === 'SUMMARY') &&
               !e.hasAttribute('disabled')
        );
        const current = (typeof this.host.getRootNode === 'function' ? this.host.getRootNode() : this.host.ownerDocument) as ShadowRoot | Document;
        const activeEl = (current as ShadowRoot).activeElement || document.activeElement;
        const index = focusable.indexOf(activeEl as HTMLElement);
        if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === focusable.length - 1)) {
          event.preventDefault();
          (event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
        }
      }
    });
    mount.append(this.host);
  }

  resetForContext(): void {
    this.query = '';
    this.category = 'all';
    this.scope = 'all';
    this.selectedEntityId = null;
    this.trayReturn = null;
  }

  clearBack(): void {
    this.trayReturn = null;
  }

  setDocked(): void {
    this.host.dataset.vnWorkspaceTool = 'story';
  }

  back(): boolean {
    const documentBack = this.host.querySelector<HTMLButtonElement>('[data-vn-document-reader] button[aria-label="Back to item"]');
    if (documentBack) {
      documentBack.click();
      return true;
    }
    if (!this.host.querySelector('[data-vn-reference-sheet]') && this.trayReturn) {
      this.trayReturn();
      return true;
    }
    return false;
  }

  isOpen(): boolean {
    return !this.host.hidden;
  }

  open(
    dossier: ReaderDossier,
    prefs: TooltipPreferences,
    chatId: string,
    trigger: HTMLElement,
    actions?: {
      drafts: InteractionDraft[];
      current: () => string;
      apply: (draft: InteractionDraft, mode: DraftMergeMode) => boolean;
      focus: () => void;
    },
    storyDocument?: StoryDocument,
    visual?: DossierVisualContext
  ): void {
    const kind = dossier.entity.kind;
    if (kind === 'npc' && this.folioOpener) {
      if (!this.host.dataset.vnWorkspaceTool) this.close();
      this.folioOpener(dossier.entity.name);
      return;
    }
    this.documentState(false);
    this.returnFocus = trigger;
    this.activeDossierContext = { dossier, prefs, chatId, trigger, actions, storyDocument, visual };
    this.host.replaceChildren();
    const panel = document.createElement('section');
    panel.dataset.vnDossierCard = '';
    panel.dataset.dossierKind = kind;
    panel.setAttribute('role', 'dialog');
    if (!this.host.dataset.vnWorkspaceTool) panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', `About ${dossier.entity.name}`);

    const header = document.createElement('header');
    header.className = 'dossier-topbar-header';
    header.style.cssText = 'position:sticky;top:0;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--vn-shell-panel, rgba(15,23,42,0.96));border-bottom:1px solid var(--vn-shell-border, rgba(255,255,255,0.12));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'workspace-back-btn dossier-back-btn has-label';
    back.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;border-radius:8px;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.22));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);flex:none;white-space:nowrap;width:auto !important;min-width:auto !important;height:44px;';
    back.innerHTML = APERTURE_ICONS.back + (this.trayReturn ? '<span>Back to Lens</span>' : '<span>Back to Reading</span>');
    back.title = this.trayReturn ? 'Back to references' : 'Back to reading';
    back.setAttribute('aria-label', this.trayReturn ? 'Back to references' : 'Back to reading');
    back.onclick = () => {
      if (this.trayReturn) {
        this.trayReturn();
      } else {
        this.close();
      }
    };

    const title = document.createElement('h2');
    title.style.cssText = 'flex:1;margin:0 8px;font-size:15px;font-weight:700;color:var(--vn-shell-text, #f1f5f9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;';
    title.textContent = kind === 'npc' ? `Character folio · ${dossier.entity.name}` : dossier.entity.name;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dossier-close-btn';
    close.style.cssText = 'min-width:44px;min-height:44px;width:44px;height:44px;border-radius:50%;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.18));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);cursor:pointer;display:grid;place-items:center;font-size:16px;line-height:1;flex:none;';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close information');
    close.onclick = () => this.close();

    header.append(back, title, close);
    panel.append(header);

    const override = entityOverride(prefs, chatId, dossier.entity);
    let currentPinned = override?.pinned === true;

    // APERTURE v4 Folio Hero Card (Screen 5 Character Folio or Location/Item showcase)
    const heroCard = document.createElement('div');
    heroCard.className = 'folio-hero-card';
    heroCard.dataset.dossierHero = kind;

    const figure = document.createElement('figure');
    figure.dataset.dossierMedia = kind;
    if (visual?.imageUrl) {
      figure.dataset.hasImage = 'true';
      const img = document.createElement('img');
      img.src = visual.imageUrl;
      img.alt = visual.imageCaption ?? dossier.entity.name;
      img.loading = 'eager';
      figure.append(img);
      if (visual.imageCaption) {
        const cap = document.createElement('figcaption');
        cap.textContent = visual.imageCaption;
        figure.append(cap);
      }
      figure.title = 'Click to toggle full artwork view';
      figure.onclick = () => {
        figure.dataset.expanded = figure.dataset.expanded === 'true' ? 'false' : 'true';
      };
    } else {
      figure.dataset.hasImage = 'false';
      figure.innerHTML = fallbackSvgForKind(kind, dossier.entity.name);
    }
    heroCard.append(figure);

    const folioLabel = document.createElement('div');
    folioLabel.className = 'folio-hero-label';
    folioLabel.textContent = dossier.entity.name;
    heroCard.append(folioLabel);

    const folioSub = document.createElement('div');
    folioSub.className = 'folio-hero-sub';
    const subLocation = visual?.locationName ? visual.locationName.toUpperCase() : (visual?.isPresent ? 'PRESENT IN SCENE' : 'KNOWN IN STORY');
    const subAlias = (dossier.entity.aliases[0] ?? (kind === 'npc' ? 'CHARACTER' : kind === 'place' ? 'LOCATION' : 'ITEM')).toUpperCase();
    folioSub.textContent = `${subAlias} · ${subLocation}`;
    heroCard.append(folioSub);

    panel.append(heroCard);

    // Meta Tags Bar (.folio-meta)
    const folioMeta = document.createElement('div');
    folioMeta.className = 'folio-meta';
    folioMeta.dataset.dossierIdentity = '';

    const kindSmall = document.createElement('small');
    kindSmall.dataset.referenceKind = '';
    kindSmall.textContent = `${kind === 'npc' ? 'Character' : kind === 'place' ? 'Location' : 'Item'} · Established story information`;
    kindSmall.style.display = 'none';
    folioMeta.append(kindSmall);

    const tagPresent = document.createElement('span');
    tagPresent.className = 'tag night';
    tagPresent.textContent = kind === 'place'
      ? (visual?.isActiveLocation ? '📍 Current scene location' : '🗺️ Known location')
      : (visual?.isPresent ? 'SEEN IN SCENE' : 'MENTIONED IN STORY');
    folioMeta.append(tagPresent);

    if (dossier.entity.aliases.length) {
      const aliasesDiv = document.createElement('div');
      aliasesDiv.dataset.dossierAliases = '';
      aliasesDiv.textContent = `Also known as: ${dossier.entity.aliases.join(', ')}`;
      aliasesDiv.style.display = 'none';
      folioMeta.append(aliasesDiv);

      for (const alias of dossier.entity.aliases.slice(0, 3)) {
        const aliasTag = document.createElement('span');
        aliasTag.className = 'tag night';
        aliasTag.textContent = alias.toUpperCase();
        folioMeta.append(aliasTag);
      }
    }

    if (currentPinned) {
      const pinTag = document.createElement('span');
      pinTag.className = 'tag night';
      pinTag.textContent = '📌 PINNED';
      folioMeta.append(pinTag);
    }

    if (visual?.anchors && visual.anchors.length > 0) {
      for (const anchor of visual.anchors) {
        const anchorTag = document.createElement('span');
        anchorTag.className = 'tag anchor-tag';
        anchorTag.textContent = `⚓ ${anchor}`;
        anchorTag.title = 'Visual consistency anchor trait';
        folioMeta.append(anchorTag);
      }
    }

    const legacyBadges = document.createElement('div');
    legacyBadges.dataset.dossierBadges = '';
    legacyBadges.style.display = 'none';
    const addLegacyBadge = (lbl: string, tone: string) => {
      const b = document.createElement('span');
      b.dataset.dossierBadge = tone;
      b.textContent = lbl;
      legacyBadges.append(b);
    };
    if (kind === 'place') addLegacyBadge(visual?.isActiveLocation ? '📍 Current scene location' : '🗺️ Known location', visual?.isActiveLocation ? 'active' : 'muted');
    else if (kind === 'npc') addLegacyBadge(visual?.isPresent ? '● Present in scene' : '○ Mentioned in story', visual?.isPresent ? 'active' : 'muted');
    else addLegacyBadge(visual?.isPresent ? '✦ In current scene' : '✦ Story item', visual?.isPresent ? 'active' : 'muted');
    if (currentPinned) addLegacyBadge('📌 Pinned', 'pinned');
    folioMeta.append(legacyBadges);

    panel.append(folioMeta);

    // Read-First Dossier: Document CTA right below Hero/Meta when an actual StoryDocument matches
    if (storyDocument) {
      const read = document.createElement('button');
      read.type = 'button';
      read.textContent = storyDocument.sections.length
        ? '📄 Read revealed text & view closeup →'
        : '📄 Inspect document & view closeup →';
      read.dataset.vnReadDocument = '';
      read.onclick = () => {
        if (this.host.hidden || panel.parentElement !== this.host) return;
        this.openDocument(
          storyDocument,
          () => {
            this.open(dossier, prefs, chatId, trigger, actions, storyDocument, visual);
            this.host.querySelector<HTMLElement>('[data-vn-read-document]')?.focus();
          },
          trigger,
        );
      };
      panel.append(read);
    }

    // Facts extraction
    const facts = dossier.facts.filter(f => f.value.trim() && prefs.fieldGroups[referenceFieldInfo(f.field).section] !== false);
    const earlier = prefs.rememberReferences ? (dossier.earlier ?? []).filter(e => prefs.fieldGroups[referenceFieldInfo(e.reference.field).section] !== false) : [];
    const lasting = facts.filter(f => !referenceFieldInfo(f.field).living);
    const overview = lasting.filter(f => ['overview', 'identity'].includes(referenceFieldInfo(f.field).section)).slice(0, 2);
    if (!overview.length && lasting.length) overview.push(lasting[0]!);

    const maxFactChars = Math.max(80, Math.min(1200, prefs.maxFactChars ?? 320));

    let quoteCalloutEl: HTMLElement | null = null;
    let obsGridEl: HTMLElement | null = null;
    const overviewPairs = new Set(overview.map(f => `${f.field}::${f.value.trim()}`));
    const current = new Map<string, string>();
    for (const fact of facts) {
      if (referenceFieldInfo(fact.field).living && !overviewPairs.has(`${fact.field}::${fact.value.trim()}`)) {
        current.set(fact.field, fact.value);
      }
    }
    const observations = facts.filter(f => referenceFieldInfo(f.field).living && dossier.state[f.field]?.trim() && dossier.state[f.field] !== f.value);
    for (const [field, value] of Object.entries(dossier.state)) {
      if (value.trim() && !overviewPairs.has(`${field}::${value.trim()}`) && prefs.fieldGroups.state !== false && prefs.fieldGroups[referenceFieldInfo(field).section] !== false) {
        current.set(field, value);
      }
    }

    const renderObsGrid = () => {
      if (!obsGridEl) return;
      obsGridEl.replaceChildren();
      const liveFacts = dossier.facts.filter(f => f.value.trim() && prefs.fieldGroups[referenceFieldInfo(f.field).section] !== false);
      const liveState = Object.entries(dossier.state)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => ({ field: k, value: v, source: { provider: 'state' } as any }));
      const seenObs = new Set<string>();
      const combined = [...liveFacts, ...liveState].filter((item) => {
        const key = `${item.field}::${item.value.trim().toLowerCase()}`;
        if (seenObs.has(key)) return false;
        seenObs.add(key);
        return true;
      });
      if (!combined.length) {
        obsGridEl.hidden = true;
        return;
      }
      obsGridEl.hidden = false;
      for (const item of combined.slice(0, 8)) {
        const cell = document.createElement('div');
        cell.className = 'observation-cell';
        if (item.value.length > 55) cell.classList.add('observation-cell-wide');
        const label = document.createElement('span');
        label.textContent = referenceFieldInfo(item.field).label;
        const strong = document.createElement('strong');
        strong.textContent = `${item.value} `;
        const em = document.createElement('em');
        const isTold = item.source?.provider === 'state' || item.source?.provider === 'user' || ['spoken', 'rumor', 'secret', 'publicHistory', 'statedGoals'].includes(item.field);
        em.textContent = isTold ? 'TOLD' : 'SEEN';
        strong.append(em);
        cell.append(label, strong);
        obsGridEl.append(cell);
      }
    };

    const syncOverviewAndGrid = () => {
      if (quoteCalloutEl) {
        const firstLive = dossier.facts.find(f => f.value.trim() && ['overview', 'identity'].includes(referenceFieldInfo(f.field).section))
          ?? dossier.facts.find(f => f.value.trim());
        if (firstLive?.value.trim()) {
          quoteCalloutEl.textContent = `“${firstLive.value.replace(/^["“]|["”]$/g, '').trim()}”`;
          quoteCalloutEl.hidden = false;
        } else {
          quoteCalloutEl.textContent = '';
          quoteCalloutEl.hidden = true;
        }
      }
      renderObsGrid();
    };

    const appendFact = (list: HTMLElement, field: string, value: string) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = referenceFieldInfo(field).label;

      const contentSpan = document.createElement('span');
      contentSpan.className = 'fact-value-text';

      const renderText = (currentVal: string) => {
        contentSpan.textContent = '';
        if (currentVal.length > maxFactChars) {
          const span = document.createElement('span');
          const toggle = document.createElement('button');
          let expanded = false;
          span.textContent = `${currentVal.slice(0, maxFactChars).trimEnd()}… `;
          toggle.type = 'button';
          toggle.dataset.factExpand = '';
          toggle.textContent = 'Show full';
          toggle.onclick = () => {
            expanded = !expanded;
            span.textContent = expanded ? `${currentVal} ` : `${currentVal.slice(0, maxFactChars).trimEnd()}… `;
            toggle.textContent = expanded ? 'Show less' : 'Show full';
          };
          contentSpan.append(span, toggle);
        } else {
          contentSpan.textContent = currentVal;
        }
      };

      let activeVal = value;
      renderText(activeVal);
      dd.append(contentSpan);

      // Fact Action buttons (Edit & Delete) with accessible touch targets
      const actionSpan = document.createElement('span');
      actionSpan.className = 'fact-actions';
      actionSpan.style.cssText = 'margin-left:8px;display:inline-flex;gap:4px;vertical-align:middle;';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.title = 'Edit reference fact';
      editBtn.className = 'fact-edit-btn';
      editBtn.textContent = '✏️';
      editBtn.style.cssText = 'width:44px;height:44px;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:8px;cursor:pointer;font-size:13px;opacity:0.84;padding:0;margin:0;';
      editBtn.onmouseenter = () => { editBtn.style.opacity = '1'; };
      editBtn.onmouseleave = () => { editBtn.style.opacity = '0.84'; };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.title = 'Delete reference fact';
      delBtn.className = 'fact-del-btn';
      delBtn.textContent = '🗑️';
      delBtn.style.cssText = 'width:44px;height:44px;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:8px;cursor:pointer;font-size:13px;opacity:0.84;padding:0;margin:0;';
      delBtn.onmouseenter = () => { delBtn.style.opacity = '1'; };
      delBtn.onmouseleave = () => { delBtn.style.opacity = '0.84'; };

      editBtn.onclick = () => {
        if (dd.querySelector('.fact-edit-input')) return;
        contentSpan.style.display = 'none';
        actionSpan.style.display = 'none';

        const editWrap = document.createElement('div');
        editWrap.className = 'fact-edit-input';
        editWrap.style.cssText = 'display:flex;gap:6px;margin-top:6px;align-items:center;';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = activeVal;
        input.style.cssText = 'flex:1;min-height:44px;font-size:13px;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);background:rgba(0,0,0,0.3);color:inherit;';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = '✓';
        saveBtn.title = 'Save';
        saveBtn.style.cssText = 'min-width:44px;min-height:44px;padding:4px 10px;font-size:13px;border-radius:6px;cursor:pointer;background:rgba(255,255,255,0.15);border:none;color:inherit;margin:0;';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = '✕';
        cancelBtn.title = 'Cancel';
        cancelBtn.style.cssText = 'min-width:44px;min-height:44px;padding:4px 10px;font-size:13px;border-radius:6px;cursor:pointer;background:transparent;border:none;color:inherit;opacity:0.7;margin:0;';

        saveBtn.onclick = () => {
          const newVal = input.value.trim();
          if (newVal) {
            activeVal = newVal;
            const match = dossier.facts.find(f => f.field === field);
            if (match) match.value = newVal;
            if (dossier.state && field in dossier.state) dossier.state[field] = newVal;
            this.update(dossier.entity, { factEdits: { [field]: newVal } });
            syncOverviewAndGrid();
          }
          renderText(activeVal);
          editWrap.remove();
          contentSpan.style.display = '';
          actionSpan.style.display = 'inline-flex';
        };

        cancelBtn.onclick = () => {
          editWrap.remove();
          contentSpan.style.display = '';
          actionSpan.style.display = 'inline-flex';
        };

        input.onkeydown = (e) => {
          if (e.key === 'Enter') saveBtn.click();
          if (e.key === 'Escape') cancelBtn.click();
        };

        editWrap.append(input, saveBtn, cancelBtn);
        dd.append(editWrap);
        input.focus();
      };

      delBtn.onclick = () => {
        dt.remove();
        dd.remove();
        const idx = dossier.facts.findIndex(f => f.field === field);
        if (idx >= 0) dossier.facts.splice(idx, 1);
        if (dossier.state && field in dossier.state) delete dossier.state[field];
        this.update(dossier.entity, { factEdits: { [field]: null } });
        syncOverviewAndGrid();
      };

      actionSpan.append(editBtn, delBtn);
      dd.append(actionSpan);
      list.append(dt, dd);
    };

    // APERTURE Quote Callout
    if (overview.length && overview[0]?.value) {
      quoteCalloutEl = document.createElement('blockquote');
      quoteCalloutEl.className = 'folio-quote-callout';
      const cleanVal = overview[0].value.replace(/^["“]|["”]$/g, '').trim();
      quoteCalloutEl.textContent = `“${cleanVal}”`;
      panel.append(quoteCalloutEl);

      const section = document.createElement('section');
      const list = document.createElement('dl');
      section.dataset.referenceOverview = '';
      for (const fact of overview) appendFact(list, fact.field, fact.value);
      section.append(list);
      panel.append(section);
    }

    // For Location sheets: Present characters (preserves World Lens history in ReaderWorkspace)
    if (kind === 'place' && visual?.presentCharacters?.length && (visual.onSelectEntity || this.folioOpener)) {
      const castSection = document.createElement('section');
      castSection.dataset.dossierPresentCast = '';
      const castHeading = document.createElement('h3');
      castHeading.textContent = 'Characters at this location';
      const castRow = document.createElement('div');
      castRow.dataset.dossierCastChips = '';
      for (const char of visual.presentCharacters) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.dossierCastChip = '';
        chip.textContent = `👤 ${char.name}`;
        chip.onclick = () => {
          if (this.folioOpener) {
            this.folioOpener(char.name);
            return;
          }
          const prevReturn = this.trayReturn;
          this.trayReturn = () => {
            this.trayReturn = prevReturn;
            this.open(dossier, prefs, chatId, trigger, actions, storyDocument, visual);
          };
          visual.onSelectEntity!(char.id, trigger);
        };
        castRow.append(chip);
      }
      castSection.append(castHeading, castRow);
      panel.append(castSection);
    }

    // APERTURE v4 2-Column Verified Observations Grid (.observations-grid)
    const allObservations = [...facts, ...[...current.entries()].map(([k, v]) => ({ field: k, value: v, source: { provider: 'state' } as any }))];
    if (allObservations.length) {
      const obsHead = document.createElement('div');
      obsHead.style.cssText = 'margin:18px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;display:flex;align-items:center;justify-content:space-between;';
      obsHead.innerHTML = '<span>Verified observations</span><span style="font-size:9px;opacity:0.65;">ESTABLISHED FACTS</span>';
      panel.append(obsHead);

      obsGridEl = document.createElement('div');
      obsGridEl.className = 'observations-grid';
      renderObsGrid();
      panel.append(obsGridEl);
    }

    if (current.size) {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      const list = document.createElement('dl');
      section.dataset.referenceCurrent = '';
      heading.textContent = observations.length ? 'Tracked scene state' : 'Current state';
      for (const [field, value] of current) appendFact(list, field, value);
      section.append(heading, list);
      panel.append(section);
    }

    if (observations.length) {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      const list = document.createElement('dl');
      section.dataset.referenceObservations = '';
      heading.textContent = 'Story observations';
      for (const fact of observations) {
        appendFact(list, fact.field, fact.value);
        const label = list.lastElementChild?.previousElementSibling;
        if (label && fact.revealedAt) label.textContent += ` · paragraph ${fact.revealedAt.paragraphIndex + 1}`;
      }
      section.append(heading, list);
      panel.append(section);
    }

    for (const group of REFERENCE_FIELD_GROUPS) {
      const grouped = lasting.filter(f => referenceFieldInfo(f.field).section === group.id && !overview.includes(f) && current.get(f.field)?.trim() !== f.value.trim());
      if (!grouped.length) continue;
      const section = document.createElement('details');
      const summary = document.createElement('summary');
      const list = document.createElement('dl');
      section.dataset.referenceSection = group.id;
      summary.textContent = group.label;
      for (const fact of grouped) appendFact(list, fact.field, fact.value);
      section.append(summary, list);
      panel.append(section);
    }

    if (earlier.length) {
      const section = document.createElement('details');
      const summary = document.createElement('summary');
      const help = document.createElement('p');
      section.dataset.referenceEarlier = '';
      summary.textContent = `Earlier in this story · ${earlier.length}`;
      help.textContent = 'Descriptions from earlier verified replies. Current scene state is shown separately.';
      section.append(summary, help);
      section.open = !facts.length && !current.size;
      for (const entry of earlier) {
        const list = document.createElement('dl');
        appendFact(list, entry.reference.field, entry.reference.value);
        const source = document.createElement('details');
        const label = document.createElement('summary');
        const quote = document.createElement('blockquote');
        label.textContent = `Reply ${entry.replyNumber} · paragraph ${entry.reference.paragraphIndex + 1}`;
        quote.textContent = entry.reference.evidence;
        source.dataset.earlierSource = '';
        source.append(label, quote);
        section.append(list, source);
      }
      panel.append(section);
    }

    if (!facts.length && !current.size && !earlier.length) {
      const p = document.createElement('p');
      p.dataset.referenceEmpty = '';
      p.textContent = 'No additional story details recorded yet.';
      panel.append(p);
    }

    if (facts.length) {
      const sources = document.createElement('details');
      const summary = document.createElement('summary');
      const list = document.createElement('ul');
      sources.dataset.referenceSources = '';
      summary.textContent = 'Sources';
      for (const fact of facts) {
        const item = document.createElement('li');
        item.textContent = `${referenceFieldInfo(fact.field).label} · ${fact.source.provider}${fact.revealedAt ? ` · revealed paragraph ${fact.revealedAt.paragraphIndex + 1}` : ''}`;
        list.append(item);
      }
      sources.append(summary, list);
      panel.append(sources);
    }

    if (actions?.drafts.length) {
      panel.append(new InteractionTray(actions.drafts, actions.current, (draft, mode) => {
        if (!actions.apply(draft, mode)) return false;
        this.close();
        actions.focus();
        return true;
      }).host);
    }

    // Read-First: Visual DNA & Place Art Studio collapsed by default below narrative details
    if (kind === 'place' || kind === 'object') {
      const studioDrawer = document.createElement('details');
      studioDrawer.className = 'story-dna-drawer';
      studioDrawer.dataset.storyDnaDrawer = kind;
      if (this.storyDnaError) studioDrawer.open = true;
      const summary = document.createElement('summary');
      summary.textContent = kind === 'place' ? '🎨 Art & Scenery DNA Studio' : '🎨 Art & Item DNA Studio';
      studioDrawer.append(summary, this.buildStoryDnaStudio(kind, dossier));
      panel.append(studioDrawer);
    }

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.hidden = true;
    panel.append(status);

    const commit = (patch: { suppressed?: boolean; pinned?: boolean; note?: string }, closeOnSuccess = false): boolean => {
      if (this.update(dossier.entity, patch)) {
        if (closeOnSuccess) this.close();
        return true;
      }
      status.textContent = 'Reference customization limit reached (64). Reset local reference customizations in Reading settings to make room.';
      status.hidden = false;
      return false;
    };

    const localActions = document.createElement('div');
    const pin = document.createElement('button');
    const suppress = document.createElement('button');
    localActions.dataset.referenceActions = '';
    pin.type = suppress.type = 'button';
    pin.textContent = currentPinned ? 'Unpin' : 'Pin reference';
    pin.setAttribute('aria-pressed', String(currentPinned));
    pin.onclick = () => {
      const next = !currentPinned;
      if (commit({ pinned: next })) {
        currentPinned = next;
        pin.textContent = currentPinned ? 'Unpin' : 'Pin reference';
        pin.setAttribute('aria-pressed', String(currentPinned));
        status.textContent = currentPinned ? 'Reference pinned to top of World Lens.' : 'Reference unpinned.';
        status.hidden = false;
      }
    };
    suppress.textContent = 'Hide from World Lens';
    suppress.onclick = () => {
      commit({ suppressed: true }, true);
    };
    localActions.append(pin, suppress);
    panel.append(localActions);

    const notes = document.createElement('details');
    const noteSummary = document.createElement('summary');
    notes.dataset.referenceNotes = '';
    noteSummary.textContent = 'Local display note';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = 'Your note (does not change the story)';
    const input = document.createElement('textarea');
    input.maxLength = 600;
    input.value = override?.note ?? '';
    noteLabel.append(input);
    const noteDisplay = document.createElement('p');
    noteDisplay.dataset.referenceSavedNote = '';
    noteDisplay.hidden = !override?.note;
    if (override?.note) noteDisplay.textContent = `Your note: ${override.note}`;
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save note';
    save.onclick = () => {
      if (commit({ note: input.value })) {
        const trimmed = input.value.trim();
        noteDisplay.hidden = !trimmed;
        noteDisplay.textContent = trimmed ? `Your note: ${input.value}` : '';
        status.textContent = trimmed ? 'Local note saved.' : 'Local note cleared.';
        status.hidden = false;
      }
    };
    notes.append(noteSummary, noteLabel, save);
    panel.append(notes, noteDisplay);

    this.host.append(panel);
    this.host.hidden = false;
    if (this.host.dataset.vnWorkspaceTool) {
      title.tabIndex = -1;
      title.focus();
    } else {
      close.focus();
    }
  }

  openTray(
    entries: ReturnType<typeof referenceEntries>,
    trigger: HTMLElement,
    open: (id: string, trigger: HTMLElement) => void,
    note?: string,
    visualResolver?: (entity: ReaderDossier['entity']) => DossierVisualContext
  ): void {
    this.documentState(false);
    this.activeDossierContext = null;
    if (!this.isOpen()) {
      this.query = '';
      this.category = 'all';
      this.scope = 'all';
      this.selectedEntityId = null;
      this.hubView = 'scene';
      this.perspectiveFilter = 'all';
      this.perspectivesOpen = false;
      this.linkMode = false;
      this.linkSourceId = null;
    }
    this.returnFocus = trigger;
    this.trayReturn = () => this.openTray(entries, trigger, open, note, visualResolver);
    this.host.replaceChildren();

    const panel = document.createElement('section');
    panel.dataset.vnDossierCard = '';
    panel.dataset.vnReferenceSheet = '';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'World Lens');

    // Header with APERTURE Back button, Title and Close
    const header = document.createElement('header');
    header.className = 'dossier-topbar-header';
    header.style.cssText = 'position:sticky;top:0;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--vn-shell-panel, rgba(15,23,42,0.96));border-bottom:1px solid var(--vn-shell-border, rgba(255,255,255,0.12));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'workspace-back-btn dossier-back-btn has-label';
    backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;border-radius:8px;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.22));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);flex:none;white-space:nowrap;width:auto !important;min-width:auto !important;height:44px;';
    backBtn.innerHTML = APERTURE_ICONS.back + '<span>Back to Reading</span>';
    backBtn.title = 'Back to reading';
    backBtn.setAttribute('aria-label', 'Back to reading');
    backBtn.onclick = () => this.close();

    const title = document.createElement('h2');
    title.style.cssText = 'flex:1;margin:0 8px;font-size:15px;font-weight:700;color:var(--vn-shell-text, #f1f5f9);letter-spacing:-0.01em;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    title.textContent = 'World Lens';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dossier-close-btn';
    close.style.cssText = 'min-width:44px;min-height:44px;width:44px;height:44px;border-radius:50%;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.18));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);cursor:pointer;display:grid;place-items:center;font-size:16px;line-height:1;flex:none;';
    close.textContent = '×';
    close.title = 'Close references';
    close.setAttribute('aria-label', 'Close information');
    close.onclick = () => this.close();
    header.append(backBtn, title, close);
    panel.append(header);

    const titleBlock = document.createElement('div');
    titleBlock.className = 'dossier-page-title-block';
    titleBlock.style.cssText = 'margin:2px 0 6px;display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;';
    const pageTitle = document.createElement('h1');
    pageTitle.className = 'page-title';
    pageTitle.style.cssText = 'margin:0;font-size:20px;font-family:Georgia,serif;letter-spacing:-0.02em;line-height:1.15;';
    pageTitle.textContent = 'World Lens';
    const pageSub = document.createElement('div');
    pageSub.className = 'page-sub';
    pageSub.style.cssText = 'font-size:11px;opacity:0.75;';
    pageSub.textContent = 'Places, items, documents & story threads.';
    titleBlock.append(pageTitle, pageSub);
    panel.append(titleBlock);

    // Filter Chips (.chip-row) — compact single scrollable bar
    const tabs = document.createElement('div');
    tabs.dataset.referenceCategories = '';
    tabs.className = 'chip-row';
    tabs.setAttribute('aria-label', 'Story categories');

    const filters = document.createElement('div');
    filters.dataset.referenceFilters = '';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'input-wrap';
    inputWrap.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m12.5 12.5 4.5 4.5"/></svg>';

    const search = document.createElement('input');
    search.type = 'search';
    search.maxLength = 160;
    search.placeholder = 'Find reference…';
    search.setAttribute('aria-label', 'Search references');
    search.value = this.query;
    inputWrap.append(search);

    const category = document.createElement('select');
    category.setAttribute('aria-label', 'Reference category');
    category.style.display = 'none';

    for (const [value, label] of [['all', 'All'], ['place', 'Places'], ['object', 'Items'], ['document', '📄 Documents']]) {
      const option = document.createElement('option');
      option.value = value!;
      option.textContent = label!;
      category.append(option);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = label!;
      button.dataset.referenceCategory = value!;
      button.setAttribute('aria-pressed', value === this.category ? 'true' : 'false');
      button.onclick = () => {
        category.value = value!;
        for (const child of tabs.querySelectorAll<HTMLButtonElement>('[data-reference-category]')) {
          child.setAttribute('aria-pressed', child.dataset.referenceCategory === value ? 'true' : 'false');
        }
        render();
      };
      tabs.append(button);
    }
    const folioBtn = document.createElement('button');
    folioBtn.type = 'button';
    folioBtn.className = 'chip folio-shortcut-chip';
    folioBtn.style.cssText = 'background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 14%,var(--vn-shell-button,transparent));color:var(--vn-shell-accent,#d8b4fe);border:1px solid color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 38%,transparent);';
    folioBtn.innerHTML = '👤 Folio';
    folioBtn.title = 'Open Character Folio for character DNA, portraits and lore';
    folioBtn.onclick = () => {
      this.folioOpener?.('');
    };
    tabs.append(folioBtn);

    const addRefBtn = document.createElement('button');
    addRefBtn.type = 'button';
    addRefBtn.className = 'chip add-ref-chip';
    addRefBtn.style.cssText = 'background:color-mix(in srgb,var(--vn-shell-accent,#38bdf8) 18%,var(--vn-shell-field,transparent));color:var(--vn-shell-accent,#38bdf8);border:1px solid color-mix(in srgb,var(--vn-shell-accent,#38bdf8) 42%,transparent);margin-left:auto;';
    addRefBtn.textContent = '＋ Add';
    addRefBtn.title = 'Manually add a location or item to the story world';
    tabs.append(addRefBtn);

    category.value = this.category;
    filters.append(inputWrap, category);

    const scope = document.createElement('select');
    scope.setAttribute('aria-label', 'Reference scope');
    scope.dataset.referenceScope = '';
    for (const [value, label] of [['all', 'Reply & earlier'], ['reply', 'This reply']]) {
      const option = document.createElement('option');
      option.value = value!;
      option.textContent = label!;
      scope.append(option);
    }
    scope.value = this.scope;
    scope.hidden = !entries.some(e => e.entity.id.startsWith('earlier:'));
    filters.append(scope);

    panel.append(tabs, filters);

    if (note) {
      const hint = document.createElement('small');
      hint.dataset.referenceHistoryNote = '';
      hint.textContent = note;
      panel.append(hint);
    }

    const addRefPanel = document.createElement('div');
    addRefPanel.className = 'add-ref-panel';
    addRefPanel.style.cssText = 'display:none;margin:8px 0 12px;padding:12px;border-radius:var(--vn-shell-radius,10px);background:var(--vn-shell-field,rgba(0,0,0,0.35));border:1px solid var(--vn-shell-border-strong,var(--vn-shell-border,rgba(56,189,248,0.35)));';
    addRefPanel.style.display = 'none';
    addRefPanel.innerHTML = '<div style="font-weight:700;font-size:12px;margin-bottom:8px;color:var(--vn-shell-accent,#38bdf8);">＋ Add Story Reference / Artifact</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<input data-add-ref-name type="text" placeholder="Name (e.g. Carved Yew Staff, Flat 3)" style="min-height:44px;padding:6px 8px;font-size:12px;border-radius:var(--vn-shell-radius,6px);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.15));background:var(--vn-shell-panel,rgba(0,0,0,0.25));color:inherit;" />' +
      '<select data-add-ref-kind style="min-height:44px;padding:6px 8px;font-size:12px;border-radius:var(--vn-shell-radius,6px);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.15));background:var(--vn-shell-panel,rgba(0,0,0,0.25));color:inherit;">' +
      '<option value="object">💎 Item / Unique Artifact</option>' +
      '<option value="place">📍 Location / Place</option>' +
      '</select></div>' +
      '<textarea data-add-ref-desc placeholder="Physical description, materials, visual traits (e.g. carved yew staff encrusted in diamonds wrapped in vines)..." style="width:100%;height:60px;box-sizing:border-box;padding:6px 8px;font-size:12px;border-radius:var(--vn-shell-radius,6px);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.15));background:var(--vn-shell-panel,rgba(0,0,0,0.25));color:inherit;margin-bottom:8px;"></textarea>' +
      '<p data-add-ref-error hidden role="alert" style="margin:0 0 8px;font-size:11px;color:#fca5a5;"></p>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
      '<button type="button" data-add-ref-cancel style="min-height:44px;padding:6px 12px;font-size:12px;border-radius:var(--vn-shell-radius,6px);background:transparent;border:1px solid var(--vn-shell-border,rgba(255,255,255,0.2));color:inherit;cursor:pointer;">Cancel</button>' +
      '<button type="button" data-add-ref-save style="min-height:44px;padding:6px 14px;font-size:12px;font-weight:700;border-radius:var(--vn-shell-radius,6px);background:var(--vn-shell-accent,#38bdf8);border:none;color:var(--vn-shell-accent-contrast,#041624);cursor:pointer;">Save Reference</button>' +
      '</div>';
    panel.append(addRefPanel);

    const addErrEl = addRefPanel.querySelector<HTMLElement>('[data-add-ref-error]')!;
    addRefBtn.onclick = () => {
      addErrEl.hidden = true;
      addRefPanel.style.display = addRefPanel.style.display === 'none' ? 'block' : 'none';
      if (addRefPanel.style.display === 'block') {
        addRefPanel.querySelector<HTMLInputElement>('[data-add-ref-name]')?.focus();
      }
    };
    addRefPanel.querySelector('[data-add-ref-cancel]')!.addEventListener('click', () => {
      addErrEl.hidden = true;
      addRefPanel.style.display = 'none';
    });
    addRefPanel.querySelector('[data-add-ref-save]')!.addEventListener('click', () => {
      const nameInput = addRefPanel.querySelector<HTMLInputElement>('[data-add-ref-name]')!;
      const kindSelect = addRefPanel.querySelector<HTMLSelectElement>('[data-add-ref-kind]')!;
      const descInput = addRefPanel.querySelector<HTMLTextAreaElement>('[data-add-ref-desc]')!;
      const name = nameInput.value.trim();
      const kind = kindSelect.value as 'place' | 'object';
      const desc = descInput.value.trim();
      if (!name || !desc) {
        addErrEl.textContent = !name
          ? 'Enter a name for the location or item.'
          : 'Enter a brief visual or story description before saving.';
        addErrEl.hidden = false;
        return;
      }
      addErrEl.hidden = true;
      const slug = kind === 'place' ? createLocationId(name) : createItemId(name);
      const canonicalId = kind === 'place' ? `dna:loc:${slug}` : `dna:item:${slug}`;
      const nowTs = Date.now();
      const newEntity: any = {
        id: canonicalId,
        name,
        kind,
        aliases: deriveShortAliases(name),
        firstParagraph: 0,
        facts: [{
          id: `f_custom_${nowTs}`,
          entityId: canonicalId,
          field: 'description',
          value: desc,
          visibility: 'observed',
          source: { provider: 'user', recordId: 'manual', observedAt: nowTs },
          revealedAt: { key: { chatId: 'manual' }, paragraphIndex: 0 },
        }],
      };
      const existingIdx = entries.findIndex((e) => e.entity.id === canonicalId || (e.entity.kind === kind && e.entity.name.toLowerCase() === name.toLowerCase()));
      if (existingIdx >= 0) entries.splice(existingIdx, 1);
      entries.unshift({
        entity: newEntity,
        current: true,
        pinned: true,
        label: desc,
      } as any);
      if (this.storyDnaRequester) {
        if (kind === 'place') {
          this.storyDnaRequester({
            action: 'save_location',
            location: {
              id: slug,
              name,
              aliases: deriveShortAliases(name),
              environmentDescription: desc.slice(0, 2000),
              persistentElements: [],
              connectedLocations: [],
              autoDiscovered: false,
              lastUpdated: nowTs,
            },
          });
        } else {
          this.storyDnaRequester({
            action: 'save_item',
            item: {
              id: slug,
              name,
              aliases: deriveShortAliases(name),
              description: desc.slice(0, 2000),
              distinctiveFeatures: [],
              colors: [],
              autoDiscovered: false,
              lastUpdated: nowTs,
            },
          });
        }
      }
      this.selectedEntityId = canonicalId;
      addRefPanel.style.display = 'none';
      nameInput.value = '';
      descInput.value = '';
      render();
    });

    // Dual-View World Lens Header (Current Scene Hub + Living Story Atlas)
    const hubToggleBar = document.createElement('div');
    hubToggleBar.className = 'world-hub-tabs';
    hubToggleBar.dataset.worldHeaderTabs = '';
    const sceneTabBtn = document.createElement('button');
    sceneTabBtn.type = 'button';
    sceneTabBtn.className = 'chip';
    sceneTabBtn.dataset.worldHubTab = 'scene';
    sceneTabBtn.textContent = '🏛️ Current Scene';
    const atlasTabBtn = document.createElement('button');
    atlasTabBtn.type = 'button';
    atlasTabBtn.className = 'chip';
    atlasTabBtn.dataset.worldHubTab = 'atlas';
    atlasTabBtn.textContent = '🗺️ Story Atlas & Threads';
    sceneTabBtn.onclick = () => { this.hubView = 'scene'; this.linkMode = false; this.linkSourceId = null; render(); };
    atlasTabBtn.onclick = () => { this.hubView = 'atlas'; render(); };
    hubToggleBar.append(sceneTabBtn, atlasTabBtn);
    panel.append(hubToggleBar);

    const worldSheet = document.createElement('div');
    worldSheet.className = 'world-sheet-map';
    panel.append(worldSheet);

    // Unified World Lens Preview Card right under the hub
    const lensSlot = document.createElement('div');
    lensSlot.className = 'world-lens-slot';
    panel.append(lensSlot);

    // Unified Directory List
    const sectionHead = document.createElement('div');
    sectionHead.style.cssText = 'font-size:10.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;margin:14px 0 6px;display:flex;justify-content:space-between;align-items:center;';
    const sectionHeadLabel = document.createElement('span');
    sectionHeadLabel.textContent = 'World Directory';
    const countBadge = document.createElement('span');
    countBadge.style.cssText = 'font-size:9px;opacity:0.65;font-weight:600;';
    sectionHead.append(sectionHeadLabel, countBadge);
    panel.append(sectionHead);

    const count = document.createElement('p');
    count.dataset.referenceCount = '';
    count.setAttribute('role', 'status');
    count.style.display = 'none';

    const list = document.createElement('div');
    list.dataset.referenceList = '';
    panel.append(count, list);

    const hiddenDrawerHost = document.createElement('div');
    panel.append(hiddenDrawerHost);

    const render = () => {
      for (const button of tabs.querySelectorAll<HTMLElement>('button[data-reference-category]')) {
        const isActive = button.dataset.referenceCategory === category.value;
        button.setAttribute('aria-pressed', String(isActive));
        if (isActive) button.classList.add('active');
        else button.classList.remove('active');
      }
      this.query = search.value;
      this.category = category.value as ReferenceKind | 'document';
      this.scope = scope.value;

      list.replaceChildren();
      hiddenDrawerHost.replaceChildren();

      sceneTabBtn.setAttribute('aria-pressed', String(this.hubView === 'scene'));
      atlasTabBtn.setAttribute('aria-pressed', String(this.hubView === 'atlas'));
      if (this.hubView === 'scene') sceneTabBtn.classList.add('active'); else sceneTabBtn.classList.remove('active');
      if (this.hubView === 'atlas') atlasTabBtn.classList.add('active'); else atlasTabBtn.classList.remove('active');

      worldSheet.replaceChildren();

      const allCombinedDocs = this.getCombinedDocuments();
      const qLower = this.query.trim().toLocaleLowerCase();
      const filteredDocs = allCombinedDocs.filter(({ doc }) =>
        !qLower || [doc.name, ...(doc.aliases ?? []), doc.kind].some((n) => n.toLocaleLowerCase().includes(qLower))
      );

      const isDocumentMode = this.category === 'document';
      // World Lens directory merges Current Scene -> Pinned -> Story Canon cleanly
      const filtered = entries.filter(({ entity }) =>
        entity.kind !== 'npc' &&
        (this.scope === 'all' || !entity.id.startsWith('earlier:')) &&
        (this.category === 'all' || (!isDocumentMode && entity.kind === this.category)) &&
        (!qLower || [entity.name, ...entity.aliases].some(name => name.toLocaleLowerCase().includes(qLower)))
      ).sort((a, b) => Number(b.current) - Number(a.current) || Number(b.pinned) - Number(a.pinned) || a.entity.name.localeCompare(b.entity.name));

      if (isDocumentMode) {
        sectionHeadLabel.textContent = 'Revealed Documents';
        count.textContent = filteredDocs.length ? `${filteredDocs.length} document${filteredDocs.length === 1 ? '' : 's'}` : 'No revealed documents match.';
        countBadge.textContent = `${filteredDocs.length} DOCUMENTS`;
      } else {
        sectionHeadLabel.textContent = 'Known in Story';
        count.textContent = filtered.length ? `${filtered.length} reference${filtered.length === 1 ? '' : 's'}` : 'No locations or items match. Try another filter.';
        countBadge.textContent = `${filtered.length} FOUND`;
        if (!filtered.some(e => e.entity.id === this.selectedEntityId)) {
          this.selectedEntityId = filtered[0]?.entity.id ?? null;
        }
      }

      const activeEntry = !isDocumentMode ? (filtered.find(e => e.entity.id === this.selectedEntityId) ?? filtered[0]) : undefined;

      // Gather Present Cast from sceneHubContext + any NPCs present in incoming entries
      const castByKey = new Map<string, DossierSceneHubContext['presentCast'][number]>();
      for (const c of this.sceneHubContext?.presentCast ?? []) {
        castByKey.set(c.name.trim().toLowerCase(), c);
      }
      for (const e of entries) {
        if (e.entity.kind !== 'npc') continue;
        const key = e.entity.name.trim().toLowerCase();
        if (!castByKey.has(key)) {
          const vis = visualResolver?.(e.entity);
          castByKey.set(key, { id: e.entity.id, name: e.entity.name, imageUrl: vis?.imageUrl, present: vis?.isPresent ?? e.current });
        }
      }
      const presentCast = [...castByKey.values()];

      if (this.hubView === 'scene') {
        const sceneHub = document.createElement('div');
        sceneHub.className = 'world-scene-hub';
        sceneHub.dataset.worldSceneHub = '';

        const activePlaceEntry = entries.find(e => e.entity.kind === 'place' && visualResolver?.(e.entity)?.isActiveLocation)
          ?? entries.find(e => e.entity.kind === 'place');
        const activeLocName = this.sceneHubContext?.activeLocationName ?? activePlaceEntry?.entity.name ?? 'Current Story Scene';
        const matchedLocDna = this.sceneHubContext?.locationDna ?? findMatchingLocation(this.storyDna.locations, activeLocName);
        const locImageUrl = this.sceneHubContext?.locationImageUrl
          ?? (activePlaceEntry ? visualResolver?.(activePlaceEntry.entity)?.imageUrl : undefined)
          ?? matchedLocDna?.referenceImageUrl;

        const banner = document.createElement('div');
        banner.className = 'world-scene-banner';
        if (locImageUrl) {
          const img = document.createElement('img');
          img.src = locImageUrl;
          img.alt = activeLocName;
          banner.append(img);
        } else {
          banner.innerHTML = fallbackSvgForKind('place', activeLocName);
        }
        const bannerOverlay = document.createElement('div');
        bannerOverlay.className = 'world-scene-banner-overlay';
        const locTitle = document.createElement('h3');
        locTitle.textContent = `📍 ${activeLocName}`;
        const dnaPills = document.createElement('div');
        dnaPills.className = 'world-scene-dna-pills';
        for (const trait of [matchedLocDna?.lighting, matchedLocDna?.atmosphere, matchedLocDna?.architecture].filter(Boolean)) {
          const pill = document.createElement('span');
          pill.className = 'scene-dna-pill';
          pill.textContent = trait!;
          dnaPills.append(pill);
        }
        if (activePlaceEntry) {
          const editSceneryBtn = document.createElement('button');
          editSceneryBtn.type = 'button';
          editSceneryBtn.className = 'world-lens-cta';
          editSceneryBtn.dataset.sceneHubEdit = '';
          editSceneryBtn.textContent = '✨ Inspect & Edit Scenery DNA';
          editSceneryBtn.onclick = () => open(activePlaceEntry.entity.id, trigger);
          bannerOverlay.append(locTitle, dnaPills, editSceneryBtn);
        } else {
          bannerOverlay.append(locTitle, dnaPills);
        }
        if (!matchedLocDna && activeLocName && activeLocName !== 'Current Story Scene' && this.storyDnaRequester) {
          const pinLocBtn = document.createElement('button');
          pinLocBtn.type = 'button';
          pinLocBtn.className = 'world-lens-cta';
          pinLocBtn.dataset.scenePinLocation = activeLocName;
          pinLocBtn.textContent = '📌 Pin location to World';
          pinLocBtn.onclick = () => {
            this.storyDnaRequester?.({
              action: 'save_location',
              location: {
                id: createLocationId(activeLocName),
                name: activeLocName,
                aliases: [],
                lighting: '',
                atmosphere: '',
                architecture: '',
                environmentDescription: '',
                persistentElements: [],
                connectedLocations: [],
                notes: '',
                locked: false,
                lastUpdated: Date.now(),
              },
            });
            pinLocBtn.textContent = '📌 Pinned to World ✓';
            pinLocBtn.disabled = true;
          };
          bannerOverlay.append(pinLocBtn);
        }
        banner.append(bannerOverlay);
        sceneHub.append(banner);

        const castWrap = document.createElement('div');
        castWrap.className = 'world-scene-cast';
        const castTitle = document.createElement('div');
        castTitle.className = 'world-scene-subhead';
        castTitle.textContent = '👥 Present in Scene · Open in Character Folio';
        const castRow = document.createElement('div');
        castRow.className = 'world-scene-cast-row';
        if (presentCast.length > 0) {
          for (const char of presentCast) {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'present-cast-pill';
            pill.dataset.presentCastPill = char.name;
            pill.textContent = `👤 ${char.name} →`;
            pill.onclick = () => {
              if (this.folioOpener) this.folioOpener(char.name);
            };
            castRow.append(pill);
          }
        } else {
          const emptyCast = document.createElement('span');
          emptyCast.className = 'world-scene-empty';
          emptyCast.textContent = 'No named characters established in this paragraph yet.';
          castRow.append(emptyCast);
        }
        castWrap.append(castTitle, castRow);
        sceneHub.append(castWrap);

        const wardrobeCandidates = presentCast.filter(c => c.wardrobeStates && Object.keys(c.wardrobeStates).length > 0);
        if (wardrobeCandidates.length > 0 && this.sceneHubContext?.onSelectWardrobe) {
          const wardrobeWrap = document.createElement('div');
          wardrobeWrap.className = 'world-scene-cast';
          wardrobeWrap.dataset.sceneWardrobeSwap = '';
          const wTitle = document.createElement('div');
          wTitle.className = 'world-scene-subhead';
          wTitle.textContent = '👗 Quick Scene Wardrobe Swap';
          wardrobeWrap.append(wTitle);
          for (const char of wardrobeCandidates.slice(0, 3)) {
            const charLabel = document.createElement('div');
            charLabel.style.cssText = 'font-size:11px;opacity:0.8;margin:4px 0 3px;font-weight:600;';
            charLabel.textContent = char.name;
            const wRow = document.createElement('div');
            wRow.className = 'world-scene-cast-row';
            for (const [key, outfit] of Object.entries(char.wardrobeStates!)) {
              const wBtn = document.createElement('button');
              wBtn.type = 'button';
              const isActive = char.activeWardrobeKey === key || (!char.activeWardrobeKey && char.activeOutfit === outfit);
              wBtn.className = `present-item-pill ${isActive ? 'active' : ''}`;
              wBtn.dataset.sceneWardrobeOption = `${char.name}:${key}`;
              wBtn.textContent = key;
              wBtn.title = outfit;
              wBtn.onclick = () => {
                this.sceneHubContext?.onSelectWardrobe?.(char.dnaId ?? char.name, key, outfit);
              };
              wRow.append(wBtn);
            }
            wardrobeWrap.append(charLabel, wRow);
          }
          sceneHub.append(wardrobeWrap);
        }

        const activeObjects = filtered.filter(e => e.entity.kind === 'object');
        if (activeObjects.length > 0) {
          const itemsWrap = document.createElement('div');
          itemsWrap.className = 'world-scene-items';
          const itemsTitle = document.createElement('div');
          itemsTitle.className = 'world-scene-subhead';
          itemsTitle.textContent = '💎 Active Artifacts & Items';
          const itemsRow = document.createElement('div');
          itemsRow.className = 'world-scene-cast-row';
          for (const { entity } of activeObjects.slice(0, 6)) {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `present-item-pill ${this.selectedEntityId === entity.id ? 'active' : ''}`;
            pill.textContent = `✦ ${entity.name}`;
            pill.onclick = () => {
              this.selectedEntityId = entity.id;
              render();
            };
            itemsRow.append(pill);
          }
          itemsWrap.append(itemsTitle, itemsRow);
          sceneHub.append(itemsWrap);
        }

        worldSheet.append(sceneHub);
      } else {
        // Living Story Atlas & Thread Map (General-Purpose Interactive Hub)
        const atlasSection = document.createElement('div');
        atlasSection.className = 'world-atlas-section';

        const atlasBar = document.createElement('div');
        atlasBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;opacity:0.9;';
        const legend = document.createElement('span');
        legend.textContent = this.linkMode
          ? (this.linkSourceId ? '🔗 Tap second place to toggle route…' : '🔗 Tap first place to link…')
          : '★ Current · 📍 Visited · ○ Mentioned';

        let atlasZoom = Number((worldSheet.dataset.atlasZoom) || '1');
        if (!Number.isFinite(atlasZoom) || atlasZoom < 0.7 || atlasZoom > 1.8) atlasZoom = 1;
        const zoomControls = document.createElement('div');
        zoomControls.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;';

        const atlasViewport = document.createElement('div');
        atlasViewport.className = 'world-atlas-viewport';
        atlasViewport.style.cssText = 'overflow:auto;max-height:260px;border-radius:10px;border:1px solid var(--vn-panel-border,rgba(255,255,255,.16));background:rgba(12,24,20,0.55);';

        const atlasSizer = document.createElement('div');
        atlasSizer.className = 'world-atlas-sizer';

        const atlasWrap = document.createElement('div');
        atlasWrap.className = 'world-atlas-view';
        atlasWrap.dataset.worldAtlasView = '';
        const applyAtlasZoom = (next: number) => {
          atlasZoom = Math.max(0.75, Math.min(1.75, Number(next.toFixed(2))));
          worldSheet.dataset.atlasZoom = String(atlasZoom);
          atlasSizer.style.setProperty("--world-atlas-width", String(Math.round(330 * atlasZoom)) + "px");
          atlasSizer.style.setProperty("--world-atlas-height", String(Math.round(215 * atlasZoom)) + "px");
          atlasSizer.style.setProperty("--world-atlas-scale", String(atlasZoom));
        };

        if (this.storyDnaRequester) {
          const linkBtn = document.createElement('button');
          linkBtn.type = 'button';
          linkBtn.dataset.atlasLinkToggle = '';
          linkBtn.className = `chip ${this.linkMode ? 'active' : ''}`;
          linkBtn.textContent = this.linkMode ? 'Done Linking' : '🔗 Link Places';
          linkBtn.setAttribute('aria-pressed', String(this.linkMode));
          linkBtn.style.cssText = 'min-height:44px;padding:6px 10px;margin:0;font-size:11px;';
          linkBtn.onclick = () => {
            this.linkMode = !this.linkMode;
            this.linkSourceId = null;
            render();
          };
          zoomControls.append(linkBtn);
        }

        for (const [label, aria, delta] of [['−', 'Zoom out atlas', -0.25], ['1:1', 'Reset atlas zoom', 0], ['+', 'Zoom in atlas', 0.25]] as const) {
          const zBtn = document.createElement('button');
          zBtn.dataset.atlasZoomControl = '';
          zBtn.type = 'button';
          zBtn.textContent = label;
          zBtn.setAttribute('aria-label', aria);
          zBtn.style.cssText = 'min-width:44px;min-height:44px;padding:6px 10px;margin:0;font-size:12px;font-weight:700;';
          zBtn.onclick = () => applyAtlasZoom(delta === 0 ? 1 : atlasZoom + delta);
          zoomControls.append(zBtn);
        }
        atlasBar.append(legend, zoomControls);
        applyAtlasZoom(atlasZoom);

        const placeMap = new Map<string, { id: string; dnaId?: string; name: string; entryId?: string; isActive: boolean; state: 'active' | 'visited' | 'mentioned'; connections: string[] }>();
        for (const e of entries) {
          if (e.entity.kind !== 'place') continue;
          const vis = visualResolver?.(e.entity);
          const dna = findMatchingLocation(this.storyDna.locations, e.entity.name);
          const isAct = Boolean(vis?.isActiveLocation);
          const hasDetails = Boolean(dna?.environmentDescription || dna?.persistentElements?.length || dna?.connectedLocations?.length || e.current);
          placeMap.set(createLocationId(e.entity.name), {
            id: createLocationId(e.entity.name),
            ...(dna ? { dnaId: dna.id } : {}),
            name: e.entity.name,
            entryId: e.entity.id,
            isActive: isAct,
            state: isAct ? 'active' : hasDetails ? 'visited' : 'mentioned',
            connections: [...new Set([...(dna?.connectedLocations ?? []), ...(vis?.connectedLocations ?? [])])],
          });
        }
        for (const loc of Object.values(this.storyDna.locations)) {
          const key = createLocationId(loc.name);
          if (!placeMap.has(key)) {
            const isAct = Boolean(this.sceneHubContext?.activeLocationName && createLocationId(this.sceneHubContext.activeLocationName) === key);
            const isMentionOnly = loc.autoDiscovered && !loc.environmentDescription && !(loc.persistentElements?.length) && !(loc.connectedLocations?.length);
            placeMap.set(key, {
              id: key,
              dnaId: loc.id,
              name: loc.name,
              entryId: `dna:loc:${loc.id}`,
              isActive: isAct,
              state: isAct ? 'active' : isMentionOnly ? 'mentioned' : 'visited',
              connections: loc.connectedLocations ?? [],
            });
          }
        }
        const nodes = [...placeMap.values()].filter(
          (n) => !qLower || n.name.toLocaleLowerCase().includes(qLower)
        );
        // More than four labels cannot fit on the ring with independent touch targets.
        atlasSection.dataset.dense = String(nodes.length > 4);
        const coords = new Map<string, { x: number; y: number }>();
        nodes.forEach((node, idx) => {
          if (nodes.length === 1) {
            coords.set(node.id, { x: 165, y: 105 });
          } else {
            const ring = Math.floor(idx / 10);
            const ringCount = ring === 0 ? Math.min(nodes.length, 10) : Math.max(1, nodes.length - 10);
            const angle = ((idx % 10) / ringCount) * Math.PI * 2 - Math.PI / 2;
            const rx = Math.max(48, 108 - ring * 34);
            const ry = Math.max(32, 68 - ring * 22);
            coords.set(node.id, {
              x: Math.round(165 + Math.cos(angle) * rx),
              y: Math.round(105 + Math.sin(angle) * ry),
            });
          }
        });
        const drawnEdges = new Set<string>();
        const edgePaths: string[] = [];
        for (const node of nodes) {
          const from = coords.get(node.id);
          if (!from) continue;
          for (const targetName of node.connections) {
            const targetKey = createLocationId(targetName);
            const to = coords.get(targetKey);
            if (!to || targetKey === node.id) continue;
            const edgeKey = [node.id, targetKey].sort().join('::');
            if (drawnEdges.has(edgeKey)) continue;
            drawnEdges.add(edgeKey);
            edgePaths.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(168,211,200,0.52)" stroke-width="1.8" stroke-dasharray="4 3"/>`);
          }
        }
        atlasWrap.innerHTML = `<svg class="world-map-svg" viewBox="0 0 330 210" aria-hidden="true">${edgePaths.join('')}</svg>`;
        for (const node of nodes) {
          const pt = coords.get(node.id)!;
          const nodeBtn = document.createElement('button');
          nodeBtn.type = 'button';
          nodeBtn.className = `map-node-pill ${this.selectedEntityId === node.entryId || (this.linkMode && this.linkSourceId === (node.dnaId ?? node.id)) ? 'active' : ''} ${node.isActive ? 'active-location' : ''}`;
          nodeBtn.style.left = `${Math.max(4, Math.min(68, Math.round((pt.x / 330) * 100 - 11)))}%`;
          nodeBtn.style.top = `${Math.max(4, Math.min(72, Math.round((pt.y / 210) * 100 - 10)))}%`;
          nodeBtn.dataset.atlasPlaceState = node.state;
          const icon = node.state === 'active' ? '★' : node.state === 'visited' ? '📍' : '○';
          const badge = node.state === 'active' ? `★ ACTIVE · 👥 ${presentCast.length}` : node.state === 'visited' ? 'Visited' : 'Mentioned';
          nodeBtn.innerHTML = html`<span class="index-dot"></span><b>${icon} ${node.name}</b><small>${badge}</small>`.value;
          nodeBtn.title = node.name;
          nodeBtn.onclick = () => {
            if (this.linkMode && this.storyDnaRequester) {
              const targetKey = node.dnaId ?? node.id;
              if (!this.linkSourceId) {
                this.linkSourceId = targetKey;
                render();
                return;
              }
              if (this.linkSourceId !== targetKey) {
                const srcNode = nodes.find((n) => (n.dnaId ?? n.id) === this.linkSourceId);
                if (srcNode && !srcNode.dnaId) {
                  this.storyDnaRequester({
                    action: 'save_location',
                    location: { id: srcNode.id, name: srcNode.name, aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: Date.now() },
                  });
                }
                if (!node.dnaId) {
                  this.storyDnaRequester({
                    action: 'save_location',
                    location: { id: node.id, name: node.name, aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: Date.now() },
                  });
                }
                const alreadyConnected = srcNode?.connections.some((c) => createLocationId(c) === node.id) ?? false;
                this.storyDnaRequester({
                  action: 'toggle_route',
                  fromLocationId: this.linkSourceId,
                  toLocationId: targetKey,
                  connected: !alreadyConnected,
                });
              }
              this.linkSourceId = null;
              this.linkMode = false;
              render();
              return;
            }
            if (node.entryId) {
              this.selectedEntityId = node.entryId;
              render();
            }
          };
          atlasWrap.append(nodeBtn);
        }
        if (nodes.length === 0) {
          const emptyAtlas = document.createElement('p');
          emptyAtlas.className = 'world-scene-empty';
          emptyAtlas.style.padding = '16px';
          emptyAtlas.textContent = 'Visit or add locations to map the story atlas.';
          atlasWrap.append(emptyAtlas);
        }
        atlasSizer.append(atlasWrap);
        atlasViewport.append(atlasSizer);
        atlasSection.append(atlasBar, atlasViewport);

        if (nodes.length >= 2 && edgePaths.length === 0) {
          const noRouteMsg = document.createElement('p');
          noRouteMsg.dataset.atlasEmptyRoutes = '';
          noRouteMsg.className = 'world-scene-empty';
          noRouteMsg.textContent = 'No routes mapped yet — tap Link Places to connect locations.';
          atlasSection.append(noRouteMsg);
        }

        worldSheet.append(atlasSection);
      }

      // Active Story Threads & Perspectives + Chapter Codex (works in Scene & Atlas views without clipping)
      const threads = this.storyDna.thoughtCabinet ?? [];
      const beliefNpcs = Object.entries(this.storyDna.npcBeliefs ?? {}).filter(([, b]) => b.length > 0);
      const codex = this.storyDna.chapterCodex ?? [];

      const threadsCard = document.createElement('div');
      threadsCard.className = 'world-threads-card';
      threadsCard.dataset.worldThreadsSection = '';
      const thHead = document.createElement('div');
      thHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;';
      const thHdr = document.createElement('span');
      thHdr.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#fde68a;';
      thHdr.textContent = `🧵 Story Threads (${threads.length})`;
      thHead.append(thHdr);

      const newThreadForm = document.createElement('div');
      newThreadForm.hidden = true;
      newThreadForm.style.cssText = 'display:grid;gap:6px;padding:8px;border-radius:8px;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.12);margin-top:4px;';
      if (this.storyDnaRequester) {
        const addThreadBtn = document.createElement('button');
        addThreadBtn.type = 'button';
        addThreadBtn.dataset.addThreadBtn = '';
        addThreadBtn.className = 'chip';
        addThreadBtn.textContent = '+ New Thread';
        addThreadBtn.style.cssText = 'min-height:44px;padding:4px 10px;font-size:11px;margin:0;';
        addThreadBtn.onclick = () => { newThreadForm.hidden = !newThreadForm.hidden; };
        thHead.append(addThreadBtn);

        const tTitle = document.createElement('input');
        tTitle.type = 'text';
        tTitle.placeholder = 'Thread title (e.g. Find Room 47, Keep promise to Naomi)…';
        tTitle.dataset.newThreadTitle = '';
        tTitle.style.cssText = 'min-height:44px;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.3);color:inherit;font-size:12px;';
        const tCat = document.createElement('select');
        tCat.dataset.newThreadCategory = '';
        tCat.style.cssText = 'min-height:44px;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.3);color:inherit;font-size:12px;';
        for (const cat of ['quest', 'goal', 'bond', 'promise', 'mystery', 'secret', 'foreshadowing', 'fact'] as const) {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
          tCat.append(opt);
        }
        const tDesc = document.createElement('textarea');
        tDesc.placeholder = 'Notes or current stakes…';
        tDesc.dataset.newThreadDesc = '';
        tDesc.style.cssText = 'min-height:54px;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.3);color:inherit;font-size:12px;margin:0;';
        const tSave = document.createElement('button');
        tSave.type = 'button';
        tSave.dataset.saveThreadBtn = '';
        tSave.className = 'world-lens-cta';
        tSave.textContent = 'Save Thread';
        tSave.onclick = () => {
          const titleVal = tTitle.value.trim();
          if (!titleVal) return;
          this.storyDnaRequester?.({
            action: 'save_thread',
            thread: {
              id: `thread-${Date.now().toString(36)}`,
              title: titleVal,
              category: tCat.value as ThoughtCabinetEntry['category'],
              description: tDesc.value.trim(),
              status: 'active',
              updatedAt: Date.now(),
            },
          });
          tTitle.value = '';
          tDesc.value = '';
          newThreadForm.hidden = true;
        };
        newThreadForm.append(tTitle, tCat, tDesc, tSave);
      }
      threadsCard.append(thHead, newThreadForm);

      if (threads.length > 0) {
        const thList = document.createElement('div');
        thList.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:6px;';
        const normalizeStatus = (s: ThoughtCabinetEntry['status']): 'active' | 'developing' | 'resolved' =>
          s === 'germinating' ? 'active' : s === 'internalized' ? 'developing' : s;
        const nextStatusOf = (s: 'active' | 'developing' | 'resolved'): 'active' | 'developing' | 'resolved' =>
          s === 'active' ? 'developing' : s === 'developing' ? 'resolved' : 'active';
        for (const tc of [...threads].reverse()) {
          const row = document.createElement('div');
          row.dataset.threadRow = tc.id;
          row.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:11.5px;line-height:1.4;padding:7px 9px;border-radius:8px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fef3c7;';
          const bodyDiv = document.createElement('div');
          bodyDiv.style.cssText = 'flex:1;min-width:0;';
          const b = document.createElement('strong');
          b.textContent = `[${tc.category}] ${tc.title}`;
          const p = document.createElement('div');
          p.style.cssText = 'opacity:0.88;margin-top:2px;';
          p.textContent = tc.description;
          bodyDiv.append(b);
          if (tc.description) bodyDiv.append(p);

          const actionsCol = document.createElement('div');
          actionsCol.style.cssText = 'display:flex;gap:4px;align-items:center;flex:none;';
          const curStatus = normalizeStatus(tc.status);
          const statusBtn = document.createElement('button');
          statusBtn.type = 'button';
          statusBtn.dataset.threadStatusBtn = tc.id;
          statusBtn.textContent = curStatus.charAt(0).toUpperCase() + curStatus.slice(1);
          statusBtn.title = 'Tap to cycle thread status';
          statusBtn.style.cssText = 'min-height:44px;min-width:44px;padding:4px 8px;margin:0;font-size:10.5px;border-radius:6px;';
          statusBtn.disabled = !this.storyDnaRequester;
          statusBtn.onclick = () => {
            this.storyDnaRequester?.({
              action: 'save_thread',
              thread: { ...tc, status: nextStatusOf(curStatus), updatedAt: Date.now() },
            });
          };
          actionsCol.append(statusBtn);
          if (this.storyDnaRequester) {
            const rmBtn = document.createElement('button');
            rmBtn.type = 'button';
            rmBtn.dataset.threadDeleteBtn = tc.id;
            rmBtn.textContent = '×';
            rmBtn.setAttribute('aria-label', `Delete thread ${tc.title}`);
            rmBtn.style.cssText = 'min-width:44px;min-height:44px;padding:4px 8px;margin:0;font-size:14px;border-radius:6px;';
            rmBtn.onclick = () => this.storyDnaRequester?.({ action: 'delete_thread', threadId: tc.id });
            actionsCol.append(rmBtn);
          }
          row.append(bodyDiv, actionsCol);
          thList.append(row);
        }
        threadsCard.append(thList);
      } else {
        const emptyTh = document.createElement('p');
        emptyTh.className = 'world-scene-empty';
        emptyTh.textContent = 'No active threads yet. Add goals, bonds, mysteries, or promises to keep track across turns.';
        threadsCard.append(emptyTh);
      }
      if (this.hubView === 'atlas' || threads.length > 0) {
        worldSheet.append(threadsCard);
      }

      if (this.hubView === 'atlas') {
        const perspCard = document.createElement('details');
        perspCard.open = this.perspectivesOpen;
        perspCard.ontoggle = () => {
          if (this.host.contains(perspCard)) this.perspectivesOpen = perspCard.open;
        };
        perspCard.className = 'world-threads-card secrets-board';
        perspCard.dataset.worldPerspectivesSection = '';
        perspCard.dataset.secretsBoard = '';
        const pHdr = document.createElement('summary');
        pHdr.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--vn-shell-info-ink,#93c5fd);margin-bottom:6px;';
        pHdr.textContent = 'Perspectives';
        const pFilterRow = document.createElement('div');
        pFilterRow.className = 'chip-row';
        for (const npc of ['all', ...beliefNpcs.map(([n]) => n)]) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `chip ${this.perspectiveFilter === npc ? 'active' : ''}`;
          btn.dataset.perspectiveFilter = npc;
          btn.textContent = npc === 'all' ? 'All Cast' : npc;
          btn.onclick = () => { this.perspectiveFilter = npc; render(); };
          pFilterRow.append(btn);
        }
        const bList = document.createElement('div');
        bList.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        if (beliefNpcs.length === 0) {
          const emptySecrets = document.createElement('p');
          emptySecrets.className = 'world-scene-empty';
          emptySecrets.textContent = 'No character perspectives have been revealed here yet.';
          bList.append(emptySecrets);
        } else {
          for (const [npc, items] of beliefNpcs) {
            if (this.perspectiveFilter !== 'all' && this.perspectiveFilter !== npc) continue;
            for (const item of items) {
              const row = document.createElement('div');
              row.className = 'secret-card-row';
              const head = document.createElement('div');
              head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;';
              const strong = document.createElement('strong');
              strong.textContent = `${npc} · ${item.topic}`;
              const rawState = item.knowledgeStatus ?? (item.knowsSecret ? 'knows' : 'unknown');
              const chip = document.createElement('span');
              chip.className = 'secret-chip';
              chip.dataset.state = rawState;
              chip.textContent = rawState === 'knows' ? 'Knows' : rawState === 'suspects' ? 'Suspects' : rawState === 'unaware' ? 'Unaware' : 'Unconfirmed';
              head.append(strong, chip);

              const body = document.createElement('div');
              body.style.cssText = 'font-size:11.5px;line-height:1.4;color:var(--vn-shell-text,#f4f7ee);';
              body.textContent = item.belief;

              row.append(head, body);
              const draftAction = this.sceneHubContext?.actionsEnabled ? this.sceneHubContext.onDraftAction : undefined;
              if (draftAction) {
                const askBtn = document.createElement('button');
                askBtn.type = 'button';
                askBtn.className = 'secret-action-btn';
                askBtn.dataset.secretAsk = '';
                askBtn.textContent = 'Draft a question for ' + npc;
                askBtn.onclick = () => draftAction('I ask ' + npc + ' about ' + item.topic + '.');
                row.append(askBtn);
                if (rawState === 'knows') {
                  const share = document.createElement('button');
                  share.type = 'button';
                  share.className = 'secret-action-btn';
                  share.dataset.secretShare = '';
                  share.textContent = 'Draft sharing this with ' + npc;
                  share.onclick = () => draftAction('I tell ' + npc + ' what I learned about ' + item.topic + ': ' + item.belief);
                  row.append(share);
                }
              }
              bList.append(row);
            }
          }
        }
        perspCard.append(pHdr, pFilterRow, bList);
        worldSheet.append(perspCard);
      }

      if (codex.length > 0) {
        const codexCard = document.createElement('div');
        codexCard.className = 'world-threads-card';
        codexCard.dataset.worldCodexSection = '';
        const chHdr = document.createElement('div');
        chHdr.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a7f3d0;margin-bottom:6px;';
        chHdr.textContent = `📖 Chapter Codex (${codex.length})`;
        const chList = document.createElement('div');
        chList.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        for (const ch of codex.slice(-6).reverse()) {
          const item = document.createElement('div');
          item.style.cssText = 'padding:8px 10px;border-radius:8px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.26);color:#e2e8f0;font-size:11.5px;';
          const top = document.createElement('div');
          top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700;';
          const tSpan = document.createElement('span');
          tSpan.textContent = `${ch.title} · 📍 ${ch.where || ch.location}`;
          top.append(tSpan);
          if (ch.messageId && this.sceneHubContext?.onJumpToMessage) {
            const jumpBtn = document.createElement('button');
            jumpBtn.type = 'button';
            jumpBtn.dataset.codexJump = ch.messageId;
            jumpBtn.textContent = 'Jump ↗';
            jumpBtn.style.cssText = 'min-height:44px;min-width:44px;padding:6px 10px;margin:0;font-size:11px;';
            jumpBtn.onclick = () => this.sceneHubContext?.onJumpToMessage?.(ch.messageId!);
            top.append(jumpBtn);
          }
          const sum = document.createElement('p');
          sum.style.cssText = 'margin:4px 0 0;opacity:0.88;line-height:1.4;';
          sum.textContent = ch.summary;
          item.append(top, sum);
          if (ch.who?.length) {
            const whoLine = document.createElement('small');
            whoLine.style.cssText = 'display:block;margin-top:3px;opacity:0.75;';
            whoLine.textContent = `Cast: ${ch.who.join(', ')}`;
            item.append(whoLine);
          }
          chList.append(item);
        }
        codexCard.append(chHdr, chList);
        worldSheet.append(codexCard);
      }

      // Single World Lens Preview Card right below the hub
      const lensCard = document.createElement('div');
      lensCard.className = 'world-lens world-lens-preview';
      if (isDocumentMode && filteredDocs.length > 0) {
        const selectedDoc = filteredDocs.find((d) => d.doc.id === this.selectedEntityId)?.doc ?? filteredDocs[0]!.doc;
        this.selectedEntityId = selectedDoc.id;
        const lensTitle = document.createElement('h3');
        lensTitle.textContent = formatDocumentDisplayTitle(selectedDoc.name, selectedDoc.kind);
        const lensDesc = document.createElement('p');
        lensDesc.textContent = selectedDoc.sections[0]?.text?.slice(0, 140)
          || selectedDoc.visualDetails
          || selectedDoc.observations?.[0]?.summary
          || `${selectedDoc.kind.toUpperCase()} revealed in the story.`;
        const readBtn = document.createElement('button');
        readBtn.type = 'button';
        readBtn.className = 'world-lens-cta';
        readBtn.dataset.worldLensReadDoc = selectedDoc.id;
        readBtn.textContent = '📄 Read / Inspect Document →';
        readBtn.onclick = () => {
          this.openDocument(selectedDoc, () => this.openTray(entries, trigger, open, note, visualResolver), trigger);
        };
        lensCard.append(lensTitle, lensDesc, readBtn);
      } else if (activeEntry) {
        const vis = visualResolver?.(activeEntry.entity);
        const entryNames = new Set([activeEntry.entity.name, ...activeEntry.entity.aliases].map((s) => s.trim().toLowerCase()));
        const matchedDoc = activeEntry.entity.kind === 'object'
          ? allCombinedDocs.find(({ doc }) => entryNames.has(doc.name.trim().toLowerCase()) || (doc.aliases ?? []).some((a) => entryNames.has(a.trim().toLowerCase())))?.doc
          : undefined;
        const lensTitle = document.createElement('h3');
        lensTitle.textContent = activeEntry.entity.name;
        const lensDesc = document.createElement('p');
        lensDesc.textContent = vis?.summarySnippet ?? (activeEntry.entity.kind === 'place' ? 'Location recognized in current scene.' : 'Item recognized in current scene.');

        const ctaBtn = document.createElement('button');
        ctaBtn.type = 'button';
        ctaBtn.className = 'world-lens-cta';
        ctaBtn.textContent = matchedDoc
          ? '📄 Read / Inspect Document →'
          : activeEntry.entity.kind === 'place'
            ? 'Inspect location →'
            : 'Inspect item →';
        ctaBtn.onclick = () => {
          open(activeEntry.entity.id, trigger);
        };

        const hideBtn = document.createElement('button');
        hideBtn.type = 'button';
        hideBtn.dataset.worldLensHide = '';
        hideBtn.style.cssText = 'display:inline-block;margin-top:6px!important;margin-left:6px!important;min-height:44px!important;min-width:44px!important;padding:6px 12px!important;font-size:11px!important;font-weight:600!important;border-radius:8px!important;background:rgba(255,255,255,0.08)!important;color:var(--vn-muted-text,#d1dfd5)!important;border:1px solid rgba(255,255,255,0.18)!important;cursor:pointer;';
        hideBtn.textContent = '✕ Hide from Lens';
        hideBtn.title = 'Hide this reference from World Lens';
        hideBtn.onclick = () => {
          if (this.update(activeEntry.entity, { suppressed: true })) {
            const idx = entries.findIndex(e => e.entity.id === activeEntry.entity.id);
            if (idx >= 0) entries.splice(idx, 1);
            this.selectedEntityId = null;
            render();
          }
        };
        const actionsRow = document.createElement('div');
        actionsRow.className = 'world-lens-preview-actions';
        actionsRow.append(ctaBtn);
        if (activeEntry.entity.kind === 'place' && !vis?.isActiveLocation && this.sceneHubContext?.actionsEnabled && this.sceneHubContext.onDraftAction) {
          const goBtn = document.createElement('button');
          goBtn.type = 'button';
          goBtn.className = 'world-lens-cta';
          goBtn.dataset.worldLensGoTo = activeEntry.entity.name;
          goBtn.title = 'Add a travel intention to your reply draft';
          goBtn.textContent = `Draft travel to ${activeEntry.entity.name}`;
          goBtn.onclick = () => {
            this.sceneHubContext?.onDraftAction?.(`I head to ${activeEntry.entity.name}.`);
          };
          actionsRow.append(goBtn);
        }
        hideBtn.style.marginLeft = '0';
        hideBtn.style.marginTop = '0';
        actionsRow.append(hideBtn);
        lensCard.append(lensTitle, lensDesc, actionsRow);
      } else {
        lensCard.innerHTML = isDocumentMode
          ? '<h3>No revealed documents yet</h3><p>Letters, notes, flyers, receipts, and screens spotted in narration will collect here across turns.</p>'
          : '<h3>No matching references</h3><p>Try another category or clear the search.</p>';
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'world-lens-cta';
        resetBtn.textContent = 'Reset filters';
        resetBtn.onclick = () => {
          this.category = 'all';
          this.query = '';
          this.scope = 'all';
          category.value = 'all';
          search.value = '';
          scope.value = 'all';
          render();
        };
        lensCard.append(resetBtn);
        const missingLoc = this.sceneHubContext?.activeLocationName;
        if (!isDocumentMode && missingLoc && missingLoc !== 'Current Story Scene' && !findMatchingLocation(this.storyDna.locations, missingLoc) && this.storyDnaRequester) {
          const pinFallbackBtn = document.createElement('button');
          pinFallbackBtn.type = 'button';
          pinFallbackBtn.className = 'world-lens-cta';
          pinFallbackBtn.dataset.scenePinFallback = missingLoc;
          pinFallbackBtn.textContent = `📌 Pin ${missingLoc} to World`;
          pinFallbackBtn.onclick = () => {
            this.storyDnaRequester?.({
              action: 'save_location',
              location: {
                id: createLocationId(missingLoc),
                name: missingLoc,
                aliases: [],
                lighting: '',
                atmosphere: '',
                architecture: '',
                environmentDescription: '',
                persistentElements: [],
                connectedLocations: [],
                notes: '',
                locked: false,
                lastUpdated: Date.now(),
              },
            });
            pinFallbackBtn.textContent = `📌 ${missingLoc} pinned ✓`;
            pinFallbackBtn.disabled = true;
          };
          lensCard.append(pinFallbackBtn);
        }
      }
      lensSlot.replaceChildren(lensCard);

      // Unified Directory List [data-reference-list]
      if (isDocumentMode) {
        for (const { doc, customNote, inCurrentTurn } of filteredDocs) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.referenceCurrent = String(inCurrentTurn);
          button.dataset.referenceKindItem = 'document';
          button.dataset.documentRowId = doc.id;
          const displayTitle = formatDocumentDisplayTitle(doc.name, doc.kind);
          button.setAttribute('aria-label', displayTitle);

          const thumb = document.createElement('span');
          thumb.dataset.referenceThumb = 'object';
          const docImgUrl = this.documentOptionsResolver?.(doc.id)?.asset?.imageUrl;
          if (docImgUrl) {
            const img = document.createElement('img');
            img.src = docImgUrl;
            img.alt = '';
            img.loading = 'lazy';
            thumb.append(img);
          } else {
            thumb.innerHTML = renderEntityStockIcon('document', doc.kind);
          }

          const body = document.createElement('span');
          body.dataset.referenceRowBody = '';
          const nameSpan = document.createElement('span');
          nameSpan.dataset.referenceRowTitle = '';
          nameSpan.textContent = displayTitle;
          const detail = document.createElement('small');
          detail.textContent = `${doc.kind.toUpperCase()} · ${doc.sections.length ? `${doc.sections.length} passage${doc.sections.length === 1 ? '' : 's'}` : doc.observations?.length ? 'Visual details observed' : 'Spotted'}${customNote ? ' · ✎ Note' : ''}`;
          body.append(nameSpan, detail);

          button.append(thumb, body);
          button.onclick = () => {
            this.selectedEntityId = doc.id;
            this.openDocument(doc, () => this.openTray(entries, trigger, open, note, visualResolver), trigger);
          };
          list.append(button);
        }
      } else {
        for (const { entity, pinned, label, current: isCurrent } of filtered) {
          const vis = visualResolver?.(entity);
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.referenceCurrent = String(isCurrent);
          button.dataset.referenceKindItem = entity.kind;
          button.setAttribute('aria-label', entity.name);
          button.setAttribute('aria-description', `${pinned ? 'Pinned. ' : ''}${label}`);

          const thumb = document.createElement('span');
          thumb.dataset.referenceThumb = entity.kind;
          const itemRefUrl = entity.kind === 'object' ? findMatchingItem(this.storyDna.items, entity.name)?.referenceImageUrl : undefined;
          const entityThumbUrl = vis?.imageUrl ?? itemRefUrl;
          if (entityThumbUrl) {
            const img = document.createElement('img');
            img.src = entityThumbUrl;
            img.alt = '';
            img.loading = 'lazy';
            thumb.append(img);
          } else {
            thumb.innerHTML = renderEntityStockIcon(entity.kind, entity.name);
          }

          const body = document.createElement('span');
          body.dataset.referenceRowBody = '';
          const nameSpan = document.createElement('span');
          nameSpan.dataset.referenceRowTitle = '';
          nameSpan.textContent = entity.name;
          const detail = document.createElement('small');
          detail.textContent = `${pinned ? '📌 Pinned · ' : ''}${entity.kind === 'npc' ? 'Character' : entity.kind === 'place' ? 'Location' : 'Item'} · ${label}`;
          body.append(nameSpan, detail);

          if (vis?.summarySnippet) {
            const snippet = document.createElement('small');
            snippet.dataset.referenceSnippet = '';
            snippet.textContent = vis.summarySnippet.length > 90 ? `${vis.summarySnippet.slice(0, 90).trimEnd()}…` : vis.summarySnippet;
            body.append(snippet);
          }

          button.append(thumb, body);
          button.onclick = () => open(entity.id, trigger);
          list.append(button);
        }
      }

      // Collapsible Hidden / Deleted Drawer (replaces irreversible hide/delete anxiety)
      const suppressedList = (this.sceneHubContext?.hiddenOverrides ?? []).filter((o) => o.kind !== 'npc');
      const deletedLocs = Object.values(this.storyDna.deletedLocations ?? {});
      const deletedItems = Object.values(this.storyDna.deletedItems ?? {});
      const hiddenTotal = suppressedList.length + deletedLocs.length + deletedItems.length;
      if (hiddenTotal > 0) {
        const drawer = document.createElement('details');
        drawer.dataset.hiddenDeletedDrawer = '';
        drawer.style.cssText = 'margin-top:14px;border-top:1px solid var(--vn-panel-border,#666);padding-top:6px;';
        const summary = document.createElement('summary');
        summary.textContent = `Hidden / Deleted (${hiddenTotal})`;
        drawer.append(summary);
        const rowWrap = document.createElement('div');
        rowWrap.style.cssText = 'display:grid;gap:6px;padding:6px 0 12px;';

        for (const item of suppressedList) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);font-size:12px;';
          const lbl = document.createElement('span');
          lbl.textContent = `${item.kind === 'place' ? '📍' : '✦'} ${item.name} (hidden)`;
          const unhide = document.createElement('button');
          unhide.type = 'button';
          unhide.dataset.unhideOverride = `${item.kind}:${item.name}`;
          unhide.textContent = 'Unhide';
          unhide.style.cssText = 'min-height:44px;margin:0;padding:6px 12px;font-size:11px;';
          unhide.onclick = () => {
            this.sceneHubContext?.onUnhideOverride?.(item.kind, item.name);
            render();
          };
          row.append(lbl, unhide);
          rowWrap.append(row);
        }
        for (const loc of deletedLocs) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);font-size:12px;';
          const lbl = document.createElement('span');
          lbl.textContent = `📍 ${loc.name} (deleted DNA)`;
          const restore = document.createElement('button');
          restore.type = 'button';
          restore.dataset.restoreLocationId = loc.id;
          restore.textContent = 'Restore';
          restore.disabled = !this.storyDnaRequester;
          restore.style.cssText = 'min-height:44px;margin:0;padding:6px 12px;font-size:11px;';
          restore.onclick = () => this.storyDnaRequester?.({ action: 'restore_location', locationId: loc.id });
          row.append(lbl, restore);
          rowWrap.append(row);
        }
        for (const it of deletedItems) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);font-size:12px;';
          const lbl = document.createElement('span');
          lbl.textContent = `✦ ${it.name} (deleted DNA)`;
          const restore = document.createElement('button');
          restore.type = 'button';
          restore.dataset.restoreItemId = it.id;
          restore.textContent = 'Restore';
          restore.disabled = !this.storyDnaRequester;
          restore.style.cssText = 'min-height:44px;margin:0;padding:6px 12px;font-size:11px;';
          restore.onclick = () => this.storyDnaRequester?.({ action: 'restore_item', itemId: it.id });
          row.append(lbl, restore);
          rowWrap.append(row);
        }
        drawer.append(rowWrap);
        hiddenDrawerHost.append(drawer);
      }
    };

    this.trayRender = render;
    search.oninput = render;
    category.onchange = render;
    scope.onchange = render;
    render();

    this.host.append(panel);
    this.host.hidden = false;
    if (this.host.dataset.vnWorkspaceTool) {
      search.focus();
    } else {
      close.focus();
    }
  }

  private buildStoryDnaStudio(kind: 'place' | 'object', dossier: ReaderDossier): HTMLElement {
    const wrap = document.createElement('section');
    wrap.className = 'story-dna-studio';
    wrap.dataset.storyDnaStudio = kind;

    const status = document.createElement('p');
    status.dataset.storyDnaStatus = '';
    status.className = 'story-dna-status';
    status.hidden = !this.storyDnaError;
    if (this.storyDnaError) status.textContent = this.storyDnaError;

    const head = document.createElement('div');
    head.className = 'story-dna-studio-head';
    const heading = document.createElement('h3');
    heading.textContent = kind === 'place' ? '📍 Scenery DNA Studio' : '💎 Item DNA Studio';

    const existingLoc = kind === 'place' ? findMatchingLocation(this.storyDna.locations, dossier.entity.name) : undefined;
    const existingItem = kind === 'object' ? findMatchingItem(this.storyDna.items, dossier.entity.name) : undefined;
    let isLocked = Boolean(kind === 'place' ? existingLoc?.locked : existingItem?.locked);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'story-dna-studio-actions';

    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.dataset.storyDnaLock = '';
    lockBtn.setAttribute('aria-pressed', String(isLocked));
    lockBtn.textContent = isLocked ? '🔒 Locked DNA' : '🔓 Lock DNA';

    const autofillBtn = document.createElement('button');
    autofillBtn.type = 'button';
    autofillBtn.dataset.storyDnaAutofill = '';
    autofillBtn.textContent = 'Review autofill suggestions';
    autofillBtn.disabled = isLocked || !this.storyDnaRequester;

    lockBtn.onclick = () => {
      isLocked = !isLocked;
      lockBtn.setAttribute('aria-pressed', String(isLocked));
      lockBtn.textContent = isLocked ? '🔒 Locked DNA' : '🔓 Lock DNA';
      autofillBtn.disabled = isLocked || !this.storyDnaRequester;
      saveBtn.click();
    };

    actionsRow.append(lockBtn, autofillBtn);
    head.append(heading, actionsRow);
    wrap.append(head, status);

    const factVal = (...fields: string[]) => {
      for (const f of fields) {
        const hit = dossier.facts.find(x => x.field === f)?.value || dossier.state?.[f];
        if (hit?.trim()) return hit.trim();
      }
      return '';
    };

    const form = document.createElement('div');
    form.className = 'story-dna-form';

    const addField = (key: string, labelText: string, value: string, multiline = false, placeholder = '') => {
      const row = document.createElement('label');
      row.className = 'story-dna-field';
      const lbl = document.createElement('span');
      lbl.textContent = labelText;
      const input = document.createElement(multiline ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement;
      if (!multiline) (input as HTMLInputElement).type = 'text';
      input.dataset.dnaField = key;
      input.value = value;
      if (placeholder) input.placeholder = placeholder;
      row.append(lbl, input);
      form.append(row);
      return input;
    };

    const preview = document.createElement('div');
    preview.className = 'story-dna-preview';
    const previewLabel = document.createElement('small');
    previewLabel.textContent = 'Prompt Injection Preview';
    const previewText = document.createElement('code');
    previewText.dataset.storyDnaPreview = '';
    preview.append(previewLabel, previewText);

    const footer = document.createElement('div');
    footer.className = 'story-dna-footer';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.dataset.storyDnaSave = '';
    saveBtn.textContent = kind === 'place' ? 'Save Scenery DNA' : 'Save Item DNA';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.storyDnaDelete = '';
    delBtn.textContent = 'Delete DNA';
    delBtn.disabled = kind === 'place' ? !existingLoc : !existingItem;
    footer.append(saveBtn, delBtn);

    if (kind === 'place') {
      const aliasesIn = addField('aliases', 'Short Aliases (comma-separated)', (existingLoc?.aliases ?? dossier.entity.aliases ?? []).join(', '));
      const descIn = addField('environmentDescription', 'Environment & Scenery Description', existingLoc?.environmentDescription ?? factVal('description', 'impression', 'surroundings', 'layout'), true);
      const archIn = addField('architecture', 'Architecture / Layout', existingLoc?.architecture ?? factVal('layout', 'architecture'));
      const lightIn = addField('lighting', 'Lighting', existingLoc?.lighting ?? '');
      const atmIn = addField('atmosphere', 'Atmosphere / Weather', existingLoc?.atmosphere ?? '');
      const elemIn = addField('persistentElements', 'Persistent Props / Landmarks (comma-separated)', (existingLoc?.persistentElements ?? []).join(', '));
      const connIn = addField('connectedLocations', 'Connected Locations (comma-separated)', (existingLoc?.connectedLocations ?? []).join(', '));
      const loreIn = addField('loreText', 'Lore / History', existingLoc?.loreText ?? factVal('history', 'publicHistory', 'significance', 'customs'), true);
      const notesIn = addField('notes', 'Personal Notes', existingLoc?.notes ?? '', true);

      const buildLoc = (): LocationDNA => ({
        id: existingLoc?.id ?? createLocationId(dossier.entity.name),
        name: existingLoc?.name ?? dossier.entity.name,
        aliases: aliasesIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 16),
        ...(descIn.value.trim() ? { environmentDescription: descIn.value.trim().slice(0, 2000) } : {}),
        ...(archIn.value.trim() ? { architecture: archIn.value.trim().slice(0, 500) } : {}),
        ...(lightIn.value.trim() ? { lighting: lightIn.value.trim().slice(0, 500) } : {}),
        ...(atmIn.value.trim() ? { atmosphere: atmIn.value.trim().slice(0, 500) } : {}),
        persistentElements: elemIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 24),
        connectedLocations: connIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 24),
        ...(loreIn.value.trim() ? { loreText: loreIn.value.trim().slice(0, 4000) } : {}),
        ...(notesIn.value.trim() ? { notes: notesIn.value.trim().slice(0, 2000) } : {}),
        ...(existingLoc?.referenceImageUrl ? { referenceImageUrl: existingLoc.referenceImageUrl } : {}),
        locked: isLocked,
        autoDiscovered: false,
        lastUpdated: Date.now(),
      });

      const refreshPreview = () => {
        const clause = formatLocationDNAForImagePrompt(buildLoc());
        previewText.textContent = clause || 'Fill scenery details above to inject consistent location visuals into generated art.';
      };
      [aliasesIn, descIn, archIn, lightIn, atmIn, elemIn, connIn, loreIn, notesIn].forEach(el => el.addEventListener('input', refreshPreview));
      refreshPreview();

      saveBtn.onclick = () => {
        const nextLoc = buildLoc();
        this.storyDnaRequester?.({ action: 'save_location', location: nextLoc, revision: this.storyDna.revision });
        status.textContent = 'Saving Scenery DNA...';
        status.hidden = false;
      };
      let locDeleteArmed = false;
      let locDeleteTimer: ReturnType<typeof setTimeout> | null = null;
      delBtn.onclick = () => {
        if (!existingLoc) return;
        if (!locDeleteArmed) {
          locDeleteArmed = true;
          delBtn.textContent = 'Tap again to confirm delete';
          if (locDeleteTimer) clearTimeout(locDeleteTimer);
          locDeleteTimer = setTimeout(() => { locDeleteArmed = false; delBtn.textContent = 'Delete Place'; }, 4000);
          return;
        }
        if (locDeleteTimer) clearTimeout(locDeleteTimer);
        this.storyDnaRequester?.({ action: 'delete_location', locationId: existingLoc.id, revision: this.storyDna.revision });
        if (this.trayReturn) this.trayReturn();
        else this.close();
      };

      const otherLocs = Object.values(this.storyDna.locations).filter((l) => l.id !== existingLoc?.id);
      if (existingLoc && otherLocs.length > 0 && this.storyDnaRequester) {
        const mergeRow = document.createElement('div');
        mergeRow.dataset.storyDnaMerge = 'place';
        mergeRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:8px;border-top:1px dashed var(--vn-shell-border,rgba(255,255,255,.16));';
        const mergeSel = document.createElement('select');
        mergeSel.dataset.dnaMergeSelect = '';
        mergeSel.setAttribute('aria-label', 'Merge into location');
        mergeSel.style.cssText = 'flex:1;min-width:140px;min-height:44px;padding:6px 8px;border-radius:8px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2));background:var(--vn-shell-panel,rgba(0,0,0,.3));color:inherit;font-size:12px;';
        for (const loc of otherLocs) {
          const opt = document.createElement('option');
          opt.value = loc.id;
          opt.textContent = loc.name;
          mergeSel.append(opt);
        }
        const mergeBtn = document.createElement('button');
        mergeBtn.type = 'button';
        mergeBtn.dataset.dnaMergeBtn = '';
        mergeBtn.textContent = 'Merge into target';
        mergeBtn.style.cssText = 'min-height:44px;margin:0;padding:6px 12px;font-size:12px;';
        mergeBtn.onclick = () => {
          const targetId = mergeSel.value;
          if (!targetId) return;
          this.storyDnaRequester?.({ action: 'merge_location', sourceId: existingLoc.id, targetId, revision: this.storyDna.revision });
          if (this.trayReturn) this.trayReturn();
        };
        mergeRow.append(mergeSel, mergeBtn);
        form.append(mergeRow);
      }

      if (this.locationArtRequester || this.locationArtLibrary.locations.length > 0) {
        const entityKey = (existingLoc?.name ?? dossier.entity.name).trim().toLowerCase();
        const fallbackKey = dossier.entity.name.trim().toLowerCase();
        const artRecord = this.locationArtLibrary.locations.find(
          (r) => r.entityId === entityKey || r.entityId === fallbackKey
        );
        const artBox = document.createElement('div');
        artBox.dataset.locationArtEmbedded = '';
        artBox.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px dashed var(--vn-shell-border,rgba(255,255,255,.16));';
        const artHead = document.createElement('div');
        artHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;';
        const artTitle = document.createElement('strong');
        artTitle.style.cssText = 'font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;';
        artTitle.textContent = `🖼️ Saved Location Views (${artRecord?.variants.length ?? 0})`;
        artHead.append(artTitle);
        if (this.locationArtRequester) {
          const refreshArtBtn = document.createElement('button');
          refreshArtBtn.type = 'button';
          refreshArtBtn.dataset.locationArtRefresh = '';
          refreshArtBtn.textContent = '↻ Refresh Saved Views';
          refreshArtBtn.style.cssText = 'min-height:44px;margin:0;padding:6px 10px;font-size:11px;';
          refreshArtBtn.onclick = () => this.locationArtRequester?.({ action: 'list' });
          artHead.append(refreshArtBtn);
        }
        artBox.append(artHead);
        if (artRecord?.variants.length) {
          const grid = document.createElement('div');
          grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;';
          for (const variant of artRecord.variants) {
            const cardEl = document.createElement('div');
            cardEl.dataset.locationArtVariant = variant.id;
            const isPreferred = artRecord.preferredVariantId === variant.id;
            cardEl.style.cssText = `border-radius:8px;overflow:hidden;border:1px solid ${isPreferred ? 'var(--vn-shell-accent,#a8d3c8)' : 'rgba(255,255,255,.16)'};background:rgba(0,0,0,.25);display:flex;flex-direction:column;gap:4px;padding:6px;`;
            const img = document.createElement('img');
            img.src = `/api/v1/images/${encodeURIComponent(variant.imageId)}`;
            img.alt = `${artRecord.name} variant`;
            img.style.cssText = 'width:100%;height:78px;object-fit:cover;border-radius:6px;display:block;';
            cardEl.append(img);
            if (this.locationArtRequester) {
              const btnRow = document.createElement('div');
              btnRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
              const prefBtn = document.createElement('button');
              prefBtn.type = 'button';
              prefBtn.dataset.locationArtPrefer = variant.id;
              prefBtn.textContent = isPreferred ? '★ Preferred' : 'Use as Preferred';
              prefBtn.disabled = isPreferred;
              prefBtn.style.cssText = 'flex:1;min-height:44px;margin:0;padding:4px 6px;font-size:10.5px;';
              prefBtn.onclick = () => this.locationArtRequester?.({ action: 'select', locationId: artRecord.entityId, variantId: variant.id });
              const rmBtn = document.createElement('button');
              rmBtn.type = 'button';
              rmBtn.dataset.locationArtForget = variant.id;
              rmBtn.textContent = 'Remove';
              rmBtn.style.cssText = 'min-height:44px;margin:0;padding:4px 8px;font-size:10.5px;';
              rmBtn.onclick = () => this.locationArtRequester?.({ action: 'forget', locationId: artRecord.entityId, variantId: variant.id });
              btnRow.append(prefBtn, rmBtn);
              cardEl.append(btnRow);
            }
            grid.append(cardEl);
          }
          artBox.append(grid);
        } else {
          const emptyArt = document.createElement('small');
          emptyArt.style.opacity = '0.75';
          emptyArt.textContent = 'No saved environment variants cached for this location yet.';
          artBox.append(emptyArt);
        }
        form.append(artBox);
      }
    } else {
      if (existingItem?.referenceImageUrl) {
        const artWrap = document.createElement('button');
        artWrap.type = 'button';
        artWrap.dataset.dossierArtOpen = '';
        artWrap.setAttribute('aria-label', 'Inspect artwork: ' + existingItem.name);
        const artImg = document.createElement('img');
        artImg.src = existingItem.referenceImageUrl;
        artImg.alt = '';
        artWrap.onclick = () => FullscreenLightbox.open({
          src: existingItem.referenceImageUrl!,
          title: existingItem.name,
          themeSource: this.host,
          opener: artWrap,
        });
        artWrap.append(artImg);
        form.append(artWrap);
      }
      const genItemArtBtn = document.createElement('button');
      genItemArtBtn.type = 'button';
      genItemArtBtn.dataset.generateItemArt = '';
      genItemArtBtn.textContent = existingItem?.referenceImageUrl ? '🔄 Regenerate Item Art' : '✨ Generate Item Art';
      genItemArtBtn.style.cssText = 'min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--vn-shell-accent,#86dbb2) 55%,transparent);background:color-mix(in srgb,var(--vn-shell-accent,#86dbb2) 16%,transparent);color:inherit;font-size:12px;font-weight:700;cursor:pointer;';
      const aliasesIn = addField('aliases', 'Short Aliases (comma-separated)', (existingItem?.aliases ?? dossier.entity.aliases ?? []).join(', '));
      const typeIn = addField('itemType', 'Item Type / Category', existingItem?.itemType ?? '');
      const descIn = addField('description', 'Visual Description (Prompt Injection)', existingItem?.description ?? factVal('description', 'appearance', 'significance') ?? dossier.entity.name, true);
      const matIn = addField('materials', 'Materials / Craftsmanship', existingItem?.materials ?? '');
      const featIn = addField('distinctiveFeatures', 'Distinctive Features (comma-separated)', (existingItem?.distinctiveFeatures ?? []).join(', '));
      const colIn = addField('colors', 'Colors (comma-separated)', (existingItem?.colors ?? []).join(', '));
      const heldIn = addField('heldBy', 'Held / Owned By', existingItem?.heldBy ?? factVal('owner'));
      const loreIn = addField('loreText', 'Lore / Significance', existingItem?.loreText ?? factVal('provenance', 'significance', 'history', 'function'), true);
      const notesIn = addField('notes', 'Personal Notes', existingItem?.notes ?? '', true);

      const buildItem = (): ItemDNA => ({
        id: existingItem?.id ?? createItemId(dossier.entity.name),
        name: existingItem?.name ?? dossier.entity.name,
        aliases: aliasesIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 16),
        ...(typeIn.value.trim() ? { itemType: typeIn.value.trim().slice(0, 100) } : {}),
        description: (descIn.value.trim() || dossier.entity.name).slice(0, 2000),
        ...(matIn.value.trim() ? { materials: matIn.value.trim().slice(0, 500) } : {}),
        distinctiveFeatures: featIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 24),
        colors: colIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12),
        ...(heldIn.value.trim() ? { heldBy: heldIn.value.trim().slice(0, 160) } : {}),
        ...(loreIn.value.trim() ? { loreText: loreIn.value.trim().slice(0, 4000) } : {}),
        ...(notesIn.value.trim() ? { notes: notesIn.value.trim().slice(0, 2000) } : {}),
        ...(existingItem?.referenceImageUrl ? { referenceImageUrl: existingItem.referenceImageUrl } : {}),
        locked: isLocked,
        autoDiscovered: false,
        lastUpdated: Date.now(),
      });

      const refreshPreview = () => {
        const clause = formatItemDNAForImagePrompt(buildItem());
        previewText.textContent = clause || 'Describe this artifact so prompts stay consistent whenever it appears.';
      };
      [aliasesIn, typeIn, descIn, matIn, featIn, colIn, heldIn, loreIn, notesIn].forEach(el => el.addEventListener('input', refreshPreview));
      refreshPreview();

      footer.insertBefore(genItemArtBtn, saveBtn);
      genItemArtBtn.onclick = () => {
        if (!existingItem) {
          const saved = buildItem();
          this.storyDnaRequester?.({ action: 'save_item', item: saved, revision: this.storyDna.revision });
          status.textContent = 'Saving item first, then click Generate Item Art.';
          status.hidden = false;
          return;
        }
        this.awaitingDnaSync = true;
        genItemArtBtn.disabled = true;
        genItemArtBtn.textContent = 'Generating Item Art…';
        status.textContent = 'Rendering artifact close-up artwork…';
        status.hidden = false;
        this.storyDnaRequester?.({ action: 'generate_item_art', itemId: existingItem.id });
      };
      saveBtn.onclick = () => {
        const nextItem = buildItem();
        this.storyDnaRequester?.({ action: 'save_item', item: nextItem, revision: this.storyDna.revision });
        status.textContent = 'Saving Item DNA...';
        status.hidden = false;
      };
      let itemDeleteArmed = false;
      let itemDeleteTimer: ReturnType<typeof setTimeout> | null = null;
      delBtn.onclick = () => {
        if (!existingItem) return;
        if (!itemDeleteArmed) {
          itemDeleteArmed = true;
          delBtn.textContent = 'Tap again to confirm delete';
          if (itemDeleteTimer) clearTimeout(itemDeleteTimer);
          itemDeleteTimer = setTimeout(() => { itemDeleteArmed = false; delBtn.textContent = 'Delete Item'; }, 4000);
          return;
        }
        if (itemDeleteTimer) clearTimeout(itemDeleteTimer);
        this.storyDnaRequester?.({ action: 'delete_item', itemId: existingItem.id, revision: this.storyDna.revision });
        if (this.trayReturn) this.trayReturn();
        else this.close();
      };

      const otherItems = Object.values(this.storyDna.items).filter((it) => it.id !== existingItem?.id);
      if (existingItem && otherItems.length > 0 && this.storyDnaRequester) {
        const mergeRow = document.createElement('div');
        mergeRow.dataset.storyDnaMerge = 'object';
        mergeRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:8px;border-top:1px dashed var(--vn-shell-border,rgba(255,255,255,.16));';
        const mergeSel = document.createElement('select');
        mergeSel.dataset.dnaMergeSelect = '';
        mergeSel.setAttribute('aria-label', 'Merge into item');
        mergeSel.style.cssText = 'flex:1;min-width:140px;min-height:44px;padding:6px 8px;border-radius:8px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2));background:var(--vn-shell-panel,rgba(0,0,0,.3));color:inherit;font-size:12px;';
        for (const it of otherItems) {
          const opt = document.createElement('option');
          opt.value = it.id;
          opt.textContent = it.name;
          mergeSel.append(opt);
        }
        const mergeBtn = document.createElement('button');
        mergeBtn.type = 'button';
        mergeBtn.dataset.dnaMergeBtn = '';
        mergeBtn.textContent = 'Merge into target';
        mergeBtn.style.cssText = 'min-height:44px;margin:0;padding:6px 12px;font-size:12px;';
        mergeBtn.onclick = () => {
          const targetId = mergeSel.value;
          if (!targetId) return;
          this.storyDnaRequester?.({ action: 'merge_item', sourceId: existingItem.id, targetId, revision: this.storyDna.revision });
          if (this.trayReturn) this.trayReturn();
        };
        mergeRow.append(mergeSel, mergeBtn);
        form.append(mergeRow);
      }
    }

    const review = document.createElement('section');
    review.dataset.storyAutofillReview = '';
    review.hidden = true;
    const fields = new Map(Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-dna-field]'))
      .map(input => [input.dataset.dnaField!, { input, saved: input.value }]));
    const setAutofillStatus = (text: string) => {
      status.textContent = text;
      status.hidden = !text;
      status.setAttribute('role', 'status');
    };
    let savingReview = false;
    const closeReview = () => {
      if (savingReview) return;
      review.hidden = true;
      review.replaceChildren();
      autofillBtn.focus({ preventScroll: true });
    };
    review.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        closeReview();
      }
    });
    const showReview = (proposal: StoryAutofillProposal) => {
      if (!proposal.changes.length) {
        setAutofillStatus('Autofill found no new fields in the revealed passages.');
        return;
      }
      const heading = document.createElement('h4');
      heading.textContent = 'Review suggestions for ' + proposal.name;
      heading.tabIndex = -1;
      const scope = document.createElement('small');
      scope.textContent = 'Revealed through passage ' + (proposal.paragraphIndex + 1);
      const evidence = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Read the source excerpts';
      evidence.append(summary);
      for (const excerpt of proposal.evidence) {
        const quote = document.createElement('blockquote');
        quote.textContent = excerpt;
        evidence.append(quote);
      }
      const choices = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = 'Select fields to apply';
      choices.append(legend);
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.textContent = 'Apply selected fields';
      apply.disabled = true;
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Keep current fields';
      cancel.onclick = closeReview;
      const note = document.createElement('p');
      note.setAttribute('role', 'status');
      const checked = new Set<StoryAutofillField>();
      for (const change of proposal.changes) {
        const label = document.createElement('label');
        label.className = 'story-autofill-field';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.dataset.autofillField = change.field;
        const labelText = document.createElement('strong');
        labelText.textContent = fields.get(change.field)?.input.closest('label')?.querySelector('span')?.textContent ?? change.field;
        const values = document.createElement('small');
        const format = (value: string | string[] | null) => (Array.isArray(value) ? value.join(', ') : value) || 'Empty';
        values.textContent = 'Current: ' + format(change.before) + '\nSuggested: ' + format(change.after);
        box.onchange = () => {
          if (box.checked) checked.add(change.field);
          else checked.delete(change.field);
          apply.disabled = checked.size === 0;
        };
        label.append(box, labelText, values);
        choices.append(label);
      }
      apply.onclick = () => {
        const selected = proposal.changes.filter(change => checked.has(change.field));
        if (!selected.length || apply.disabled) return;
        if (selected.some(change => {
          const field = fields.get(change.field);
          return field && field.input.value !== field.saved;
        })) {
          note.textContent = 'A selected field has unsaved edits in this editor. Keep your edits or deselect that field.';
          return;
        }
        savingReview = true;
        apply.disabled = true;
        cancel.disabled = true;
        autofillBtn.disabled = true;
        choices.disabled = true;
        note.textContent = 'Saving selected fields…';
        this.storyDnaRequester?.({ action: 'apply_autofill', proposalId: proposal.id, fields: [...checked] }, result => {
          if (!this.host.contains(review) || review.hidden) return;
          savingReview = false;
          cancel.disabled = false;
          autofillBtn.disabled = isLocked || !this.storyDnaRequester;
          if ('error' in result) {
            note.textContent = result.error;
            choices.disabled = false;
            apply.disabled = false;
            return;
          }
          if (!('saved' in result)) return;
          for (const change of selected) {
            const field = fields.get(change.field);
            if (!field) continue;
            const value = Array.isArray(change.after) ? change.after.join(', ') : change.after;
            if (field.input.value === field.saved) {
              field.input.value = value;
              field.input.dispatchEvent(new Event('input'));
            }
            field.saved = value;
          }
          setAutofillStatus('Selected autofill fields saved.');
          closeReview();
        });
      };
      const actions = document.createElement('div');
      actions.className = 'story-dna-footer';
      actions.append(cancel, apply);
      review.replaceChildren(heading, scope, evidence, choices, note, actions);
      review.hidden = false;
      heading.focus({ preventScroll: true });
    };
    autofillBtn.onclick = () => {
      if (!review.hidden) closeReview();
      const target = existingLoc ?? existingItem;
      autofillBtn.disabled = true;
      setAutofillStatus('Scanning revealed passages for suggestions…');
      this.storyDnaRequester?.({
        action: 'review_autofill', kind, name: dossier.entity.name,
        ...(target ? { targetId: target.id } : {}),
      }, result => {
        if (!this.host.contains(wrap) || this.host.hidden) return;
        autofillBtn.disabled = isLocked || !this.storyDnaRequester;
        if ('error' in result) setAutofillStatus(result.error);
        else if ('proposal' in result) {
          setAutofillStatus('');
          showReview(result.proposal);
        }
      });
    };
    wrap.append(review, form, preview, footer);
    return wrap;
  }

  close(): void {
    this.activeDossierContext = null;
    this.activeDocumentRecord = null;
    this.trayRender = null;
    this.awaitingDnaSync = false;
    this.documentState(false);
    if (this.host.hidden) return;
    this.host.hidden = true;
    this.trayReturn = null;
    if (!this.host.dataset.vnWorkspaceTool) {
      this.query = '';
      this.category = 'all';
      this.selectedEntityId = null;
    }
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target?.isConnected) target.focus();
    else this.host.parentElement?.focus();
    this.closeCallback();
  }

  destroy(): void {
    this.documentState(false);
    this.host.remove();
  }
}

export { DOSSIER_CSS, DOCKED_DOSSIER_CSS } from "./dossier-css.js";
