/** Layout is independent of theme color. Shell tokens follow every existing preset.
 * These rules never reach into the user-CSS theme root. */
export const READER_SHELL_CSS = `
[data-vn-reader-first="true"] { --reader-rail:82px; --reader-header:64px; --reader-gap:12px; --reader-bottom:0px; --reader-workspace:0px;--vn-shell-accent-contrast:var(--vn-shell-panel); font-family:var(--vn-shell-family); }
[data-vn-reader-first="true"][data-vn-preset="lumiverse"]{--vn-shell-accent-contrast:var(--lumiverse-primary-contrast,var(--vn-shell-panel));}
[data-vn-reader-first="true"][data-vn-preset="literature-club"]{--vn-shell-accent-contrast:#2b0b18;--vn-shell-navigation-ink:#a72b53;}
[data-vn-reader-first="true"] [hidden] { display:none!important; }
[data-vn-reader-first="true"] [data-vn-theme-host] { width:auto;height:auto;left:calc(var(--reader-rail) + var(--reader-gap)); top:calc(var(--reader-header) + var(--reader-gap)); right:calc(var(--reader-workspace) + var(--reader-gap)); bottom:calc(var(--reader-bottom) + var(--reader-gap)); border-radius:min(var(--vn-shell-radius),12px); overflow:hidden; }
[data-vn-reader-first="true"][data-vn-workspace] { --reader-workspace:clamp(370px,36%,560px); }
[data-vn-navigation] { position:absolute;inset:0 auto var(--reader-bottom) 0;width:var(--reader-rail);display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 8px 80px;border-right:1px solid var(--vn-shell-border);background:var(--vn-shell-panel);z-index:12;box-sizing:border-box;color:var(--vn-shell-text); }
[data-vn-navigation-brand] { display:grid;place-items:center;min-height:48px;font:36px/1 Georgia,serif;color:var(--vn-shell-accent);margin-bottom:22px; }
[data-vn-navigation] button { position:relative;width:100%;min-height:64px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--vn-shell-muted);font:550 11px/1.25 var(--vn-shell-family);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:8px 2px; }
[data-vn-navigation] svg { width:22px;height:22px;flex:none; }
[data-vn-navigation] button:hover { background:color-mix(in srgb,var(--vn-shell-accent) 8%,transparent);color:var(--vn-shell-text); }
[data-vn-navigation] button[aria-current="page"] { color:var(--vn-shell-navigation-ink,var(--vn-shell-accent));background:color-mix(in srgb,var(--vn-shell-accent) 12%,transparent);border-color:color-mix(in srgb,var(--vn-shell-accent) 25%,transparent); }
[data-reader-destination="settings"] { margin-top:auto; }
[data-vn-navigation] [data-reader-destination="more"] { display:none; }
[data-reader-attention] { position:absolute;top:3px;right:3px;min-width:18px;padding:2px;border-radius:10px;background:var(--vn-shell-accent);color:var(--vn-shell-accent-contrast);font:700 10px/1.4 system-ui; }
[data-vn-reader-header] { position:absolute;top:0;left:var(--reader-rail);right:0;height:var(--reader-header);padding:0 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--vn-shell-border);background:var(--vn-shell-panel);color:var(--vn-shell-text);box-sizing:border-box;z-index:11; }
[data-vn-reader-header]>div { display:flex;align-items:center;gap:18px;min-width:0; }
[data-vn-reader-wordmark] { font-size:10px;letter-spacing:.17em;color:var(--vn-shell-accent);font-weight:650; }
[data-reader-caption] { font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:32ch; }
[data-vn-reader-header] button,[data-workspace-heading] button { min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--vn-shell-muted);font:500 12px/1.35 var(--vn-shell-family);padding:7px 10px;cursor:pointer; }
[data-vn-reader-header] button:hover,[data-workspace-heading] button:hover { background:color-mix(in srgb,var(--vn-shell-accent) 10%,transparent);color:var(--vn-shell-text); }
[data-vn-reader-header] svg,[data-workspace-heading] svg { width:18px;height:18px;flex:none; }
[data-vn-reader-header] kbd { font:10px/1.4 system-ui;border:1px solid var(--vn-shell-border);border-radius:4px;padding:2px 4px;margin-left:6px; }
[data-vn-reader-first="true"] [data-vn-exit] { z-index:20;top:auto;bottom:14px;left:8px;right:auto;width:66px;min-height:52px;white-space:normal;text-align:center;padding:8px 4px;border:0;border-radius:8px;background:transparent;box-shadow:none;font:550 11px/1.35 var(--vn-shell-family);gap:6px;flex-direction:column; }
[data-vn-reader-first="true"] [data-vn-exit]::before { width:8px;height:8px;margin:0 0 4px; }
[data-vn-workspace] { --vn-panel-solid:var(--vn-shell-panel);--vn-panel-border:var(--vn-shell-border);--vn-text:var(--vn-shell-text);--vn-muted-text:var(--vn-shell-muted);--vn-accent:var(--vn-shell-accent);--vn-chrome-text:var(--vn-shell-text);--vn-button-bg:var(--vn-shell-button); }
aside[data-vn-workspace] { position:absolute;right:var(--reader-gap);top:calc(var(--reader-header) + var(--reader-gap));bottom:calc(var(--reader-bottom) + var(--reader-gap));width:calc(var(--reader-workspace) - var(--reader-gap));display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;background:var(--vn-shell-panel);color:var(--vn-shell-text);border:1px solid var(--vn-shell-border);border-radius:min(var(--vn-shell-radius),12px);z-index:10; }
[data-workspace-heading] { flex:none;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 20px 15px;border-bottom:1px solid var(--vn-shell-border); }
[data-workspace-heading]>div { min-width:0; }
[data-workspace-title] { font:500 28px/1.2 var(--vn-shell-family);margin:5px 0 0;overflow-wrap:anywhere; }
[data-workspace-subtitle] { font-size:11px;line-height:1.5;color:var(--vn-shell-muted);margin:0; }
[data-workspace-content] { position:relative;flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--vn-shell-border) transparent; }
[data-workspace-content]>[data-vn-workspace-tool] { position:relative;inset:auto;width:100%;height:100%;display:block;pointer-events:auto;min-height:0; }
[data-workspace-empty] { margin:24px;font-size:14px;line-height:1.8;color:var(--vn-shell-muted); }
[data-reader-more] { padding:8px 20px; }
[data-reader-more] button { display:flex;align-items:center;gap:14px;min-height:76px;text-align:left;background:none;color:var(--vn-shell-text);width:100%;border:0;border-bottom:1px solid var(--vn-shell-border);padding:12px 0;cursor:pointer;font:600 15px/1.5 var(--vn-shell-family); }
[data-reader-more] svg { width:22px;height:22px;color:var(--vn-shell-accent);flex:none; }
[data-reader-more] small { display:block;color:var(--vn-shell-muted);font-size:12px;font-weight:400; }
[data-reader-more] p { color:var(--vn-shell-muted);font-size:12px;line-height:1.8;margin-top:24px; }
[data-reader-command] { width:min(580px,calc(100% - 24px));max-height:85dvh;box-sizing:border-box;overflow:auto;padding:20px;border:1px solid var(--vn-shell-border);border-radius:14px;background:var(--vn-shell-panel);color:var(--vn-shell-text);font:14px/1.5 var(--vn-shell-family);box-shadow:0 24px 100px #0006; }
[data-reader-command]::backdrop { background:#0009; }
[data-reader-command] header { display:flex;align-items:center;justify-content:space-between;gap:12px; }
[data-reader-command] h2 { font-size:22px;margin:0; }
[data-reader-command] button { font:inherit;color:inherit;cursor:pointer;min-height:44px; }
[data-reader-command] header button { width:44px;border:0;border-radius:8px;background:transparent; }
[data-reader-command] svg { width:20px;height:20px;flex:none; }
[data-reader-command] label { display:flex;align-items:center;gap:12px;border:1px solid var(--vn-shell-border);border-radius:8px;padding:0 12px;margin:16px 0;background:var(--vn-shell-field); }
[data-reader-command] input { min-height:48px;min-width:0;width:100%;border:0;background:transparent;color:inherit;font:inherit;font-size:16px; }
[data-reader-command-results] { max-height:48dvh;overflow:auto;overscroll-behavior:contain; }
[data-reader-command-results] button { display:block;width:100%;background:transparent;border:0;border-radius:8px;text-align:left;padding:10px 12px; }
[data-reader-command-results] button:hover { background:color-mix(in srgb,var(--vn-shell-accent) 12%,transparent); }
[data-reader-command-results] small { display:block;font-size:12px;color:var(--vn-shell-muted);margin-top:3px; }
[data-reader-command]>p { font-size:12px;color:var(--vn-shell-muted);margin:16px 0 0; }
[data-vn-reader-first="true"] :is([data-vn-navigation] button,[data-vn-reader-header] button,[data-workspace-heading] button,[data-reader-more] button,[data-reader-command] button,[data-reader-command] input):focus-visible { outline:2px solid var(--vn-shell-accent);outline-offset:2px; }
[data-vn-reader-first="true"][data-vn-reading-focus="true"] { --reader-rail:0px;--reader-header:0px;--reader-bottom:0px;--reader-gap:0px; }
[data-vn-reading-focus="true"] [data-vn-navigation],[data-vn-reading-focus="true"] [data-vn-reader-wordmark],[data-vn-reading-focus="true"] [data-reader-caption],[data-vn-reading-focus="true"] [data-reader-search] { display:none; }
[data-vn-reading-focus="true"] [data-vn-reader-header] { left:auto;top:8px;right:8px;height:44px;border:0;padding:0;background:transparent;pointer-events:none; }
[data-vn-reading-focus="true"] [data-reader-focus] { pointer-events:auto;background:var(--vn-shell-panel);border-color:var(--vn-shell-border); }
[data-vn-reader-first="true"][data-vn-reading-focus="true"] [data-vn-exit] { left:12px;bottom:auto;top:10px;width:auto;min-height:44px;padding:10px 12px;flex-direction:row;background:var(--vn-shell-panel);border:1px solid var(--vn-shell-border); }
[data-vn-reading-focus="true"] [data-vn-exit]::before { margin:0; }
[data-vn-reader-first="true"] [data-vn-panel-layer], [data-vn-reader-first="true"] [data-vn-speech-dock] { left:calc(var(--reader-rail) + var(--reader-gap));top:calc(var(--reader-header) + var(--reader-gap));right:calc(var(--reader-workspace) + var(--reader-gap));bottom:calc(var(--reader-bottom) + var(--reader-gap));width:auto;height:auto; }
@media(max-width:1100px) and (min-width:761px) {
 [data-vn-reader-first="true"][data-vn-workspace] { --reader-workspace:400px; }
 [data-vn-reader-wordmark],[data-reader-search] kbd { display:none; }
}
@media(max-width:760px) {
 [data-vn-reader-first="true"] { --reader-rail:0px;--reader-header:calc(56px + env(safe-area-inset-top));--reader-gap:0px;--reader-bottom:calc(68px + env(safe-area-inset-bottom) + var(--reader-keyboard-inset,0px)); }
 [data-vn-navigation] { top:auto;bottom:var(--reader-keyboard-inset,0px);left:0;right:0;width:100%;height:calc(68px + env(safe-area-inset-bottom));padding:4px max(8px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));flex-direction:row;gap:6px;border:0;border-top:1px solid var(--vn-shell-border); }
 [data-vn-navigation-brand],[data-vn-navigation] [data-reader-destination="history"],[data-vn-navigation] [data-reader-destination="settings"] { display:none; }
 [data-vn-navigation] [data-reader-destination="more"] { display:flex; }
 [data-vn-navigation] button { flex:1;min-height:56px;width:auto;margin:0;gap:5px;font-size:11px;padding:5px 2px; }
 [data-vn-navigation] svg { width:21px;height:21px; }
 [data-vn-reader-header] { padding:env(safe-area-inset-top) 10px 0 12px;gap:8px; }
 [data-vn-reader-wordmark],[data-reader-search] span,[data-reader-search] kbd,[data-reader-focus] span { display:none; }
 [data-vn-reader-header]>div { gap:4px; }
 [data-reader-caption] { font-size:12px;max-width:calc(100vw - 200px); }
 [data-vn-reader-header] [data-reader-header-actions] { margin-right:0; }
 [data-vn-reader-header] button { min-width:44px;padding:8px; }
 [data-vn-reader-first="true"] [data-vn-exit] { position:absolute;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden; }
 [data-vn-reader-first="true"] [data-vn-exit]::before { display:none; }
 [data-vn-reader-first="true"] [data-vn-theme-host] { position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:0; }
 [data-vn-reader-first="true"][data-vn-workspace] { --reader-workspace:0px; }
 aside[data-vn-workspace] { left:0;right:0;width:auto;border:0;border-radius:0; }
 [data-workspace-heading] { padding:16px 18px 13px; }
 [data-workspace-title] { font-size:26px; }
 [data-vn-reading-focus="true"] [data-vn-reader-header] { left:auto;right:8px;width:auto; }
 [data-vn-reading-focus="true"] [data-vn-reader-header] [data-reader-header-actions] { margin-right:0; }
 [data-vn-reader-first="true"][data-vn-reading-focus="true"] [data-vn-exit] { right:auto;left:8px;width:auto;border-radius:8px; }
 [data-vn-reading-focus="true"] [data-reader-focus] span { display:inline; }
}
@media(max-height:640px) and (min-width:761px) {
 [data-vn-navigation]{gap:4px;padding:8px 8px 66px;overflow-y:auto}
 [data-vn-navigation-brand]{display:none}
 [data-vn-navigation] button{min-height:48px;flex-shrink:0;gap:3px;padding:5px 2px}
 [data-vn-navigation] svg{width:18px;height:18px}
}
@media(prefers-reduced-motion:no-preference) {
 [data-vn-navigation] button,[data-vn-reader-header] button { transition:background-color 140ms ease,color 140ms ease; }
}
`;

