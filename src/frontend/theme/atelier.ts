/** Local CSS/SVG only. Decorative light stays at the plate edge, behind text. */
type Palette = { accent: string; text: string; muted: string; solid: string; glow: string; font: string; radius: string; texture: string };
export const ATELIER_PALETTES = {
  'astral-glass': {accent:'#b7eaff',text:'#f2f5ff',muted:'#c3cde0',solid:'#101728',glow:'#bd9aff',font:'ui-rounded, "Segoe UI", system-ui, sans-serif',radius:'1rem',texture:'radial-gradient(ellipse at 0% 0%, #b7eaff22, transparent 45%), radial-gradient(ellipse at 100% 100%, #bd9aff1c, transparent 50%)'},
  'neon-rain': {accent:'#78f7dc',text:'#e6fff9',muted:'#b0d5d0',solid:'#0b191e',glow:'#fa83c4',font:'"Cascadia Code", ui-monospace, monospace',radius:'.35rem',texture:'repeating-linear-gradient(0deg, transparent 0 5px, #78f7dc05 5px 6px), linear-gradient(120deg, #78f7dc12, transparent 45%, #fa83c410)'},
  'obsidian-reliquary': {accent:'#d1b6f5',text:'#f5effc',muted:'#cbbfd7',solid:'#1a1422',glow:'#dbe2ed',font:'Georgia, "Times New Roman", serif',radius:'.65rem',texture:'radial-gradient(ellipse at 50% 0%, #d1b6f51c, transparent 65%), repeating-linear-gradient(135deg, transparent 0 20px, #dbe2ed04 20px 21px)'},
} satisfies Record<string, Palette>;

function plate(id: string, p: Palette): string {
  const root=`[data-vn-root][data-vn-preset="${id}"]`;
  return `${root} {
    --vn-accent: ${p.accent}; --vn-text: ${p.text}; --vn-muted-text: ${p.muted};
    --vn-dialogue-bg: ${p.texture}, ${p.solid}; --vn-dialogue-border: ${p.accent}80;
    --vn-dialogue-width: min(76rem, calc(100 * var(--vn-vw, 1vw) - 2rem));
    --vn-font-family: ${p.font}; --vn-dialogue-font-size: clamp(1rem, 1.1vw + .7rem, 1.35rem);
    --vn-transition-duration: 300ms; --vn-accent-contrast: ${p.solid};
    --vn-chrome-bg: ${p.solid}; --vn-chrome-text: ${p.text}; --vn-chrome-border: ${p.accent}65;
    --vn-chrome-hover: ${p.accent}20; --vn-panel-bg: ${p.solid}f5;
    --vn-panel-solid: ${p.solid}; --vn-panel-border: ${p.accent}70;
    --vn-focus-ring: ${p.accent}; --vn-button-radius: ${p.radius};
  }
  ${root} [data-vn-ornament-group][data-vn-preset="${id}"] { display: block; }
  ${root} [data-vn-dialogue] {
    border-radius: ${p.radius}; border: 1px solid var(--vn-dialogue-border);
    font-family: var(--vn-font-family);
    background: var(--vn-dialogue-bg); outline: 1px solid ${p.glow}38; outline-offset: -5px;
    box-shadow: 0 .8rem 2rem #0005, inset 0 1px 0 ${p.accent}30;
  }
  ${root} [data-vn-dialogue]::before {
    content: ""; position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
    background: linear-gradient(90deg, transparent, ${p.accent}, ${p.glow}, transparent);
    box-shadow: 0 0 8px ${p.glow}60; pointer-events: none;
  }
  ${root} [data-vn-dialogue]::after {
    content: ""; position: absolute; inset: 8px; border: 1px solid ${p.glow}65;
    clip-path: polygon(0 0, 18px 0, 18px 1px, 1px 1px, 1px 18px, 0 18px, 0 0, 100% 0, 100% 18px, calc(100% - 1px) 18px, calc(100% - 1px) 1px, calc(100% - 18px) 1px, calc(100% - 18px) 0, 100% 0, 100% 100%, calc(100% - 18px) 100%, calc(100% - 18px) calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) calc(100% - 18px), 100% calc(100% - 18px), 100% 100%, 0 100%, 0 calc(100% - 18px), 1px calc(100% - 18px), 1px calc(100% - 1px), 18px calc(100% - 1px), 18px 100%, 0 100%);
    pointer-events: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    ${root}[data-vn-effect-intensity="full"] [data-vn-dialogue]::before { animation: vn-${id}-edge 8s ease-in-out infinite; }
  }
  @keyframes vn-${id}-edge { 0%,100% { opacity: .45; } 50% { opacity: .95; } }
  ${root} [data-vn-control]:hover:not(:disabled),
  ${root} [data-vn-control][data-vn-active="true"] { color: ${p.accent}; background: ${p.accent}18; box-shadow: inset 0 -1px 0 ${p.accent}70; }
  ${root} [data-vn-choice]:hover:not(:disabled), ${root} [data-vn-choice]:focus-visible {
    border-color: ${p.accent}; background: ${p.accent}18; outline-color: ${p.accent};
  }
  ${root} [data-vn-backlog], ${root} [data-vn-input] { background: ${p.solid}; color: ${p.text}; }
  ${root} [data-vn-speaker], ${root} [data-vn-progress] { color: ${p.accent}; }
  ${root} [data-vn-continue] { border-color: ${p.accent}90; background: ${p.accent}15; color: ${p.text}; }
  ${root} [data-vn-continue]:hover { background: ${p.accent}28; }
  ${root} [data-vn-dialogue-text] { scrollbar-color: ${p.accent}80 transparent; }
  `;
}
export const ATELIER_CSS = Object.fromEntries(Object.entries(ATELIER_PALETTES).map(([id,p])=>[id,plate(id,p)])) as Record<keyof typeof ATELIER_PALETTES,string>;

