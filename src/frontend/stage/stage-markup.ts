import type { AmbientEffect, StageEffect, VnPhase } from "../store/index.js";
import type { VisualNovelEffectIntensity } from "../../config.js";
import { VN_ORNAMENT_LAYER_MARKUP } from "../theme/index.js";

export const STAGE_EFFECT_IDS: ReadonlySet<string> = new Set([
  "shake",
  "flash_white",
  "flash_red",
  "zoom_in",
  "fade_to_black",
  "shake_hard",
  "rumble",
  "zoom_punch",
  "speed_lines",
  "fade_from_black",
  "fade_to_white",
  "lightning",
  "zoom_out",
  "tilt",
  "heartbeat",
  "blur_pulse",
  "sparkle_burst",
  "hearts_burst",
  "confetti",
  "glitch",
  "cinema_bars",
]);

export const AMBIENT_EFFECT_IDS: ReadonlySet<string> = new Set([
  "rain",
  "heavy_rain",
  "snow",
  "snowstorm",
  "sakura",
  "autumn_leaves",
  "fog",
  "sunbeams",
  "fireflies",
  "embers",
  "floating_runes",
  "underwater_bubbles",
  "shooting_stars",
  "vignette_dark",
  "sepia_flashback",
  "desaturate",
  "dream_haze",
  "danger_pulse",
]);

export function isStageEffect(value: unknown): value is StageEffect {
  return typeof value === "string" && STAGE_EFFECT_IDS.has(value);
}

export function isAmbientEffect(value: unknown): value is AmbientEffect {
  return typeof value === "string" && AMBIENT_EFFECT_IDS.has(value);
}

