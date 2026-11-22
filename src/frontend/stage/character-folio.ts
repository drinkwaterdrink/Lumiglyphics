import {isScenarioTitle} from '../../shared/card-role.js';
import {samePresentationTurn} from '../../shared/presentation-entities.js';
import {sceneImageCandidatesFor} from './image-loader.js';
import {DNA_FIELDS,DNA_FIELD_LABELS,dnaFieldValue,applyDnaChanges,type DnaField,type DnaProposal} from '../../shared/character-dna-workflow.js';
import {areNamesEquivalent,findMatchingCharacterId} from '../../shared/nicknames.js';
import type { CharacterDNA, CharacterDNALibrary, CharacterRelationship } from '../../shared/character-dna.js';
import {
  createEmptyCharacterDNA,
  findCharacterDNA,
  formatCharacterDNAForImagePrompt,
  formatCharacterDNAToTags,
} from '../../shared/character-dna.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';
import { FullscreenLightbox } from './fullscreen-lightbox.js';
import { openReferenceCropperModal } from './reference-cropper.js';
import { InteractionTray } from './interaction-tray.js';
import type { DraftMergeMode, InteractionDraft } from '../../shared/scene-interactions.js';
import type { WorkspaceSurface } from './reader-workspace.js';
import type { TurnView, AssetView } from '../../protocol.js';

export interface CharacterFolioHandlers {
  onSaveDNA?: (dna: CharacterDNA,revision:number) => void;
  onHarvestDNA?: (characterName: string) => void;
  onAutoFillDNA?: (characterName:string,characterId:string,fields?:DnaField[])=>void;
  onApplyDNA?:(proposalId:string,fields:DnaField[])=>void;
  onCancelDNA?:()=>void;
  onDeleteDNA?:(dna:CharacterDNA,revision:number)=>void;
  onRestoreDNA?:(id:string,revision:number)=>void;
  onMergeDNA?:(id:string,otherId:string,revision:number)=>void;
  onScrubSwipesDNA?: () => void;
  onDeleteImage?: (imageUrl: string) => void;
  onPickFromHostGallery?: (callback: (imageUrl: string, caption?: string) => void) => void;
  onConfigureVoice?: (characterName: string) => void;
  onClose?: () => void;
}

export interface CharacterLoreContext {
  quote?: string;
  inScene?: boolean;
  roleTags?: string[];
  observations?: Array<{ key: string; value: string }>;
  facts?: Array<{ field: string; value: string }>;
  playerNote?: string;
  cgs?: Array<{ imageUrl: string; caption?: string }>;
}

export interface CharacterSceneActionTools {
  drafts: InteractionDraft[];
  current: () => string;
  focus: () => void;
  apply: (draft: InteractionDraft, mode: DraftMergeMode) => boolean;
}

export class CharacterFolio implements WorkspaceSurface {
  readonly element: HTMLElement;
  private readonly rosterControls: HTMLElement;
  private readonly rosterCarousel: HTMLElement;
  private readonly detailContainer: HTMLElement;
  private library: Record<string, CharacterDNA> = Object.create(null);
  private loreMap: Record<string, CharacterLoreContext> = Object.create(null);
  private activeCharacterId: string | null = null;
  private activeSubTab: 'dna' | 'relationships' | 'lore' | 'cgs' = 'dna';
  private latestTurnText = '';
  private discoveredIds = new Set<string>();
  private swipeCharacterCache = new Map<string, Map<string, CharacterDNA>>();
  private lastRenderedSwipeKey: string | null = null;
  private turnRpgCompanions = new Map<string, { name: string; affinity: number; status: string }>();
  private storyCursor = "";
  private sceneActionTools: CharacterSceneActionTools | null = null;
  private sceneActionForName: string | null = null;
  private sceneActionResolver?: ((characterName: string) => CharacterSceneActionTools | null) | undefined;
  private chatId:string|null=null;
  private revision=0;
  private dirty=new Set<string>();
  private saving=new Set<string>();
  private savedLibrary:Record<string,CharacterDNA>=Object.create(null);
  private deleted:Record<string,CharacterDNA>={};
  private proposal:DnaProposal|null=null;
  private pending=false;
  private notice='';
  private deleteConfirm=false;
  private mergeOther='';
  private accumulatedCgs = new Map<string, Array<{ imageUrl: string; caption?: string }>>();
  private persistentGalleries: Record<string, Array<{ imageUrl: string; imageId?: string; caption?: string; messageId?: string }>> = Object.create(null);

  setSceneActionTools(tools: CharacterSceneActionTools | null, forCharacterName?: string): void {
    this.sceneActionTools = tools;
    this.sceneActionForName = forCharacterName?.trim() || null;
    if (this.activeCharacterId) this.renderDetail();
  }
  setSceneActionResolver(resolver: ((characterName: string) => CharacterSceneActionTools | null) | undefined): void {
    this.sceneActionResolver = resolver;
  }
  setContext(chatId:string|null):void{
    if(this.chatId===chatId)return;
    this.handlers.onCancelDNA?.();this.chatId=chatId;this.sceneActionTools=null;this.sceneActionForName=null;this.discoveredIds.clear();this.swipeCharacterCache.clear();this.lastRenderedSwipeKey=null;this.turnRpgCompanions.clear();this.activeSubTab='dna';this.library=Object.create(null);this.dirty.clear();this.saving.clear();this.savedLibrary=Object.create(null);this.loreMap=Object.create(null);this.deleted={};this.revision=0;this.activeCharacterId=null;this.proposal=null;this.pending=false;this.notice='';this.latestTurnText='';this.deleteConfirm=false;this.mergeOther='';this.accumulatedCgs.clear();this.persistentGalleries=Object.create(null);this.renderRoster();this.renderDetail();
  }
  getContext():string|null{return this.chatId;}
  setGalleries(galleries?: Record<string, Array<{ imageUrl: string; imageId?: string; caption?: string; messageId?: string }>>): void {
    const next: Record<string, Array<{ imageUrl: string; imageId?: string; caption?: string; messageId?: string }>> = Object.create(null);
    if (galleries) {
      for (const [key, list] of Object.entries(galleries)) {
        if (Array.isArray(list) && list.length > 0) next[key] = list.slice();
      }
    }
    this.persistentGalleries = next;
    this.renderRoster();
    this.renderDetail();
  }
  ingestCgs(items: Array<{ characterName?: string; characterNames?: string[]; imageUrl: string; caption?: string }>): void {
    let changed = false;
    for (const item of items) {
      if (!item.imageUrl) continue;
      const names = (item.characterNames && item.characterNames.length > 0)
        ? item.characterNames
        : item.characterName?.trim() ? [item.characterName.trim()] : [];
      if (names.length === 0) continue;
      for (const rawName of names) {
        const charName = rawName.trim();
        if (!charName) continue;
        const matchId = findMatchingCharacterId(this.library, charName);
        const key = (matchId && this.library[matchId]) ? this.library[matchId].name.toLowerCase() : charName.toLowerCase();
        const list = this.accumulatedCgs.get(key) || [];
        if (!list.some(c => c.imageUrl === item.imageUrl)) {
          list.push({ imageUrl: item.imageUrl, caption: item.caption || 'Scene picture' });
          this.accumulatedCgs.set(key, list);
          changed = true;
        }
      }
    }
    if (changed) {
      this.renderRoster();
      this.renderDetail();
    }
  }

  removeCg(imageUrl: string): void {
    let changed = false;
    for (const [k, list] of this.accumulatedCgs.entries()) {
      const filtered = list.filter(item => item.imageUrl !== imageUrl);
      if (filtered.length !== list.length) {
        this.accumulatedCgs.set(k, filtered);
        changed = true;
      }
    }
    for (const [k, list] of Object.entries(this.persistentGalleries)) {
      const filtered = list.filter(item => item.imageUrl !== imageUrl);
      if (filtered.length !== list.length) {
        if (filtered.length > 0) this.persistentGalleries[k] = filtered;
        else delete this.persistentGalleries[k];
        changed = true;
      }
    }
    for (const char of Object.values(this.library)) {
      let charModified = false;
      if (char.referenceImageUrl === imageUrl) { delete char.referenceImageUrl; delete char.referenceImageId; charModified = true; }
      if (char.secondaryReferenceImageUrl === imageUrl) { delete char.secondaryReferenceImageUrl; delete char.secondaryReferenceImageId; charModified = true; }
      if (char.avatarUrl === imageUrl) { delete char.avatarUrl; charModified = true; }
      if (charModified) {
        char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
        this.dirty.add(char.id);
        this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
        changed = true;
      }
    }
    if (changed) {
      this.renderRoster();
      this.renderDetail();
    }
  }
  invalidateContext():void{this.cancelProposal();this.renderDetail();}
  setProposal(proposal:DnaProposal):void{if(proposal.characterId!==this.activeCharacterId)return;this.pending=false;this.proposal=proposal;this.notice='';this.renderDetail();}
  showError(error:string):void{this.saving.clear();this.pending=false;this.notice=error;this.renderDetail();}
  private cancelProposal():void{if(this.pending||this.proposal)this.handlers.onCancelDNA?.();this.proposal=null;this.pending=false;this.notice='';}


  constructor(private readonly handlers: CharacterFolioHandlers = {}) {
    this.element = document.createElement('div');
    this.element.className = 'character-folio-surface';
    this.element.setAttribute('data-character-folio', 'true');

    this.element.innerHTML = `
      <style>
        .folio-workflow { border:1px solid var(--vn-shell-border,#34505b);border-radius:12px;padding:14px;background:var(--vn-shell-panel,#10212b);font-size:13px;line-height:1.5;overflow-wrap:anywhere; }
        .folio-workflow h3 {margin:0 0 8px;font-size:17px;}
        .folio-workflow p {margin:8px 0;}
        .folio-workflow > button {margin:6px 6px 0 0;}
        .folio-suggestion {display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:12px 0;border-bottom:1px solid var(--vn-shell-border,#34505b);}
        .folio-suggestion input {width:20px;height:20px;}
        .folio-suggestion small {grid-column:2;color:var(--vn-shell-accent,#8ae9b3);font-weight:700;}
        .folio-workflow summary {min-height:44px;display:flex;align-items:center;cursor:pointer;}
        .folio-workflow select {width:100%;min-height:44px;}
        .folio-action-btn:disabled,.btn-field-autofill:disabled {opacity:.5;cursor:default;}
        .folio-action-btn:focus-visible,.btn-field-autofill:focus-visible {outline:2px solid var(--vn-shell-accent,#8ae9b3);outline-offset:2px;}
        .character-folio-surface .folio-prompt-header {display:block;}
        .character-folio-surface .folio-prompt-header span {display:block;margin-bottom:4px;}
        .folio-source-status {font-size:11px;opacity:.8;}
        .character-folio-surface .btn-field-autofill {min-width:44px;min-height:44px;}
        .character-folio-surface button {min-height:44px;min-width:44px;}
        .character-folio-surface .folio-field input {min-height:44px;box-sizing:border-box;}
        @media (pointer: coarse) {
          .character-folio-surface input,
          .character-folio-surface textarea {font-size:16px !important;}
        }
        .character-folio-surface .folio-hero-avatar {width:60px;height:60px;}

        .character-folio-surface {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          width: 100% !important;
          min-height: 0 !important;
          flex: 1 1 auto !important;
          overflow: hidden !important;
          background: transparent;
          color: var(--vn-shell-text, #e2e8f0);
          font-family: var(--vn-shell-family, ui-sans-serif, system-ui, sans-serif);
          box-sizing: border-box !important;
        }
        /* Top Horizontal Swipeable Cast Roster Carousel */
        .folio-roster-carousel {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: color-mix(in srgb, var(--vn-shell-field, #0d161a) 72%, transparent);
          border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
          flex-shrink: 0;
          scrollbar-width: none;
        }
        .folio-roster-carousel::-webkit-scrollbar {
          display: none;
        }
        .folio-roster-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px 5px 6px;
          border-radius: var(--vn-shell-radius, 9999px);
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.12));
          background: var(--vn-shell-button, rgba(255, 255, 255, 0.06));
          color: inherit;
          cursor: pointer;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .folio-roster-item:hover {
          background: var(--vn-shell-bg-hover, rgba(255, 255, 255, 0.1));
        }
        .folio-roster-item:active {
          transform: scale(0.97);
        }
        .folio-roster-item.active {
          background: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 18%, var(--vn-shell-button, rgba(255, 255, 255, 0.08)));
          border-color: var(--vn-shell-accent, #6ee7b7);
          color: var(--vn-shell-text, #fff);
          font-weight: 700;
        }
        .folio-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--vn-shell-field, rgba(255, 255, 255, 0.12));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.15));
        }
        .folio-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .folio-roster-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .folio-roster-name {
          font-size: 12px;
          white-space: nowrap;
        }
        .in-scene-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--vn-shell-accent, #34d399);
          box-shadow: 0 0 6px color-mix(in srgb, var(--vn-shell-accent, #34d399) 75%, transparent);
        }
        .folio-lock-badge {
          font-size: 11px;
          opacity: 0.85;
        }
        .folio-add-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          border-radius: 9999px;
          border: 1px dashed var(--vn-shell-border, rgba(255, 255, 255, 0.25));
          background: transparent;
          color: var(--vn-shell-muted, #94a3b8);
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .folio-add-chip:hover {
          color: var(--vn-shell-text, #f1f5f9);
          border-color: var(--vn-shell-accent, #6ee7b7);
        }

        /* Natural Full-Height Single Scroll Container */
        .folio-scroll-body {
          flex: 1 1 0% !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-y !important;
          overscroll-behavior: contain !important;
          padding: 14px 14px calc(28px + env(safe-area-inset-bottom, 0px)) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 14px !important;
        }
        .folio-scroll-body > * {
          flex-shrink:0;
          box-sizing: border-box !important;
        }
        .folio-scroll-body::-webkit-scrollbar {
          width: 6px;
        }
        .folio-scroll-body::-webkit-scrollbar-thumb {
          background: var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          border-radius: 3px;
        }

        /* Hero Section */
        .folio-profile-card {
          flex-shrink:0;
          background: var(--vn-shell-panel, rgba(15, 23, 42, 0.7));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }
        .folio-hero-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .folio-hero-avatar {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.18));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .folio-hero-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .folio-hero-title {
          flex: 1;
          min-width: 0;
        }
        .folio-hero-title h2 {
          margin: 0;
          font-family: var(--vn-shell-display-font, inherit);
          font-size: 18px;
          font-weight: 700;
          color: var(--vn-shell-text, #f1f5f9);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .folio-hero-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .folio-tag {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--vn-shell-field, rgba(255, 255, 255, 0.08));
          color: var(--vn-shell-text, #cbd5e1);
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
        }
        .folio-tag.tag-scene {
          background: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 16%, transparent);
          color: var(--vn-shell-accent, #6ee7b7);
          border-color: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 38%, transparent);
        }
        .folio-tag.tag-lock {
          background: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 18%, transparent);
          color: var(--vn-shell-accent, #6ee7b7);
          border-color: var(--vn-shell-accent, #6ee7b7);
        }

        /* Hero Action Buttons */
        .folio-hero-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
          gap: 8px;
          padding-top: 6px;
          border-top: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
        }
        .folio-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height:44px;
          padding: 8px 10px;
          border-radius: min(var(--vn-shell-radius, 12px), 10px);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          background: var(--vn-shell-button, rgba(255, 255, 255, 0.06));
          color: var(--vn-shell-text, #f1f5f9);
          transition: background 0.15s ease, filter 0.15s ease;
          white-space: nowrap;
        }
        .folio-action-btn:hover {
          background: var(--vn-shell-bg-hover, rgba(255, 255, 255, 0.12));
        }
        .folio-action-btn:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }
        .folio-action-btn.btn-accent {
          background: var(--vn-shell-accent, #6ee7b7);
          color: var(--vn-shell-accent-contrast, #0b1114);
          border-color: var(--vn-shell-accent, #6ee7b7);
        }
        .folio-action-btn.btn-accent:hover {
          filter: brightness(1.1);
        }

        /* Sticky Sub-Tab Navigation */
        .folio-subtabs {
          position: sticky;
          top: -14px;
          z-index: 8;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
          gap: 4px;
          padding: 4px;
          background: var(--vn-shell-panel, rgba(15, 23, 42, 0.95));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .subtab-btn {
          padding: 8px 10px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
          color: var(--vn-shell-muted, #94a3b8);
          text-align: center;
          transition: all 0.15s ease;
        }
        .subtab-btn:hover {
          color: var(--vn-shell-text, #fff);
        }
        .subtab-btn.active {
          background: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 20%, transparent);
          color: var(--vn-shell-accent, #6ee7b7);
          border-color: var(--vn-shell-accent, #6ee7b7);
        }

        /* Group Cards & Form Fields */
        .folio-group-card {
          background: var(--vn-shell-panel, rgba(15, 23, 42, 0.6));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .folio-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.06));
          padding-bottom: 8px;
        }
        .folio-group-header h4 {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--vn-shell-accent, #6ee7b7);
        }
        .folio-fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .folio-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .folio-field label {
          font-size: 11px;
          color: var(--vn-shell-muted, #94a3b8);
          font-weight: 500;
        }
        .folio-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .folio-input-wrap input,
        .folio-input-wrap textarea {
          width: 100%;
          padding: 8px 34px 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.12));
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.25));
          color: var(--vn-shell-text, #f1f5f9);
          font-size: 12px;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }
        .folio-input-wrap input:focus,
        .folio-input-wrap textarea:focus {
          outline: none;
          border-color: var(--vn-shell-accent, #6ee7b7);
        }
        .btn-field-autofill {
          position: absolute;
          right: 4px;
          width: 34px;
          height: 34px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--vn-shell-muted, #94a3b8);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 14px;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .btn-field-autofill:hover {
          color: var(--vn-shell-accent, #6ee7b7);
          background: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 12%, transparent);
        }

        /* Prompt Preview Box */
        .folio-prompt-preview {
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.35));
          border: 1px dashed var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          border-radius: min(var(--vn-shell-radius, 12px), 10px);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .folio-prompt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
          color: var(--vn-shell-accent, #6ee7b7);
        }
        .folio-prompt-text {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--vn-shell-text, #e2e8f0);
          word-break: break-word;
          background: color-mix(in srgb, var(--vn-shell-bg, #0d161a) 55%, transparent);
          padding: 8px 10px;
          border-radius: 6px;
          margin: 0;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
        }

        /* Relationships Tab & Constellation Web */
        .rel-web-wrap {
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.28));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          padding: 8px;
          overflow: hidden;
        }
        .rel-web-svg {
          width: 100%;
          height: auto;
          display: block;
          max-height: 240px;
        }
        .rel-web-node {
          cursor: pointer;
        }
        .rel-bond-card {
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.25));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.15s ease;
        }
        .rel-bond-card.is-highlighted {
          border-color: var(--vn-shell-accent, #6ee7b7);
        }
        .rel-bond-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rel-bond-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--vn-shell-text, #f8fafc);
        }
        .rel-bond-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .rel-meter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 10px;
        }
        .rel-slider-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rel-slider-row input[type="range"] {
          flex: 1;
          accent-color: var(--vn-shell-accent, #6ee7b7);
        }
        .rel-slider-row input[type="number"] {
          width: 68px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.12));
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.3));
          color: var(--vn-shell-text, #f1f5f9);
          font-size: 12px;
        }
        .rel-text-input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.12));
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.25));
          color: var(--vn-shell-text, #f1f5f9);
          font-size: 12px;
          box-sizing: border-box;
          font-family: inherit;
        }
        .rel-beat-list {
          margin: 4px 0 0;
          padding-left: 18px;
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--vn-shell-muted, #cbd5e1);
        }
        .rel-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rel-btn-sm {
          min-height: 34px;
          padding: 5px 12px;
          font-size: 11.5px;
        }

        /* Lore Tab Styles */
        .folio-quote-box {
          border-left: 3px solid var(--vn-shell-accent, #6ee7b7);
          padding: 8px 12px;
          font-style: italic;
          font-size: 13px;
          line-height: 1.5;
          background: var(--vn-shell-field, rgba(255, 255, 255, 0.04));
          border-radius: 0 8px 8px 0;
          color: var(--vn-shell-text, #f1f5f9);
        }
        .folio-observations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 8px;
        }
        .observation-card {
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.25));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.06));
          border-radius: 8px;
          padding: 8px 10px;
        }
        .observation-key {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--vn-shell-muted, #94a3b8);
          margin-bottom: 2px;
        }
        .observation-val {
          font-size: 12px;
          font-weight: 600;
          color: var(--vn-shell-text, #f1f5f9);
        }

        /* CGs Tab Styles */
        .folio-cgs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        .folio-cg-card {
          border-radius: min(var(--vn-shell-radius, 12px), 10px);
          overflow: hidden;
          background: var(--vn-shell-panel, rgba(0, 0, 0, 0.3));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          display: flex;
          flex-direction: column;
        }
        .folio-cg-thumb {
          width: 100%;
          height: 160px;
          object-fit: cover;
          cursor: pointer;
          display: block;
        }
        .folio-cg-footer {
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.4));
          gap: 6px;
        }
        .folio-cg-caption {
          font-size: 10.5px;
          color: var(--vn-shell-muted, #94a3b8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .btn-set-avatar {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          background: var(--vn-shell-button, rgba(255, 255, 255, 0.08));
          color: var(--vn-shell-text, #f1f5f9);
          cursor: pointer;
          flex-shrink: 0;
        }
        .btn-set-avatar:hover {
          background: var(--vn-shell-accent, #6ee7b7);
          color: var(--vn-shell-accent-contrast, #000);
        }

        .folio-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--vn-shell-muted, #94a3b8);
          text-align: center;
          gap: 8px;
        }
      </style>
      <div class="folio-roster-controls" data-folio-roster-controls hidden style="display:flex;align-items:center;gap:6px;padding:8px 14px 2px;background:color-mix(in srgb,var(--vn-shell-field,#0d161a) 72%,transparent);flex-shrink:0;"></div>
      <div class="folio-roster-carousel" data-folio-roster></div>
      <div class="folio-scroll-body" data-folio-body></div>
    `;

    this.rosterControls = this.element.querySelector('[data-folio-roster-controls]')!;
    this.rosterCarousel = this.element.querySelector('[data-folio-roster]')!;
    this.detailContainer = this.element.querySelector('[data-folio-body]')!;

  }

