import type { VisualNovelThemePreset } from "../../config.js";

/**
 * Single source of truth for cohesive UI/menu palettes across all shadow roots
 * (`SettingsPanel`, `ImageLibrary`, `ImageStudio`, `PanelDock`, `Stage`, and `Workspace`).
 * Pure local CSS tokens & gradients only — never embeds URLs or external fonts.
 * Every preset owns its full surface/text/accent palette directly with no global light/dark mode switch.
 */

export interface ThemePaletteSpec {
  mode: "light" | "dark";
  overlayBg: string;
  workspaceBg: string;
  surfaceGradient: string;
  cardPattern: string;
  ringColor: string;
  accentSurface: string;
  ghostBg: string;
  accent: string;
  accentHover: string;
  accentContrast: string;
  accentGlow: string;
  text: string;
  muted: string;
  panel: string;
  field: string;
  button: string;
  hoverBg: string;
  border: string;
  borderStrong: string;
  radius: string;
  scrubberRadius: string;
  family: string;
  displayFont: string;
  shadow: string;
  quoteColor: string;
  edgeGlow: string;
  dialogueBg: string;
  dialogueBorder: string;
  bottomBarBg: string;
  bottomBarBorder: string;
  buttonBg: string;
  buttonBorder: string;
  buttonText: string;
  buttonHoverBg: string;
  inputFormBg: string;
  inputBg: string;
  choiceBg: string;
  choiceBorder: string;
  choiceHoverBg: string;
}