export const THEME_MARKUP = `
  <main data-vn-root data-vn-mode="standard" data-vn-phase="idle" tabindex="0" aria-label="Visual novel">
    <div data-vn-scene aria-hidden="true">
      <img data-vn-scene-backdrop data-vn-empty="true" alt="" aria-hidden="true" />
      <img data-vn-scene-image data-vn-layer="active" data-vn-empty="true" alt="" />
      <img data-vn-scene-image data-vn-layer="incoming" data-vn-empty="true" alt="" />
      <div data-vn-ambient aria-hidden="true"></div>
      <div data-vn-atmosphere aria-hidden="true"></div>
      <div data-vn-scrim></div>
    </div>

    ${VN_ORNAMENT_LAYER_MARKUP}

    <div data-vn-fx aria-hidden="true"></div>
    <div data-vn-flash aria-hidden="true"></div>
    <div data-vn-chapter-card hidden aria-hidden="true">
      <div class="chapter-card-inner">
        <span class="chapter-eyebrow" data-vn-chapter-eyebrow>SCENE</span>
        <h2 class="chapter-title" data-vn-chapter-title></h2>
        <p class="chapter-subtitle" data-vn-chapter-subtitle></p>
      </div>
    </div>

    <div data-vn-status-stack aria-live="polite" aria-atomic="false"></div>
    <button data-vn-clean-restore type="button" hidden aria-label="Show reader controls" title="Show reader controls (H)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><span>Show UI</span></button>
    <div data-vn-empty-state>
      <div data-vn-empty-card>
        <span data-vn-empty-icon aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4.2C6.6 3.2 4.6 2.8 2.5 3v9.4c2.1-.2 4.1.2 5.5 1.2 1.4-1 3.4-1.4 5.5-1.2V3c-2.1-.2-4.1.2-5.5 1.2z" /><path d="M8 4.2v9.4" /></svg></span>
        <p data-vn-empty-text>There is no reply to show yet. Go back to chat, send the first message, then open Visual novel again.</p>
      </div>
    </div>

    <section data-vn-narrative hidden aria-label="Dialogue">
      <div data-vn-dialogue class="reader-caption refined-caption">
        <div class="caption-head" data-vn-sheet-header>
          <div class="speaker"><span data-vn-speaker></span><span class="caption-split">/</span><span data-vn-caption-scene>SCENE</span></div>
        </div>
        <div class="scroll-copy">
          <p data-vn-dialogue-text aria-live="polite" aria-atomic="true"></p>
        </div>
        <div data-vn-dialogue-footer class="caption-foot" style="display:none">
          <span data-vn-progress></span>
          <span class="caption-foot-dot">✧</span>
          <span data-vn-footer-speaker></span>
          <span data-vn-reading-state aria-live="polite" style="display:none"></span>
        </div>
      </div>
      <footer class="reader-actions">
        <div class="reader-progress">
          <small data-vn-step-left>1 / 1</small>
          <div data-vn-scrubber class="ticks" role="group" aria-label="Paragraph timeline"></div>
          <small data-vn-step-right>100%</small>
        </div>
        <nav data-vn-controls class="reader-action-row" aria-label="Reading controls">
          <button data-vn-control="previous" class="action icon-action nav-step-btn" type="button" aria-label="Previous paragraph" aria-keyshortcuts="ArrowLeft" title="Previous paragraph (Left Arrow)">
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span><span data-vn-control-label style="display:none">Previous</span>
          </button>
          <button data-vn-control="log" class="action icon-action" type="button" aria-label="Open history" aria-keyshortcuts="L" title="History (L)">
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 7M3 5v7h7M12 7v5l4 2"/></svg></span><span data-vn-control-label>History</span>
          </button>
          <button data-vn-control="lens" class="action icon-action" type="button" aria-label="World Lens" title="World Lens">
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/></svg></span><span data-vn-control-label>Lens</span>
          </button>
          <button data-vn-control="cast" class="action icon-action" type="button" aria-label="Open Cast and Character Folio" title="Cast & Characters">
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19c0-3 3-5 5.5-5s5.5 2 5.5 5M15 14c2.2 0 4.5 1.4 4.5 4.5"/></svg></span><span data-vn-control-label>Cast</span>
          </button>
          <button data-vn-control="settings" class="action icon-action" type="button" aria-label="Extension settings" title="Settings">
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg></span><span data-vn-control-label>Settings</span>
          </button>
          <button
            data-vn-continue
            class="action advance nav-step-btn"
            type="button"
            aria-label="Continue"
            aria-keyshortcuts="Enter Space ArrowRight"
            title="Continue (Enter)"
          ><span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span></button>

          <button data-vn-control="auto" type="button" aria-label="Auto play" aria-pressed="false" aria-keyshortcuts="A" title="Auto play (A)" style="display:none">
            <span data-vn-auto-ring aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14">
                <circle class="vn-auto-track" cx="8" cy="8" r="6" fill="none" stroke-width="2" />
                <circle class="vn-auto-bar" cx="8" cy="8" r="6" fill="none" stroke-width="2" stroke-dasharray="37.7" stroke-dashoffset="37.7" />
              </svg>
            </span>
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" focusable="false" fill="currentColor" stroke="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.2v9.6L12.6 8z" /></svg></span><span data-vn-control-label>Auto</span>
          </button>
          <button data-vn-control="skip" type="button" aria-label="Skip" aria-pressed="false" aria-describedby="vn-skip-description" aria-keyshortcuts="S" title="Skip (S)" style="display:none">
            <span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" focusable="false" fill="currentColor" stroke="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.5v9L7.6 8z" /><path d="M8.2 3.5v9L13.8 8z" /></svg></span><span data-vn-control-label>Skip</span>
          </button>
          <span id="vn-skip-description" data-vn-skip-description hidden></span>
        </nav>
      </footer>
    </section>

    <section data-vn-interaction hidden tabindex="0" aria-labelledby="vn-interaction-title">
      <div data-vn-interaction-heading>
        <h2 id="vn-interaction-title" data-vn-interaction-title>Your turn</h2>
        <p data-vn-interaction-hint></p>
      </div>
      <div data-vn-game-choices hidden aria-label="Game moves"></div>
      <ol data-vn-choice-list hidden aria-label="Choose a reply"></ol>
      <form data-vn-input-form hidden>
        <textarea data-vn-input aria-label="Your reply"></textarea>
        <button data-vn-submit type="submit"><span data-vn-submit-label>Send</span><span data-vn-submit-icon aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8h10" /><path d="M8.5 4l4 4-4 4" /></svg></span></button>
      </form>
    </section>

    <div data-vn-backlog hidden aria-modal="true" role="dialog" aria-label="History">
      <div data-vn-backlog-header>
        <h3 data-vn-backlog-title>History</h3>
        <button data-vn-backlog-close type="button" aria-label="Close history"><svg viewBox="0 0 16 16" width="14" height="14" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l8 8" /><path d="M12 4l-8 8" /></svg></button>
      </div>
      <div data-vn-backlog-search-row class="backlog-search-row">
        <input type="search" data-vn-backlog-search placeholder="Search dialogue history..." aria-label="Search dialogue history" />
        <span data-vn-backlog-search-count class="backlog-search-count"></span>
      </div>
      <div data-vn-backlog-content tabindex="0"></div>
      <footer data-vn-backlog-footer><button data-vn-backlog-return type="button">Back to reader</button></footer></div><div data-vn-scene-hud hidden role="region" aria-label="Scene overview">
    </div>
  </main>
`;

