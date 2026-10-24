/** Settings-only layout. Reader themes and user CSS remain independent. */
export const WORKSPACE_CSS=`
:host{overflow-wrap:anywhere;font-size:1rem;--set-radius:14px;--set-control:44px}
[data-shell]{padding:16px;gap:12px;max-width:1120px;margin:auto}
[data-workspace-header]{display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:var(--set-field);border:1px solid var(--set-border);border-radius:12px;padding:4px;min-width:0}
[data-workspace-header] button{border:0;background:transparent;border-radius:8px;min-width:44px;padding:8px 10px}
[data-toggle-search] svg{display:block;width:20px;height:20px}
[data-category-picker]{flex:1 1 8rem;display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0;text-align:left}
[data-page-label]{overflow-wrap:anywhere}
[data-all-settings]{font-weight:500}
[data-topbar]{gap:0;min-height:0}
[data-topbar]:has([data-status]:empty) [data-status]{display:none}
[data-search]{flex-basis:100%;margin-bottom:8px}
[data-search] input{padding:10px 12px;border-radius:10px}
[data-search-results]{position:static;margin-top:8px;max-height:none;overflow:visible;box-shadow:none}
[data-layout]{display:block}
[data-nav]{display:none;position:static;margin:0;padding:0;border:0;background:var(--set-field)}
[data-panes]{display:block;min-width:0}
[data-pane]{gap:20px;padding:8px 0 16px}
[data-pane-head]{gap:6px;margin:0 0 4px}
[data-pane-head] h2{font-size:1.5rem;letter-spacing:0;outline-offset:4px}
[data-pane-head] p{font-size:1rem;line-height:1.5}
[data-home]{display:grid;gap:20px;padding-top:12px}
[data-home] h1{font-size:1.75rem;margin:0 0 4px;line-height:1.2}
[data-home-categories]{display:grid;gap:0;border-top:1px solid var(--set-border)}
[data-home-categories] button,[data-page-links] button,[data-category-options] button{width:100%;display:flex;align-items:center;gap:14px;text-align:left;white-space:normal;border:0;border-bottom:1px solid var(--set-border);border-radius:0;background:transparent;padding:16px 4px;min-height:64px}
[data-home-categories] svg{width:24px;height:24px;flex:none;color:var(--set-accent)}
[data-home-categories] button>span:nth-last-child(2),[data-page-links] button>span:first-child{flex:1;min-width:0}
[data-home-categories] b,[data-page-links] b{display:block;font-size:1rem;font-weight:650}
[data-home-categories] small,[data-page-links] small{font-size:.9rem;margin-top:3px}
[data-page-links]{display:grid;border-top:1px solid var(--set-border)}
[data-workspace-page]{display:grid;gap:20px;min-width:0}
[data-group]{border:0;border-radius:0;background:transparent;padding:0 0 20px;border-bottom:1px solid var(--set-border);gap:16px;scroll-margin:16px}
[data-group-head] h3{font-size:1.05rem}
[data-apply-chip]{display:none}
[data-check]{border:0!important;border-radius:0!important;background:transparent!important}
[data-options]{grid-template-columns:1fr;gap:0}
[data-options] label{border-radius:8px;background:transparent;padding:10px;min-height:44px;border-color:transparent}
[data-options] label small{font-size:.9rem}
[data-options] label:has(input:checked){background:color-mix(in srgb,var(--set-accent) 9%,var(--set-field))}
[data-source-options] label:not(:has(input:checked)) small{display:none}
button{border-radius:9px;white-space:normal;min-height:44px}
summary{min-height:44px;align-content:center}
input,select,textarea{min-width:0;max-width:100%;font-size:1rem!important}
textarea{font-family:inherit;line-height:1.6;min-height:130px}
textarea[spellcheck=false]{font-family:var(--lumiverse-font-mono,ui-monospace,monospace)}
[data-segments]{gap:4px;display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr))}
[data-segments] label{justify-content:center;border-radius:8px;padding:8px;white-space:normal;text-align:center}
[data-character-tabs]{display:flex;gap:8px;border-bottom:1px solid var(--set-border);padding-bottom:12px}
[data-character-tabs] button{flex:1;background:transparent}
[data-character-tabs] [aria-pressed=true]{background:var(--set-hover);border-color:var(--set-accent)}
[data-draft-bar]{position:static;bottom:auto;display:flex;flex-wrap:wrap;gap:12px;background:var(--set-field);border:1px solid var(--set-border);border-radius:12px;padding:16px;margin-top:16px;box-shadow:none}
[data-draft-bar] small{font-size:.9rem}
dialog{width:min(440px,calc(100% - 24px));max-height:calc(100dvh - 32px);overflow:auto;padding:20px;border:1px solid var(--set-border);border-radius:16px;background:var(--set-field);color:var(--set-text);font:inherit;box-shadow:0 20px 60px #0006}
dialog::backdrop{background:#0008}
dialog header{display:flex;gap:12px;align-items:center;justify-content:space-between}
dialog header button{min-width:44px}
dialog p{margin:12px 0 20px}
[data-category-options]{display:grid;margin-top:12px}
[data-category-options] button{justify-content:space-between}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
[data-route-hidden],[hidden]{display:none!important}
[data-setup]{display:none!important}
[data-shell][data-show-onboarding] [data-setup]{display:grid!important}
@container(min-width:800px){
 [data-layout]{display:grid;grid-template-columns:216px minmax(0,1fr);gap:28px}
 [data-nav]{display:block;background:transparent}
 [data-tablist]{display:flex;flex-direction:column;overflow:visible}
 [data-tab]{min-height:52px;border-radius:9px;padding:10px;white-space:normal}
 [data-tab-summary]{display:block;font-size:.85rem;white-space:normal}
 [data-workspace-header]{background:transparent;border:0;padding:0}
 [data-category-picker]{pointer-events:none;font-size:1rem;color:var(--set-muted)}
 [data-category-picker]>span:last-child{display:none}
}
@container(max-width:420px){[data-row]{grid-template-columns:1fr}[data-all-settings] span{display:none}[data-all-settings]{font-size:1.2rem}[data-preset-row]{display:grid;grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;