export const THEME_PALETTE_SPECS: Record<VisualNovelThemePreset, ThemePaletteSpec> = {
  lumiverse: {
    mode: "dark",
    overlayBg: "var(--lumiverse-bg-elevated, linear-gradient(170deg, #16241f, #0d1714, #070d0b))",
    workspaceBg: "var(--lumiverse-bg-elevated, linear-gradient(160deg, #131e1a, #0c1411, #060b09))",
    surfaceGradient: "var(--lumiverse-card-bg, linear-gradient(155deg, #14211c 0%, #0e1819 58%, #081013 100%))",
    cardPattern: "radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--vn-shell-accent) 7%, transparent), transparent 55%)",
    ringColor: "color-mix(in srgb, var(--lumiverse-primary, #dcebad) 10%, transparent)",
    accentSurface: "var(--lumiverse-fill-medium, #183628)",
    ghostBg: "rgba(14, 30, 24, 0.65)",
    accent: "var(--lumiverse-primary, #dcebad)",
    accentHover: "color-mix(in srgb, var(--lumiverse-primary, #dcebad) 84%, #ffffff)",
    accentContrast: "var(--lumiverse-primary-contrast, #11241c)",
    accentGlow: "color-mix(in srgb, var(--lumiverse-primary, #dcebad) 36%, transparent)",
    text: "var(--lumiverse-text, #eff4e9)",
    muted: "var(--lumiverse-text-muted, #9cb5a8)",
    panel: "var(--lumiverse-bg-elevated, #111a1e)",
    field: "color-mix(in srgb, var(--lumiverse-bg-elevated, #182429) 92%, #000000)",
    button: "var(--lumiverse-fill-medium, #23342e)",
    hoverBg: "color-mix(in srgb, var(--lumiverse-primary, #dcebad) 14%, var(--lumiverse-fill-medium, #23342e))",
    border: "var(--lumiverse-border, rgba(220, 238, 217, 0.16))",
    borderStrong: "color-mix(in srgb, var(--lumiverse-primary, #dcebad) 45%, transparent)",
    radius: "12px",
    scrubberRadius: "999px",
    family: 'var(--lumiverse-font-family, ui-rounded, "Segoe UI", system-ui, sans-serif)',
    displayFont: 'Georgia, "Times New Roman", serif',
    shadow: "0 0.35rem 1.2rem rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    quoteColor: "var(--lumiverse-primary, #e6b89c)",
    edgeGlow: "rgba(220, 238, 177, 0.46)",
    dialogueBg: "rgba(6, 15, 18, var(--caption-opacity, 0.8))",
    dialogueBorder: "var(--lumiverse-border, rgba(224, 238, 217, 0.32))",
    bottomBarBg: "rgba(7, 16, 13, 0.94)",
    bottomBarBorder: "rgba(160, 205, 185, 0.18)",
    buttonBg: "rgba(14, 30, 24, 0.92)",
    buttonBorder: "rgba(160, 205, 185, 0.3)",
    buttonText: "#edf3ea",
    buttonHoverBg: "rgba(35, 75, 57, 0.95)",
    inputFormBg: "rgba(11, 24, 18, 0.94)",
    inputBg: "rgba(6, 14, 11, 0.84)",
    choiceBg: "rgba(11, 24, 18, 0.92)",
    choiceBorder: "rgba(160, 205, 185, 0.28)",
    choiceHoverBg: "rgba(35, 75, 57, 0.95)",
  },

  "golden-hour": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #27170b, #170c05, #0b0502)",
    workspaceBg: "linear-gradient(160deg, #211208, #140a04, #0a0401)",
    surfaceGradient: "linear-gradient(155deg, #231409 0%, #160c05 58%, #0c0502 100%)",
    cardPattern: "radial-gradient(ellipse at 50% 0%, rgba(245, 179, 86, 0.08), transparent 60%)",
    ringColor: "rgba(245, 179, 86, 0.095)",
    accentSurface: "#3d220e",
    ghostBg: "rgba(36, 21, 10, 0.7)",
    accent: "#efb35e",
    accentHover: "#ffd088",
    accentContrast: "#231203",
    accentGlow: "rgba(239, 179, 94, 0.38)",
    text: "#fff5e0",
    muted: "#d7a96e",
    panel: "#1c1008",
    field: "#28180c",
    button: "#3b2311",
    hoverBg: "#4e2f17",
    border: "rgba(239, 179, 94, 0.24)",
    borderStrong: "rgba(255, 208, 136, 0.56)",
    radius: "14px",
    scrubberRadius: "999px",
    family: 'ui-rounded, "Segoe UI", system-ui, sans-serif',
    displayFont: 'Georgia, "Palatino Linotype", serif',
    shadow: "0 0.45rem 1.4rem rgba(38, 16, 4, 0.55), inset 0 1px 0 rgba(255, 224, 172, 0.14)",
    quoteColor: "#f8c97d",
    edgeGlow: "rgba(246, 220, 164, 0.62)",
    dialogueBg: "rgba(28, 18, 9, var(--caption-opacity, 0.88))",
    dialogueBorder: "rgba(239, 179, 94, 0.48)",
    bottomBarBg: "rgba(20, 12, 6, 0.95)",
    bottomBarBorder: "rgba(239, 179, 94, 0.24)",
    buttonBg: "rgba(36, 22, 11, 0.94)",
    buttonBorder: "rgba(239, 179, 94, 0.34)",
    buttonText: "#fff4de",
    buttonHoverBg: "rgba(62, 37, 17, 0.96)",
    inputFormBg: "rgba(30, 19, 9, 0.95)",
    inputBg: "rgba(16, 9, 4, 0.9)",
    choiceBg: "rgba(30, 19, 9, 0.94)",
    choiceBorder: "rgba(239, 179, 94, 0.32)",
    choiceHoverBg: "rgba(62, 37, 17, 0.96)",
  },

  "boxed-console": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #101916, #090f0d, #040706)",
    workspaceBg: "linear-gradient(160deg, #0e1614, #080e0c, #040706)",
    surfaceGradient: "linear-gradient(155deg, #0f1816 0%, #09100e 58%, #040807 100%)",
    cardPattern: "repeating-linear-gradient(0deg, rgba(125, 255, 161, 0.025) 0 1px, transparent 1px 4px)",
    ringColor: "rgba(125, 255, 161, 0.08)",
    accentSurface: "#14271e",
    ghostBg: "rgba(10, 20, 16, 0.72)",
    accent: "#7dffa1",
    accentHover: "#aeffc5",
    accentContrast: "#04140a",
    accentGlow: "rgba(125, 255, 161, 0.34)",
    text: "#e7f9eb",
    muted: "#84bda0",
    panel: "#0a120f",
    field: "#101d18",
    button: "#162922",
    hoverBg: "#1e3a2f",
    border: "rgba(125, 255, 161, 0.24)",
    borderStrong: "rgba(125, 255, 161, 0.62)",
    radius: "4px",
    scrubberRadius: "1px",
    family: 'ui-monospace, "Cascadia Code", "Cascadia Mono", Consolas, monospace',
    displayFont: 'ui-monospace, "Cascadia Code", Consolas, monospace',
    shadow: "4px 4px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(125, 255, 161, 0.12)",
    quoteColor: "#9dffb8",
    edgeGlow: "rgba(125, 255, 161, 0.56)",
    dialogueBg: "rgba(9, 15, 12, var(--caption-opacity, 0.92))",
    dialogueBorder: "rgba(125, 255, 161, 0.42)",
    bottomBarBg: "rgba(6, 11, 9, 0.96)",
    bottomBarBorder: "rgba(125, 255, 161, 0.24)",
    buttonBg: "rgba(12, 22, 18, 0.94)",
    buttonBorder: "rgba(125, 255, 161, 0.34)",
    buttonText: "#e7f9eb",
    buttonHoverBg: "rgba(22, 43, 34, 0.96)",
    inputFormBg: "rgba(10, 18, 14, 0.96)",
    inputBg: "rgba(4, 8, 6, 0.92)",
    choiceBg: "rgba(11, 20, 16, 0.94)",
    choiceBorder: "rgba(125, 255, 161, 0.3)",
    choiceHoverBg: "rgba(22, 43, 34, 0.96)",
  },

  "paper-novel": {
    mode: "light",
    overlayBg: "linear-gradient(170deg, #f6f0e4, #ebe3d3, #dfd4bf)",
    workspaceBg: "linear-gradient(160deg, #f5efe3, #e9e0cf, #ddd2be)",
    surfaceGradient: "linear-gradient(155deg, #f6f0e4 0%, #ede4d4 58%, #e3d8c4 100%)",
    cardPattern: "linear-gradient(90deg, rgba(138, 47, 35, 0.045) 0 3px, transparent 3px)",
    ringColor: "rgba(138, 47, 35, 0.075)",
    accentSurface: "#eadecf",
    ghostBg: "rgba(244, 236, 220, 0.88)",
    accent: "#8a2f23",
    accentHover: "#a4392b",
    accentContrast: "#fdf8f0",
    accentGlow: "rgba(138, 47, 35, 0.26)",
    text: "#241d17",
    muted: "#695a4b",
    panel: "#f5efe2",
    field: "#fcf8f0",
    button: "#e8decb",
    hoverBg: "#ddd0b9",
    border: "rgba(101, 75, 43, 0.24)",
    borderStrong: "rgba(138, 47, 35, 0.58)",
    radius: "5px",
    scrubberRadius: "2px",
    family: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
    displayFont: 'Georgia, "Palatino Linotype", serif',
    shadow: "0 6px 20px rgba(42, 28, 14, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.75)",
    quoteColor: "#8a2f23",
    edgeGlow: "rgba(138, 47, 35, 0.38)",
    dialogueBg: "rgba(248, 242, 229, var(--caption-opacity, 0.94))",
    dialogueBorder: "rgba(138, 47, 35, 0.44)",
    bottomBarBg: "rgba(243, 235, 218, 0.97)",
    bottomBarBorder: "rgba(101, 75, 43, 0.24)",
    buttonBg: "rgba(232, 222, 203, 0.96)",
    buttonBorder: "rgba(101, 75, 43, 0.34)",
    buttonText: "#241d17",
    buttonHoverBg: "rgba(218, 203, 179, 0.98)",
    inputFormBg: "rgba(246, 239, 224, 0.97)",
    inputBg: "rgba(255, 252, 245, 0.95)",
    choiceBg: "rgba(245, 238, 223, 0.97)",
    choiceBorder: "rgba(138, 47, 35, 0.3)",
    choiceHoverBg: "rgba(234, 220, 198, 0.98)",
  },

  "midnight-noir": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #0f1320, #06080f, #000000)",
    workspaceBg: "linear-gradient(160deg, #0c101b, #05070c, #000000)",
    surfaceGradient: "linear-gradient(155deg, #0d111c 0%, #06080f 58%, #010205 100%)",
    cardPattern: "repeating-linear-gradient(0deg, rgba(217, 164, 65, 0.02) 0 1px, transparent 1px 6px)",
    ringColor: "rgba(217, 164, 65, 0.085)",
    accentSurface: "#171d2e",
    ghostBg: "rgba(10, 13, 24, 0.78)",
    accent: "#d9a441",
    accentHover: "#f2c66d",
    accentContrast: "#0a0802",
    accentGlow: "rgba(217, 164, 65, 0.38)",
    text: "#f5f1e6",
    muted: "#9ca6b8",
    panel: "#080b13",
    field: "#101522",
    button: "#182033",
    hoverBg: "#232e47",
    border: "rgba(217, 164, 65, 0.28)",
    borderStrong: "rgba(239, 199, 110, 0.62)",
    radius: "3px",
    scrubberRadius: "1px",
    family: 'Georgia, "Iowan Old Style", serif',
    displayFont: 'Georgia, "Cinzel", serif',
    shadow: "0 10px 28px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 234, 188, 0.1)",
    quoteColor: "#efc76e",
    edgeGlow: "rgba(217, 164, 65, 0.56)",
    dialogueBg: "rgba(6, 9, 17, var(--caption-opacity, 0.94))",
    dialogueBorder: "rgba(217, 164, 65, 0.5)",
    bottomBarBg: "rgba(4, 6, 12, 0.97)",
    bottomBarBorder: "rgba(217, 164, 65, 0.25)",
    buttonBg: "rgba(14, 19, 32, 0.95)",
    buttonBorder: "rgba(217, 164, 65, 0.34)",
    buttonText: "#f5f1e6",
    buttonHoverBg: "rgba(27, 35, 56, 0.97)",
    inputFormBg: "rgba(10, 14, 24, 0.96)",
    inputBg: "rgba(4, 6, 12, 0.94)",
    choiceBg: "rgba(12, 16, 28, 0.95)",
    choiceBorder: "rgba(217, 164, 65, 0.32)",
    choiceHoverBg: "rgba(27, 35, 56, 0.97)",
  },

  "yamaku-classic": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #211722, #140e16, #0a060b)",
    workspaceBg: "linear-gradient(160deg, #1d141f, #120c14, #08050a)",
    surfaceGradient: "linear-gradient(155deg, #1f1621 0%, #140e17 58%, #0a070c 100%)",
    cardPattern: "radial-gradient(ellipse at 90% 10%, rgba(192, 132, 252, 0.08), transparent 55%)",
    ringColor: "rgba(255, 112, 149, 0.085)",
    accentSurface: "#322035",
    ghostBg: "rgba(28, 19, 30, 0.72)",
    accent: "#ff7095",
    accentHover: "#ff9ab4",
    accentContrast: "#240712",
    accentGlow: "rgba(255, 112, 149, 0.38)",
    text: "#fef7f9",
    muted: "#cca6b5",
    panel: "#19131c",
    field: "#241b28",
    button: "#35263a",
    hoverBg: "#493350",
    border: "rgba(255, 112, 149, 0.25)",
    borderStrong: "rgba(255, 154, 180, 0.55)",
    radius: "10px",
    scrubberRadius: "999px",
    family: '"Segoe UI", system-ui, sans-serif',
    displayFont: 'Georgia, "Times New Roman", serif',
    shadow: "0 8px 24px rgba(10, 4, 14, 0.5), inset 0 1px 0 rgba(255, 220, 232, 0.09)",
    quoteColor: "#ffa2bc",
    edgeGlow: "rgba(255, 112, 149, 0.52)",
    dialogueBg: "linear-gradient(to top, rgba(20, 17, 15, var(--caption-opacity, 0.9)) 0%, rgba(28, 24, 20, 0.62) 100%)",
    dialogueBorder: "rgba(255, 112, 149, 0.42)",
    bottomBarBg: "rgba(18, 13, 20, 0.95)",
    bottomBarBorder: "rgba(255, 112, 149, 0.22)",
    buttonBg: "rgba(34, 24, 38, 0.93)",
    buttonBorder: "rgba(255, 112, 149, 0.3)",
    buttonText: "#fef7f9",
    buttonHoverBg: "rgba(56, 38, 60, 0.96)",
    inputFormBg: "rgba(26, 19, 29, 0.95)",
    inputBg: "rgba(15, 10, 18, 0.88)",
    choiceBg: "rgba(30, 22, 33, 0.94)",
    choiceBorder: "rgba(255, 112, 149, 0.28)",
    choiceHoverBg: "rgba(56, 38, 60, 0.96)",
  },

  "literature-club": {
    mode: "light",
    overlayBg: "linear-gradient(170deg, #fff5f9, #ffe7f0, #ffd9e7)",
    workspaceBg: "linear-gradient(160deg, #fff6f9, #ffe9f1, #ffdce9)",
    surfaceGradient: "linear-gradient(155deg, #fff5f9 0%, #ffe8f1 58%, #ffdbe8 100%)",
    cardPattern: "radial-gradient(circle, rgba(232, 80, 124, 0.08) 1.5px, transparent 1.7px)",
    ringColor: "rgba(232, 80, 124, 0.095)",
    accentSurface: "#ffd8e6",
    ghostBg: "rgba(255, 242, 247, 0.92)",
    accent: "#e8507c",
    accentHover: "#f46891",
    accentContrast: "#ffffff",
    accentGlow: "rgba(232, 80, 124, 0.3)",
    text: "#4a152b",
    muted: "#8c4463",
    panel: "#fff7fa",
    field: "#ffffff",
    button: "#ffe2ed",
    hoverBg: "#ffd0e2",
    border: "rgba(232, 80, 124, 0.26)",
    borderStrong: "rgba(232, 80, 124, 0.6)",
    radius: "16px",
    scrubberRadius: "999px",
    family: 'ui-rounded, "Comfortaa", "Trebuchet MS", system-ui, sans-serif',
    displayFont: '"Comfortaa", "Trebuchet MS", Georgia, serif',
    shadow: "0 6px 20px rgba(232, 80, 124, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
    quoteColor: "#c43868",
    edgeGlow: "rgba(255, 255, 255, 0.85)",
    dialogueBg: "linear-gradient(to bottom, rgba(255, 166, 206, 0.94) 0%, rgba(236, 148, 191, 0.78) 100%)",
    dialogueBorder: "rgba(255, 255, 255, 0.92)",
    bottomBarBg: "rgba(255, 244, 249, 0.96)",
    bottomBarBorder: "rgba(232, 80, 124, 0.24)",
    buttonBg: "rgba(255, 232, 241, 0.96)",
    buttonBorder: "rgba(232, 80, 124, 0.34)",
    buttonText: "#4a152b",
    buttonHoverBg: "rgba(255, 212, 229, 0.98)",
    inputFormBg: "rgba(255, 245, 249, 0.97)",
    inputBg: "#ffffff",
    choiceBg: "rgba(255, 244, 249, 0.97)",
    choiceBorder: "rgba(232, 80, 124, 0.32)",
    choiceHoverBg: "#ffffff",
  },

  "astral-glass": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #0b1b33, #061123, #020812)",
    workspaceBg: "linear-gradient(160deg, #09182e, #050f1e, #020811)",
    surfaceGradient: "linear-gradient(155deg, #0a1a31 0%, #061122 58%, #020813 100%)",
    cardPattern: "radial-gradient(ellipse at 15% 0%, rgba(72, 209, 255, 0.09), transparent 52%), radial-gradient(ellipse at 95% 95%, rgba(167, 139, 250, 0.07), transparent 48%)",
    ringColor: "rgba(72, 209, 255, 0.095)",
    accentSurface: "#102a4d",
    ghostBg: "rgba(10, 26, 50, 0.72)",
    accent: "#52d5ff",
    accentHover: "#8de4ff",
    accentContrast: "#031e2e",
    accentGlow: "rgba(82, 213, 255, 0.38)",
    text: "#eef7ff",
    muted: "#8bb6dd",
    panel: "#08162b",
    field: "#0e223f",
    button: "#15325b",
    hoverBg: "#1d4276",
    border: "rgba(82, 213, 255, 0.24)",
    borderStrong: "rgba(141, 228, 255, 0.56)",
    radius: "15px",
    scrubberRadius: "999px",
    family: 'ui-rounded, "Segoe UI", system-ui, sans-serif',
    displayFont: 'Georgia, "Palatino Linotype", serif',
    shadow: "0 10px 28px rgba(2, 10, 24, 0.55), inset 0 1px 0 rgba(186, 230, 253, 0.14)",
    quoteColor: "#9fe3ff",
    edgeGlow: "rgba(141, 228, 255, 0.65)",
    dialogueBg: "rgba(8, 20, 38, var(--caption-opacity, 0.86))",
    dialogueBorder: "rgba(82, 213, 255, 0.44)",
    bottomBarBg: "rgba(5, 14, 28, 0.95)",
    bottomBarBorder: "rgba(82, 213, 255, 0.22)",
    buttonBg: "rgba(14, 32, 58, 0.94)",
    buttonBorder: "rgba(82, 213, 255, 0.32)",
    buttonText: "#eef7ff",
    buttonHoverBg: "rgba(22, 50, 88, 0.96)",
    inputFormBg: "rgba(10, 24, 46, 0.95)",
    inputBg: "rgba(4, 11, 22, 0.88)",
    choiceBg: "rgba(12, 28, 52, 0.94)",
    choiceBorder: "rgba(82, 213, 255, 0.3)",
    choiceHoverBg: "rgba(22, 50, 88, 0.96)",
  },

  "neon-rain": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #091d22, #041115, #01080a)",
    workspaceBg: "linear-gradient(160deg, #08181d, #040e12, #010608)",
    surfaceGradient: "linear-gradient(155deg, #08191e 0%, #041014 58%, #02080a 100%)",
    cardPattern: "repeating-linear-gradient(0deg, transparent 0 5px, rgba(45, 212, 191, 0.03) 5px 6px), linear-gradient(125deg, rgba(45, 212, 191, 0.06), transparent 45%, rgba(244, 114, 182, 0.05))",
    ringColor: "rgba(45, 212, 191, 0.095)",
    accentSurface: "#0f3138",
    ghostBg: "rgba(9, 25, 32, 0.74)",
    accent: "#2dd4bf",
    accentHover: "#64eedc",
    accentContrast: "#02221e",
    accentGlow: "rgba(45, 212, 191, 0.38)",
    text: "#e9fffb",
    muted: "#7ac2b9",
    panel: "#07161b",
    field: "#0d242c",
    button: "#143742",
    hoverBg: "#1b4a58",
    border: "rgba(45, 212, 191, 0.26)",
    borderStrong: "rgba(100, 238, 220, 0.56)",
    radius: "6px",
    scrubberRadius: "2px",
    family: '"Segoe UI", system-ui, sans-serif',
    displayFont: '"Cascadia Code", ui-monospace, monospace',
    shadow: "0 8px 24px rgba(1, 12, 16, 0.55), inset 0 1px 0 rgba(94, 234, 212, 0.14)",
    quoteColor: "#f78fc7",
    edgeGlow: "rgba(45, 212, 191, 0.62)",
    dialogueBg: "rgba(8, 20, 27, var(--caption-opacity, 0.9))",
    dialogueBorder: "rgba(45, 212, 191, 0.46)",
    bottomBarBg: "rgba(5, 14, 18, 0.96)",
    bottomBarBorder: "rgba(45, 212, 191, 0.24)",
    buttonBg: "rgba(12, 30, 38, 0.94)",
    buttonBorder: "rgba(45, 212, 191, 0.34)",
    buttonText: "#e9fffb",
    buttonHoverBg: "rgba(20, 50, 62, 0.96)",
    inputFormBg: "rgba(10, 23, 30, 0.95)",
    inputBg: "rgba(4, 10, 14, 0.9)",
    choiceBg: "rgba(10, 24, 31, 0.94)",
    choiceBorder: "rgba(45, 212, 191, 0.3)",
    choiceHoverBg: "rgba(20, 50, 62, 0.96)",
  },

  "obsidian-reliquary": {
    mode: "dark",
    overlayBg: "linear-gradient(170deg, #1d1429, #110b19, #08040c)",
    workspaceBg: "linear-gradient(160deg, #191124, #0f0917, #07040b)",
    surfaceGradient: "linear-gradient(155deg, #1b1227 0%, #110b19 58%, #08040d 100%)",
    cardPattern: "repeating-linear-gradient(135deg, transparent 0 22px, rgba(219, 226, 237, 0.03) 22px 23px), radial-gradient(ellipse at 50% 0%, rgba(200, 168, 248, 0.09), transparent 60%)",
    ringColor: "rgba(200, 168, 248, 0.095)",
    accentSurface: "#2c1d40",
    ghostBg: "rgba(24, 16, 36, 0.72)",
    accent: "#c9a8f8",
    accentHover: "#e2d1ff",
    accentContrast: "#18092b",
    accentGlow: "rgba(201, 168, 248, 0.38)",
    text: "#f7f2ff",
    muted: "#b3a0ce",
    panel: "#150e20",
    field: "#201631",
    button: "#302147",
    hoverBg: "#412d60",
    border: "rgba(201, 168, 248, 0.25)",
    borderStrong: "rgba(219, 226, 237, 0.55)",
    radius: "10px",
    scrubberRadius: "3px",
    family: 'Georgia, "Times New Roman", serif',
    displayFont: 'Georgia, "Cinzel", serif',
    shadow: "0 10px 28px rgba(8, 2, 16, 0.6), inset 0 1px 0 rgba(219, 226, 237, 0.14)",
    quoteColor: "#dbe6f5",
    edgeGlow: "rgba(219, 226, 237, 0.58)",
    dialogueBg: "rgba(22, 15, 33, var(--caption-opacity, 0.9))",
    dialogueBorder: "rgba(201, 168, 248, 0.45)",
    bottomBarBg: "rgba(14, 9, 22, 0.96)",
    bottomBarBorder: "rgba(201, 168, 248, 0.24)",
    buttonBg: "rgba(28, 19, 43, 0.94)",
    buttonBorder: "rgba(201, 168, 248, 0.34)",
    buttonText: "#f7f2ff",
    buttonHoverBg: "rgba(48, 33, 72, 0.96)",
    inputFormBg: "rgba(24, 16, 36, 0.95)",
    inputBg: "rgba(12, 7, 18, 0.9)",
    choiceBg: "rgba(25, 17, 37, 0.94)",
    choiceBorder: "rgba(201, 168, 248, 0.3)",
    choiceHoverBg: "rgba(48, 33, 72, 0.96)",
  },
};

