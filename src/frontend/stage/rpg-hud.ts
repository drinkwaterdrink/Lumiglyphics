import {
  computePacingFrustrationMultiplier,
  computeQuestUrgency,
  evaluateContextualSkillCheckDetailed,
  formatSkillCheckSubmission,
  resolveSkillCheck,
  type RpgMode,
  type RpgState,
  type SkillCheck,
  type SkillCheckModifierSource,
  type SkillCheckOutcome,
} from "../../shared/rpg-state.js";
import type { VnChoice } from "../store/vn-store.js";
import { trapFocusWithin } from "../image-review/focus-trap.js";
import { escapeHtml as esc } from "../../shared/html-escape.js";

export const RPG_HUD_CSS = `
[data-vn-choice-check] {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--vn-accent, #7c9cff) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--vn-accent, #7c9cff) 45%, transparent);
  color: var(--vn-text, #f4f6fb);
  vertical-align: middle;
}
[data-vn-rpg-bar] {
  position: absolute;
  top: calc(var(--reader-header, 56px) + env(safe-area-inset-top, 0px) + 8px);
  left: max(12px, env(safe-area-inset-left, 0px));
  max-width: calc(100% - 24px);
  min-height: 44px;
  z-index: 32;
  pointer-events: auto;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--vn-surface, rgba(14, 17, 26, 0.84));
  border: 1px solid var(--vn-border, rgba(255, 255, 255, 0.16));
  color: var(--vn-text, #f4f6fb);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: transform 140ms ease, border-color 140ms ease;
}
@media (max-width: 760px) {
  [data-vn-rpg-bar] {
    top: calc(76px + env(safe-area-inset-top, 0px));
    left: 12px;
    right: auto;
    max-width: calc(100% - 24px);
    min-height: 44px;
    padding: 6px 14px;
    font-size: 0.72rem;
    justify-content: flex-start;
  }
}
[data-vn-check-info] {
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 5px;
  margin-left: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.75em;
  font-weight: 700;
  cursor: pointer;
}
.vn-rpg-check-breakdown {
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--vn-surface-elevated, rgba(14, 17, 26, 0.9));
  border: 1px solid var(--vn-border, rgba(255, 255, 255, 0.16));
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--vn-text, #f4f6fb);
}
[data-vn-rpg-bar]:hover {
  transform: translateY(-1px);
  border-color: var(--vn-accent, #7c9cff);
}
[data-vn-rpg-bar][hidden] {
  display: none !important;
}
[data-vn-choice-lock] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(248, 113, 113, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.36);
  color: rgba(254, 202, 202, 0.92);
}
[data-vn-rpg-theatre] {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 48;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 18px;
  border-radius: 14px;
  background: var(--vn-surface-elevated, rgba(14, 17, 26, 0.94));
  border: 1px solid var(--vn-accent, #7c9cff);
  color: var(--vn-text, #f4f6fb);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
  animation: vn-rpg-pop 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
[data-vn-rpg-theatre][hidden] {
  display: none !important;
}
[data-vn-rpg-theatre][data-roll-tier="critical_success"] {
  border-color: rgba(250, 204, 21, 0.7);
  box-shadow: 0 0 28px rgba(250, 204, 21, 0.32);
}
[data-vn-rpg-theatre][data-roll-tier="critical_failure"] {
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 0 28px rgba(239, 68, 68, 0.35);
}
@keyframes vn-rpg-pop {
  from { opacity: 0; transform: translate(-50%, -8px) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
[data-vn-rpg-drawer] {
  position: absolute;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(6, 8, 14, 0.68);
  backdrop-filter: blur(8px);
}
[data-vn-rpg-drawer][hidden] {
  display: none !important;
}
.vn-rpg-sheet {
  width: min(680px, 94vw);
  max-height: min(560px, 84vh);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: var(--vn-surface-elevated, rgba(16, 19, 29, 0.96));
  border: 1px solid var(--vn-border, rgba(255, 255, 255, 0.16));
  color: var(--vn-text, #f4f6fb);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.vn-rpg-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vn-border, rgba(255, 255, 255, 0.12));
}
.vn-rpg-tabs {
  display: flex;
  gap: 6px;
}
.vn-rpg-tab {
  min-height: 44px;
  min-width: 44px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vn-text-muted, rgba(244, 246, 251, 0.68));
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}
[data-rpg-close] {
  min-width: 44px;
  min-height: 44px;
}
.vn-rpg-tab[aria-selected="true"] {
  background: color-mix(in srgb, var(--vn-accent, #7c9cff) 20%, transparent);
  border-color: color-mix(in srgb, var(--vn-accent, #7c9cff) 45%, transparent);
  color: var(--vn-text, #f4f6fb);
}
.vn-rpg-sheet-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.85rem;
}
.vn-rpg-meter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.vn-rpg-card {
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--vn-text, #ffffff) 5%, transparent);
  border: 1px solid var(--vn-border, rgba(255, 255, 255, 0.1));
}
[data-vn-rpg-theatre][data-roll-phase="rolling"] .vn-rpg-roll-total {
  opacity: 0.45;
  transform: scale(0.92);
  transition: opacity 180ms ease, transform 180ms ease;
}
.vn-rpg-breakdown {
  font-size: 0.72rem;
  opacity: 0.82;
  letter-spacing: 0.02em;
}
`;