function ornament(id: string, shapes: string): string {
  return `<g data-vn-ornament-group="" data-vn-preset="${id}" aria-hidden="true" focusable="false" vector-effect="non-scaling-stroke" fill="none" stroke="currentColor" opacity="0.42">${shapes}</g>`;
}
export const ATELIER_ORNAMENTS = {
  'astral-glass': ornament('astral-glass', '<path d="M45 155V55H145 M1455 55H1555V155" stroke-width="1.5"/><g stroke-width="1"><circle cx="105" cy="105" r="32"/><path d="M73 105H137 M105 73V137 M80 80L130 130 M80 130L130 80"/><path d="M1460 80L1490 110L1520 80L1490 50Z M1450 135L1525 160"/></g><circle cx="1460" cy="138" r="3" fill="currentColor"/>'),
  'neon-rain': ornament('neon-rain', '<path d="M45 155V55H135 M1465 55H1555V155 M45 740V825H100 M1500 825H1555V740" stroke-width="2"/><path d="M65 75H105 M65 85H90 M1495 75H1535 M1510 85H1535" stroke-width="1"/><g opacity=".5"><path d="M75 220L65 260 M100 280L90 320 M1510 200L1500 240 M1535 310L1525 350"/></g>'),
  'obsidian-reliquary': ornament('obsidian-reliquary', '<path d="M45 165V75L75 45H165 M1435 45H1525L1555 75V165" stroke-width="1.8"/><path d="M57 150V80L80 57H150 M1450 57H1520L1543 80V150"/><path d="M85 100L100 85L115 100L100 115Z M1485 100L1500 85L1515 100L1500 115Z"/><path d="M650 45H755L780 60L800 40L820 60L845 45H950" stroke-width="1"/>'),
};

export const ATELIER_SHELL_CSS=Object.entries(ATELIER_PALETTES).map(([id,p])=>`[data-vn-shell][data-vn-preset="${id}"] {
  --vn-shell-bg: ${p.solid}; --vn-shell-bg-hover: color-mix(in srgb, ${p.accent} 15%, ${p.solid});
  --vn-shell-panel: ${p.solid}; --vn-shell-field: color-mix(in srgb, ${p.solid} 85%, black);
  --vn-shell-button: color-mix(in srgb, ${p.accent} 10%, ${p.solid}); --vn-shell-text: ${p.text};
  --vn-shell-muted: ${p.muted}; --vn-shell-border: ${p.accent}80; --vn-shell-accent: ${p.accent};
  --vn-shell-radius: ${p.radius}; --vn-shell-family: ${p.font};
  --vn-shell-shadow: 0 .3rem 1rem #0005, inset 0 1px 0 ${p.accent}20;
}`).join('\n');