  enter(): void {
    if (!this.activeCharacterId && Object.keys(this.library).length > 0) {
      this.activeCharacterId = Object.keys(this.library)[0]!;
    }
    this.renderRoster();
    this.renderDetail();
  }

  leave(): void {
    // Keep character selection state
  }

  syncFromTurn(turn: TurnView | null, paragraphIndex = 0): void {
    const cursorKey=JSON.stringify([turn?.chatId,turn?.messageId,turn?.swipeId,turn?.sourceFingerprint,turn?.revision,paragraphIndex]);
    const currentSwipeKey = turn?.messageId ? `${turn.messageId}::${turn.swipeId ?? 0}` : null;
    if (this.lastRenderedSwipeKey && currentSwipeKey && this.lastRenderedSwipeKey !== currentSwipeKey) {
      for (const [id, dna] of Object.entries(this.library)) {
        const isTemporary = Boolean(dna.autoDiscovered || this.discoveredIds.has(id));
        if (!isTemporary || dna.locked || this.dirty.has(id) || this.saving.has(id)) continue;
        const swipes = dna.seenInSwipes && dna.seenInSwipes.length > 0 ? dna.seenInSwipes : [this.lastRenderedSwipeKey];
        for (const sKey of swipes) {
          let bucket = this.swipeCharacterCache.get(sKey);
          if (!bucket) { bucket = new Map(); this.swipeCharacterCache.set(sKey, bucket); }
          bucket.set(id, structuredClone(dna));
        }
        if (!swipes.includes(currentSwipeKey)) {
          delete this.library[id];
          delete this.savedLibrary[id];
          this.discoveredIds.delete(id);
        }
      }
      const cachedBucket = this.swipeCharacterCache.get(currentSwipeKey);
      if (cachedBucket) {
        for (const [id, cachedDna] of cachedBucket.entries()) {
          if (!this.library[id] && !this.deleted[id] && !findCharacterDNA(this.deleted, cachedDna.name)) {
            this.library[id] = structuredClone(cachedDna);
            this.discoveredIds.add(id);
          }
        }
      }
    }
    if (currentSwipeKey) this.lastRenderedSwipeKey = currentSwipeKey;
    const cancelledProposal=this.storyCursor!==cursorKey&&(this.pending||Boolean(this.proposal));
    if(this.storyCursor!==cursorKey){if(cancelledProposal)this.cancelProposal();this.storyCursor=cursorKey;this.sceneActionTools=null;this.sceneActionForName=null;}
    const before = JSON.stringify([this.loreMap,Object.keys(this.library)]);
    this.loreMap = Object.create(null);
    const cursor = turn && Number.isInteger(paragraphIndex) ? Math.min(paragraphIndex,turn.paragraphs.length-1) : -1;
    const visibleAssets = (turn?.assets ?? []).filter(asset=>asset.paragraphIndex<=cursor);
    const visibleText = (turn?.paragraphs ?? []).slice(0,Math.max(0,cursor+1)).join('\n\n');
    const mentioned = (name:string) => {
      const escaped=name.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return Boolean(escaped)&&new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`,'iu').test(visibleText);
    };
    const detectedNames = new Set<string>();

    // Collect latest story text for fast local regex auto-fill
    this.latestTurnText = visibleText;
    this.turnRpgCompanions.clear();
    for (const comp of turn?.rpgState?.vitals?.companions ?? []) {
      if (comp.name?.trim()) {
        this.turnRpgCompanions.set(comp.name.trim().toLowerCase(), {
          name: comp.name.trim(),
          affinity: Number.isFinite(comp.affinity) ? Math.round(comp.affinity) : 0,
          status: comp.status || '',
        });
      }
    }

    // 1. From presentation snapshots (NPC entities + observations/quotes/facts)
    const candidate=turn?.presentation&&cursor>=0?selectPresentationSnapshot(turn.presentation,cursor):undefined;
    const snapshot=candidate&&turn&&samePresentationTurn(candidate.at.key,{chatId:turn.chatId,assistantMessageId:turn.messageId,swipeId:turn.swipeId,sourceFingerprint:turn.sourceFingerprint,revision:turn.revision})?candidate:undefined;
    for (const snap of snapshot?[snapshot]:[]) {
      for (const ent of snap.entities ?? []) {
        if (ent.kind === 'npc' && ent.name?.trim()) {
          const name = ent.name.trim();
          detectedNames.add(name);
          const key = name.toLowerCase();
          const existingLore = this.loreMap[key] || {};
          const presentInSnap = snap.presentEntityIds ? snap.presentEntityIds.includes(ent.id) : false; if (!mentioned(name) && !presentInSnap) { detectedNames.delete(name); continue; } existingLore.inScene = snap.presentEntityIds?.includes(ent.id) ?? true;
          const anyEnt = ent as any;
          if (anyEnt.quote) existingLore.quote = anyEnt.quote;
          if (Array.isArray(anyEnt.verifiedObservations) && anyEnt.verifiedObservations.length) existingLore.observations = anyEnt.verifiedObservations;
          if (ent.facts?.length) existingLore.facts = ent.facts;
          if (anyEnt.playerNote) existingLore.playerNote = anyEnt.playerNote;
          this.loreMap[key] = existingLore;
        }
      }
    }

    // 2. From subject candidates
    for (const cand of (turn?.subjectCandidates ?? []) as any[]) {
      if (typeof cand === 'string' && cand.trim() && mentioned(cand)) {
        detectedNames.add(cand.trim());
      } else if (cand && typeof cand === 'object' && typeof cand.name === 'string' && cand.name.trim() && mentioned(cand.name)) {
        detectedNames.add(cand.name.trim());
      }
    }

    // 3. From assets stageAsset character & CG collection
    for (const asset of visibleAssets) {
      const charNames = asset.stageAsset?.characters ?? (asset.stageAsset?.character ? [asset.stageAsset.character] : []);
      const imageUrl = ['generated','browser_ready'].includes(asset.status) ? sceneImageCandidatesFor(asset)[0] : undefined;
      if (charNames.length > 0 && imageUrl) {
        for (const rawName of charNames) {
          const charName = rawName.trim();
          if (!charName) continue;
          detectedNames.add(charName);
          const matchingId = findMatchingCharacterId(this.library, charName);
          const key = (matchingId && this.library[matchingId]) ? this.library[matchingId].name.toLowerCase() : charName.toLowerCase();
          const existingLore = this.loreMap[key] || {};
          existingLore.cgs = existingLore.cgs || [];
          if (!existingLore.cgs.some(c => c.imageUrl === imageUrl)) {
            existingLore.cgs.unshift({
              imageUrl,
              caption: asset.stageAsset?.attire || asset.stageAsset?.role || 'Scene portrait'
            });
          }
          this.loreMap[key] = existingLore;
          const accList = this.accumulatedCgs.get(key) || [];
          if (!accList.some(c => c.imageUrl === imageUrl)) {
            accList.unshift({
              imageUrl,
              caption: asset.stageAsset?.attire || asset.stageAsset?.role || 'Scene portrait'
            });
            this.accumulatedCgs.set(key, accList);
          }
        }
      }
    }

    // 4. From cast if present
    const anyCast = (turn as any)?.cast;
    if (Array.isArray(anyCast)) {
      for (const c of anyCast) {
        if (c && typeof c === 'object' && typeof c.name === 'string' && c.name.trim() && mentioned(c.name)) {
          detectedNames.add(c.name.trim());
        }
      }
    }

    let changed = false;
    const names = new Set([...detectedNames].map(name=>name.toLowerCase()));
    for(const id of this.discoveredIds){const dna=this.library[id];if(!dna){this.discoveredIds.delete(id);continue;}
      if(!names.has(dna.name.toLowerCase())&&!this.savedLibrary[id]&&!this.dirty.has(id)&&!this.saving.has(id)){delete this.library[id];this.discoveredIds.delete(id);changed=true;}}
    if(this.activeCharacterId&&!this.library[this.activeCharacterId])this.activeCharacterId=null;
    for (const name of detectedNames) {
      const key = name.trim().toLowerCase();
      let match = Object.values(this.library).find(c => c.name.toLowerCase() === key || c.aliases.some(a => a.toLowerCase() === key));
      if (!match) {
        const matchId = findMatchingCharacterId(this.library, name);
        if (matchId && this.library[matchId]) {
          match = this.library[matchId];
          if (!match.aliases.some(a => a.toLowerCase() === key) && match.name.toLowerCase() !== key) {
            match.aliases.push(name.trim());
            changed = true;
          }
        }
      }
      if (match && currentSwipeKey && match.autoDiscovered) { const seen = match.seenInSwipes ?? []; if (!seen.includes(currentSwipeKey)) match.seenInSwipes = [...seen, currentSwipeKey].slice(-60); let bucket = this.swipeCharacterCache.get(currentSwipeKey); if (!bucket) { bucket = new Map(); this.swipeCharacterCache.set(currentSwipeKey, bucket); } bucket.set(match.id, structuredClone(match)); }
      const isDeleted = Boolean(isScenarioTitle(name) || findCharacterDNA(this.deleted, name) || findMatchingCharacterId(this.deleted, name));
      if (!match && !isDeleted) {
        const dna = createEmptyCharacterDNA(name);
        const assetWithImage = visibleAssets.find(a => {
          const aName = a.stageAsset?.character?.trim();
          return aName && areNamesEquivalent(aName, name) && ['generated','browser_ready'].includes(a.status) && sceneImageCandidatesFor(a).length > 0;
        });
        if (assetWithImage) {
          dna.avatarUrl = sceneImageCandidatesFor(assetWithImage)[0];
        }
        this.library[dna.id] = dna;
        dna.autoDiscovered = true; if (currentSwipeKey) { dna.seenInSwipes = [currentSwipeKey]; let bucket = this.swipeCharacterCache.get(currentSwipeKey); if (!bucket) { bucket = new Map(); this.swipeCharacterCache.set(currentSwipeKey, bucket); } bucket.set(dna.id, structuredClone(dna)); } this.discoveredIds.add(dna.id);
        changed = true;
      }
    }

    if (cancelledProposal || changed || !this.activeCharacterId || before!==JSON.stringify([this.loreMap,Object.keys(this.library)])) {
      if (!this.activeCharacterId && Object.keys(this.library).length > 0) {
        this.activeCharacterId = Object.keys(this.library)[0]!;
      }
      this.renderRoster();
      // Asset/cursor notifications must not replace the textarea under active typing.
      const owner=this.element.getRootNode?.() as Document|ShadowRoot|undefined;
      const editing=owner?.activeElement;
      if(!editing||!this.element.contains(editing)||!editing.matches('input,textarea,select'))this.renderDetail();
    }
  }

  setLibrary(library: CharacterDNALibrary | Record<string, CharacterDNA>, completed=true,acceptedSave?:{id:string;updatedAt:number}): void {
    const authoritative='characters'in library;
    if(authoritative){const saved=library as CharacterDNALibrary;if((saved.revision??0)<this.revision)return;this.revision=saved.revision??0;this.deleted=saved.deleted??{};if(saved.warnings?.length)this.notice=saved.warnings.join(' ');}
    const incoming = (authoritative ? library.characters : library) as Record<string, CharacterDNA>;
    if(acceptedSave)this.saving.delete(acceptedSave.id);
    if(acceptedSave&&this.library[acceptedSave.id]?.lastUpdated===acceptedSave.updatedAt)this.dirty.delete(acceptedSave.id);
    const next:Record<string,CharacterDNA>=Object.create(null);
    for(const dna of Object.values(this.library)){
      const incomingMatch=Object.values(incoming).some(c=>c.id===dna.id);
      if(authoritative&&dna.autoDiscovered&&!dna.locked&&!incomingMatch&&!this.dirty.has(dna.id)&&!this.saving.has(dna.id))continue;
      if(!this.deleted[dna.id]&&(incomingMatch||!findCharacterDNA(this.deleted,dna.name)))next[dna.id]=dna;
    }
    for(const dna of Object.values(incoming)){
      if(this.dirty.has(dna.id)&&next[dna.id]){
        const local=next[dna.id]!,base=this.savedLibrary[dna.id];
        if(base){for(const path of DNA_FIELDS){if(JSON.stringify(dnaFieldValue(local,path))!==JSON.stringify(dnaFieldValue(base,path)))continue;const[a,b]=path.split('.'),value=structuredClone(dnaFieldValue(dna,path));if(b){if(value===undefined)delete(local as any)[a!][b];else(local as any)[a!][b]=value;}else{if(value===undefined)delete(local as any)[a!];else(local as any)[a!]=value;}}
          for(const key of ['locked','avatarUrl','notes'] as const)if(local[key]===base[key]){if(dna[key]===undefined)delete(local as any)[key];else(local as any)[key]=dna[key];}
          if(JSON.stringify(local.relationships??[])===JSON.stringify(base.relationships??[])){local.relationships=structuredClone(dna.relationships??[]);}
        }
        this.savedLibrary[dna.id]=structuredClone(dna);continue;
      }
      this.savedLibrary[dna.id]=structuredClone(dna);
      const previous=findCharacterDNA(next,dna.id)||findCharacterDNA(next,dna.name);
      if(previous)delete next[previous.id];
      // Focused controls close over this object. Refresh it in place rather than leaving stale save handlers behind.
      if(previous&&previous.id===dna.id){for(const key of Object.keys(previous))delete(previous as any)[key];Object.assign(previous,structuredClone(dna));next[dna.id]=previous;}
      else next[dna.id]=structuredClone(dna);
    }
    this.library=next;
    for(const id of this.dirty)if(!next[id])this.dirty.delete(id);
    if(authoritative&&completed){this.pending=false;this.proposal=null;}
    if (!this.activeCharacterId || !this.library[this.activeCharacterId]) {
      const first = Object.keys(this.library)[0];
      this.activeCharacterId = first || null;
    }
    this.renderRoster();
    const save=this.element.querySelector<HTMLButtonElement>('[data-dna-save]');if(save)save.disabled=!this.activeCharacterId||!this.dirty.has(this.activeCharacterId)||this.saving.has(this.activeCharacterId);
    const stickyWrap=this.element.querySelector<HTMLElement>('[data-folio-sticky-save]');if(stickyWrap)stickyWrap.hidden=!this.activeCharacterId||!this.dirty.has(this.activeCharacterId);
    const stickyBtn=this.element.querySelector<HTMLButtonElement>('[data-dna-sticky-save]');if(stickyBtn)stickyBtn.disabled=!this.activeCharacterId||!this.dirty.has(this.activeCharacterId)||this.saving.has(this.activeCharacterId);
    const saveState=this.element.querySelector('[data-dna-save-state]');if(saveState)saveState.textContent=this.activeCharacterId&&this.dirty.has(this.activeCharacterId)?'Unsaved changes — Save changes to use in pictures':'Saved DNA is used for matching pictured characters';
    const focused=document.activeElement;if(!focused||!this.element.contains(focused)||!focused.matches('input,textarea'))this.renderDetail();
  }

  setActiveCharacter(idOrName: string): void {
    this.cancelProposal();
    if (!idOrName || !idOrName.trim()) {
      if (!this.activeCharacterId || !this.library[this.activeCharacterId]) {
        const first = Object.keys(this.library)[0];
        this.activeCharacterId = first || null;
      }
      this.renderRoster();
      this.renderDetail();
      return;
    }
    const key = idOrName.trim().toLowerCase();
    const byIdentity = findCharacterDNA(this.library, idOrName);
    if (byIdentity) {
      this.activeCharacterId = byIdentity.id;
      this.renderRoster();
      this.renderDetail();
      return;
    }
    const matchingId = findMatchingCharacterId(this.library, idOrName);
    if (matchingId && this.library[matchingId]) {
      this.activeCharacterId = matchingId;
      this.renderRoster();
      this.renderDetail();
      return;
    }
    if (this.library[key]) {
      this.activeCharacterId = key;
    } else {
      const match = Object.values(this.library).find(c => c.name.toLowerCase() === key || c.aliases.some(a => a.toLowerCase() === key));
      if (match) {
        this.activeCharacterId = match.id;
      } else {
        const created = createEmptyCharacterDNA(idOrName.trim());
        this.library[created.id] = created;
        this.activeCharacterId = created.id;
      }
    }
    this.renderRoster();
    this.renderDetail();
  }

  private rosterQuery = '';
  private rosterInSceneOnly = false;

  private renderRoster(): void {
    this.rosterControls.replaceChildren();
    this.rosterCarousel.replaceChildren();
    const characters = Object.values(this.library);

    if (characters.length > 4) {
      this.rosterControls.hidden = false;
      const search = document.createElement('input');
      search.type = 'search';
      search.setAttribute('data-folio-roster-search', '');
      search.placeholder = 'Filter cast…';
      search.setAttribute('aria-label', 'Filter cast roster');
      search.value = this.rosterQuery;
      search.style.cssText = 'flex:1;min-width:120px;min-height:44px;padding:6px 10px;border-radius:10px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.18));background:var(--vn-shell-field,rgba(0,0,0,.25));color:inherit;font-size:12px;';
      search.oninput = () => {
        this.rosterQuery = search.value;
        this.renderRoster();
        const nextInput = this.rosterControls.querySelector<HTMLInputElement>('[data-folio-roster-search]');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange?.(this.rosterQuery.length, this.rosterQuery.length);
        }
      };

      const inSceneBtn = document.createElement('button');
      inSceneBtn.type = 'button';
      inSceneBtn.setAttribute('data-folio-roster-inscene', '');
      inSceneBtn.setAttribute('aria-pressed', String(this.rosterInSceneOnly));
      inSceneBtn.textContent = this.rosterInSceneOnly ? 'In Scene ✓' : 'In Scene';
      inSceneBtn.style.cssText = `min-height:44px;min-width:44px;padding:6px 12px;border-radius:10px;font-size:11.5px;font-weight:650;cursor:pointer;border:1px solid ${this.rosterInSceneOnly ? 'var(--vn-shell-accent,#38bdf8)' : 'var(--vn-shell-border,rgba(255,255,255,.18))'};background:${this.rosterInSceneOnly ? 'color-mix(in srgb,var(--vn-shell-accent,#38bdf8) 18%,transparent)' : 'var(--vn-shell-button,rgba(255,255,255,.06))'};color:inherit;white-space:nowrap;`;
      inSceneBtn.onclick = () => {
        this.rosterInSceneOnly = !this.rosterInSceneOnly;
        this.renderRoster();
      };

      this.rosterControls.append(search, inSceneBtn);
    } else {
      this.rosterControls.hidden = true;
    }

    const q = this.rosterQuery.trim().toLowerCase();
    const visibleCharacters = characters.filter((char) => {
      const charKey = char.name.toLowerCase();
      const lore = this.loreMap[charKey] || this.loreMap[char.id] || {};
      if (this.rosterInSceneOnly && !lore.inScene && this.activeCharacterId !== char.id) return false;
      if (!q) return true;
      return charKey.includes(q) || (char.aliases ?? []).some((a) => a.toLowerCase().includes(q));
    });

    for (const char of visibleCharacters) {
      const charKey = char.name.toLowerCase();
      const lore = this.loreMap[charKey] || this.loreMap[char.id] || {};
      const isActive = this.activeCharacterId === char.id;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `folio-roster-item${isActive ? ' active' : ''}`;
      chip.onclick = () => {
        this.cancelProposal();this.deleteConfirm=false;this.mergeOther='';
        this.activeCharacterId = char.id;
        this.renderRoster();
        this.renderDetail();
      };

      const avatar = document.createElement('div');
      avatar.className = 'folio-avatar';
      if (char.avatarUrl) {
        const img = document.createElement('img');
        img.src = char.avatarUrl;
        img.alt = char.name;
        avatar.append(img);
      } else {
        avatar.textContent = (char.name[0] || '?').toUpperCase();
      }

      const meta = document.createElement('div');
      meta.className = 'folio-roster-meta';
      const name = document.createElement('span');
      name.className = 'folio-roster-name';
      name.textContent = char.name;
      meta.append(name);

      if (lore.inScene) {
        const dot = document.createElement('span');
        dot.className = 'in-scene-dot';
        dot.title = 'Present in active scene';
        meta.append(dot);
      }

      if (char.locked) {
        const lock = document.createElement('span');
        lock.className = 'folio-lock-badge';
        lock.title = 'Locked DNA';
        lock.textContent = '🔒';
        meta.append(lock);
      }

      chip.append(avatar, meta);
      this.rosterCarousel.append(chip);
    }

    // + Add Custom Character Button
    const addChip = document.createElement('button');
    addChip.type = 'button';
    addChip.className = 'folio-add-chip';
    addChip.innerHTML = `<span>+</span><span>Add Character</span>`;
    const commitNewCharacter = (rawName: string) => {
      const trimmed = rawName.trim();
      if (!trimmed) return;
      if (trimmed.length > 160) { this.showError('Character names must be 160 characters or fewer.'); return; }
      const existing = findCharacterDNA(this.library, trimmed);
      if (existing) { this.setActiveCharacter(existing.id); return; }
      if (findCharacterDNA(this.deleted, trimmed)) { this.notice = 'This character was deleted. Use Undo delete to restore it.'; this.renderDetail(); return; }
      const created = createEmptyCharacterDNA(trimmed);
      created.autoDiscovered = false;
      this.library[created.id] = created;
      this.activeCharacterId = created.id;
      this.handlers.onSaveDNA?.(created, this.revision);
      this.renderRoster();
      this.renderDetail();
    };
    addChip.onclick = () => {
      const existingForm = this.rosterCarousel.querySelector('[data-folio-inline-add]');
      if (existingForm) { (existingForm.querySelector('input') as HTMLInputElement | null)?.focus(); return; }
      const form = document.createElement('div');
      form.setAttribute('data-folio-inline-add', '');
      form.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:10px;background:rgba(15,23,42,0.92);border:1px solid rgba(110,231,183,0.45);';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = 'Character name...';
      inp.maxLength = 160;
      inp.style.cssText = 'width:130px;background:transparent;border:none;outline:none;color:#f8fafc;font-size:12px;padding:3px 4px;';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'folio-action-btn';
      ok.textContent = 'Add';
      ok.style.cssText = 'padding:3px 8px;font-size:11px;';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'folio-action-btn';
      cancel.textContent = '✕';
      cancel.style.cssText = 'padding:3px 6px;font-size:11px;opacity:0.75;';
      ok.onclick = () => { const v = inp.value; form.remove(); commitNewCharacter(v); };
      cancel.onclick = () => form.remove();
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } else if (e.key === 'Escape') { e.preventDefault(); form.remove(); } };
      form.append(inp, ok, cancel);
      this.rosterCarousel.insertBefore(form, addChip);
      inp.focus();
    };
    this.rosterCarousel.append(addChip);
    const last=Object.values(this.deleted).at(-1);if(last){const undo=document.createElement('button');undo.type='button';undo.className='folio-action-btn';undo.textContent='Undo delete';undo.onclick=()=>this.handlers.onRestoreDNA?.(last.id,this.revision);this.rosterCarousel.append(undo);}
    if (this.handlers.onScrubSwipesDNA && Object.values(this.library).some(c => c.autoDiscovered && !c.locked)) {
      const scrubBtn = document.createElement('button');
      scrubBtn.type = 'button';
      scrubBtn.className = 'folio-action-btn';
      scrubBtn.setAttribute('data-dna-scrub-swipes', '');
      scrubBtn.textContent = '🧹 Scrub Swipes';
      scrubBtn.title = 'Remove un-locked auto-discovered characters from discarded swipes';
      scrubBtn.onclick = () => this.handlers.onScrubSwipesDNA?.();
      this.rosterCarousel.append(scrubBtn);
    }
  }

  private renderDetail(): void {
    this.detailContainer.replaceChildren();
    if (!this.activeCharacterId || !this.library[this.activeCharacterId]) {
      const empty = document.createElement('div');
      empty.className = 'folio-empty';
      empty.innerHTML = `<span>Select a character from the cast roster or create one to inspect their Visual DNA.</span>`;
      this.detailContainer.append(empty);
      return;
    }

    const char = this.library[this.activeCharacterId]!;
    const charKey = char.name.toLowerCase();
    const lore = this.loreMap[charKey] || this.loreMap[char.id] || {};
    const isMale = char.build.gender?.toLowerCase() === 'man' || char.build.gender?.toLowerCase() === 'male';

    // 1. HERO SECTION
    const heroCard = document.createElement('section');
    heroCard.className = 'folio-profile-card';

    const heroTop = document.createElement('div');
    heroTop.className = 'folio-hero-top';

    const heroAvatar = document.createElement('div');
    heroAvatar.className = 'folio-hero-avatar';
    if (char.avatarUrl) {
      const img = document.createElement('img');
      img.src = char.avatarUrl;
      img.alt = char.name;
      heroAvatar.append(img);
    } else {
      heroAvatar.textContent = (char.name[0] || '?').toUpperCase();
    }

    const heroTitle = document.createElement('div');
    heroTitle.className = 'folio-hero-title';
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    const h2 = document.createElement('h2');
    h2.textContent = char.name;
    h2.style.margin = '0';
    titleRow.append(h2);

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'folio-action-btn';
    renameBtn.style.cssText = 'font-size:11px;padding:2px 8px;border-radius:4px;';
    renameBtn.innerHTML = '✏️ <span>Reveal True Name</span>';
    renameBtn.title = 'Reveal true name or rename character (demotes previous name to alias)';
    renameBtn.onclick = () => {
      const current = char.name;
      const next = typeof window !== 'undefined' ? window.prompt?.(`Enter revealed true name for "${current}" (previous name will be kept as an alias):`, current) : null;
      if (!next || !next.trim() || next.trim() === current) return;
      const newName = next.trim();
      const oldName = char.name;
      char.name = newName;
      if (!char.aliases) char.aliases = [];
      if (!char.aliases.some(a => a.toLowerCase() === oldName.toLowerCase())) {
        char.aliases.push(oldName);
      }
      char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
      this.dirty.add(char.id);
      this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
      this.renderRoster();
      this.renderDetail();
    };
    titleRow.append(renameBtn);

    const metaTags = document.createElement('div');
    metaTags.className = 'folio-hero-meta';

    const voicePill = document.createElement('button');
    voicePill.type = 'button';
    voicePill.className = 'folio-tag folio-voice-pill';
    voicePill.style.cssText = 'cursor:pointer;background:rgba(99,102,241,0.18);color:#c7d2fe;border:1px solid rgba(99,102,241,0.35);font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;';
    voicePill.textContent = '🎙️ Voice';
    voicePill.title = 'Assign or preview character voice in Settings';
    voicePill.onclick = () => {
      this.handlers.onConfigureVoice?.(char.name);
    };
    metaTags.append(voicePill);

    if (lore.observations?.length || (char.mindLedger && ((char.mindLedger.knownFacts?.length ?? 0) > 0 || (char.mindLedger.falseBeliefs?.length ?? 0) > 0))) {
      const clueChip = document.createElement('span');
      clueChip.className = 'folio-tag tag-clues';
      clueChip.style.cssText = 'background:rgba(234,179,8,0.18);color:#fde047;border:1px solid rgba(234,179,8,0.35);font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;';
      clueChip.textContent = '🔍 Clues Active';
      metaTags.append(clueChip);
    }

    if (char.locked) {
      const lockTag = document.createElement('span');
      lockTag.className = 'folio-tag tag-lock folio-lock-badge';
      lockTag.textContent = '🔒 Locked';
      metaTags.append(lockTag);
    }

    if (lore.inScene) {
      const sceneTag = document.createElement('span');
      sceneTag.className = 'folio-tag tag-scene';
      sceneTag.textContent = '● In Scene';
      metaTags.append(sceneTag);
    }

    if (char.build.species) {
      const speciesTag = document.createElement('span');
      speciesTag.className = 'folio-tag';
      speciesTag.textContent = char.build.species;
      metaTags.append(speciesTag);
    }

    if (char.build.gender) {
      const genderTag = document.createElement('span');
      genderTag.className = 'folio-tag';
      genderTag.textContent = char.build.gender;
      metaTags.append(genderTag);
    }

    heroTitle.append(titleRow, metaTags);
    heroTop.append(heroAvatar, heroTitle);

    // Global Actions
    const heroActions = document.createElement('div');
    heroActions.className = 'folio-hero-actions';

    const autoFillAllBtn = document.createElement('button');
    autoFillAllBtn.type = 'button';autoFillAllBtn.setAttribute('aria-label','Auto-Fill All');
    autoFillAllBtn.className = 'folio-action-btn btn-accent';
    autoFillAllBtn.innerHTML = `✨ <span>Auto-Fill All</span>`;
    autoFillAllBtn.disabled=char.locked||this.pending;
    autoFillAllBtn.onclick = () => {
      this.autoFillAllFields(char);
    };

    const lockToggleBtn = document.createElement('button');
    lockToggleBtn.type = 'button';lockToggleBtn.setAttribute('aria-label',char.locked?'Unlock DNA':'Lock DNA');
    lockToggleBtn.className = 'folio-action-btn';
    lockToggleBtn.innerHTML = char.locked ? `🔓 <span>Unlock DNA</span>` : `🔒 <span>Lock DNA</span>`;
    lockToggleBtn.onclick = () => {
      this.cancelProposal();
      char.locked = !char.locked;char.autoDiscovered=false;char.lastUpdated=Math.max(Date.now(),char.lastUpdated+1);this.dirty.add(char.id);
      this.handlers.onSaveDNA?.(structuredClone(char),this.revision);
      this.renderRoster();
      this.renderDetail();
    };

    const copyPromptBtn = document.createElement('button');
    copyPromptBtn.type = 'button';copyPromptBtn.setAttribute('aria-label','Copy Prompt');
    copyPromptBtn.className = 'folio-action-btn';
    copyPromptBtn.innerHTML = `📋 <span>Copy Prompt</span>`;
    copyPromptBtn.onclick = async () => {
      try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(formatCharacterDNAForImagePrompt(char));copyPromptBtn.textContent='Copied!';}
      catch{copyPromptBtn.textContent='Copy failed — try again';}
    };
    const deleteButton=document.createElement('button');deleteButton.type='button';deleteButton.className='folio-action-btn';deleteButton.textContent='Delete character';deleteButton.onclick=()=>{this.cancelProposal();this.deleteConfirm=true;this.renderDetail();};

    const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='folio-action-btn btn-accent';saveButton.textContent='Save changes';saveButton.setAttribute('data-dna-save','');saveButton.disabled=!this.dirty.has(char.id)||this.saving.has(char.id);saveButton.onclick=()=>{this.cancelProposal();char.autoDiscovered=false;this.saving.add(char.id);saveButton.disabled=true;this.handlers.onSaveDNA?.(structuredClone(char),this.revision);};
    heroActions.append(autoFillAllBtn, lockToggleBtn, copyPromptBtn,deleteButton,saveButton);
    const heroAliases = document.createElement('div');
    heroAliases.className = 'folio-hero-aliases';
    heroAliases.style.cssText = 'margin:10px 0 6px;padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.14);border-radius:8px;display:flex;flex-direction:column;gap:4px;';
    const aliasHeader = document.createElement('div');
    aliasHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
    const aliasTitle = document.createElement('label');
    aliasTitle.style.cssText = 'font-size:11.5px;font-weight:700;color:var(--vn-accent,#a8d3c8);display:flex;align-items:center;gap:5px;';
    aliasTitle.innerHTML = '🏷️ <span>Aliases & Nicknames</span>';
    const aliasSubtitle = document.createElement('small');
    aliasSubtitle.style.cssText = 'font-size:10px;opacity:0.65;font-weight:400;';
    aliasSubtitle.textContent = 'SimTracker, lore & prompt matching';
    aliasHeader.append(aliasTitle, aliasSubtitle);
    const aliasInput = document.createElement('input');
    aliasInput.type = 'text';
    aliasInput.className = 'folio-aliases-input';
    aliasInput.placeholder = 'e.g. Mars, Lady Vane, Headmistress (comma-separated)';
    aliasInput.value = (char.aliases ?? []).join(', ');
    aliasInput.style.cssText = 'width:100%;box-sizing:border-box;padding:6px 10px;font-size:12px;border-radius:6px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.3);color:inherit;';
    aliasInput.setAttribute('aria-label', `Aliases and nicknames for ${char.name}`);
    aliasInput.oninput = () => {
      char.aliases = aliasInput.value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
      this.dirty.add(char.id);
      const save = this.element.querySelector<HTMLButtonElement>('[data-dna-save]');
      if (save) save.disabled = this.saving.has(char.id);
      const sw = this.element.querySelector<HTMLElement>('[data-folio-sticky-save]');
      if (sw) sw.hidden = false;
      const sb = this.element.querySelector<HTMLButtonElement>('[data-dna-sticky-save]');
      if (sb) sb.disabled = this.saving.has(char.id);
      const idGridInput = this.element.querySelector<HTMLInputElement>(`#dna-${char.id}-Aliases---Known-As`);
      if (idGridInput && idGridInput !== aliasInput) idGridInput.value = aliasInput.value;
    };
    heroAliases.append(aliasHeader, aliasInput);
    heroCard.append(heroTop, heroAliases, heroActions);
    this.detailContainer.append(heroCard);
    const resolvedActionTools = this.sceneActionResolver?.(char.name)
      ?? (this.sceneActionTools && (!this.sceneActionForName || areNamesEquivalent(this.sceneActionForName, char.name)) ? this.sceneActionTools : null);
    if (lore?.inScene === true && resolvedActionTools && resolvedActionTools.drafts.length > 0) {
      const actionWrap = document.createElement('div');
      actionWrap.setAttribute('data-folio-scene-actions', '');
      actionWrap.append(new InteractionTray(resolvedActionTools.drafts, resolvedActionTools.current, (draft, mode) => {
        if (!resolvedActionTools.apply(draft, mode)) return false;
        this.handlers.onClose?.();
        resolvedActionTools.focus();
        return true;
      }).host);
      this.detailContainer.append(actionWrap);
    }
    this.renderWorkflow(char);

    // 2. STICKY SUB-TABS SELECTOR
    const subtabs = document.createElement('div');
    subtabs.className = 'folio-subtabs';

    const dnaTabBtn = document.createElement('button');
    dnaTabBtn.type = 'button';
    dnaTabBtn.setAttribute('data-subtab', 'dna');
    dnaTabBtn.className = `subtab-btn${this.activeSubTab === 'dna' ? ' active' : ''}`;
    dnaTabBtn.innerHTML = `✨ Visual DNA`;
    dnaTabBtn.onclick = () => {
      this.activeSubTab = 'dna';
      this.renderDetail();
    };

    const effectiveBondData = this.collectEffectiveBonds(char, lore);
    const bondCount = effectiveBondData.bonds.length;
    const relTabBtn = document.createElement('button');
    relTabBtn.type = 'button';
    relTabBtn.setAttribute('data-subtab', 'relationships');
    relTabBtn.className = `subtab-btn${this.activeSubTab === 'relationships' ? ' active' : ''}`;
    relTabBtn.textContent = bondCount > 0 ? `🤝 Relationships (${bondCount})` : '🤝 Relationships';
    relTabBtn.onclick = () => {
      this.activeSubTab = 'relationships';
      this.renderDetail();
    };

    const loreTabBtn = document.createElement('button');
    loreTabBtn.type = 'button';
    loreTabBtn.setAttribute('data-subtab', 'lore');
    loreTabBtn.className = `subtab-btn${this.activeSubTab === 'lore' ? ' active' : ''}`;
    loreTabBtn.innerHTML = `📖 Story Lore`;
    loreTabBtn.onclick = () => {
      this.activeSubTab = 'lore';
      this.renderDetail();
    };

    const cgsCount = this.collectCharacterCgs(char).length;
    const cgsTabBtn = document.createElement('button');
    cgsTabBtn.type = 'button';
    cgsTabBtn.setAttribute('data-subtab', 'cgs');
    cgsTabBtn.className = `subtab-btn${this.activeSubTab === 'cgs' ? ' active' : ''}`;
    cgsTabBtn.textContent = `🖼️ Gallery & References (${cgsCount})`;
    cgsTabBtn.onclick = () => {
      this.activeSubTab = 'cgs';
      this.renderDetail();
    };

    subtabs.append(dnaTabBtn, relTabBtn, loreTabBtn, cgsTabBtn);
    this.detailContainer.append(subtabs);

    // 3. TAB CONTENT
    if (this.activeSubTab === 'dna') {
      this.renderDnaTab(char, isMale);
    } else if (this.activeSubTab === 'relationships') {
      this.renderRelationshipsTab(char, lore);
    } else if (this.activeSubTab === 'lore') {
      this.renderLoreTab(char, lore);
    } else if (this.activeSubTab === 'cgs') {
      this.renderCgsTab(char, lore);
    }

    const stickySave = document.createElement('div');
    stickySave.setAttribute('data-folio-sticky-save', '');
    stickySave.hidden = !this.dirty.has(char.id);
    stickySave.style.cssText = 'position:sticky;bottom:0;z-index:8;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(15,23,42,0.96);border:1px solid rgba(110,231,183,0.45);box-shadow:0 8px 24px rgba(0,0,0,0.45);margin-top:8px;';
    const stickyMsg = document.createElement('span');
    stickyMsg.style.cssText = 'font-size:12px;color:#cbd5e1;';
    stickyMsg.textContent = `Unsaved DNA edits for ${char.name}`;
    const stickyBtn = document.createElement('button');
    stickyBtn.type = 'button';
    stickyBtn.className = 'folio-action-btn btn-accent';
    stickyBtn.setAttribute('data-dna-sticky-save', '');
    stickyBtn.textContent = 'Save changes';
    stickyBtn.disabled = this.saving.has(char.id);
    stickyBtn.onclick = () => {
      this.cancelProposal();
      char.autoDiscovered = false;
      this.saving.add(char.id);
      stickyBtn.disabled = true;
      this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
    };
    stickySave.append(stickyMsg, stickyBtn);
    this.detailContainer.append(stickySave);
  }

