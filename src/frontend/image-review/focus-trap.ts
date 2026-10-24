/**
 * F15: shared mobile focus-trap primitive. Surfaces that become
 * near-fullscreen under a container query must keep keyboard and screen
 * reader focus from escaping to the stage behind them.
 */

/** Mirrors the `@container (max-width:600px)` breakpoint used by the studio. */
export const MOBILE_CONTAINER_MAX_WIDTH_PX = 600;

export function isMobileWidth(host: Element): boolean {
  const width = host.getBoundingClientRect().width;
  return width > 0 && width <= MOBILE_CONTAINER_MAX_WIDTH_PX;
}

const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "select:not(:disabled)",
  "input:not(:disabled)",
  "textarea:not(:disabled)",
  "summary",
  "a[href]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

/**
 * Wrap Tab/Shift+Tab between the first and last focusable descendant of
 * `container`. Elements hidden via the `hidden` attribute or a hidden
 * ancestor (including closed <details> content in real browsers) are excluded.
 * `active` is the current focused element; pass the shadow root's
 * activeElement when trapping inside a Shadow DOM.
 */
export function trapFocusWithin(
  container: ParentNode,
  event: KeyboardEvent,
  active: Element | null
): void {
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((el) =>
    !el.hidden
    && !el.closest("[hidden]")
    && (typeof el.getClientRects !== "function" || el.getClientRects().length > 0)
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}