export const queryRequired = <T extends Element>(
  root: ParentNode,
  selector: string,
): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`VN stage is missing ${selector}.`);
  return element;
};

export const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(target.closest("button, textarea, input, select, option, a, [role='button'], [data-vn-interaction]"));

export const phaseLoadingLabel = (phase: VnPhase): string | null => {
  switch (phase) {
    case "waiting-for-response":
      return "Waiting for the reply\u2026";
    case "planning":
      return "Preparing the scene\u2026";
    case "submitting":
      return "Sending your reply\u2026";
    default:
      return null;
  }
};

export type VnStageErrorSource =
  | "planner"
  | "image"
  | "generation"
  | "permission"
  | "submit"
  | "waiting"
  | "other";

export interface VnStageErrorDetails {
  failureId?: string;
  message: string;
  detail?: string;
  source?: VnStageErrorSource;
  retryable?: boolean;
  retryScope?: string;
}

export type VnStageErrorInput = string | VnStageErrorDetails | null;
export type VnEffectIntensity = VisualNovelEffectIntensity;

export const errorTitle = (source: VnStageErrorSource | undefined): string => {
  switch (source) {
    case "planner":
      return "Scene planning failed";
    case "image":
      return "Scene image could not be made";
    case "generation":
      return "Reply could not be generated";
    case "permission":
      return "Permission needed";
    case "submit":
      return "Reply not sent";
    case "waiting":
      return "Waiting for a scene choice";
    default:
      return "Something went wrong";
  }
};

export const restatesTitle = (message: string, title: string): boolean => {
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/^(this|the|a) /, "").replace(/\s+/g, " ").trim();
  return normalize(message) === normalize(title);
};

export const skipDescription = (mode: "read" | "all"): string =>
  mode === "all"
    ? "Skips all text until your next reply."
    : "Skips text you have already read and stops at new text.";

export function createBadgeIconSvg(icon: "spinner" | "image" | "check" | "alert" | "reroll"): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-vn-badge-icon", icon);

  switch (icon) {
    case "spinner": {
      svg.setAttribute("fill", "none");
      svg.innerHTML = `
        <circle class="vn-spinner-track" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity="0.25"/>
        <circle class="vn-spinner-head" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="24 36"/>
      `;
      break;
    }
    case "image": {
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = `
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="m21 15-5-5L5 21"/>
      `;
      break;
    }
    case "check": {
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2.5");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = `<path d="M20 6 9 17l-5-5"/>`;
      break;
    }
    case "alert": {
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = `
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      `;
      break;
    }
    case "reroll": {
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = `
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        <path d="M3 21v-5h5"/>
      `;
      break;
    }
  }
  return svg;
}