const TIER_LABELS: Record<SkillCheckOutcome["tier"], string> = {
  critical_success: "CRITICAL SUCCESS (NAT 20)",
  success: "SUCCESS",
  partial: "PARTIAL SUCCESS",
  failure: "FAILURE",
  critical_failure: "CRITICAL FAILURE (NAT 1)",
};

/** Format an itemized skill-check roll breakdown string for UI and tooltips. */
export function formatSkillCheckBreakdown(
  natural: number,
  check: SkillCheck,
  sources: SkillCheckModifierSource[],
  total: number,
): string {
  const parts = [`d20(${natural})`];
  for (const src of sources) {
    if (src.delta !== 0) {
      parts.push(`${src.delta > 0 ? `+${src.delta}` : `${src.delta}`} ${src.label}`);
    } else if (src.advantage) {
      parts.push(src.label);
    }
  }
  return `${parts.join(" · ")} = ${total} vs DC ${check.dc}`;
}

export class RpgStageController {
  private rpgMode: RpgMode = "off";
  private rpgState: RpgState | null = null;
  private rollLog: Array<{ stat: string; dc: number; natural: number; total: number; tier: SkillCheckOutcome["tier"] }> = [];
  private activeTab: "vitals" | "quests" | "atlas" = "vitals";
  private barEl: HTMLButtonElement | null = null;
  private theatreEl: HTMLElement | null = null;
  private drawerEl: HTMLElement | null = null;
  private theatreTimer: ReturnType<typeof setTimeout> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  mount(stageEl: HTMLElement, hudEl: HTMLElement): void {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.dataset.vnRpgBar = "";
    bar.hidden = true;
    bar.title = "Open RPG Sheet, Quests & World Atlas";
    bar.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleDrawer(true);
    });
    hudEl.appendChild(bar);
    this.barEl = bar;

    const theatre = document.createElement("div");
    theatre.dataset.vnRpgTheatre = "";
    theatre.hidden = true;
    theatre.setAttribute("role", "status");
    theatre.setAttribute("aria-live", "polite");
    theatre.title = "Click to dismiss";
    theatre.addEventListener("click", () => this.dismissTheatre());
    stageEl.appendChild(theatre);
    this.theatreEl = theatre;

    const drawer = document.createElement("div");
    drawer.dataset.vnRpgDrawer = "";
    drawer.hidden = true;
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) this.toggleDrawer(false);
    });
    stageEl.appendChild(drawer);
    this.drawerEl = drawer;
  }

  private dismissTheatre(): void {
    if (this.theatreTimer) {
      clearTimeout(this.theatreTimer);
      this.theatreTimer = null;
    }
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.theatreEl) {
      this.theatreEl.hidden = true;
    }
  }

  destroy(): void {
    this.dismissTheatre();
    this.barEl?.remove();
    this.theatreEl?.remove();
    this.drawerEl?.remove();
    this.barEl = null;
    this.theatreEl = null;
    this.drawerEl = null;
  }

  update(mode: RpgMode, state: RpgState | null | undefined): void {
    this.rpgMode = mode;
    this.rpgState = mode === "full" ? (state ?? null) : null;
    if (mode === "off") {
      this.rollLog = [];
    }
    if (mode === "lite") {
      this.renderLiteBar();
      if (this.drawerEl && !this.drawerEl.hidden) {
        this.renderDrawer();
      }
      return;
    }
    if (mode !== "full" || !this.rpgState) {
      if (this.barEl) this.barEl.hidden = true;
      this.toggleDrawer(false);
      return;
    }
    this.renderBar();
    if (this.drawerEl && !this.drawerEl.hidden) {
      this.renderDrawer();
    }
  }

  private renderLiteBar(): void {
    if (!this.barEl) return;
    const countSuffix = this.rollLog.length > 0 ? ` · ${this.rollLog.length} Roll${this.rollLog.length === 1 ? "" : "s"}` : "";
    const span = document.createElement("span");
    span.textContent = `🎲 d20 Lite Active${countSuffix}`;
    this.barEl.replaceChildren(span);
    this.barEl.title = "Adventure Time Lite is active — click for Lite rules & recent checks.";
    this.barEl.hidden = false;
  }

  decorateChoiceButton(button: HTMLButtonElement, choice: VnChoice): void {
    if (choice.disabled && choice.lockedReason) {
      const lockPill = document.createElement("span");
      lockPill.dataset.vnChoiceLock = "";
      lockPill.textContent = `🔒 ${choice.lockedReason}`;
      button.appendChild(lockPill);
      button.title = choice.lockedReason;
    }
    if (this.rpgMode === "off" || choice.disabled || !choice.check) return;
    const { check, sources } = evaluateContextualSkillCheckDetailed(choice.check, this.rpgState?.vitals);
    const modStr = check.modifier > 0 ? ` +${check.modifier}` : check.modifier < 0 ? ` ${check.modifier}` : "";
    const rollTag = check.rollMode === "advantage" ? " · ADV" : check.rollMode === "disadvantage" ? " · DIS" : "";
    const needed = check.dc - check.modifier;
    const singleProb = Math.max(0.05, Math.min(0.95, (21 - needed) / 20));
    const odds = check.rollMode === "advantage"
      ? 1 - Math.pow(1 - singleProb, 2)
      : check.rollMode === "disadvantage"
        ? Math.pow(singleProb, 2)
        : singleProb;
    const pct = Math.round(odds * 100);
    const breakdownText = sources.length > 0
      ? sources.map((src) => `${src.label}: ${src.delta >= 0 ? `+${src.delta}` : src.delta}${src.advantage ? " (ADV)" : ""}`).join(", ")
      : "";
    if (breakdownText && !button.title) {
      button.title = breakdownText;
    }
    const badge = document.createElement("span");
    badge.dataset.vnChoiceCheck = "";
    badge.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin-left:8px;font-size:0.78em;transform:perspective(220px) rotateX(4deg);";
    const risk = pct < 40 ? "High risk" : pct < 70 ? "Moderate risk" : "Low risk";
    badge.setAttribute("aria-label", risk + " · estimated " + pct + "%");
    badge.textContent = `🎲 ${check.stat} DC ${check.dc}${modStr}${rollTag} · ${pct}%`;
    const meter = document.createElement("span");
    meter.style.cssText = "display:inline-block;width:36px;height:4px;border-radius:999px;background:rgba(255,255,255,0.16);overflow:hidden;vertical-align:middle;";
    const fill = document.createElement("span");
    const meterColor = pct >= 70 ? "#6ee7b7" : pct >= 40 ? "#fcd34d" : "#f87171";
    fill.style.cssText = `display:block;height:100%;width:${pct}%;background:${meterColor};`;
    meter.appendChild(fill);
    badge.appendChild(meter);
    if (breakdownText) {
      const info = document.createElement("span");
      info.setAttribute("role", "button");
      info.tabIndex = 0;
      info.dataset.vnCheckInfo = "";
      info.setAttribute("aria-expanded", "false");
      info.setAttribute("aria-label", `Inspect ${check.stat} modifiers`);
      info.textContent = "ⓘ";
      const choiceKey = choice.id || choice.label;
      const toggleInfo = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const scope = button.closest("ol, ul, [data-vn-choices]") ?? button.parentElement;
        if (!scope) return;
        const existing = scope.querySelector<HTMLElement>(".vn-rpg-check-breakdown");
        const isSameChoice = existing?.dataset.vnCheckFor === choiceKey;
        if (existing) existing.remove();
        scope.querySelectorAll<HTMLElement>("[data-vn-check-info]").forEach((el) => {
          el.setAttribute("aria-expanded", "false");
        });
        if (isSameChoice) return;
        const card = document.createElement("div");
        card.className = "vn-rpg-check-breakdown";
        card.dataset.vnCheckFor = choiceKey;
        card.textContent = `Modifiers (${check.stat} DC ${check.dc}): ${breakdownText}`;
        if (typeof button.insertAdjacentElement === "function") {
          button.insertAdjacentElement("afterend", card);
        } else {
          button.parentElement?.insertBefore(card, button.nextSibling);
        }
        info.setAttribute("aria-expanded", "true");
      };
      info.addEventListener("click", toggleInfo);
      info.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") toggleInfo(event);
      });
      badge.appendChild(info);
    }
    button.appendChild(badge);
  }

  resolveChoiceSubmission(choice: VnChoice): string {
    let payload = choice.value;
    if (this.rpgMode !== "off" && choice.setsFlags && Object.keys(choice.setsFlags).length > 0) {
      const flagPairs = Object.entries(choice.setsFlags)
        .map(([key, val]) => `${key}=${val ? "true" : "false"}`)
        .join(", ");
      payload = `${payload}\n[FLAGS: ${flagPairs}]`;
    }
    if (this.rpgMode === "off" || !choice.check) return payload;
    const { check, sources } = evaluateContextualSkillCheckDetailed(choice.check, this.rpgState?.vitals);
    const outcome = resolveSkillCheck(check);
    this.showRollTheatre(outcome, sources);
    return formatSkillCheckSubmission(payload, outcome);
  }

  onRollEffect?: (effect: "shake_hard" | "zoom_punch") => void;

  private showRollTheatre(outcome: SkillCheckOutcome, sources: SkillCheckModifierSource[] = []): void {
    if (!this.theatreEl) return;
    if (this.theatreTimer) clearTimeout(this.theatreTimer);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    const { check, rolls, natural, total, tier } = outcome;
    this.rollLog.unshift({ stat: check.stat, dc: check.dc, natural, total, tier });
    if (this.rollLog.length > 12) this.rollLog.length = 12;
    if (this.rpgMode === "lite") {
      this.renderLiteBar();
      if (this.drawerEl && !this.drawerEl.hidden) this.renderDrawer();
    }
    const rollDetail = rolls.length > 1 ? `2d20(${rolls.join(", ")}) → ${natural}` : `d20(${natural})`;
    const modStr = check.modifier > 0 ? `+${check.modifier}` : check.modifier < 0 ? `${check.modifier}` : "+0";
    const breakdown = formatSkillCheckBreakdown(natural, check, sources, total);
    const d20Svg = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="rgba(124,156,255,0.22)" stroke="currentColor" stroke-width="1.6"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" font-size="9" font-weight="800">${natural}</text></svg>`;
    this.theatreEl.style.borderColor = "";
    this.theatreEl.style.boxShadow = "";
    this.theatreEl.dataset.rollTier = tier;
    if (tier === "critical_success" || tier === "critical_failure") {
      this.onRollEffect?.(tier === "critical_success" ? "zoom_punch" : "shake_hard");
    }
    this.theatreEl.dataset.rollPhase = "rolling";
    this.theatreEl.innerHTML = `
      <div style="font-size:0.72rem;letter-spacing:0.08em;opacity:0.85;display:inline-flex;align-items:center;justify-content:center;">${d20Svg}${esc(check.stat)} SKILL CHECK (DC ${check.dc})</div>
      <div style="font-size:1rem;font-weight:700;">${esc(TIER_LABELS[tier])}</div>
      <div class="vn-rpg-roll-total" style="font-size:0.78rem;opacity:0.88;">${esc(rollDetail)} ${modStr} = <b>${total}</b> vs DC ${check.dc}</div>
      <div class="vn-rpg-breakdown">${esc(breakdown)}</div>
    `;
    this.theatreEl.hidden = false;
    this.settleTimer = setTimeout(() => {
      if (this.theatreEl) this.theatreEl.dataset.rollPhase = "settled";
    }, 450);
    this.theatreTimer = setTimeout(() => {
      this.dismissTheatre();
    }, 4200);
  }

  private renderBar(): void {
    if (!this.barEl || !this.rpgState) return;
    const v = this.rpgState.vitals;
    const activeQuests = this.rpgState.quests.filter((q) => q.status === "active").length;
    const nodeCount = this.rpgState.atlas.nodes.length;
    this.barEl.innerHTML = `
      <span>⚔️ HP ${v.hp}/${v.maxHp}</span>
      <span>⚡ STA ${v.stamina}/${v.maxStamina}</span>
      ${activeQuests > 0 ? `<span>📜 ${activeQuests} Quest${activeQuests === 1 ? "" : "s"}</span>` : ""}
      ${nodeCount > 0 ? `<span>🗺️ ${nodeCount} Node${nodeCount === 1 ? "" : "s"}</span>` : ""}
    `;
    this.barEl.hidden = false;
  }

  private readonly handleDrawerKeyDown = (event: KeyboardEvent): void => {
    if (!this.drawerEl || this.drawerEl.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.toggleDrawer(false);
      return;
    }
    if (event.key === "Tab") {
      trapFocusWithin(this.drawerEl, event, (document as unknown as { activeElement?: Element | null }).activeElement ?? null);
    }
  };

  private toggleDrawer(open: boolean): void {
    if (!this.drawerEl) return;
    this.drawerEl.hidden = !open;
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleDrawerKeyDown, true);
    }
    if (open) {
      this.renderDrawer();
      if (typeof window !== "undefined") {
        window.addEventListener("keydown", this.handleDrawerKeyDown, true);
      }
      this.drawerEl.querySelector<HTMLElement>("[data-rpg-close]")?.focus?.();
    } else {
      this.barEl?.focus?.();
    }
  }

  private renderDrawer(): void {
    if (!this.drawerEl) return;
    if (this.rpgMode === "lite") {
      const recentHtml = this.rollLog.length === 0
        ? `<div class="vn-rpg-card">No skill checks rolled in this session yet. Select a choice with a d20 badge to test your luck.</div>`
        : `<div class="vn-rpg-card"><b>Recent Checks (${this.rollLog.length})</b><ul style="margin:6px 0 0;padding-left:18px;">${this.rollLog.map((r) => `<li><b>${esc(r.stat)}</b> vs DC ${r.dc} — d20(${r.natural}) → <b>${r.total}</b> <small>[${esc(TIER_LABELS[r.tier])}]</small></li>`).join("")}</ul></div>`;
      this.drawerEl.innerHTML = `
        <div class="vn-rpg-sheet" role="dialog" aria-label="Adventure Time Lite Sheet">
          <div class="vn-rpg-sheet-head">
            <div style="font-weight:700;font-size:0.9rem;">🎲 d20 Lite Rules &amp; Recent Checks</div>
            <button type="button" class="vn-rpg-tab" data-rpg-close aria-label="Close Lite Sheet">✕</button>
          </div>
          <div class="vn-rpg-sheet-body">
            <div class="vn-rpg-card"><b>Lite Rules</b><div style="margin-top:4px;opacity:0.88;">Skill checks roll 1d20 plus modifiers against the choice DC. Nat 20 scores a Critical Success; Nat 1 scores a Critical Failure. Switch to Full RPG in settings to track HP, Stamina, Quests, and the Node Atlas.</div></div>
            ${recentHtml}
          </div>
        </div>
      `;
      this.drawerEl.querySelector("[data-rpg-close]")?.addEventListener("click", () => this.toggleDrawer(false));
      return;
    }
    if (!this.rpgState) return;
    const state = this.rpgState;
    const v = state.vitals;
    const pressure = computePacingFrustrationMultiplier(state.turnsSinceProgress ?? state.turnCounter);

    let bodyHtml = "";
    if (this.activeTab === "vitals") {
      bodyHtml = `
        <div class="vn-rpg-meter-row">
          <div class="vn-rpg-card"><b>${esc(v.name)}</b> · Lv.${v.level} ${esc(v.archetype)}<br><small>Turn ${state.turnCounter} · Pacing Pressure ${pressure.toFixed(2)}x</small></div>
          <div class="vn-rpg-card"><b>HP:</b> ${v.hp} / ${v.maxHp}<br><b>Stamina:</b> ${v.stamina} / ${v.maxStamina}<br><b>Stress:</b> ${v.stress}/100</div>
          ${v.currency ? `<div class="vn-rpg-card"><b>Currency</b><br>${esc(v.currency)}</div>` : ""}
        </div>
        <div class="vn-rpg-card">
          <b>Status Effects:</b> ${v.statusEffects.length ? v.statusEffects.map(esc).join(", ") : "None"}
        </div>
        <div class="vn-rpg-card">
          <b>Inventory (${v.inventory.length}):</b> ${v.inventory.length ? v.inventory.map(esc).join(" · ") : "Empty"}
        </div>
        ${v.companions.length ? `<div class="vn-rpg-card"><b>Party Companions</b><ul style="margin:6px 0 0;padding-left:18px;">${v.companions.map((c) => `<li><b>${esc(c.name)}</b> — HP ${c.hp}/${c.maxHp} · Affinity ${c.affinity >= 0 ? `+${c.affinity}` : c.affinity}${c.status && c.status !== "healthy" ? ` (${esc(c.status)})` : ""}</li>`).join("")}</ul></div>` : ""}
      `;
    } else if (this.activeTab === "quests") {
      if (state.quests.length === 0) {
        bodyHtml = `<div class="vn-rpg-card">No active quests recorded yet.</div>`;
      } else {
        bodyHtml = state.quests.map((q) => {
          const urgency = computeQuestUrgency(q);
          const badge = urgency !== "none" ? ` · <span style="text-transform:uppercase;font-weight:700;">${esc(urgency.replace("_", " "))}</span>` : "";
          return `<div class="vn-rpg-card"><b>${esc(q.title)}</b> <small>[${esc(q.status.toUpperCase())}${badge}]</small><div style="margin-top:4px;opacity:0.9;">${esc(q.objective)}</div></div>`;
        }).join("");
      }
    } else {
      const nodes = state.atlas.nodes;
      const edges = state.atlas.edges;
      if (nodes.length === 0) {
        bodyHtml = `<div class="vn-rpg-card">No world nodes discovered yet.</div>`;
      } else {
        const positions = new Map<string, { x: number; y: number }>();
        const cx = 260;
        const cy = 110;
        const rx = Math.min(200, Math.max(70, nodes.length * 28));
        const ry = 72;
        nodes.forEach((node, idx) => {
          const angle = nodes.length === 1 ? 0 : (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
          positions.set(node.id, {
            x: nodes.length === 1 ? cx : Math.round(cx + Math.cos(angle) * rx),
            y: nodes.length === 1 ? cy : Math.round(cy + Math.sin(angle) * ry),
          });
        });
        const svgEdges = edges.map((edge) => {
          const a = positions.get(edge.from);
          const b = positions.get(edge.to);
          if (!a || !b) return "";
          return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(160,185,255,0.45)" stroke-width="2" />`;
        }).join("");
        const svgNodes = nodes.map((node) => {
          const p = positions.get(node.id)!;
          const isCurrent = node.id === state.atlas.currentLocationId;
          return `<g transform="translate(${p.x},${p.y})"><circle r="${isCurrent ? 11 : 7}" fill="${isCurrent ? "#7c9cff" : "rgba(255,255,255,0.45)"}" /><text y="-14" text-anchor="middle" fill="currentColor" font-size="11">${esc(node.label.slice(0, 22))}</text></g>`;
        }).join("");
        bodyHtml = `
          <div class="vn-rpg-card" style="text-align:center;">
            <svg viewBox="0 0 520 220" style="width:100%;max-height:210px;overflow:visible;">${svgEdges}${svgNodes}</svg>
          </div>
          ${nodes.map((n) => `<div class="vn-rpg-card"><b>${esc(n.label)}</b> ${n.id === state.atlas.currentLocationId ? "<small>[CURRENT]</small>" : `<small>(Visited ${n.visits}x)</small>`}${n.summary ? `<div style="margin-top:3px;opacity:0.85;">${esc(n.summary)}</div>` : ""}</div>`).join("")}
        `;
      }
    }

    this.drawerEl.innerHTML = `
      <div class="vn-rpg-sheet" role="dialog" aria-label="RPG Campaign Sheet">
        <div class="vn-rpg-sheet-head">
          <div class="vn-rpg-tabs" role="tablist">
            <button type="button" class="vn-rpg-tab" data-rpg-tab="vitals" aria-selected="${this.activeTab === "vitals"}">⚔️ Vitals &amp; Party</button>
            <button type="button" class="vn-rpg-tab" data-rpg-tab="quests" aria-selected="${this.activeTab === "quests"}">📜 Quests (${state.quests.length})</button>
            <button type="button" class="vn-rpg-tab" data-rpg-tab="atlas" aria-selected="${this.activeTab === "atlas"}">🗺️ Node Atlas (${state.atlas.nodes.length})</button>
          </div>
          <button type="button" class="vn-rpg-tab" data-rpg-close aria-label="Close RPG Sheet">✕</button>
        </div>
        <div class="vn-rpg-sheet-body">${bodyHtml}</div>
      </div>
    `;
    this.drawerEl.querySelectorAll<HTMLButtonElement>("[data-rpg-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.rpgTab as "vitals" | "quests" | "atlas";
        if (tab) {
          this.activeTab = tab;
          this.renderDrawer();
        }
      });
    });
    this.drawerEl.querySelector("[data-rpg-close]")?.addEventListener("click", () => this.toggleDrawer(false));
  }
}
