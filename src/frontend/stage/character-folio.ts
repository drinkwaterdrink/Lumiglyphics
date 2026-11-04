import {samePresentationTurn} from '../../shared/presentation-entities.js';
import {sceneImageCandidatesFor} from './image-loader.js';
import {DNA_FIELDS,DNA_FIELD_LABELS,dnaFieldValue,type DnaField,type DnaProposal} from '../../shared/character-dna-workflow.js';
import type { CharacterDNA, CharacterDNALibrary } from '../../shared/character-dna.js';
import {
  createEmptyCharacterDNA,
  findCharacterDNA,
  formatCharacterDNAToPromptClause,
  formatCharacterDNAToTags,
} from '../../shared/character-dna.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';
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

export class CharacterFolio implements WorkspaceSurface {
  readonly element: HTMLElement;
  private readonly rosterCarousel: HTMLElement;
  private readonly detailContainer: HTMLElement;
  private library: Record<string, CharacterDNA> = Object.create(null);
  private loreMap: Record<string, CharacterLoreContext> = Object.create(null);
  private activeCharacterId: string | null = null;
  private activeSubTab: 'dna' | 'lore' | 'cgs' = 'dna';
  private latestTurnText = '';
  private discoveredIds = new Set<string>();
  private storyCursor = "";
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

  setContext(chatId:string|null):void{
    if(this.chatId===chatId)return;
    this.handlers.onCancelDNA?.();this.chatId=chatId;this.discoveredIds.clear();this.library=Object.create(null);this.dirty.clear();this.saving.clear();this.savedLibrary=Object.create(null);this.loreMap=Object.create(null);this.deleted={};this.revision=0;this.activeCharacterId=null;this.proposal=null;this.pending=false;this.notice='';this.latestTurnText='';this.deleteConfirm=false;this.mergeOther='';this.renderRoster();this.renderDetail();
  }
  getContext():string|null{return this.chatId;}
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
        .character-folio-surface .folio-field input {min-height:44px;box-sizing:border-box;}
        .character-folio-surface .folio-hero-avatar {width:60px;height:60px;}

