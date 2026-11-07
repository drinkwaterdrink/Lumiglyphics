import {
  computePacingFrustrationMultiplier,
  computeQuestUrgency,
  formatSkillCheckSubmission,
  resolveSkillCheck,
  type RpgMode,
  type RpgState,
  type SkillCheck,
  type SkillCheckOutcome,
} from "../../shared/rpg-state.js";
import type { VnChoice } from "../store/vn-store.js";

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
  top: 14px;
  left: 16px;
  z-index: 32;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
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
[data-vn-rpg-bar]:hover {
  transform: translateY(-1px);
  border-color: var(--vn-accent, #7c9cff);
}
[data-vn-rpg-bar][hidden] {
  display: none !important;
}
[data-vn-rpg-theatre] {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 48;
  pointer-events: none;
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
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vn-text-muted, rgba(244, 246, 251, 0.68));
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
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
`;

const TIER_LABELS: Record<SkillCheckOutcome["tier"], string> = {
  critical_success: "CRITICAL SUCCESS (NAT 20)",
  success: "SUCCESS",
  partial: "PARTIAL SUCCESS",
  failure: "FAILURE",
  critical_failure: "CRITICAL FAILURE (NAT 1)",
};

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class RpgStageController {
  private rpgMode: RpgMode = "off";
  private rpgState: RpgState | null = null;
  private activeTab: "vitals" | "quests" | "atlas" = "vitals";
  private barEl: HTMLButtonElement | null = null;
  private theatreEl: HTMLElement | null = null;
  private drawerEl: HTMLElement | null = null;
  private theatreTimer: ReturnType<typeof setTimeout> | null = null;

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

  destroy(): void {
    if (this.theatreTimer) {
      clearTimeout(this.theatreTimer);
      this.theatreTimer = null;
    }
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

  decorateChoiceButton(button: HTMLButtonElement, choice: VnChoice): void {
    if (this.rpgMode === "off" || !choice.check) return;
    const check = choice.check;
    const modStr = check.modifier > 0 ? ` +${check.modifier}` : check.modifier < 0 ? ` ${check.modifier}` : "";
    const rollTag = check.rollMode === "advantage" ? " · ADV" : check.rollMode === "disadvantage" ? " · DIS" : "";
    const badge = document.createElement("span");
    badge.dataset.vnChoiceCheck = "";
    badge.textContent = `🎲 ${check.stat} DC ${check.dc}${modStr}${rollTag}`;
    button.appendChild(badge);
  }

  resolveChoiceSubmission(choice: VnChoice): string {
    if (this.rpgMode === "off" || !choice.check) return choice.value;
    const outcome = resolveSkillCheck(choice.check);
    this.showRollTheatre(outcome);
    return formatSkillCheckSubmission(choice.value, outcome);
  }

  private showRollTheatre(outcome: SkillCheckOutcome): void {
    if (!this.theatreEl) return;
    if (this.theatreTimer) clearTimeout(this.theatreTimer);
    const { check, rolls, natural, total, tier } = outcome;
    const rollDetail = rolls.length > 1 ? `2d20(${rolls.join(", ")}) → ${natural}` : `d20(${natural})`;
    const modStr = check.modifier > 0 ? `+${check.modifier}` : check.modifier < 0 ? `${check.modifier}` : "+0";
    this.theatreEl.innerHTML = `
      <div style="font-size:0.72rem;letter-spacing:0.08em;opacity:0.8;">🎲 ${esc(check.stat)} SKILL CHECK (DC ${check.dc})</div>
      <div style="font-size:1rem;font-weight:700;">${esc(TIER_LABELS[tier])}</div>
      <div style="font-size:0.78rem;opacity:0.88;">${esc(rollDetail)} ${modStr} = <b>${total}</b> vs DC ${check.dc}</div>
    `;
    this.theatreEl.hidden = false;
    this.theatreTimer = setTimeout(() => {
      if (this.theatreEl) this.theatreEl.hidden = true;
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

  private toggleDrawer(open: boolean): void {
    if (!this.drawerEl) return;
    this.drawerEl.hidden = !open;
    if (open) this.renderDrawer();
  }

  private renderDrawer(): void {
    if (!this.drawerEl || !this.rpgState) return;
    const state = this.rpgState;
    const v = state.vitals;
    const pressure = computePacingFrustrationMultiplier(state.turnCounter);

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
          const urgency = computeQuestUrgency(q, state.turnCounter);
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