/** Added to base, BEFORE presets and custom CSS. No palette override. */
export const READER_STAGE_CSS = `
[data-vn-root][data-vn-reader-first="true"] { min-height:0; }
[data-vn-root][data-vn-reader-first="true"] [data-vn-dialogue] { max-width:100%; }
[data-vn-root][data-vn-reader-first="true"] [data-vn-narrative] { max-width:100%;min-width:0;grid-template-columns:minmax(0,1fr); }
[data-vn-root][data-vn-reader-first="true"] [data-vn-controls] { max-width:100%; }
[data-vn-root][data-vn-reader-first="true"] [data-vn-dialogue-text] { overflow-wrap:anywhere; }
/* Reserve reply room from the actual reduced reader, including landscape.
   The original viewport-based ceiling is too large once navigation is outside. */
[data-vn-root][data-vn-reader-first="true"][data-vn-adjustable-sheet="true"]:not([data-vn-text-hidden="true"]):has([data-vn-interaction]:not([hidden])) {
 --vn-reply-sheet-height:min(var(--vn-sheet-height),max(6rem,calc(var(--vn-reader-height,100dvh) - 17rem)));
}
[data-vn-root][data-vn-reader-first="true"][data-vn-preset] [data-vn-interaction] { top:1rem; }
/* Reader height now excludes navigation; don't size the scroll region to the full screen. */
[data-vn-root][data-vn-reader-first="true"]:not([data-vn-adjustable-sheet="true"]) [data-vn-dialogue-text] { max-height:min(22rem,max(3.2em,calc(100 * var(--vn-dvh,1dvh) - 23rem))); }
`;