        .character-folio-surface {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          width: 100% !important;
          min-height: 0 !important;
          flex: 1 1 auto !important;
          overflow: hidden !important;
          background: var(--vn-shell-bg, #0b1114);
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
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.25));
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
          border-radius: 9999px;
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
          background: rgba(255, 255, 255, 0.1);
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
          background: rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.15);
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
          background: #34d399;
          box-shadow: 0 0 6px rgba(52, 211, 153, 0.8);
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
          background: rgba(255, 255, 255, 0.08);
          color: var(--vn-shell-text, #cbd5e1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .folio-tag.tag-scene {
          background: rgba(52, 211, 153, 0.15);
          color: #6ee7b7;
          border-color: rgba(52, 211, 153, 0.3);
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
          border-radius: 8px;
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
          background: rgba(255, 255, 255, 0.12);
        }
        .folio-action-btn.btn-accent {
          background: var(--vn-shell-accent, #6ee7b7);
          color: #0b1114;
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
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          padding: 4px;
          background: var(--vn-shell-panel, rgba(15, 23, 42, 0.95));
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .subtab-btn {
          padding: 8px;
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
          background: rgba(0, 0, 0, 0.25);
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
          width: 26px;
          height: 26px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: var(--vn-shell-muted, #94a3b8);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 13px;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .btn-field-autofill:hover {
          color: var(--vn-shell-accent, #6ee7b7);
          background: rgba(255, 255, 255, 0.08);
        }

        /* Prompt Preview Box */
        .folio-prompt-preview {
          background: rgba(0, 0, 0, 0.35);
          border: 1px dashed var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          border-radius: 10px;
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
          color: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 90%, #fff);
          word-break: break-word;
          background: rgba(0, 0, 0, 0.25);
          padding: 8px 10px;
          border-radius: 6px;
          margin: 0;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        /* Lore Tab Styles */
        .folio-quote-box {
          border-left: 3px solid var(--vn-shell-accent, #6ee7b7);
          padding: 8px 12px;
          font-style: italic;
          font-size: 13px;
          line-height: 1.5;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 0 8px 8px 0;
          color: var(--vn-shell-text, #f1f5f9);
        }
        .folio-observations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 8px;
        }
        .observation-card {
          background: rgba(0, 0, 0, 0.25);
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
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
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
          background: rgba(0, 0, 0, 0.4);
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
          color: #000;
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
      <div class="folio-roster-carousel" data-folio-roster></div>
      <div class="folio-scroll-body" data-folio-body></div>
    `;

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
    const cancelledProposal=this.storyCursor!==cursorKey&&(this.pending||Boolean(this.proposal));
    if(this.storyCursor!==cursorKey){if(cancelledProposal)this.cancelProposal();this.storyCursor=cursorKey;}
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
          existingLore.inScene = snap.presentEntityIds?.includes(ent.id) ?? true;
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
      const charName = asset.stageAsset?.character?.trim();
      const imageUrl = ['generated','browser_ready'].includes(asset.status) ? sceneImageCandidatesFor(asset)[0] : undefined;
      if (charName && imageUrl) {
        detectedNames.add(charName);
        const key = charName.toLowerCase();
        const existingLore = this.loreMap[key] || {};
        existingLore.cgs = existingLore.cgs || [];
        if (!existingLore.cgs.some(c => c.imageUrl === imageUrl)) {
          existingLore.cgs.unshift({
            imageUrl,
            caption: asset.stageAsset?.attire || asset.stageAsset?.role || 'Scene portrait'
          });
        }
        this.loreMap[key] = existingLore;
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
      const existing = Object.values(this.library).find(c => c.name.toLowerCase() === key || c.aliases.some(a => a.toLowerCase() === key));
      if (!existing && !findCharacterDNA(this.deleted,name)) {
        const dna = createEmptyCharacterDNA(name);
        const assetWithImage = visibleAssets.find(a => a.stageAsset?.character?.trim().toLowerCase() === key && ['generated','browser_ready'].includes(a.status) && sceneImageCandidatesFor(a).length > 0);
        if (assetWithImage) {
          dna.avatarUrl = sceneImageCandidatesFor(assetWithImage)[0];
        }
        this.library[dna.id] = dna;
        this.discoveredIds.add(dna.id);
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
    for(const dna of Object.values(this.library))if(!this.deleted[dna.id]&&(Object.values(incoming).some(c=>c.id===dna.id)||!findCharacterDNA(this.deleted,dna.name)))next[dna.id]=dna;
    for(const dna of Object.values(incoming)){
      if(this.dirty.has(dna.id)&&next[dna.id]){
        const local=next[dna.id]!,base=this.savedLibrary[dna.id];
        if(base){for(const path of DNA_FIELDS){if(JSON.stringify(dnaFieldValue(local,path))!==JSON.stringify(dnaFieldValue(base,path)))continue;const[a,b]=path.split('.'),value=structuredClone(dnaFieldValue(dna,path));if(b){if(value===undefined)delete(local as any)[a!][b];else(local as any)[a!][b]=value;}else{if(value===undefined)delete(local as any)[a!];else(local as any)[a!]=value;}}
          for(const key of ['locked','avatarUrl','notes'] as const)if(local[key]===base[key]){if(dna[key]===undefined)delete(local as any)[key];else(local as any)[key]=dna[key];}
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
    const saveState=this.element.querySelector('[data-dna-save-state]');if(saveState)saveState.textContent=this.activeCharacterId&&this.dirty.has(this.activeCharacterId)?'Unsaved changes — Save changes to use in pictures':'Saved DNA is used for matching pictured characters';
    const focused=document.activeElement;if(!focused||!this.element.contains(focused)||!focused.matches('input,textarea'))this.renderDetail();
  }

  setActiveCharacter(idOrName: string): void {
    this.cancelProposal();
    const key = idOrName.trim().toLowerCase();
    const byIdentity=findCharacterDNA(this.library,idOrName);if(byIdentity){this.activeCharacterId=byIdentity.id;this.renderRoster();this.renderDetail();return;}
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

  private renderRoster(): void {
    this.rosterCarousel.replaceChildren();
    const characters = Object.values(this.library);

    for (const char of characters) {
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
    addChip.onclick = () => {
      const name = prompt('Enter character name:');
      if (name && name.trim()) {
        if(name.trim().length>160){this.showError('Character names must be 160 characters or fewer.');return;}
        const existing=findCharacterDNA(this.library,name);if(existing){this.setActiveCharacter(existing.id);return;}
        if(findCharacterDNA(this.deleted,name)){this.notice='This character was deleted. Use Undo delete to restore it.';this.renderDetail();return;}
        const created = createEmptyCharacterDNA(name.trim());
        this.library[created.id] = created;
        this.activeCharacterId = created.id;
        this.handlers.onSaveDNA?.(created,this.revision);
        this.renderRoster();
        this.renderDetail();
      }
    };
    this.rosterCarousel.append(addChip);
    const last=Object.values(this.deleted).at(-1);if(last){const undo=document.createElement('button');undo.type='button';undo.className='folio-action-btn';undo.textContent='Undo delete';undo.onclick=()=>this.handlers.onRestoreDNA?.(last.id,this.revision);this.rosterCarousel.append(undo);}
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
    const h2 = document.createElement('h2');
    h2.textContent = char.name;

    const metaTags = document.createElement('div');
    metaTags.className = 'folio-hero-meta';

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

    heroTitle.append(h2, metaTags);
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
      char.locked = !char.locked;char.lastUpdated=Math.max(Date.now(),char.lastUpdated+1);this.dirty.add(char.id);
      this.handlers.onSaveDNA?.(structuredClone(char),this.revision);
      this.renderRoster();
      this.renderDetail();
    };

    const copyPromptBtn = document.createElement('button');
    copyPromptBtn.type = 'button';copyPromptBtn.setAttribute('aria-label','Copy Prompt');
    copyPromptBtn.className = 'folio-action-btn';
    copyPromptBtn.innerHTML = `📋 <span>Copy Prompt</span>`;
    copyPromptBtn.onclick = async () => {
      try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(formatCharacterDNAToPromptClause(char));copyPromptBtn.textContent='Copied!';}
      catch{copyPromptBtn.textContent='Copy failed — try again';}
    };
    const deleteButton=document.createElement('button');deleteButton.type='button';deleteButton.className='folio-action-btn';deleteButton.textContent='Delete character';deleteButton.onclick=()=>{this.cancelProposal();this.deleteConfirm=true;this.renderDetail();};

    const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='folio-action-btn btn-accent';saveButton.textContent='Save changes';saveButton.setAttribute('data-dna-save','');saveButton.disabled=!this.dirty.has(char.id)||this.saving.has(char.id);saveButton.onclick=()=>{this.cancelProposal();this.saving.add(char.id);saveButton.disabled=true;this.handlers.onSaveDNA?.(structuredClone(char),this.revision);};
    heroActions.append(autoFillAllBtn, lockToggleBtn, copyPromptBtn,deleteButton,saveButton);
    heroCard.append(heroTop, heroActions);
    this.detailContainer.append(heroCard);
    this.renderWorkflow(char);

    // 2. STICKY SUB-TABS SELECTOR
    const subtabs = document.createElement('div');
    subtabs.className = 'folio-subtabs';

    const dnaTabBtn = document.createElement('button');
    dnaTabBtn.type = 'button';
    dnaTabBtn.className = `subtab-btn${this.activeSubTab === 'dna' ? ' active' : ''}`;
    dnaTabBtn.innerHTML = `✨ Visual DNA`;
    dnaTabBtn.onclick = () => {
      this.activeSubTab = 'dna';
      this.renderDetail();
    };

    const loreTabBtn = document.createElement('button');
    loreTabBtn.type = 'button';
    loreTabBtn.className = `subtab-btn${this.activeSubTab === 'lore' ? ' active' : ''}`;
    loreTabBtn.innerHTML = `📖 Story Lore`;
    loreTabBtn.onclick = () => {
      this.activeSubTab = 'lore';
      this.renderDetail();
    };

    const cgsCount = (lore.cgs?.length || 0);
    const cgsTabBtn = document.createElement('button');
    cgsTabBtn.type = 'button';
    cgsTabBtn.className = `subtab-btn${this.activeSubTab === 'cgs' ? ' active' : ''}`;
    cgsTabBtn.textContent = `🖼️ CGs (${cgsCount})`;
    cgsTabBtn.onclick = () => {
      this.activeSubTab = 'cgs';
      this.renderDetail();
    };

    subtabs.append(dnaTabBtn, loreTabBtn, cgsTabBtn);
    this.detailContainer.append(subtabs);

    // 3. TAB CONTENT
    if (this.activeSubTab === 'dna') {
      this.renderDnaTab(char, isMale);
    } else if (this.activeSubTab === 'lore') {
      this.renderLoreTab(char, lore);
    } else if (this.activeSubTab === 'cgs') {
      this.renderCgsTab(char, lore);
    }
  }

  private renderDnaTab(char: CharacterDNA, isMale: boolean): void {
    // Live Prompt Injection Preview Box
    const previewBox = document.createElement('div');
    previewBox.className = 'folio-prompt-preview';

    const previewHeader = document.createElement('div');
    previewHeader.className = 'folio-prompt-header';
    previewHeader.innerHTML = `<span>⚡ Appearance Prompt Preview:</span><span data-dna-save-state style="opacity:0.75;font-size:11px"></span>`;

    const previewCode = document.createElement('p');
    previewCode.className = 'folio-prompt-text';
    const updatePreview = () => {
      const clause = formatCharacterDNAToPromptClause(char);
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

    this.detailContainer.append(idCard, propCard, faceCard, wardCard);
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

    // Facts list if present
    if (lore.facts && lore.facts.length > 0) {
      const factsCard = document.createElement('div');
      factsCard.className = 'folio-group-card';
      factsCard.innerHTML = `<div class="folio-group-header"><h4>📝 Narrative Facts</h4></div>`;
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:var(--vn-shell-text);';
      for (const fact of lore.facts) {
        const li = document.createElement('li');
        li.textContent = `${fact.field ? `${fact.field}: ` : ''}${fact.value}`;
        ul.append(li);
      }
      factsCard.append(ul);
      loreWrap.append(factsCard);
    }

    // Player Notes
    const notesCard = document.createElement('div');
    notesCard.className = 'folio-group-card';
    notesCard.innerHTML = `<div class="folio-group-header"><h4>✏️ Player Notes</h4></div>`;
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'width:100%;height:80px;padding:8px 10px;border-radius:6px;border:1px solid var(--vn-shell-border,rgba(255,255,255,0.12));background:rgba(0,0,0,0.25);color:var(--vn-shell-text,#f1f5f9);font-size:12px;box-sizing:border-box;font-family:inherit;';
    textarea.placeholder = 'Add private notes about this character...';
    textarea.value = lore.playerNote || '';
    textarea.addEventListener('change', () => {
      lore.playerNote = textarea.value.trim();
    });
    notesCard.append(textarea);
    loreWrap.append(notesCard);

    this.detailContainer.append(loreWrap);
  }

  private renderCgsTab(char: CharacterDNA, lore: CharacterLoreContext): void {
    const cgsWrap = document.createElement('div');
    cgsWrap.style.display = 'flex';
    cgsWrap.style.flexDirection = 'column';
    cgsWrap.style.gap = '12px';

    const cgs = lore.cgs || [];
    if (cgs.length === 0 && char.avatarUrl) {
      cgs.push({ imageUrl: char.avatarUrl, caption: 'Avatar portrait' });
    }

    if (cgs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'folio-empty';
      empty.innerHTML = `<span>No CGs or portraits generated for this character yet.</span>`;
      cgsWrap.append(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'folio-cgs-grid';

      for (const cg of cgs) {
        const card = document.createElement('div');
        card.className = 'folio-cg-card';

        const img = document.createElement('img');
        img.className = 'folio-cg-thumb';
        img.src = cg.imageUrl;
        img.alt = cg.caption || char.name;
        img.title = 'Click to inspect full image';
        img.onclick = () => {
          window.open(cg.imageUrl, '_blank');
        };

        const footer = document.createElement('div');
        footer.className = 'folio-cg-footer';

        const cap = document.createElement('span');
        cap.className = 'folio-cg-caption';
        cap.textContent = cg.caption || 'Scene view';

        const setBtn = document.createElement('button');
        setBtn.type = 'button';
        setBtn.className = 'btn-set-avatar';
        setBtn.textContent = 'Set Avatar';
        setBtn.onclick = () => {
          this.cancelProposal();char.avatarUrl = cg.imageUrl;char.lastUpdated=Math.max(Date.now(),char.lastUpdated+1);this.dirty.add(char.id);
          this.handlers.onSaveDNA?.(structuredClone(char),this.revision);
          this.renderRoster();
          this.renderDetail();
        };

        footer.append(cap, setBtn);
        card.append(img, footer);
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
    const field = document.createElement('div');
    field.className = 'folio-field';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const wrap = document.createElement('div');
    wrap.className = 'folio-input-wrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-label',label);
    const fieldId=`dna-${this.activeCharacterId??'field'}-${label.replace(/[^a-z0-9]/gi,'-')}`;input.setAttribute('id',fieldId);lbl.setAttribute('for',fieldId);
    input.value = initialValue;
    input.placeholder = placeholder;
    let composing=false,lastValue=initialValue;
    const changed=()=>{const value=input.value.trim();if(composing||value===lastValue)return;lastValue=value;onChange(value);};
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

    field.append(lbl, wrap);
    const labels:Record<string,DnaField>={'Age':'build.age','Gender':'build.gender','Species':'build.species','Height':'build.height','Body Type':'build.bodyType','Skin Tone & Complexion':'build.skinTone','Hair Color':'hair.color','Hair Length':'hair.length','Hair Style':'hair.style','Eye Color':'eyes.color','Eye Shape':'eyes.shape','Facial Structure':'faceFeatures','Demeanor & Posture':'demeanor','Signature Outfit':'signatureOutfit','Active Scene Attire':'activeOutfit'};
    const path=labels[label],source=this.activeCharacterId&&path?this.library[this.activeCharacterId]?.fieldSources?.[path]:undefined;
    if(source){const badge=document.createElement('small');badge.className='folio-field-source';badge.textContent=source.classification==='manual'?'Manual':source.classification==='generated'?'Generated':source.classification==='inferred'?'Inferred':'Evidence';badge.title=source.sources.join('\n')||'User-approved appearance detail';field.append(badge);}
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
      details.append(explanation,select,button('Preview merge',()=>{this.mergeOther=select.value;this.renderDetail();}));if(this.mergeOther){const other=this.library[this.mergeOther];if(other){const preview=document.createElement('p');preview.textContent=DNA_FIELDS.map(path=>{const a=dnaFieldValue(char,path),b=dnaFieldValue(other,path);return b?`${DNA_FIELD_LABELS[path]}: ${a?`${JSON.stringify(a)} kept; duplicate ${JSON.stringify(b)}`:`fill ${JSON.stringify(b)}`}`:'';}).filter(Boolean).join(' · ');details.append(preview,button('Merge into this character',()=>{this.handlers.onMergeDNA?.(char.id,other.id,this.revision);this.mergeOther='';}));details.open=true;}}box.append(details);}
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
