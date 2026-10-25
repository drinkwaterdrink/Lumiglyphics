/**
 * The ordered cascade of style layers inside the nested theme shadow root.
 *
 * The first layer wins the earliest spot in the cascade and the last layer
 * wins ties, so the order is significant:
 *
 *   1. `base`   — the platform theme (VN_BASE_CSS): stable data-vn-* selectors,
 *                 the user-selectable scene-image fit, and the default values
 *                 for every documented --vn-* custom property.
 *   2. `preset` — exactly one built-in preset (THEME_PRESET_CSS), scoped to
 *                 `[data-vn-root][data-vn-preset="<id>"]`.
 *   3. `aperture` — optional APERTURE reader presentation, after built-in themes.
 *   4. `user`     — the user's custom CSS, sanitized of remote fetches. This is
 *                  always the final layer, so custom CSS stays authoritative.
 *
 * `VnStage` appends its style elements in exactly this order, and the order
 * below is the single reference the stage and the tests share.
 */

export const THEME_STYLE_LAYER_ORDER = ["base", "preset", "aperture", "user"] as const;

export type ThemeStyleLayer = (typeof THEME_STYLE_LAYER_ORDER)[number];

/**
 * The `data-vn-*` attribute written on each <style> element so the layer is
 * identifiable from the DOM and so tests can assert the layer composition.
 */
export const THEME_STYLE_LAYER_ATTRIBUTE: Record<ThemeStyleLayer, string> = {
  base: "data-vn-base-css",
  preset: "data-vn-preset-css",
  aperture: "data-vn-aperture-css",
  user: "data-vn-user-css",
};