  private renderDnaTab(char: CharacterDNA, isMale: boolean): void {
    // Live Prompt Injection Preview Box
    const previewBox = document.createElement('details');
    previewBox.className = 'folio-prompt-preview';

    const previewHeader = document.createElement('summary');
    previewHeader.className = 'folio-prompt-header';
    previewHeader.style.cursor = 'pointer';
    previewHeader.innerHTML = `<span>⚡ Appearance Prompt Preview (tap to inspect)</span><span data-dna-save-state style="opacity:0.75;font-size:11px"></span>`;

    const previewCode = document.createElement('p');
    previewCode.className = 'folio-prompt-text';
    const updatePreview = () => {
      const clause = formatCharacterDNAForImagePrompt(char);
      const state=previewHeader.querySelector('[data-dna-save-state]');if(state)state.textContent=this.dirty.has(char.id)?'Unsaved changes — Save changes to use in pictures':'Saved DNA is used for matching pictured characters';
      previewCode.textContent = clause ? `${char.name}: ${clause}.` : `${char.name} has no traits defined yet.`;
    };
    updatePreview();
    previewBox.append(previewHeader, previewCode);
    this.detailContainer.append(previewBox);

    // Helper to persist edits
    const onFieldChange = () => {
      this.cancelProposal();
      char.lastUpdated=Math.max(Date.now(),char.lastUpdated+1);this.dirty.add(char.id);
      const save=this.element.querySelector<HTMLButtonElement>('[data-dna-save]');if(save)save.disabled=this.saving.has(char.id);
      const sw=this.element.querySelector<HTMLElement>('[data-folio-sticky-save]');if(sw)sw.hidden=false;
      const sb=this.element.querySelector<HTMLButtonElement>('[data-dna-sticky-save]');if(sb)sb.disabled=this.saving.has(char.id);
      updatePreview();
    };

    // Helper to auto-fill single field with story text or LLM fallback
    const onSingleAutoFill = (fieldKey:string,_inputEl:HTMLInputElement) => {
      const paths:Record<string,DnaField[]>={age:['build.age'],gender:['build.gender'],species:['build.species'],height:['build.height'],bodyType:['build.bodyType'],bust:['build.bust'],hipsGlutes:['build.hipsGlutes'],skinTone:['build.skinTone'],faceFeatures:['faceFeatures'],demeanor:['demeanor'],hairColor:['hair.color'],hairLength:['hair.length'],hairStyle:['hair.style'],eyeColor:['eyes.color'],eyeShape:['eyes.shape'],signatureOutfit:['signatureOutfit'],activeOutfit:['activeOutfit'],distinguishingFeatures:['distinguishingFeatures']};
      this.requestAutoFill(char,paths[fieldKey]);
    };

    // 1. Identity & Demeanor Card
    const idCard = document.createElement('div');
    idCard.className = 'folio-group-card';
    idCard.innerHTML = `<div class="folio-group-header"><h4>👤 Identity & Demeanor</h4></div>`;
    const idGrid = document.createElement('div');
    idGrid.className = 'folio-fields-grid';

    idGrid.append(
      this.createFormField('Aliases / Known As', (char.aliases ?? []).join(', '), 'e.g. Lady Marseline, Vane, Mars (comma-separated)', v => {
        char.aliases = v.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        onFieldChange();
      }),
      this.createFormField('Age', char.build.age ?? '', 'e.g. late 20s, early 30s', v => { char.build.age = v; onFieldChange(); }, el => onSingleAutoFill('age', el)),
      this.createFormField('Gender', char.build.gender ?? '', 'e.g. woman, man', v => { char.build.gender = v; onFieldChange(); }, el => onSingleAutoFill('gender', el)),
      this.createFormField('Species', char.build.species ?? '', 'e.g. human, elf, kitsune', v => { char.build.species = v; onFieldChange(); }, el => onSingleAutoFill('species', el)),
      this.createFormField('Demeanor & Posture', char.demeanor ?? '', 'e.g. guarded posture, shy gaze', v => { char.demeanor = v; onFieldChange(); }, el => onSingleAutoFill('demeanor', el)),
      this.createFormField('Height', char.build.height ?? '', 'e.g. petite, tall, medium', v => { char.build.height = v; onFieldChange(); }, el => onSingleAutoFill('height', el)),
      this.createFormField('Body Type', char.build.bodyType ?? '', 'e.g. slender, athletic, curvy hourglass', v => { char.build.bodyType = v; onFieldChange(); }, el => onSingleAutoFill('bodyType', el))
    );
    idCard.append(idGrid);

    // 2. Proportions Card
    const propCard = document.createElement('div');
    propCard.className = 'folio-group-card';
    propCard.innerHTML = `<div class="folio-group-header"><h4>📏 Proportions & Complexion</h4></div>`;
    const propGrid = document.createElement('div');
    propGrid.className = 'folio-fields-grid';

    const bustLabel = isMale ? 'Muscular Chest / Shoulders' : 'Bust & Cleavage';
    const bustPlaceholder = isMale ? 'e.g. broad muscular chest' : 'e.g. full bust with natural cleavage';
    propGrid.append(
      this.createFormField(bustLabel, char.build.bust ?? '', bustPlaceholder, v => { char.build.bust = v; onFieldChange(); }, el => onSingleAutoFill('bust', el))
    );

    if (!isMale) {
      propGrid.append(
        this.createFormField('Hips, Waist & Glutes', char.build.hipsGlutes ?? '', 'e.g. curvy hourglass hips, narrow waist', v => { char.build.hipsGlutes = v; onFieldChange(); }, el => onSingleAutoFill('hipsGlutes', el))
      );
    }

    propGrid.append(
      this.createFormField('Skin Tone & Complexion', char.build.skinTone ?? '', 'e.g. fair with light freckles, sun-kissed olive', v => { char.build.skinTone = v; onFieldChange(); }, el => onSingleAutoFill('skinTone', el))
    );
    propCard.append(propGrid);

    // 3. Face, Hair & Eyes Card
    const faceCard = document.createElement('div');
    faceCard.className = 'folio-group-card';
    faceCard.innerHTML = `<div class="folio-group-header"><h4>💇 Face, Hair & Eyes</h4></div>`;
    const faceGrid = document.createElement('div');
    faceGrid.className = 'folio-fields-grid';

    faceGrid.append(
      this.createFormField('Facial Structure', char.faceFeatures ?? '', 'e.g. heart-shaped face, soft full lips', v => { char.faceFeatures = v; onFieldChange(); }, el => onSingleAutoFill('faceFeatures', el)),
      this.createFormField('Hair Color', char.hair.color ?? '', 'e.g. chestnut brown, platinum silver', v => { char.hair.color = v; onFieldChange(); }, el => onSingleAutoFill('hairColor', el)),
      this.createFormField('Hair Length', char.hair.length??'', 'e.g. shoulder-length', v=>{char.hair.length=v;onFieldChange();},el=>onSingleAutoFill('hairLength',el)),
      this.createFormField('Hair Style', char.hair.style??'', 'e.g. loose waves', v=>{char.hair.style=v;onFieldChange();},el=>onSingleAutoFill('hairStyle',el)),
      this.createFormField('Eye Color', char.eyes.color??'', 'e.g. hazel', v=>{char.eyes.color=v;onFieldChange();},el=>onSingleAutoFill('eyeColor',el)),
      this.createFormField('Eye Shape', char.eyes.shape??'', 'e.g. almond-shaped', v=>{char.eyes.shape=v;onFieldChange();},el=>onSingleAutoFill('eyeShape',el))
    );
    faceCard.append(faceGrid);

    // 4. Wardrobe & Consistency Anchors Card
    const wardCard = document.createElement('div');
    wardCard.className = 'folio-group-card';
    wardCard.innerHTML = `<div class="folio-group-header"><h4>👗 Wardrobe & Consistency Anchors</h4></div>`;
    const wardGrid = document.createElement('div');
    wardGrid.className = 'folio-fields-grid';

    wardGrid.append(
      this.createFormField('Signature Attire (Default outfit)', char.signatureOutfit ?? '', 'e.g. stiff canvas work apron over faded midi dress', v => { char.signatureOutfit = v; onFieldChange(); }, el => onSingleAutoFill('signatureOutfit', el)),
      this.createFormField('Active Scene Attire (Dynamic override)', char.activeOutfit ?? '', 'Overrides default outfit for current scene only', v => { char.activeOutfit = v; onFieldChange(); }, el => onSingleAutoFill('activeOutfit', el)),
      this.createFormField('Distinguishing Marks & Anchors', char.distinguishingFeatures.join(', '), 'e.g. dry clay packed under nails, blush on neck', v => {
        char.distinguishingFeatures = v.split(',').map(s => s.trim()).filter(Boolean);
        onFieldChange();
      }, el => onSingleAutoFill('distinguishingFeatures', el))
    );
    wardCard.append(wardGrid);
    // Wardrobe Locker & Presets
    const lockerBox = document.createElement('div');
    lockerBox.style.cssText = 'margin-top:10px;padding:10px;border-radius:8px;background:rgba(15,23,42,0.5);border:1px solid rgba(148,163,184,0.2);display:flex;flex-direction:column;gap:8px;';

    const lockerHdr = document.createElement('div');
    lockerHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;';
    const lockerTitle = document.createElement('strong');
    lockerTitle.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#a7f3d0;';
    lockerTitle.textContent = '👗 Wardrobe Locker & Scene Locking';

    const lockToggleWrap = document.createElement('label');
    lockToggleWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11.5px;color:#cbd5e1;cursor:pointer;';
    const lockBox = document.createElement('input');
    lockBox.type = 'checkbox';
    lockBox.checked = Boolean(char.lockActiveWardrobe);
    lockBox.onchange = () => {
      char.lockActiveWardrobe = lockBox.checked;
      char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
      this.dirty.add(char.id);
      this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
    };
    const lockLbl = document.createElement('span');
    lockLbl.textContent = '🔒 Lock active wardrobe across scenes';
    lockToggleWrap.append(lockBox, lockLbl);
    lockerHdr.append(lockerTitle, lockToggleWrap);
    lockerBox.append(lockerHdr);

    const presetWrap = document.createElement('div');
    presetWrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;';
    const states = char.wardrobeStates ?? {};
    for (const [key, outfitVal] of Object.entries(states)) {
      const chip = document.createElement('div');
      chip.style.cssText = 'display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:11px;background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.3);';
      const isActive = char.activeWardrobeKey === key || char.activeOutfit === outfitVal;
      if (isActive) {
        chip.style.borderColor = '#6ee7b7';
        chip.style.background = 'rgba(110,231,183,0.18)';
      }
      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.style.cssText = 'background:none;border:none;color:inherit;cursor:pointer;font-size:inherit;font-weight:600;padding:0;';
      selectBtn.textContent = key;
      selectBtn.title = outfitVal;
      selectBtn.onclick = () => {
        char.activeWardrobeKey = key;
        char.activeOutfit = outfitVal;
        char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
        this.dirty.add(char.id);
        this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
        this.renderDetail();
      };
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.style.cssText = 'background:none;border:none;color:rgba(248,113,113,0.8);cursor:pointer;font-size:12px;padding:0 2px;';
      delBtn.textContent = '×';
      delBtn.title = `Delete ${key} preset`;
      delBtn.onclick = (e) => {
        e.stopPropagation();
        delete states[key];
        if (char.wardrobeThumbnails) delete char.wardrobeThumbnails[key];
        if (char.activeWardrobeKey === key) delete char.activeWardrobeKey;
        char.wardrobeStates = { ...states };
        char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
        this.dirty.add(char.id);
        this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
        this.renderDetail();
      };
      chip.append(selectBtn, delBtn);
      presetWrap.append(chip);
    }

    const addPresetBtn = document.createElement('button');
    addPresetBtn.type = 'button';
    addPresetBtn.className = 'folio-action-btn';
    addPresetBtn.style.cssText = 'padding:3px 9px;font-size:11px;border-radius:999px;';
    addPresetBtn.textContent = '+ Add Wardrobe Preset';
    addPresetBtn.onclick = () => {
      const name = typeof window !== 'undefined' ? window.prompt?.('Enter name for wardrobe preset (e.g. Formal, Battle Armor, Casual):') : null;
      if (!name || !name.trim()) return;
      const desc = typeof window !== 'undefined' ? window.prompt?.(`Enter visual attire description for "${name}":`, char.activeOutfit || char.signatureOutfit || '') : null;
      if (!desc || !desc.trim()) return;
      if (!char.wardrobeStates) char.wardrobeStates = {};
      char.wardrobeStates[name.trim()] = desc.trim();
      char.activeWardrobeKey = name.trim();
      char.activeOutfit = desc.trim();
      char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
      this.dirty.add(char.id);
      this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
      this.renderDetail();
    };
    presetWrap.append(addPresetBtn);
    lockerBox.append(presetWrap);
    wardCard.append(lockerBox);
    if (char.transientConditions?.length) {
      const condWrap = document.createElement('div');
      condWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;';
      for (const cond of char.transientConditions) {
        const pill = document.createElement('span');
        pill.style.cssText = 'font-size:11px;padding:3px 8px;border-radius:999px;background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.3);color:#fde68a;';
        pill.textContent = cond;
        condWrap.append(pill);
      }
      wardCard.append(condWrap);
    }
    if (char.mindLedger && ((char.mindLedger.knownFacts?.length ?? 0) > 0 || (char.mindLedger.falseBeliefs?.length ?? 0) > 0 || (char.mindLedger.secrets?.length ?? 0) > 0)) {
      const mlCard = document.createElement('div');
      mlCard.style.cssText = 'margin-top:10px;padding:10px;border-radius:8px;background:rgba(15,23,42,0.5);border:1px solid rgba(148,163,184,0.2);display:flex;flex-direction:column;gap:4px;';
      const mlHdr = document.createElement('div');
      mlHdr.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#93c5fd;';
      mlHdr.textContent = '🧠 Epistemic Mind Ledger';
      mlCard.append(mlHdr);
      const addList = (title: string, items?: string[]) => {
        if (!items?.length) return;
        const p = document.createElement('div');
        p.style.cssText = 'font-size:11.5px;line-height:1.4;color:#e2e8f0;';
        const b = document.createElement('strong');
        b.textContent = `${title}: `;
        const s = document.createElement('span');
        s.textContent = items.join(' · ');
        p.append(b, s);
        mlCard.append(p);
      };
      addList('Known Facts', char.mindLedger.knownFacts);
      addList('False Beliefs', char.mindLedger.falseBeliefs);
      addList('Secrets', char.mindLedger.secrets);
      wardCard.append(mlCard);
    }

    this.detailContainer.append(idCard, propCard, faceCard, wardCard);
  }