function renderPresetTokenVariables(spec: ThemePaletteSpec): string {
  return `
  --vn-shell-bg: ${spec.panel};
  --vn-shell-bg-hover: ${spec.hoverBg};
  --vn-shell-panel: ${spec.panel};
  --vn-shell-field: ${spec.field};
  --vn-shell-button: ${spec.button};
  --vn-shell-text: ${spec.text};
  --vn-shell-muted: ${spec.muted};
  --vn-shell-border: ${spec.border};
  --vn-shell-border-strong: ${spec.borderStrong};
  --vn-shell-accent: ${spec.accent};
  --vn-shell-accent-hover: ${spec.accentHover};
  --vn-shell-accent-contrast: ${spec.accentContrast};
  --vn-shell-glow: ${spec.accentGlow};
  --vn-shell-radius: ${spec.radius};
  --vn-shell-family: ${spec.family};
  --vn-shell-display-font: ${spec.displayFont};
  --vn-shell-shadow: ${spec.shadow};
  --vn-shell-ring: ${spec.ringColor};
  --vn-shell-surface-gradient: ${spec.surfaceGradient};
  --vn-shell-card-pattern: ${spec.cardPattern};
  --vn-scrubber-radius: ${spec.scrubberRadius};
  --vn-quote-color: ${spec.quoteColor};
  --vn-edge-glow: ${spec.edgeGlow};
  --aperture-overlay-bg: ${spec.overlayBg};
  --aperture-ring-color: ${spec.ringColor};
  --aperture-workspace-bg: ${spec.workspaceBg};
  --aperture-accent-surface: ${spec.accentSurface};
  --aperture-ghost-bg: ${spec.ghostBg};
  --aperture-accent: ${spec.accent};
  --aperture-accent-hover: ${spec.accentHover};
  --aperture-accent-contrast: ${spec.accentContrast};
  --aperture-accent-glow: ${spec.accentGlow};
  --aperture-text: ${spec.text};
  --aperture-muted: ${spec.muted};
  --aperture-dialogue-bg: ${spec.dialogueBg};
  --aperture-dialogue-border: ${spec.dialogueBorder};
  --aperture-bottom-bar-bg: ${spec.bottomBarBg};
  --aperture-bottom-bar-border: ${spec.bottomBarBorder};
  --aperture-button-bg: ${spec.buttonBg};
  --aperture-button-border: ${spec.buttonBorder};
  --aperture-button-text: ${spec.buttonText};
  --aperture-button-hover-bg: ${spec.buttonHoverBg};
  --aperture-input-form-bg: ${spec.inputFormBg};
  --aperture-input-bg: ${spec.inputBg};
  --aperture-choice-bg: ${spec.choiceBg};
  --aperture-choice-border: ${spec.choiceBorder};
  --aperture-choice-hover-bg: ${spec.choiceHoverBg};`;
}

/**
 * Generates CSS rules targeting outer shells, reader roots, and Shadow DOM `:host`
 * elements alike so every menu & sub-panel inherits exact preset tokens.
 */
export const VN_SHELL_PRESET_TOKENS_CSS = Object.entries(THEME_PALETTE_SPECS)
  .map(([id, spec]) => {
    const body = renderPresetTokenVariables(spec);
    return `[data-vn-shell][data-vn-preset="${id}"],\n[data-vn-root][data-vn-preset="${id}"],\nbody[data-vn-preset="${id}"],\n:host([data-vn-preset="${id}"]) {${body}\n}`;
  })
  .join("\n");
