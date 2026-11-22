import { DOCUMENT_READER_CSS } from "./document-reader.js";

export const DOSSIER_CSS = `
[data-vn-references][hidden]{display:none!important}
[data-vn-root] [data-vn-references]{min-width:44px!important;min-height:44px!important;width:44px;height:44px;padding:0!important;display:inline-flex;align-items:center;justify-content:center}
[data-vn-references] svg{width:20px;height:20px;display:block;flex:none}
[data-vn-root] [data-entity-anchor]{font:inherit;font-weight:650;color:inherit;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,transparent);border:0;text-decoration:underline 1.5px color-mix(in srgb,var(--vn-accent,#9ec6f0) 80%,transparent);text-underline-offset:3px;border-radius:.15em;padding:0;cursor:pointer;text-align:inherit;display:inline;line-height:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}
[data-vn-root] [data-entity-anchor][data-entity-doc="true"]{background:color-mix(in srgb,#e8c987 18%,var(--vn-accent,#9ec6f0) 10%);text-decoration:underline dotted 1.5px color-mix(in srgb,#e8c987 82%,var(--vn-accent,#9ec6f0))}
[data-vn-root] [data-entity-anchor][data-entity-doc="true"]::after{content:" 🗏";font-size:.78em;opacity:.72;vertical-align:0.05em}
[data-vn-root] [data-entity-anchor]:hover{background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 28%,transparent)}
[data-entity-anchor]:focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:3px}
[data-vn-dossier][hidden]{display:none!important}
[data-vn-dossier]{position:absolute;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,7,14,.74);backdrop-filter:blur(6px);padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box}
[data-vn-dossier-card]{box-sizing:border-box;width:min(100%,580px);max-height:min(86dvh,calc(100dvh - 24px));overflow:auto;overscroll-behavior:contain;padding:20px;border:1px solid var(--vn-panel-border,#666);border-radius:18px;background:var(--vn-panel-solid,#171b26);color:var(--vn-chrome-text,var(--vn-text,#eef1f7));box-shadow:0 16px 56px rgba(0,0,0,.65);touch-action:pan-y;font:inherit;line-height:1.55;scroll-padding-top:76px}
[data-vn-dossier-card] header{position:sticky;top:-20px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-4px 0 0;padding:4px 0 10px;background:var(--vn-panel-solid,#171b26);border-bottom:1px solid var(--vn-panel-border,#666)}
[data-vn-dossier-card] h2{flex:1;min-width:0;margin:0;font-size:1.2em;line-height:1.3;overflow-wrap:anywhere}
[data-vn-dossier-card] button{box-sizing:border-box;font:inherit;min-width:44px;min-height:44px;padding:8px 12px;margin:4px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;cursor:pointer;white-space:normal;transition:border-color .15s ease,background-color .15s ease}
[data-vn-dossier-card] button:hover{border-color:var(--vn-accent,#9ec6f0);background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 14%,var(--vn-button-bg,#ffffff0d))}
[data-vn-dossier-card] header button{flex:none;margin:0;width:44px;padding:6px;font-size:1.35em;line-height:1}

/* Folio Hero & Media */
.folio-hero-card{height:250px;position:relative;background:var(--vn-shell-field,#2a3539);overflow:hidden;border-radius:var(--vn-shell-radius,12px);margin:8px 0 12px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.15))}
.folio-hero-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 18%;filter:saturate(.7) contrast(1.05)}
.folio-hero-card::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.85) 100%)}
.folio-meta{position:absolute;bottom:14px;left:14px;right:14px;z-index:2;color:#fff}
.folio-meta h2{margin:0;font-family:Georgia,serif;font-size:20px;line-height:1.15;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.folio-meta p{margin:4px 0 0;font-size:11.5px;opacity:.92;line-height:1.35;color:rgba(255,255,255,.9)}
.observations-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}
.observation-cell{padding:9px;border-radius:min(var(--vn-shell-radius,8px),10px);background:var(--vn-shell-button,rgba(255,255,255,.04));border:1px solid var(--vn-shell-border,rgba(255,255,255,.12))}
.observation-cell .label{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--vn-shell-muted,rgba(255,255,255,.65));margin-bottom:3px;font-weight:700}
.observation-cell .val{font-size:12px;font-weight:600;color:var(--vn-shell-text,#fff)}

/* World Lens Map & Tray */
.world-sheet-map{min-height:145px;border-radius:min(var(--vn-shell-radius,10px),12px);background:radial-gradient(circle at 30% 35%,color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 20%,transparent),var(--vn-shell-field,#16202a) 75%);border:1px solid var(--vn-shell-border,rgba(255,255,255,.15));padding:12px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;margin-bottom:10px}
.world-sheet-map-title{font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:800;color:var(--vn-shell-accent,#a8d3c8)}
.world-sheet-map-nodes{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.map-node-pill{padding:5px 10px;border-radius:999px;background:rgba(15,23,42,.55);border:1px solid var(--vn-shell-border,rgba(255,255,255,.18));font-size:11px;font-weight:600;color:var(--vn-shell-text,#eef4f1);cursor:pointer;display:inline-flex;align-items:center;gap:4px;min-height:44px;transition:transform .12s ease,border-color .15s ease}
.map-node-pill:hover{border-color:var(--vn-shell-accent,#a8d3c8);transform:translateY(-1px)}
.chip-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:10px}
.chip-row::-webkit-scrollbar{display:none}
.chip-row .chip{flex:none;height:32px;min-height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.16));background:var(--vn-shell-button,rgba(255,255,255,.06));color:var(--vn-shell-text,inherit);font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;margin:0}
.chip-row .chip[aria-pressed="true"]{background:var(--vn-shell-accent,#a8d3c8);color:var(--vn-shell-accent-contrast,#0b1922);border-color:var(--vn-shell-accent,#a8d3c8)}
.world-lens{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:min(var(--vn-shell-radius,10px),12px);border:1px solid var(--vn-shell-border,rgba(255,255,255,.14));background:var(--vn-shell-panel,rgba(255,255,255,.04));margin-bottom:8px;cursor:pointer;text-align:left;width:100%;min-height:44px;color:inherit;transition:border-color .14s ease,background-color .14s ease}
.world-lens:hover{border-color:var(--vn-shell-accent,#a8d3c8);background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 8%,var(--vn-shell-panel,rgba(255,255,255,.04)))}
.world-lens-thumb{width:46px;height:46px;border-radius:9px;background:var(--vn-shell-button,rgba(255,255,255,.08));overflow:hidden;flex:none;display:grid;place-items:center;font-size:18px}
.world-lens-thumb img{width:100%;height:100%;object-fit:cover}
.world-lens-meta{flex:1;min-width:0}
.world-lens-meta h4{margin:0;font-size:13.5px;font-weight:700;color:var(--vn-shell-text,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.world-lens-meta p{margin:2px 0 0;font-size:11.5px;color:var(--vn-shell-muted,inherit);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

[data-vn-dossier-card] p,[data-vn-dossier-card] h3,[data-vn-dossier-card] h4{margin:8px 0;overflow-wrap:anywhere}
[data-vn-dossier-card] h3{font-size:.82em;letter-spacing:.05em;text-transform:uppercase;color:var(--vn-accent,#9ec6f0)}
[data-vn-dossier-card] h4{font-size:1em}
[data-vn-dossier-card] small{color:var(--vn-muted-text,#cbd5e1)}
[data-vn-dossier-card] ul{margin:6px 0;padding-left:18px}
[data-vn-dossier-card] li{margin:4px 0;overflow-wrap:anywhere}
[data-vn-dossier-card] label{display:block;margin:8px 0}
[data-vn-dossier-card] textarea{box-sizing:border-box;width:100%;min-height:66px;margin:4px 0;padding:8px;border:1px solid var(--vn-panel-border,#666);border-radius:6px;background:var(--vn-input-bg,#ffffff0d);color:inherit;font:inherit}
[data-vn-dossier-card] [data-reference-filters]{display:grid;gap:8px;margin:10px 0 12px}
[data-vn-dossier-card] [data-reference-filters] input,[data-vn-dossier-card] [data-reference-filters] select{box-sizing:border-box;width:100%;min-height:44px;padding:8px 10px;border:1px solid var(--vn-panel-border,#666);border-radius:8px;background:var(--vn-input-bg,#ffffff0d);color:inherit;font:inherit}
[data-vn-dossier-card] [data-reference-filters] .input-wrap{position:relative;display:flex;align-items:center}
[data-vn-dossier-card] [data-reference-filters] .input-wrap svg{position:absolute;left:11px;opacity:.6;pointer-events:none}
[data-vn-dossier-card] [data-reference-filters] .input-wrap input{padding-left:32px}
[data-vn-dossier-card] [data-reference-tray-item]{display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px}
[data-vn-dossier-card] [data-reference-tray-item] strong,[data-vn-dossier-card] [data-reference-tray-item] span{display:block}
[data-vn-dossier-card] [data-reference-tray-item] span{font-size:.82em;opacity:.78;margin-top:2px}
[data-vn-dossier-card] [data-reference-fact]{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
[data-vn-dossier-card] [data-reference-fact] span{flex:1 1 200px;min-width:0}
[data-vn-dossier-card] [data-reference-edit],[data-vn-dossier-card] [data-reference-remove]{flex:none}
[data-vn-dossier-card] [data-reference-actions]{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
[data-vn-dossier-card] [data-reference-kind]{font-size:.76em;letter-spacing:.05em;text-transform:uppercase;opacity:.76}
[data-vn-dossier-card] [data-reference-status]{margin:4px 0 0;min-height:1em;font-size:.82em;color:var(--vn-accent,#9ec6f0)}
[data-vn-dossier-card] [data-reference-note-box]{margin:10px 0;padding-top:6px;border-top:1px solid color-mix(in srgb,var(--vn-panel-border,#666) 55%,transparent)}
[data-vn-dossier-card] [data-reference-note-box] button{width:100%;margin:4px 0}
[data-vn-dossier-card] [data-reference-evidence] button{margin:6px 0 2px}
[data-vn-dossier-card] [data-reference-evidence] blockquote{margin:6px 0 0;padding:6px 10px;border-left:2px solid var(--vn-accent,#9ec6f0);opacity:.9}
[data-vn-dossier-card] [data-reference-pin]{margin:0 0 8px}
[data-vn-dossier-card] [data-reference-pin][aria-pressed="true"]{border-color:var(--vn-accent,#9ec6f0);background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 18%,transparent)}
[data-vn-dossier-card] [data-reference-empty]{opacity:.78}
[data-vn-dossier-card] .vn-dossier-actions{display:flex;flex-wrap:wrap;gap:4px}
[data-vn-dossier-card] .vn-dossier-actions button[data-interaction-mode]{flex:1 1 120px}
@media(pointer:coarse){[data-vn-dossier-card] button{min-height:48px}}
[data-vn-dossier-card] [data-story-dna-panel]{margin-top:12px;padding:12px;border-radius:min(var(--vn-shell-radius,10px),12px);background:var(--vn-shell-field,rgba(255,255,255,.04));border:1px solid var(--vn-shell-border,rgba(255,255,255,.14));display:flex;flex-direction:column;gap:8px}
.story-dna-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.story-dna-head strong{font-size:12px;color:var(--vn-shell-text,inherit)}
.story-dna-head button{min-height:44px;min-width:44px;margin:0!important;font-size:11.5px!important}
.story-dna-status{margin:0;font-size:11px;color:var(--vn-shell-accent,#93c5fd)}
.story-dna-form{display:grid;grid-template-columns:1fr;gap:8px}
.story-dna-field{display:flex;flex-direction:column;gap:3px;font-size:11px}
.story-dna-field span{color:var(--vn-shell-muted,inherit);font-weight:600}
.story-dna-field input,.story-dna-field textarea{box-sizing:border-box;width:100%;padding:7px 9px;border-radius:min(var(--vn-shell-radius,8px),10px);border:1px solid var(--vn-shell-border,rgba(255,255,255,.16));background:var(--vn-shell-panel,rgba(0,0,0,.28));color:var(--vn-shell-text,inherit);font:inherit;font-size:12px}
.story-dna-field textarea{min-height:54px;margin:0}
.story-dna-preview{padding:8px 10px;border-radius:min(var(--vn-shell-radius,8px),10px);background:var(--vn-shell-panel,rgba(0,0,0,.28));border:1px dashed var(--vn-shell-border-strong,var(--vn-shell-border))}
.story-dna-preview small{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-shell-muted,inherit);margin-bottom:3px}
.story-dna-preview code{display:block;font-size:11px;line-height:1.45;white-space:pre-wrap;color:var(--vn-shell-accent,#cbe9e0)}
.story-dna-footer{display:flex;gap:8px;justify-content:flex-end}
.story-dna-footer button{min-height:44px;min-width:44px;margin:0!important;font-size:12px!important}
.vn-inline-tooltip-popover{position:fixed;z-index:260;width:min(320px,calc(100vw - 24px));padding:12px;border-radius:var(--vn-shell-radius,14px);background:var(--vn-shell-panel,rgba(15,23,36,.96));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--vn-shell-border-strong,var(--vn-shell-border));box-shadow:0 14px 36px rgba(0,0,0,.58);color:var(--vn-shell-text,#eef4f1);display:flex;flex-direction:column;gap:8px}
.vn-inline-tooltip-head{display:flex;align-items:center;gap:10px}
.vn-inline-tooltip-thumb{width:42px;height:42px;border-radius:8px;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--vn-shell-button,rgba(255,255,255,.08));font-weight:700}
.vn-inline-tooltip-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.vn-inline-tooltip-title{flex:1;min-width:0}
.vn-inline-tooltip-title strong{display:block;font-size:13.5px;line-height:1.25}
.vn-inline-tooltip-title small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--vn-shell-muted,inherit)}
.vn-inline-tooltip-close{min-width:44px;min-height:44px;border-radius:50%;border:1px solid var(--vn-shell-border,rgba(255,255,255,.18));background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1}
.vn-inline-tooltip-body{margin:0;font-size:11.5px;line-height:1.45;opacity:.92;white-space:pre-line}
.vn-inline-tooltip-actions{display:flex;flex-wrap:wrap;gap:6px}
.vn-inline-tooltip-micro{flex:1 1 auto;min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2));background:rgba(255,255,255,.08);color:inherit;font-size:11px;font-weight:650;cursor:pointer}
.vn-inline-tooltip-cta{width:100%;min-height:44px;padding:8px 12px;border-radius:min(var(--vn-shell-radius,8px),10px);border:none;background:var(--vn-shell-accent,#a8d3c8);color:var(--vn-shell-accent-contrast,#0e1e1a);font-weight:750;font-size:12px;cursor:pointer;text-align:center}
[data-vn-track-selection]{position:fixed;z-index:262;display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:6px 10px;border-radius:12px;background:var(--vn-shell-panel,rgba(12,22,28,.96));border:1px solid var(--vn-shell-border-strong,rgba(168,211,200,.45));box-shadow:0 12px 32px rgba(0,0,0,.58);color:var(--vn-shell-text,#eef4f1);font-size:11.5px}
[data-vn-track-selection] button{min-height:44px;min-width:44px;padding:6px 10px;border-radius:8px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2));background:rgba(255,255,255,.08);color:inherit;font-size:11px;font-weight:650;cursor:pointer}
` + DOCUMENT_READER_CSS;