  private escapeSvgText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private collectEffectiveBonds(
    char: CharacterDNA,
    lore: CharacterLoreContext
  ): {
    bonds: Array<CharacterRelationship & { fromRpgCompanion?: boolean }>;
    signals: Array<{ field: string; value: string }>;
    incoming: Array<{ fromName: string; bond: CharacterRelationship }>;
  } {
    const bonds: Array<CharacterRelationship & { fromRpgCompanion?: boolean }> = structuredClone(char.relationships ?? []);

    // Match active RPG companion telemetry against this character's name or aliases
    const candidates = [char.name, ...(char.aliases ?? [])].map((n) => n.trim().toLowerCase()).filter(Boolean);
    for (const [compKey, comp] of this.turnRpgCompanions.entries()) {
      const matched =
        candidates.includes(compKey) ||
        candidates.some((c) => areNamesEquivalent(c, comp.name));
      if (!matched) continue;
      if (!bonds.some((b) => b.targetName.trim().toLowerCase() === 'protagonist / user')) {
        bonds.unshift({
          targetName: 'Protagonist / User',
          affinity: Math.max(-100, Math.min(100, Math.round(comp.affinity))),
          trust: 0,
          dynamicLabel: 'Companion',
          status: comp.status || 'Tracked in RPG companion state',
          recentBeats: [],
          lastUpdated: Date.now(),
          fromRpgCompanion: true,
        });
      }
      break;
    }

    const signals = (lore.facts ?? []).filter((f) =>
      /relationship|affinity|trust|bond|dynamic/i.test(f.field || '')
    );

    const incoming: Array<{ fromName: string; bond: CharacterRelationship }> = [];
    for (const other of Object.values(this.library)) {
      if (other.id === char.id) continue;
      for (const rel of other.relationships ?? []) {
        const tgt = rel.targetName.trim().toLowerCase();
        if (candidates.includes(tgt) || candidates.some((c) => areNamesEquivalent(c, rel.targetName))) {
          incoming.push({ fromName: other.name, bond: rel });
        }
      }
    }

    return { bonds, signals, incoming };
  }

