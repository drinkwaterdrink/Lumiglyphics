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
.folio-hero-card:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(10,16,20,.35) 60%,rgba(8,14,16,.92) 100%)}
.folio-hero-label{position:absolute;z-index:2;bottom:22px;left:16px;font-family:var(--vn-shell-display-font,Georgia,serif);font-size:30px;letter-spacing:-.04em;color:#fff!important;text-shadow:0 2px 10px rgba(0,0,0,.85)}
.folio-hero-sub{position:absolute;z-index:2;left:17px;bottom:7px;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:rgba(255,255,255,.88)!important;text-shadow:0 1px 4px rgba(0,0,0,.85)}
.folio-meta{display:flex;gap:5px;margin:8px 0 10px;flex-wrap:wrap}
.folio-meta .tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:var(--vn-shell-radius,6px);font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 14%,var(--vn-shell-field,transparent));color:var(--vn-shell-text,#d5eee7);border:1px solid var(--vn-shell-border,rgba(130,185,165,.35))}
.folio-quote-callout{border-left:2px solid var(--vn-shell-accent,var(--vn-accent,#b7d6ae));padding:2px 0 2px 12px;color:var(--vn-shell-text,var(--vn-chrome-text,#e4ead9));font:italic 13px/1.5 Georgia,serif;margin:12px 0}
.observations-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--vn-shell-border,rgba(255,255,255,.15));margin-top:8px}
.observation-cell{padding:8px 6px 8px 0;border-bottom:1px solid var(--vn-shell-border,rgba(255,255,255,.12));min-height:48px}
.observation-cell:nth-child(even){padding-left:10px}
.observation-cell span{display:block;font-size:9.5px;margin-bottom:2px;opacity:.92;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-shell-muted,var(--vn-muted-text,#9cb5a8))}
.observation-cell strong{font-size:11.5px;font-weight:650;color:var(--vn-shell-text,var(--vn-chrome-text,var(--vn-text,#f3f7f0)))}

.observation-cell em{font-size:8.5px;font-style:normal;margin-left:4px;padding:1px 4px;border-radius:4px;background:color-mix(in srgb,var(--vn-shell-accent,#dcebad) 20%,transparent);color:var(--vn-shell-accent,#dcebad);font-weight:750}

[data-dossier-media]{margin:0;position:relative;overflow:hidden;border-radius:var(--vn-shell-radius,12px);border:1px solid color-mix(in srgb,var(--vn-shell-accent,var(--vn-accent,#9ec6f0)) 35%,transparent);background:rgba(0,0,0,.35);display:grid;place-items:center}
[data-dossier-media][data-has-image="true"]{cursor:zoom-in}
[data-dossier-media][data-expanded="true"]{grid-column:1 / -1;width:100%;height:auto;max-height:340px;cursor:zoom-out}
[data-dossier-media] img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block}
[data-dossier-media][data-expanded="true"] img{object-fit:contain;max-height:320px;background:rgba(0,0,0,.6)}
[data-dossier-media] svg{width:100%;height:100%;display:block;color:var(--vn-shell-accent,var(--vn-accent,#9ec6f0))}
[data-dossier-media] figcaption{position:absolute;inset:auto 0 0 0;padding:4px 8px;font-size:.68em;background:linear-gradient(transparent,rgba(0,0,0,.82));color:#fff;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}

/* World Lens Scene Map & Chips */
.chip-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px}
.chip{min-height:44px;min-width:44px;white-space:nowrap;padding:0 12px;border:1px solid var(--vn-shell-border,var(--vn-panel-border,rgba(255,255,255,.2)));border-radius:min(var(--vn-shell-radius,20px),20px);font-size:11.5px;font-weight:600;cursor:pointer;background:var(--vn-shell-button,var(--vn-button-bg,rgba(255,255,255,.06)));color:var(--vn-shell-text,inherit);transition:all .15s ease}
.chip[aria-pressed="true"],.chip.active{border-color:var(--vn-shell-accent,var(--vn-accent,#a8d3c8));background:var(--vn-shell-accent,var(--vn-accent,#a8d3c8));color:var(--vn-shell-accent-contrast,#091418)!important;font-weight:750;box-shadow:0 2px 10px color-mix(in srgb,var(--vn-shell-accent,var(--vn-accent,#a8d3c8)) 28%,transparent)}
.world-sheet-map{margin-top:8px;height:auto;min-height:0;border-radius:var(--vn-shell-radius,12px);position:relative;overflow:visible;border:1px solid var(--vn-shell-border,var(--vn-panel-border,rgba(255,255,255,.18)));background:var(--vn-shell-field,rgba(16,28,25,.96))}
.world-map-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.world-map-svg path{fill:none;stroke:var(--vn-shell-accent,var(--vn-accent,#80b5a3));stroke-width:1.2;stroke-dasharray:3 5;opacity:.5}
.map-node-pill{position:absolute;min-width:82px;max-width:114px;padding:5px 8px;text-align:left;border-radius:min(var(--vn-shell-radius,8px),10px);border:1px solid var(--vn-shell-border,rgba(255,255,255,.25));background:var(--vn-shell-panel,rgba(22,40,34,.95));color:var(--vn-shell-text,inherit);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);transition:transform .18s cubic-bezier(.16,1,.3,1),background .15s ease;z-index:2}
.map-node-pill.active{background:var(--vn-shell-accent,var(--vn-accent,#deefac));color:var(--vn-shell-accent-contrast,#122822)!important;border-color:var(--vn-shell-border-strong,#fff);transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.map-node-pill b{display:block;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.map-node-pill small{display:block;font-size:9px;opacity:.75;margin-top:1px}
.map-node-pill .index-dot{display:block;width:7px;height:7px;background:var(--vn-shell-muted,#90b5a7);border:1.5px solid var(--vn-shell-panel,#fff);border-radius:100%;position:absolute;top:-5px;left:9px}
.map-node-pill.active .index-dot{background:var(--vn-shell-accent-contrast,#315f50);border-color:var(--vn-shell-accent,#deefac)}
.world-lens{position:relative;margin:10px 0 6px;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-panel,var(--vn-panel-solid,rgba(14,25,21,.94)));backdrop-filter:blur(8px);border:1px solid var(--vn-shell-border,var(--vn-panel-border,rgba(130,175,155,.35)));box-shadow:var(--vn-shell-shadow,0 6px 18px rgba(0,0,0,.35));z-index:3}
.world-lens h3{font-size:13px;margin:0 0 2px;font-weight:700;color:var(--vn-shell-text,var(--vn-text,#f2f7ed));font-family:var(--vn-shell-display-font,inherit)}
.world-lens p{margin:0;font-size:11px;line-height:1.48;color:var(--vn-shell-muted,#d1dfd5)}
.world-lens-cta{display:inline-flex;align-items:center;justify-content:center;margin-top:8px!important;min-height:44px!important;min-width:44px!important;padding:8px 14px!important;font-size:11.5px!important;font-weight:750!important;border-radius:min(var(--vn-shell-radius,8px),10px)!important;background:var(--vn-shell-accent,var(--vn-accent,#a8d3c8))!important;color:var(--vn-shell-accent-contrast,#0f1e1a)!important;border:none!important;cursor:pointer}
.world-lens.world-lens-preview{display:flex;flex-direction:column;align-items:stretch;gap:8px;cursor:default}
.world-lens-preview-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.world-threads-card{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22)}
.story-dna-drawer{margin:12px 0;border-top:1px solid var(--vn-panel-border,#666)}
.input-wrap{display:flex;gap:8px;align-items:center;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2));border-radius:var(--vn-shell-radius,10px);background:var(--vn-shell-field,rgba(0,0,0,.15));width:100%;padding:0 10px;height:44px;box-sizing:border-box}
.input-wrap input{width:100%;min-width:0;background:none;border:none;outline:none;font:inherit;color:var(--vn-shell-text,inherit);padding:0}

/* Cast chips and Details */
[data-dossier-present-cast]{margin:12px 0;padding:10px 12px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-field,rgba(255,255,255,.03));border:1px solid var(--vn-shell-border,#666)}
[data-dossier-present-cast] h3{margin:0 0 8px;font-size:.8em;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-shell-muted,inherit)}
[data-dossier-cast-chips]{display:flex;flex-wrap:wrap;gap:6px}
[data-dossier-cast-chip]{margin:0!important;min-height:44px;min-width:44px;padding:8px 12px!important;border-radius:999px!important;font-size:.8em!important;font-weight:600!important}
[data-vn-dossier-card] dl{margin:0}
[data-vn-dossier-card] dt{font-size:.75em;margin-top:12px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:.025em;color:var(--vn-shell-accent,#a8c7b8)}
[data-vn-dossier-card] dt:first-child{margin-top:0}
[data-vn-dossier-card] dd{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.62;color:var(--vn-shell-text,var(--vn-chrome-text,var(--vn-text,#f2f7f0)))}
[data-vn-dossier-card] [data-fact-expand]{display:inline;min-width:0;min-height:0;padding:1px 6px;margin:0 0 0 4px;font-size:.75em;border-radius:6px;vertical-align:baseline}
[data-reference-overview]{padding:12px 14px;background:var(--vn-shell-field,rgba(27,49,41,.6));border:1px solid var(--vn-shell-border,rgba(130,185,165,.3));border-radius:var(--vn-shell-radius,12px);margin:10px 0 14px}
section[data-reference-current],section[data-reference-observations]{margin:14px 0;padding:12px 14px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-field,rgba(255,255,255,.03));border:1px solid var(--vn-shell-border,#666)}
section[data-reference-current] h3,section[data-reference-observations] h3{font-size:.82em;text-transform:uppercase;letter-spacing:.03em;margin:0 0 10px;opacity:1;color:var(--vn-shell-accent,#dcebad);font-weight:700}
[data-reference-section]{border-bottom:1px solid var(--vn-panel-border,#666)}
[data-reference-section] dl{padding:0 4px 16px}
[data-reference-sources]{font-size:.8em;margin:12px 0;opacity:.85}
[data-reference-sources] ul{list-style:none;margin:0;padding:0 0 12px;overflow-wrap:anywhere}
[data-reference-sources] li+li{margin-top:6px}
[data-reference-earlier]{border-top:1px solid var(--vn-panel-border,#666);margin-top:16px;padding-top:4px}
[data-reference-earlier]>p{font-size:.8em;color:var(--vn-muted-text);line-height:1.5;margin:0 0 14px}
[data-reference-earlier] dl{padding-top:12px}[data-earlier-source]{font-size:.8em;margin-bottom:12px;border-bottom:1px solid var(--vn-panel-border,#666)}
[data-earlier-source] summary{font-weight:400;color:var(--vn-muted-text)}[data-earlier-source] blockquote{margin:0;padding:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}
[data-reference-actions]{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--vn-panel-border,#666)}
[data-reference-actions] button{margin:0;flex:1}
[data-reference-notes] label{display:block;font-size:.85em}
[data-vn-dossier-card] textarea{display:block;box-sizing:border-box;width:100%;min-height:90px;margin:8px 0;font:inherit;color:inherit;background:#0002;border:1px solid var(--vn-panel-border,#666);border-radius:8px;padding:10px}
[data-vn-dossier-card] summary{box-sizing:border-box;cursor:pointer;min-height:44px;padding:12px 0;font-weight:600;line-height:1.4}
[data-reference-filters]{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;margin:4px 0 8px;align-items:center}
[data-reference-filters] input{font-size:16px}
[data-reference-filters] select{box-sizing:border-box;min-width:0;width:auto;max-width:150px;min-height:44px;font:inherit;font-size:16px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;padding:6px 8px}
[data-reference-history-note]{font-size:.75em;line-height:1.4;color:var(--vn-muted-text)}
[data-vn-reference-sheet]{display:flex;flex-direction:column;overflow:auto}
[data-vn-reference-sheet] header,[data-reference-filters],[data-reference-count]{flex:none}
[data-reference-list]{min-height:0;overflow:auto;overscroll-behavior:contain;display:grid;gap:6px;padding:2px 2px 6px}
[data-reference-count]{font-size:.8em;opacity:.75;margin:8px 0}
[data-reference-list] button{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;text-align:left;margin:0;min-width:0;overflow-wrap:anywhere;gap:10px;padding:8px 10px;border-radius:10px}
[data-reference-thumb]{width:40px;height:40px;border-radius:8px;overflow:hidden;display:grid;place-items:center;font-weight:700;font-size:.85em;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,rgba(255,255,255,.05));border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 35%,transparent);flex:none}
[data-reference-thumb] img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block}
[data-reference-row-body]{display:flex;flex-direction:column;gap:2px;min-width:0}
[data-reference-row-title]{font-weight:650;font-size:.94em}
[data-reference-list] small{font-size:.74em;opacity:.8;line-height:1.3}
[data-reference-snippet]{opacity:.68!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-reference-list] [data-reference-current=true]{border-left:3px solid var(--vn-accent,#9ec6f0)}
[data-vn-dossier-card] :is(button,input,select,textarea,summary):focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
@media(min-width:700px){[data-vn-dossier]{align-items:center}}
@media(max-width:420px){[data-vn-dossier-card]{padding:14px;border-radius:14px}[data-vn-dossier-card] header{top:-14px}[data-reference-overview]{padding:10px}[data-dossier-hero="npc"],[data-dossier-hero="object"]{grid-template-columns:76px minmax(0,1fr)}[data-dossier-media="npc"]{width:76px;height:92px}[data-dossier-media="object"]{width:76px;height:76px}}
.world-hub-tabs{display:flex;gap:6px;margin:4px 0 6px}
.world-scene-hub{padding:10px;display:flex;flex-direction:column;gap:10px}
.world-scene-banner{position:relative;height:142px;border-radius:min(var(--vn-shell-radius,10px),12px);overflow:hidden;border:1px solid var(--vn-shell-border,rgba(255,255,255,.16));background:var(--vn-shell-panel,rgba(12,20,24,.88))}
.world-scene-banner img,.world-scene-banner svg{width:100%;height:100%;object-fit:cover;display:block}
.world-scene-banner-overlay{position:absolute;inset:auto 0 0 0;padding:10px 12px;background:linear-gradient(transparent,rgba(6,12,16,.92));display:flex;flex-direction:column;gap:5px}
.world-scene-banner-overlay h3{margin:0;font-size:14px;font-weight:700;color:#fff;font-family:var(--vn-shell-display-font,inherit)}
.world-scene-dna-pills{display:flex;flex-wrap:wrap;gap:4px}
.scene-dna-pill{font-size:9.5px;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 20%,rgba(0,0,0,.35));border:1px solid color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 40%,transparent);color:#f4f9ff}
.world-scene-subhead{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--vn-shell-muted,inherit);margin-bottom:5px}
.world-scene-cast-row{display:flex;flex-wrap:wrap;gap:6px}
.present-cast-pill,.present-item-pill{min-height:44px;min-width:44px;padding:8px 12px!important;margin:0!important;font-size:12px!important;border-radius:999px!important;background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 14%,var(--vn-shell-button,transparent))!important;border:1px solid var(--vn-shell-border-strong,var(--vn-shell-border))!important;color:var(--vn-shell-text,inherit)!important}
.present-item-pill.active,.present-cast-pill.active{background:var(--vn-shell-accent,#a8d3c8)!important;color:var(--vn-shell-accent-contrast,#091418)!important;border-color:var(--vn-shell-accent,#a8d3c8)!important;font-weight:750!important}
.world-scene-empty{font-size:11px;color:var(--vn-shell-muted,inherit)}
.world-atlas-view{position:relative;height:215px;width:330px}
.story-dna-studio{margin:12px 0;padding:12px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-field,rgba(18,32,38,.7));border:1px solid var(--vn-shell-border,rgba(130,185,165,.32));display:flex;flex-direction:column;gap:10px}
.story-dna-studio-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.story-dna-studio-head h3{margin:0;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--vn-shell-accent,#d6ecad)}
.story-dna-studio-actions{display:flex;gap:6px}
.story-dna-studio-actions button{min-height:44px;min-width:44px;padding:6px 12px!important;font-size:12px!important;margin:0!important}
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