export const DOCKED_DOSSIER_CSS = `
[data-vn-dossier][data-vn-workspace-tool="story"]{position:relative;inset:auto;display:flex;align-items:stretch;padding:0;background:transparent;height:100%;z-index:auto}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]{width:100%;max-height:100%;height:100%;border:0;border-radius:0;box-shadow:none;padding:18px;font-size:14px;line-height:1.7}
[data-vn-workspace-tool="story"] [data-vn-dossier-card] > .dossier-topbar-header,
[data-vn-workspace-tool="story"] [data-vn-dossier-card] > .dossier-page-title-block{display:none!important}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]>header{position:static;top:auto;padding:0 0 14px;background:transparent;display:flex;align-items:center;justify-content:space-between}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]>header button[aria-label^="Close"]{display:none}
[data-vn-workspace-tool="story"] [data-vn-document-reader]>header button[aria-label="Back to item"]{display:none}
[data-reference-categories]{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
[data-reference-categories] button{flex:1;min-width:60px;margin:0;font-size:11.5px;padding:6px 10px}
[data-reference-categories] [aria-pressed="true"]{border-color:var(--vn-shell-accent,var(--vn-accent))!important;background:var(--vn-shell-accent,var(--vn-accent))!important;color:var(--vn-shell-accent-contrast,#091418)!important;font-weight:750!important}
`;