  private renderRelationshipsTab(char: CharacterDNA, lore: CharacterLoreContext): void {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '12px';

    const { bonds, signals, incoming } = this.collectEffectiveBonds(char, lore);

    const persistRelationships = (nextRels: CharacterRelationship[], noticeMsg?: string) => {
      char.relationships = nextRels.slice(0, 40);
      char.autoDiscovered = false;
      char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
      this.dirty.add(char.id);
      if (noticeMsg) this.notice = noticeMsg;
      this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
      this.renderRoster();
      this.renderDetail();
    };

    // 1. Relationship Constellation Web Card
    const webCard = document.createElement('div');
    webCard.className = 'folio-group-card';
    const webHeader = document.createElement('div');
    webHeader.className = 'folio-group-header';
    const webTitle = document.createElement('h4');
    webTitle.textContent = '🕸️ Relationship Constellation Web';
    const webHeaderRight = document.createElement('div');
    webHeaderRight.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const zoomControls = document.createElement('div');
    zoomControls.style.cssText = 'display:inline-flex;gap:3px;';
    let zoomLevel = 1;
    const applyZoom = () => {
      const svgEl = webBox.querySelector('svg');
      if (svgEl) {
        (svgEl as unknown as HTMLElement).style.transform = `scale(${zoomLevel})`;
        (svgEl as unknown as HTMLElement).style.transformOrigin = 'center center';
        (svgEl as unknown as HTMLElement).style.transition = 'transform 0.16s ease';
      }
    };
    const mkZoomBtn = (lbl: string, title: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'folio-action-btn';
      b.textContent = lbl;
      b.title = title;
      b.style.cssText = 'padding:6px 10px;font-size:12px;min-height:44px;min-width:44px;';
      b.onclick = onClick;
      return b;
    };
    zoomControls.append(
      mkZoomBtn('−', 'Zoom out constellation', () => { zoomLevel = Math.max(0.75, Number((zoomLevel - 0.15).toFixed(2))); applyZoom(); }),
      mkZoomBtn('1:1', 'Reset constellation zoom', () => { zoomLevel = 1; applyZoom(); }),
      mkZoomBtn('+', 'Zoom in constellation', () => { zoomLevel = Math.min(1.6, Number((zoomLevel + 0.15).toFixed(2))); applyZoom(); }),
    );
    const webBadge = document.createElement('span');
    webBadge.style.fontSize = '10px';
    webBadge.style.opacity = '0.7';
    webBadge.textContent = `${bonds.length} BOND${bonds.length === 1 ? '' : 'S'}`;
    webHeaderRight.append(zoomControls, webBadge);
    webHeader.appendChild(webTitle);
    webHeader.appendChild(webHeaderRight);
    webCard.appendChild(webHeader);

    const webBox = document.createElement('div');
    webBox.className = 'rel-web-wrap';
    webBox.style.overflow = 'hidden';
    webBox.setAttribute('data-relationship-web', char.id);

    const cx = 210;
    const cy = 110;
    const rx = bonds.length <= 2 ? 128 : 142;
    const ry = bonds.length <= 2 ? 72 : 76;

    const svgLines: string[] = [];
    const svgNodes: string[] = [];

    if (bonds.length === 0) {
      svgNodes.push(
        `<circle cx="${cx}" cy="${cy}" r="66" fill="none" stroke="rgba(148,163,184,0.22)" stroke-dasharray="4 4" stroke-width="1.2" />`,
        `<text x="${cx}" y="${cy + 46}" text-anchor="middle" fill="#94a3b8" font-size="10.5">No tracked bonds yet — add a bond below</text>`
      );
    } else {
      bonds.forEach((bond, idx) => {
        const angle = (-Math.PI / 2) + (idx * 2 * Math.PI) / bonds.length;
        const nx = Math.round(cx + rx * Math.cos(angle));
        const ny = Math.round(cy + ry * Math.sin(angle));
        const strokeColor =
          bond.affinity >= 25
            ? '#34d399'
            : bond.affinity <= -25
              ? '#f43f5e'
              : bond.affinity !== 0 || bond.trust !== 0
                ? '#fbbf24'
                : '#94a3b8';
        const strokeWidth = (1.6 + Math.min(2.4, Math.abs(bond.affinity) / 42)).toFixed(2);
        const mx = Math.round((cx + nx) / 2);
        const my = Math.round((cy + ny) / 2);
        const affLabel = `${bond.affinity >= 0 ? '+' : ''}${bond.affinity}`;
        const shortDyn = bond.dynamicLabel ? bond.dynamicLabel.slice(0, 16) : affLabel;
        const shortTarget = bond.targetName.length > 18 ? `${bond.targetName.slice(0, 16)}…` : bond.targetName;

        svgLines.push(
          `<line class="rel-pulse-filament" x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="0.78" stroke-dasharray="6 4"><animate attributeName="stroke-dashoffset" from="20" to="0" dur="2.2s" repeatCount="indefinite" /></line>`,
          `<rect x="${mx - 26}" y="${my - 9}" width="52" height="16" rx="8" fill="#0f172a" stroke="${strokeColor}" stroke-opacity="0.65" stroke-width="0.9" />`,
          `<text x="${mx}" y="${my + 2.5}" text-anchor="middle" fill="${strokeColor}" font-size="8.5" font-weight="700">${this.escapeSvgText(affLabel)}</text>`
        );

        svgNodes.push(
          `<g class="rel-web-node" data-constellation-node="${this.escapeSvgText(bond.targetName)}" style="cursor:pointer;">`,
          `<circle cx="${nx}" cy="${ny}" r="18" fill="rgba(15,23,42,0.94)" stroke="${strokeColor}" stroke-width="2" />`,
          `<text x="${nx}" y="${ny + 3.5}" text-anchor="middle" fill="#f8fafc" font-size="9.5" font-weight="700">${this.escapeSvgText((bond.targetName[0] || '?').toUpperCase())}</text>`,
          `<text x="${nx}" y="${ny + 30}" text-anchor="middle" fill="#e2e8f0" font-size="9.5" font-weight="600">${this.escapeSvgText(shortTarget)}</text>`,
          `<text x="${nx}" y="${ny + 41}" text-anchor="middle" fill="#94a3b8" font-size="8">${this.escapeSvgText(shortDyn)}</text>`,
          `</g>`
        );
      });
    }

    const centerLabel = char.name.length > 16 ? `${char.name.slice(0, 14)}…` : char.name;
    const centerGroup = `<g><circle cx="${cx}" cy="${cy}" r="24" fill="rgba(16,33,43,0.98)" stroke="var(--vn-shell-accent,#6ee7b7)" stroke-width="2.2" /><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#6ee7b7" font-size="11" font-weight="700">${this.escapeSvgText((char.name[0] || '?').toUpperCase())}</text><text x="${cx}" y="${cy + 36}" text-anchor="middle" fill="#6ee7b7" font-size="9.5" font-weight="700">${this.escapeSvgText(centerLabel)}</text></g>`;

    webBox.innerHTML = `<svg viewBox="0 0 420 220" class="rel-web-svg" role="img" aria-label="Relationship constellation for ${this.escapeSvgText(char.name)}">${svgLines.join('')}${svgNodes.join('')}${centerGroup}</svg>`;

    const confidantInspector = document.createElement('div');
    confidantInspector.setAttribute('data-confidant-inspector', '');
    confidantInspector.hidden = true;
    confidantInspector.style.cssText = 'margin-top:8px;padding:10px 12px;border-radius:8px;border:1px solid rgba(110,231,183,0.3);background:rgba(15,23,42,0.88);display:flex;flex-direction:column;gap:6px;';

    for (const nodeEl of webBox.querySelectorAll('[data-constellation-node]')) {
      (nodeEl as unknown as HTMLElement).addEventListener('click', () => {
        const target = nodeEl.getAttribute('data-constellation-node') || '';
        const bond = bonds.find(b => b.targetName === target);
        if (bond) {
          confidantInspector.hidden = false;
          confidantInspector.replaceChildren();
          const inspHead = document.createElement('div');
          inspHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
          const inspTitle = document.createElement('strong');
          inspTitle.style.cssText = 'font-size:12.5px;color:#f8fafc;';
          inspTitle.textContent = `${bond.targetName} (${bond.affinity >= 0 ? `+${bond.affinity}` : bond.affinity} affinity · Trust ${bond.trust})`;
          const inspClose = document.createElement('button');
          inspClose.type = 'button';
          inspClose.textContent = '×';
          inspClose.className = 'folio-action-btn';
          inspClose.style.cssText = 'padding:4px 10px;min-height:44px;min-width:44px;font-size:14px;';
          inspClose.onclick = () => { confidantInspector.hidden = true; };
          inspHead.append(inspTitle, inspClose);
          const inspMeta = document.createElement('div');
          inspMeta.style.cssText = 'font-size:11.5px;color:#cbd5e1;';
          inspMeta.textContent = [bond.dynamicLabel, bond.status].filter(Boolean).join(' — ') || 'No bond notes recorded yet.';
          const inspActions = document.createElement('div');
          inspActions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
          if (!bond.fromRpgCompanion) {
            const boostBtn = document.createElement('button');
            boostBtn.type = 'button';
            boostBtn.className = 'folio-action-btn btn-accent';
            boostBtn.style.cssText = 'padding:6px 12px;min-height:44px;min-width:44px;font-size:11.5px;';
            boostBtn.textContent = '+5 Affinity';
            boostBtn.onclick = () => {
              const nextRels = structuredClone(char.relationships ?? []);
              const entry = nextRels.find(r => r.targetName === bond.targetName);
              if (entry) {
                entry.affinity = Math.min(100, (entry.affinity ?? 0) + 5);
                entry.lastUpdated = Date.now();
                persistRelationships(nextRels, `Raised affinity with ${bond.targetName}.`);
              }
            };
            inspActions.append(boostBtn);
          }
          const jumpTargetId = findMatchingCharacterId(this.library, bond.targetName);
          if (jumpTargetId && jumpTargetId !== char.id) {
            const jumpBtn = document.createElement('button');
            jumpBtn.type = 'button';
            jumpBtn.className = 'folio-action-btn';
            jumpBtn.style.cssText = 'padding:6px 12px;min-height:44px;min-width:44px;font-size:11.5px;';
            jumpBtn.textContent = `Open ${bond.targetName}’s Folio`;
            jumpBtn.onclick = () => {
              this.activeCharacterId = jumpTargetId;
              this.renderRoster();
              this.renderDetail();
            };
            inspActions.append(jumpBtn);
          }

          const editCardBtn = document.createElement('button');
          editCardBtn.type = 'button';
          editCardBtn.className = 'folio-action-btn';
          editCardBtn.style.cssText = 'padding:6px 12px;min-height:44px;min-width:44px;font-size:11.5px;';
          editCardBtn.textContent = 'Edit Bond Card';
          editCardBtn.onclick = () => {
            const cards = wrap.querySelectorAll('.rel-bond-card');
            for (const c of cards) {
              if (c.getAttribute('data-bond-target') === target) {
                (c as unknown as { scrollIntoView?: (opts?: unknown) => void }).scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                c.querySelector<HTMLInputElement>('[data-bond-dynamic]')?.focus?.();
              }
            }
          };
          inspActions.append(editCardBtn);
          confidantInspector.append(inspHead, inspMeta, inspActions);
        }
        const cards = wrap.querySelectorAll('.rel-bond-card');
        for (const c of cards) c.classList.remove('is-highlighted');
        for (const c of cards) {
          if (c.getAttribute('data-bond-target') === target) {
            c.classList.add('is-highlighted');
            (c as unknown as { scrollIntoView?: (opts?: unknown) => void }).scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
            const dynInput = c.querySelector<HTMLInputElement>('[data-bond-dynamic]');
            dynInput?.focus?.();
          }
        }
      });
    }

    webCard.append(webBox, confidantInspector);
    wrap.append(webCard);

    // 2. Editable Bond Cards
    const bondsSection = document.createElement('div');
    bondsSection.className = 'folio-group-card';
    bondsSection.innerHTML = `<div class="folio-group-header"><h4>💬 Tracked Bonds & Affinities</h4><span style="font-size:10px;opacity:0.7">EDIT & SAVE TO DNA</span></div>`;

    if (bonds.length === 0) {
      const emptyNote = document.createElement('p');
      emptyNote.style.cssText = 'margin:0;font-size:12px;color:var(--vn-shell-muted,#94a3b8);';
      emptyNote.textContent = 'No saved relationships yet. Bonds discovered from SimTracker or RPG companions will appear here automatically, or you can add one below.';
      bondsSection.append(emptyNote);
    }

    for (const bond of bonds) {
      const card = document.createElement('div');
      card.className = 'rel-bond-card';
      card.setAttribute('data-bond-target', bond.targetName);

      const header = document.createElement('div');
      header.className = 'rel-bond-header';
      const title = document.createElement('span');
      title.className = 'rel-bond-title';
      title.textContent = bond.targetName;

      const badges = document.createElement('div');
      badges.className = 'rel-bond-badges';
      const affColor = bond.affinity >= 25 ? '#34d399' : bond.affinity <= -25 ? '#f43f5e' : '#fbbf24';
      const scoreBadge = document.createElement('span');
      scoreBadge.className = 'folio-tag';
      scoreBadge.style.borderColor = affColor;
      scoreBadge.style.color = affColor;
      scoreBadge.textContent = `Affinity ${bond.affinity >= 0 ? '+' : ''}${bond.affinity} · Trust ${bond.trust >= 0 ? '+' : ''}${bond.trust}`;
      badges.append(scoreBadge);

      if (bond.fromRpgCompanion) {
        const rpgBadge = document.createElement('span');
        rpgBadge.className = 'folio-tag';
        rpgBadge.textContent = 'RPG Companion Sync (Unsaved)';
        badges.append(rpgBadge);
      }

      header.append(title, badges);
      card.append(header);

      const meterGrid = document.createElement('div');
      meterGrid.className = 'rel-meter-grid';

      // Affinity slider + number
      const affField = document.createElement('div');
      affField.className = 'folio-field';
      const affLabel = document.createElement('label');
      affLabel.textContent = 'Affinity (-100 to +100)';
      const affRow = document.createElement('div');
      affRow.className = 'rel-slider-row';
      const affRange = document.createElement('input');
      affRange.type = 'range';
      affRange.min = '-100';
      affRange.max = '100';
      affRange.value = String(bond.affinity);
      affRange.setAttribute('data-bond-affinity-range', '');
      const affNum = document.createElement('input');
      affNum.type = 'number';
      affNum.min = '-100';
      affNum.max = '100';
      affNum.value = String(bond.affinity);
      affNum.setAttribute('data-bond-affinity', '');
      affNum.setAttribute('aria-label', `Affinity with ${bond.targetName}`);

      // Trust slider + number
      const trustField = document.createElement('div');
      trustField.className = 'folio-field';
      const trustLabel = document.createElement('label');
      trustLabel.textContent = 'Trust (-100 to +100)';
      const trustRow = document.createElement('div');
      trustRow.className = 'rel-slider-row';
      const trustRange = document.createElement('input');
      trustRange.type = 'range';
      trustRange.min = '-100';
      trustRange.max = '100';
      trustRange.value = String(bond.trust);
      trustRange.setAttribute('data-bond-trust-range', '');
      const trustNum = document.createElement('input');
      trustNum.type = 'number';
      trustNum.min = '-100';
      trustNum.max = '100';
      trustNum.value = String(bond.trust);
      trustNum.setAttribute('data-bond-trust', '');
      trustNum.setAttribute('aria-label', `Trust with ${bond.targetName}`);

      // Dynamic Label & Status
      const textGrid = document.createElement('div');
      textGrid.className = 'rel-meter-grid';

      const dynField = document.createElement('div');
      dynField.className = 'folio-field';
      const dynLabel = document.createElement('label');
      dynLabel.textContent = 'Dynamic Label';
      const dynInput = document.createElement('input');
      dynInput.type = 'text';
      dynInput.maxLength = 160;
      dynInput.className = 'rel-text-input';
      dynInput.value = bond.dynamicLabel || '';
      dynInput.placeholder = 'e.g. reluctant allies, protective mentor, rival';
      dynInput.setAttribute('data-bond-dynamic', '');
      dynInput.setAttribute('aria-label', `Dynamic label with ${bond.targetName}`);
      dynField.append(dynLabel, dynInput);

      const statusField = document.createElement('div');
      statusField.className = 'folio-field';
      const statusLabel = document.createElement('label');
      statusLabel.textContent = 'Current Dynamic / Status';
      const statusInput = document.createElement('input');
      statusInput.type = 'text';
      statusInput.maxLength = 300;
      statusInput.className = 'rel-text-input';
      statusInput.value = bond.status || '';
      statusInput.placeholder = 'Brief summary of current relational standing...';
      statusInput.setAttribute('data-bond-status', '');
      statusInput.setAttribute('aria-label', `Status with ${bond.targetName}`);
      statusField.append(statusLabel, statusInput);

      const markBondDraftDirty = () => {
        const nextAff = Math.max(-100, Math.min(100, Math.round(Number(affNum.value) || 0)));
        const nextTrust = Math.max(-100, Math.min(100, Math.round(Number(trustNum.value) || 0)));
        const nextDyn = dynInput.value.trim().slice(0, 160);
        const nextStatus = statusInput.value.trim().slice(0, 300);
        const nextRels = structuredClone(char.relationships ?? []);
        const idx = nextRels.findIndex(
          (r) => r.targetName.trim().toLowerCase() === bond.targetName.trim().toLowerCase(),
        );
        const draftBond: CharacterRelationship = {
          targetName: bond.targetName.trim().slice(0, 120),
          affinity: nextAff,
          trust: nextTrust,
          dynamicLabel: nextDyn,
          status: nextStatus,
          recentBeats: structuredClone(bond.recentBeats ?? []),
          lastUpdated: Date.now(),
        };
        if (idx >= 0) nextRels[idx] = draftBond;
        else nextRels.push(draftBond);
        char.relationships = nextRels.slice(0, 40);
        char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
        this.dirty.add(char.id);
        const save = this.element.querySelector<HTMLButtonElement>('[data-dna-save]');
        if (save) save.disabled = this.saving.has(char.id);
        const sw = this.element.querySelector<HTMLElement>('[data-folio-sticky-save]');
        if (sw) sw.hidden = false;
        const sb = this.element.querySelector<HTMLButtonElement>('[data-dna-sticky-save]');
        if (sb) sb.disabled = this.saving.has(char.id);
        const state = this.element.querySelector('[data-dna-save-state]');
        if (state) state.textContent = 'Unsaved changes — Save changes to use in pictures';
      };

      affRange.oninput = () => { affNum.value = affRange.value; markBondDraftDirty(); };
      affNum.oninput = () => {
        const clamped = Math.max(-100, Math.min(100, Math.round(Number(affNum.value) || 0)));
        affRange.value = String(clamped);
        markBondDraftDirty();
      };
      affRow.append(affRange, affNum);
      affField.append(affLabel, affRow);

      trustRange.oninput = () => { trustNum.value = trustRange.value; markBondDraftDirty(); };
      trustNum.oninput = () => {
        const clamped = Math.max(-100, Math.min(100, Math.round(Number(trustNum.value) || 0)));
        trustRange.value = String(clamped);
        markBondDraftDirty();
      };
      trustRow.append(trustRange, trustNum);
      trustField.append(trustLabel, trustRow);

      dynInput.oninput = () => markBondDraftDirty();
      statusInput.oninput = () => markBondDraftDirty();

      meterGrid.append(affField, trustField);
      card.append(meterGrid);

      textGrid.append(dynField, statusField);
      card.append(textGrid);

      // Recent Beats
      if (bond.recentBeats && bond.recentBeats.length > 0) {
        const beatsDetails = document.createElement('details');
        const beatsSummary = document.createElement('summary');
        beatsSummary.style.cssText = 'cursor:pointer;font-size:11px;font-weight:600;color:var(--vn-shell-muted,#94a3b8);';
        beatsSummary.textContent = `Recent Relational Beats (${bond.recentBeats.length})`;
        const beatsUl = document.createElement('ul');
        beatsUl.className = 'rel-beat-list';
        for (const beat of bond.recentBeats.slice(0, 6)) {
          const li = document.createElement('li');
          li.textContent = beat.text;
          beatsUl.append(li);
        }
        beatsDetails.append(beatsSummary, beatsUl);
        card.append(beatsDetails);
      }

      // Actions
      const actionRow = document.createElement('div');
      actionRow.className = 'rel-actions-row';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'folio-action-btn rel-btn-sm';
      deleteBtn.textContent = 'Delete Bond';
      deleteBtn.setAttribute('data-bond-delete', bond.targetName);
      deleteBtn.onclick = () => {
        const nextRels = (char.relationships ?? []).filter(
          (r) => r.targetName.trim().toLowerCase() !== bond.targetName.trim().toLowerCase()
        );
        persistRelationships(nextRels, `Removed relationship with ${bond.targetName}.`);
      };

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'folio-action-btn btn-accent rel-btn-sm';
      saveBtn.textContent = bond.fromRpgCompanion ? 'Save to DNA' : 'Save Bond';
      saveBtn.setAttribute('data-bond-save', bond.targetName);
      saveBtn.onclick = () => {
        const nextAff = Math.max(-100, Math.min(100, Math.round(Number(affNum.value) || 0)));
        const nextTrust = Math.max(-100, Math.min(100, Math.round(Number(trustNum.value) || 0)));
        const nextDyn = dynInput.value.trim().slice(0, 160);
        const nextStatus = statusInput.value.trim().slice(0, 300);
        const nextRels = structuredClone(char.relationships ?? []);
        const idx = nextRels.findIndex(
          (r) => r.targetName.trim().toLowerCase() === bond.targetName.trim().toLowerCase()
        );
        const updatedBond: CharacterRelationship = {
          targetName: bond.targetName.trim().slice(0, 120),
          affinity: nextAff,
          trust: nextTrust,
          dynamicLabel: nextDyn,
          status: nextStatus,
          recentBeats: structuredClone(bond.recentBeats ?? []),
          lastUpdated: Date.now(),
        };
        if (idx >= 0) nextRels[idx] = updatedBond;
        else nextRels.push(updatedBond);
        persistRelationships(nextRels, `Saved relationship with ${updatedBond.targetName}.`);
      };

      actionRow.append(deleteBtn, saveBtn);
      card.append(actionRow);
      bondsSection.append(card);
    }

    wrap.append(bondsSection);

    // 3. Incoming Bonds & Narrative Tracker Signals (if present)
    if (incoming.length > 0 || signals.length > 0) {
      const signalsCard = document.createElement('div');
      signalsCard.className = 'folio-group-card';
      signalsCard.innerHTML = `<div class="folio-group-header"><h4>📡 Cross-Cast & Tracker Signals</h4></div>`;
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:var(--vn-shell-text,#f1f5f9);';
      for (const inc of incoming) {
        const li = document.createElement('li');
        li.textContent = `${inc.fromName} → ${char.name}: Affinity ${inc.bond.affinity >= 0 ? '+' : ''}${inc.bond.affinity}${inc.bond.dynamicLabel ? ` (${inc.bond.dynamicLabel})` : ''}${inc.bond.status ? ` — ${inc.bond.status}` : ''}`;
        ul.append(li);
      }
      for (const sig of signals) {
        const li = document.createElement('li');
        li.textContent = `${sig.field}: ${sig.value}`;
        ul.append(li);
      }
      signalsCard.append(ul);
      wrap.append(signalsCard);
    }

    // 4. + Add Relationship Bond Form
    const addCard = document.createElement('div');
    addCard.className = 'folio-group-card';
    addCard.innerHTML = `<div class="folio-group-header"><h4>➕ Add Relationship Bond</h4></div>`;

    const suggestListId = `rel-targets-${char.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const datalist = document.createElement('datalist');
    datalist.setAttribute('id', suggestListId);
    const targetSuggestions = new Set<string>(['Protagonist / User']);
    for (const other of Object.values(this.library)) {
      if (other.id !== char.id && other.name.trim()) targetSuggestions.add(other.name.trim());
    }
    for (const s of targetSuggestions) {
      const opt = document.createElement('option');
      opt.value = s;
      datalist.append(opt);
    }
    addCard.append(datalist);

    const addGrid = document.createElement('div');
    addGrid.className = 'rel-meter-grid';

    const targetField = document.createElement('div');
    targetField.className = 'folio-field';
    const targetLbl = document.createElement('label');
    targetLbl.textContent = 'Target Character / Protagonist';
    const targetInput = document.createElement('input');
    targetInput.type = 'text';
    targetInput.maxLength = 120;
    targetInput.className = 'rel-text-input';
    targetInput.placeholder = 'e.g. Protagonist / User or cast member';
    targetInput.setAttribute('list', suggestListId);
    targetInput.setAttribute('data-add-bond-target', '');
    targetField.append(targetLbl, targetInput);

    const newDynField = document.createElement('div');
    newDynField.className = 'folio-field';
    const newDynLbl = document.createElement('label');
    newDynLbl.textContent = 'Dynamic Label';
    const newDynInput = document.createElement('input');
    newDynInput.type = 'text';
    newDynInput.maxLength = 160;
    newDynInput.className = 'rel-text-input';
    newDynInput.placeholder = 'e.g. trusted confidant, uneasy rival';
    newDynInput.setAttribute('data-add-bond-dynamic', '');
    newDynField.append(newDynLbl, newDynInput);

    const newStatusField = document.createElement('div');
    newStatusField.className = 'folio-field';
    const newStatusLbl = document.createElement('label');
    newStatusLbl.textContent = 'Status / Tension';
    const newStatusInput = document.createElement('input');
    newStatusInput.type = 'text';
    newStatusInput.maxLength = 300;
    newStatusInput.className = 'rel-text-input';
    newStatusInput.placeholder = 'Initial relationship standing...';
    newStatusInput.setAttribute('data-add-bond-status', '');
    newStatusField.append(newStatusLbl, newStatusInput);

    const newAffField = document.createElement('div');
    newAffField.className = 'folio-field';
    const newAffLbl = document.createElement('label');
    newAffLbl.textContent = 'Initial Affinity (-100..100)';
    const newAffInput = document.createElement('input');
    newAffInput.type = 'number';
    newAffInput.min = '-100';
    newAffInput.max = '100';
    newAffInput.value = '0';
    newAffInput.className = 'rel-text-input';
    newAffInput.setAttribute('data-add-bond-affinity', '');
    newAffField.append(newAffLbl, newAffInput);

    addGrid.append(targetField, newDynField, newStatusField, newAffField);
    addCard.append(addGrid);

    const addActions = document.createElement('div');
    addActions.className = 'rel-actions-row';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'folio-action-btn btn-accent rel-btn-sm';
    addBtn.textContent = '+ Add Relationship Bond';
    addBtn.setAttribute('data-add-bond-btn', '');
    addBtn.onclick = () => {
      const targetName = targetInput.value.trim().slice(0, 120);
      if (!targetName) {
        this.notice = 'Enter a target name to add a relationship bond.';
        this.renderDetail();
        return;
      }
      const affinity = Math.max(-100, Math.min(100, Math.round(Number(newAffInput.value) || 0)));
      const nextRels = structuredClone(char.relationships ?? []);
      const idx = nextRels.findIndex((r) => r.targetName.trim().toLowerCase() === targetName.toLowerCase());
      const entry: CharacterRelationship = {
        targetName,
        affinity,
        trust: idx >= 0 ? nextRels[idx]!.trust : 0,
        dynamicLabel: newDynInput.value.trim().slice(0, 160),
        status: newStatusInput.value.trim().slice(0, 300),
        recentBeats: idx >= 0 ? structuredClone(nextRels[idx]!.recentBeats ?? []) : [],
        lastUpdated: Date.now(),
      };
      if (idx >= 0) nextRels[idx] = entry;
      else nextRels.push(entry);
      persistRelationships(nextRels, `Added relationship with ${targetName}.`);
    };
    addActions.append(addBtn);
    addCard.append(addActions);
    wrap.append(addCard);

    this.detailContainer.append(wrap);
  }

  private renderLoreTab(char: CharacterDNA, lore: CharacterLoreContext): void {
    const loreWrap = document.createElement('div');
    loreWrap.style.display = 'flex';
    loreWrap.style.flexDirection = 'column';
    loreWrap.style.gap = '12px';

    // Quote callout if available
    if (lore.quote) {
      const quoteBox = document.createElement('blockquote');
      quoteBox.className = 'folio-quote-box';
      quoteBox.textContent = `“${lore.quote}”`;
      loreWrap.append(quoteBox);
    }

    // Verified Observations Card
    const obsCard = document.createElement('div');
    obsCard.className = 'folio-group-card';
    obsCard.innerHTML = `<div class="folio-group-header"><h4>📖 Verified Observations</h4><span style="font-size:10px;opacity:0.7">ESTABLISHED LORE</span></div>`;

    const obsGrid = document.createElement('div');
    obsGrid.className = 'folio-observations-grid';

    const observations = lore.observations || [
      { key: 'Role / Occupation', value: char.sourceSummary || 'Established in scenario' },
      { key: 'Scene Presence', value: lore.inScene ? 'Present in current scene' : 'Known character' }
    ];

    for (const obs of observations) {
      const card = document.createElement('div');
      card.className = 'observation-card';
      const k = document.createElement('div');
      k.className = 'observation-key';
      k.textContent = obs.key;
      const v = document.createElement('div');
      v.className = 'observation-val';
      v.textContent = obs.value;
      card.append(k, v);
      obsGrid.append(card);
    }
    obsCard.append(obsGrid);
    loreWrap.append(obsCard);

    // Facts list if present (deduplicated)
    if (lore.facts && lore.facts.length > 0) {
      const seenFacts = new Set<string>();
      const dedupedFacts = lore.facts.filter(fact => {
        const key = `${fact.field || ''}::${(fact.value || '').trim().toLowerCase()}`;
        if (seenFacts.has(key)) return false;
        seenFacts.add(key);
        return true;
      });

      if (dedupedFacts.length > 0) {
        const factsCard = document.createElement('div');
        factsCard.className = 'folio-group-card';
        factsCard.innerHTML = `<div class="folio-group-header"><h4>📝 Narrative Facts</h4></div>`;
        const ul = document.createElement('ul');
        ul.style.cssText = 'margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:var(--vn-shell-text);';
        for (const fact of dedupedFacts) {
          const li = document.createElement('li');
          li.textContent = `${fact.field ? `${fact.field}: ` : ''}${fact.value}`;
          ul.append(li);
        }
        factsCard.append(ul);
        loreWrap.append(factsCard);
      }
    }

    // Player Notes
    const notesCard = document.createElement('div');
    notesCard.className = 'folio-group-card';
    notesCard.innerHTML = `<div class="folio-group-header"><h4>✏️ Player Notes</h4><span style="font-size:10px;opacity:0.7">PERSISTENT CHARACTER NOTES</span></div>`;
    const textarea = document.createElement('textarea');
    textarea.setAttribute('data-player-notes', char.id);
    textarea.style.cssText = 'width:100%;height:88px;padding:8px 10px;border-radius:6px;border:1px solid var(--vn-shell-border,rgba(255,255,255,0.12));background:rgba(0,0,0,0.25);color:var(--vn-shell-text,#f1f5f9);font-size:12px;box-sizing:border-box;font-family:inherit;resize:vertical;';
    textarea.placeholder = 'Add private notes about this character...';
    textarea.value = char.notes ?? lore.playerNote ?? '';
    const notesFooter = document.createElement('div');
    notesFooter.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;';
    const notesStatus = document.createElement('small');
    notesStatus.style.cssText = 'font-size:11px;color:var(--vn-shell-muted,#94a3b8);';
    notesStatus.textContent = 'Saved with this character profile';
    const saveNotesBtn = document.createElement('button');
    saveNotesBtn.type = 'button';
    saveNotesBtn.className = 'folio-action-btn rel-btn-sm';
    saveNotesBtn.textContent = 'Save Notes';
    saveNotesBtn.setAttribute('data-save-notes', '');
    const persistNotes = () => {
      const nextNote = textarea.value.trim().slice(0, 1000);
      lore.playerNote = nextNote;
      if (nextNote) char.notes = nextNote;
      else delete char.notes;
      char.autoDiscovered = false;
      char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
      this.dirty.add(char.id);
      this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
      notesStatus.textContent = 'Notes saved ✓';
    };
    textarea.addEventListener('change', persistNotes);
    saveNotesBtn.onclick = persistNotes;
    notesFooter.append(notesStatus, saveNotesBtn);
    notesCard.append(textarea, notesFooter);
    loreWrap.append(notesCard);

    this.detailContainer.append(loreWrap);
  }

  private collectCharacterCgs(char: CharacterDNA): Array<{ imageUrl: string; caption?: string | undefined }> {
    const collected: Array<{ imageUrl: string; caption?: string | undefined }> = [];
    const seenUrls = new Set<string>();
    const matchesCharacter = (key: string) =>
      areNamesEquivalent(key, char.name) || char.aliases.some(a => areNamesEquivalent(key, a));
    const addImage = (url?: string, caption?: string) => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      collected.push({ imageUrl: url, caption });
    };

    if (char.referenceImageUrl) addImage(char.referenceImageUrl, 'Primary Face Reference');
    if (char.secondaryReferenceImageUrl) addImage(char.secondaryReferenceImageUrl, 'Outfit Reference');
    if (char.avatarUrl) addImage(char.avatarUrl, 'Active Avatar');

    for (const [key, list] of this.accumulatedCgs.entries()) {
      if (matchesCharacter(key)) {
        for (const cg of list) addImage(cg.imageUrl, cg.caption);
      }
    }

    for (const [key, list] of Object.entries(this.persistentGalleries)) {
      if (matchesCharacter(key)) {
        for (const cg of list) addImage(cg.imageUrl, cg.caption);
      }
    }

    for (const [key, ctx] of Object.entries(this.loreMap)) {
      if (matchesCharacter(key)) {
        for (const cg of ctx.cgs ?? []) addImage(cg.imageUrl, cg.caption);
      }
    }

    return collected;
  }

  private renderCgsTab(char: CharacterDNA, lore: CharacterLoreContext): void {
    const cgsWrap = document.createElement('div');
    cgsWrap.style.display = 'flex';
    cgsWrap.style.flexDirection = 'column';
    cgsWrap.style.gap = '14px';

    const collected = this.collectCharacterCgs(char);

    // Top instruction note
    const guide = document.createElement('p');
    guide.className = 'folio-gallery-guide';
    guide.style.cssText = 'font-size:12px;opacity:0.85;margin:0 0 6px;line-height:1.4;';
    guide.textContent = 'Select which picture serves as the authority reference for consistency in future image generations. Set a Primary Reference for facial identity, and an optional Secondary Reference for active attire/outfit.';
    cgsWrap.append(guide);

    if (collected.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'folio-empty';
      const emptySpan = document.createElement('span'); emptySpan.textContent = `No pictures or scene portraits generated for ${char.name} yet. Pictures created during reading will appear in this gallery.`; empty.append(emptySpan);
      cgsWrap.append(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'folio-cgs-grid';

      for (const cg of collected) {
        const isPrimary = char.referenceImageUrl === cg.imageUrl;
        const isSecondary = char.secondaryReferenceImageUrl === cg.imageUrl;
        const isAvatar = char.avatarUrl === cg.imageUrl;

        const card = document.createElement('div');
        card.className = `folio-cg-card${isPrimary ? ' active-primary-ref' : ''}${isSecondary ? ' active-secondary-ref' : ''}`;

        const img = document.createElement('img');
        img.className = 'folio-cg-thumb';
        img.src = cg.imageUrl;
        img.alt = cg.caption || char.name;
        img.title = 'Click to inspect full image';
        img.onclick = () => {
          FullscreenLightbox.open({
            src: cg.imageUrl,
            title: char.name,
            ...(cg.caption ? { subtitle: cg.caption } : {}),
            gallery: collected.map((item) => ({
              src: item.imageUrl,
              title: char.name,
              ...(item.caption ? { subtitle: item.caption } : {}),
            })),
            galleryIndex: collected.indexOf(cg),
            themeSource: this.element,
            onDelete: (item) => {
              this.removeCg(item.src);
              this.handlers.onDeleteImage?.(item.src);
            },
          });
        };

        // Status badges container
        const badges = document.createElement('div');
        badges.className = 'folio-cg-badges';
        badges.style.cssText = 'position:absolute;top:6px;left:6px;display:flex;flex-direction:column;gap:4px;pointer-events:none;z-index:2;';

        if (isPrimary) {
          const b = document.createElement('span');
          b.className = 'folio-tag tag-primary-ref';
          b.style.cssText = 'background:#1a4d2e;color:#85e3a0;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid #2d6a4f;';
          b.textContent = '⭐ Primary Reference';
          badges.append(b);
        }
        if (isSecondary) {
          const b = document.createElement('span');
          b.className = 'folio-tag tag-secondary-ref';
          b.style.cssText = 'background:#2b2d42;color:#a8dadc;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid #457b9d;';
          b.textContent = '👔 Outfit Reference';
          badges.append(b);
        }
        if (isAvatar && !isPrimary) {
          const b = document.createElement('span');
          b.className = 'folio-tag';
          b.style.cssText = 'background:#3d2645;color:#e2afff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid #8338ec;';
          b.textContent = '👤 Avatar';
          badges.append(b);
        }

        const footer = document.createElement('div');
        footer.className = 'folio-cg-footer';

        const cap = document.createElement('span');
        cap.className = 'folio-cg-caption';
        cap.textContent = cg.caption || 'Scene portrait';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;';

        // Primary Reference Button
        const primaryBtn = document.createElement('button');
        primaryBtn.type = 'button';
        primaryBtn.className = 'folio-action-btn' + (isPrimary ? ' btn-active' : '');
        primaryBtn.style.cssText = 'font-size:11px;padding:4px 8px;';
        primaryBtn.textContent = isPrimary ? '★ Primary Active' : '⭐ Set as Face Reference';
        primaryBtn.onclick = () => {
          this.cancelProposal();
          if (isPrimary) {
            delete char.referenceImageUrl; delete char.referenceImageId;
          } else {
            char.referenceImageUrl = cg.imageUrl; const m1 = /\/api\/v1\/images\/([^/?#]+)/.exec(cg.imageUrl); if (m1 && m1[1]) char.referenceImageId = decodeURIComponent(m1[1]);
            char.avatarUrl = cg.imageUrl;
          }
          char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
          this.dirty.add(char.id);
          this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
          this.renderRoster();
          this.renderDetail();
        };

        // Secondary Reference Button
        const secondaryBtn = document.createElement('button');
        secondaryBtn.type = 'button';
        secondaryBtn.className = 'folio-action-btn' + (isSecondary ? ' btn-active' : '');
        secondaryBtn.style.cssText = 'font-size:11px;padding:4px 8px;';
        secondaryBtn.textContent = isSecondary ? '👔 Outfit Active' : '👔 Set as Outfit Reference';
        secondaryBtn.onclick = () => {
          this.cancelProposal();
          if (isSecondary) {
            delete char.secondaryReferenceImageUrl; delete char.secondaryReferenceImageId;
          } else {
            char.secondaryReferenceImageUrl = cg.imageUrl; const m2 = /\/api\/v1\/images\/([^/?#]+)/.exec(cg.imageUrl); if (m2 && m2[1]) char.secondaryReferenceImageId = decodeURIComponent(m2[1]);
          }
          char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
          this.dirty.add(char.id);
          this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
          this.renderRoster();
          this.renderDetail();
        };

        // Set as Avatar button
        const avatarBtn = document.createElement('button');
        avatarBtn.type = 'button';
        avatarBtn.className = 'btn-set-avatar';
        avatarBtn.style.cssText = 'font-size:11px;padding:4px 8px;';
        avatarBtn.textContent = isAvatar ? '✓ Avatar' : 'Set Avatar';
        avatarBtn.disabled = isAvatar;
        avatarBtn.onclick = () => {
          this.cancelProposal();
          char.avatarUrl = cg.imageUrl;
          char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
          this.dirty.add(char.id);
          this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
          this.renderRoster();
          this.renderDetail();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'folio-action-btn';
        deleteBtn.style.cssText = 'font-size:11px;padding:4px 8px;background:rgba(239,68,68,0.18);color:var(--vn-shell-danger-ink,#fca5a5);border:1px solid rgba(239,68,68,0.35);';
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.title = 'Delete this picture';
        let deleteArmed = false;
        let deleteTimer: ReturnType<typeof setTimeout> | null = null;
        deleteBtn.onclick = () => {
          if (!deleteArmed) {
            deleteArmed = true;
            deleteBtn.textContent = 'Tap again to delete';
            if (deleteTimer) clearTimeout(deleteTimer);
            deleteTimer = setTimeout(() => { deleteArmed = false; deleteBtn.textContent = '🗑️ Delete'; }, 4000);
            return;
          }
          if (deleteTimer) clearTimeout(deleteTimer);
          this.removeCg(cg.imageUrl);
          this.handlers.onDeleteImage?.(cg.imageUrl);
        };

        const cropBtn = document.createElement('button');
        cropBtn.type = 'button';
        cropBtn.className = 'folio-action-btn';
        cropBtn.style.cssText = 'font-size:11px;padding:4px 8px;';
        cropBtn.textContent = '✂️ Crop Face Ref';
        cropBtn.title = 'Open interactive cropper to focus on face for generation consistency';
        cropBtn.onclick = () => {
          openReferenceCropperModal({
            sourceUrl: cg.imageUrl,
            characterName: char.name,
            slot: 'face',
            initialMeta: char.referenceCropMeta,
            onConfirm: (result) => {
              char.referenceImageUrl = result.dataUrl;
              char.referenceCropMeta = result.cropMeta;
              char.avatarUrl = result.dataUrl;
              char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
              this.dirty.add(char.id);
              this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
              this.renderRoster();
              this.renderDetail();
            }
          });
        };

        const cropOutfitBtn = document.createElement('button');
        cropOutfitBtn.type = 'button';
        cropOutfitBtn.className = 'folio-action-btn';
        cropOutfitBtn.style.cssText = 'font-size:11px;padding:4px 8px;';
        cropOutfitBtn.textContent = '✂️ Crop Outfit Ref';
        cropOutfitBtn.title = 'Open interactive cropper to focus on attire/costume';
        cropOutfitBtn.onclick = () => {
          openReferenceCropperModal({
            sourceUrl: cg.imageUrl,
            characterName: char.name,
            slot: 'outfit',
            initialMeta: char.secondaryReferenceCropMeta,
            onConfirm: (result) => {
              char.secondaryReferenceImageUrl = result.dataUrl;
              char.secondaryReferenceCropMeta = result.cropMeta;
              char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
              this.dirty.add(char.id);
              this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
              this.renderRoster();
              this.renderDetail();
            }
          });
        };

        btnRow.append(primaryBtn, secondaryBtn, cropBtn, cropOutfitBtn, avatarBtn, deleteBtn);
        footer.append(cap, btnRow);
        card.append(badges, img, footer);
        grid.append(card);
      }
      cgsWrap.append(grid);
    }

    this.detailContainer.append(cgsWrap);
  }

  private createFormField(
    label: string,
    initialValue: string,
    placeholder: string,
    onChange: (value: string) => void,
    onAutoFill?: (inputEl: HTMLInputElement) => void
  ): HTMLElement {
    const labels:Record<string,DnaField>={'Age':'build.age','Gender':'build.gender','Species':'build.species','Height':'build.height','Body Type':'build.bodyType','Bust & Cleavage':'build.bust','Muscular Chest / Shoulders':'build.bust','Hips, Waist & Glutes':'build.hipsGlutes','Skin Tone & Complexion':'build.skinTone','Hair Color':'hair.color','Hair Length':'hair.length','Hair Style':'hair.style','Eye Color':'eyes.color','Eye Shape':'eyes.shape','Facial Structure':'faceFeatures','Demeanor & Posture':'demeanor','Signature Outfit':'signatureOutfit','Signature Attire (Default outfit)':'signatureOutfit','Active Scene Attire':'activeOutfit','Active Scene Attire (Dynamic override)':'activeOutfit','Distinguishing Marks & Anchors':'distinguishingFeatures'};
    const path=labels[label];
    const field = document.createElement('div');
    field.className = 'folio-field';

    const headRow = document.createElement('div');
    headRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    headRow.append(lbl);

    const wrap = document.createElement('div');
    wrap.className = 'folio-input-wrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-label',label);
    const fieldId=`dna-${this.activeCharacterId??'field'}-${label.replace(/[^a-z0-9]/gi,'-')}`;input.setAttribute('id',fieldId);lbl.setAttribute('for',fieldId);
    input.value = initialValue;
    input.placeholder = placeholder;
    let composing=false,lastValue=initialValue;
    const changed=()=>{
      const value=input.value.trim();
      if(composing||value===lastValue)return;
      lastValue=value;
      const activeChar=this.activeCharacterId?this.library[this.activeCharacterId]:undefined;
      if(activeChar&&path){
        activeChar.fieldSources={...(activeChar.fieldSources??{}),[path]:{classification:'manual',sources:[]}};
        const existingBadge=headRow.querySelector<HTMLElement>('.folio-field-source');
        if(existingBadge){
          existingBadge.textContent='Manual';
          existingBadge.title='Edited manually';
          existingBadge.style.opacity='0.78';
        }
      }
      onChange(value);
    };
    input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;changed();});
    input.addEventListener('input',changed);input.addEventListener('change',changed);
    if(label==='Gender')input.addEventListener('blur',()=>{if(!this.pending)this.renderDetail();});

    wrap.append(input);

    if (onAutoFill) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-field-autofill';
      btn.innerHTML = '✨';
      btn.title = `Suggest ${label} from context`;
      btn.setAttribute('aria-label',`Suggest ${label}`);
      btn.disabled=this.pending||Boolean(this.activeCharacterId&&this.library[this.activeCharacterId]?.locked);
      btn.onclick = () => onAutoFill(input);
      wrap.append(btn);
    }

    const source=this.activeCharacterId&&path?this.library[this.activeCharacterId]?.fieldSources?.[path]:undefined;
    if(source){
      const badge=document.createElement('small');
      badge.className='folio-field-source';
      badge.textContent=source.classification==='manual'?'Manual':source.classification==='generated'?'Generated':source.classification==='inferred'?'Inferred':'Evidence';
      badge.title=source.sources.join('\n')||'User-approved appearance detail';
      badge.style.cssText='font-size:10px;opacity:0.65;padding:1px 6px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);white-space:nowrap;cursor:pointer;';
      badge.onclick=()=>{
        const srcText=source.sources.filter(Boolean).join(' · ')||'User-approved appearance detail';
        this.notice=`${label} (${badge.textContent}): ${srcText}`;
        const existing=field.querySelector<HTMLElement>('[data-source-detail]');
        if(existing){existing.remove();return;}
        const detail=document.createElement('small');
        detail.dataset.sourceDetail='';
        detail.style.cssText='font-size:11px;opacity:0.78;line-height:1.35;margin-top:2px;';
        detail.textContent=srcText;
        field.append(detail);
      };
      headRow.append(badge);
    }
    field.append(headRow, wrap);
    return field;
  }

  private requestAutoFill(char:CharacterDNA,fields?:DnaField[]):void{
    if(char.locked||this.pending)return;
    if(this.dirty.has(char.id)){this.notice='Save your manual changes before requesting suggestions.';this.renderDetail();return;}
    this.cancelProposal();this.pending=true;this.notice='Reading context and preparing suggestions…';this.renderDetail();
    this.handlers.onAutoFillDNA?.(char.name,char.id,fields);
  }
  private autoFillAllFields(char:CharacterDNA):void{this.requestAutoFill(char);}

  private renderWorkflow(char:CharacterDNA):void{
    const box=document.createElement('section');box.className='folio-workflow';box.setAttribute('aria-live','polite');
    const button=(name:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.className='folio-action-btn';b.textContent=name;b.onclick=action;return b;};
    if(this.notice){const p=document.createElement('p');p.textContent=this.notice;box.append(p);}
    if(this.pending)box.append(button('Cancel auto-fill',()=>{this.cancelProposal();this.renderDetail();}));
    if(this.deleteConfirm){const p=document.createElement('p');p.textContent=`Delete ${char.name} from this chat’s Cast? Story, lore and gallery images remain. You can undo this.`;box.append(p,button('Delete from this chat',()=>{this.deleteConfirm=false;this.handlers.onDeleteDNA?.(char,this.revision);}),button('Keep character',()=>{this.deleteConfirm=false;this.renderDetail();}));}
    const p=this.proposal;
    if(p&&p.characterId===char.id){
      box.setAttribute('data-dna-review','');const title=document.createElement('h3');title.textContent='Review DNA suggestions';box.append(title);
      const help=document.createElement('p');help.textContent='Review each change. Existing values are kept unless you select their replacement.';box.append(help);const selected=new Set<DnaField>();
      for(const change of p.changes){const row=document.createElement('label');row.className='folio-suggestion';const check=document.createElement('input');check.type='checkbox';const current=dnaFieldValue(char,change.path);check.checked=!current||(Array.isArray(current)&&!current.length);if(check.checked)selected.add(change.path);check.onchange=()=>{if(check.checked)selected.add(change.path);else selected.delete(change.path);};check.setAttribute('aria-label',`Apply ${DNA_FIELD_LABELS[change.path]}`);
        const text=document.createElement('span');text.textContent=`${DNA_FIELD_LABELS[change.path]}: ${Array.isArray(current)?current.join(', '):current||'Not set'} → ${Array.isArray(change.value)?change.value.join(', '):change.value}`;
        const badge=document.createElement('small');badge.textContent=change.classification==='evidence'?'Evidence':change.classification==='inferred'?'Inferred':'Generated';row.append(check,text,badge);box.append(row);
        if(change.sourceRefs.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='View evidence';details.append(summary);for(const id of change.sourceRefs){const e=p.evidence.find(e=>e.id===id);if(e){const excerpt=document.createElement('p');excerpt.textContent=`${e.source}: ${e.text}`;details.append(excerpt);}}box.append(details);}
      }
      const status=document.createElement('p');status.className='folio-source-status';status.textContent=p.statuses.map(s=>`${s.source}: ${s.status}`).join(' · ');box.append(status);
      if(!p.changes.length){const empty=document.createElement('p');empty.textContent='No unambiguous changes were proposed. Your profile is unchanged.';box.append(empty);}
      box.append(button('Apply selected fields',()=>{if(!selected.size){this.notice='Select at least one field to apply.';this.renderDetail();return;}this.pending=true;this.handlers.onApplyDNA?.(p.id,[...selected]);}),button('Discard suggestions',()=>{this.cancelProposal();this.renderDetail();}));
    }
    const saved=Object.values(this.library).filter(c=>c.id!==char.id);
    if(saved.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Merge a duplicate';details.append(summary);const select=document.createElement('select');select.setAttribute('aria-label','Duplicate character');for(const c of saved){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;select.append(option);}const explanation=document.createElement('p');explanation.textContent=`Keep ${char.name} and its existing values. Fill only blank fields from the selected duplicate and retain its name as an alias. Conflicting values stay with ${char.name}.`;
      details.append(explanation,select,button('Preview merge',()=>{this.mergeOther=select.value;this.renderDetail();}));if(this.mergeOther){const other=this.library[this.mergeOther];if(other){const preview=document.createElement('p');preview.textContent=DNA_FIELDS.map(path=>{const a=dnaFieldValue(char,path),b=dnaFieldValue(other,path);return b?`${DNA_FIELD_LABELS[path]}: ${a?`${JSON.stringify(a)} kept; duplicate ${JSON.stringify(b)}`:`fill ${JSON.stringify(b)}`}`:'';}).filter(Boolean).join(' · ');details.append(preview,button('Merge into this character',()=>{
        if (this.savedLibrary[char.id] && this.savedLibrary[other.id]) {
          this.handlers.onMergeDNA?.(char.id, other.id, this.revision);
        } else {
          for (const path of DNA_FIELDS) {
            const current = dnaFieldValue(char, path);
            const value = dnaFieldValue(other, path);
            if ((!current || (Array.isArray(current) && !current.length)) && value) {
              applyDnaChanges(char, [{ path, value, classification: 'generated', sourceRefs: [] }]);
            }
          }
          char.aliases = [...new Set([...char.aliases, other.name, ...other.aliases])].filter(n => n !== char.name).slice(0, 16);
          if (!char.avatarUrl && other.avatarUrl) char.avatarUrl = other.avatarUrl;
          if (!char.referenceImageUrl && other.referenceImageUrl) char.referenceImageUrl = other.referenceImageUrl;
          if (!char.secondaryReferenceImageUrl && other.secondaryReferenceImageUrl) char.secondaryReferenceImageUrl = other.secondaryReferenceImageUrl;
          if (!char.referenceCropMeta && other.referenceCropMeta) char.referenceCropMeta = other.referenceCropMeta;
          if (!char.secondaryReferenceCropMeta && other.secondaryReferenceCropMeta) char.secondaryReferenceCropMeta = other.secondaryReferenceCropMeta;
          if (other.wardrobeThumbnails) char.wardrobeThumbnails = { ...other.wardrobeThumbnails, ...(char.wardrobeThumbnails ?? {}) };
          if (other.wardrobeStates) char.wardrobeStates = { ...other.wardrobeStates, ...(char.wardrobeStates ?? {}) };
          if (!char.activeWardrobeKey && other.activeWardrobeKey) char.activeWardrobeKey = other.activeWardrobeKey;
          if (!char.activeOutfit && other.activeOutfit) char.activeOutfit = other.activeOutfit;
          if (!char.signatureOutfit && other.signatureOutfit) char.signatureOutfit = other.signatureOutfit;
          if (other.distinguishingFeatures?.length) char.distinguishingFeatures = [...new Set([...(char.distinguishingFeatures ?? []), ...other.distinguishingFeatures])];
          delete this.library[other.id];
          this.discoveredIds.delete(other.id);
          char.lastUpdated = Math.max(Date.now(), char.lastUpdated + 1);
          this.dirty.add(char.id);
          this.handlers.onSaveDNA?.(structuredClone(char), this.revision);
          this.renderRoster();
          this.renderDetail();
        }
        this.mergeOther = '';
      }));details.open=true;}}box.append(details);}
    if(box.children.length)this.detailContainer.append(box);
  }

  back(): boolean {
    if (this.activeSubTab !== 'dna') {
      this.activeSubTab = 'dna';
      this.renderDetail();
      return true;
    }
    this.handlers.onClose?.();
    return false;
  }
}
import {selectPresentationSnapshot} from '../../shared/presentation-selectors.js';
