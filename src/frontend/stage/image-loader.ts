export interface VnLoadableImage {
  src: string;
  decoding?: string;
  complete: boolean;
  naturalWidth: number;
  addEventListener(
    type: "load" | "error",
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener(type: "load" | "error", listener: EventListener): void;
  decode?: () => Promise<void>;
}

export type VnImageFactory = () => VnLoadableImage;

const waitForImageLoad = (image: VnLoadableImage, url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      image.removeEventListener("load", onLoad as EventListener);
      image.removeEventListener("error", onError as EventListener);
    };
    const onLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("The scene image could not be loaded."));
    };

    image.addEventListener("load", onLoad as EventListener, { once: true });
    image.addEventListener("error", onError as EventListener, { once: true });

    image.src = url;

    if (image.complete) {
      if (image.naturalWidth > 0) {
        onLoad();
      } else {
        onError();
      }
    }
  });
};

/** Loads and decodes an image before the visible scene points at its URL. */
export const preloadAndDecodeVnImage = async (
  url: string,
  createImage: VnImageFactory = () => new Image(),
): Promise<void> => {
  if (!url.trim()) throw new Error("A scene image URL is required.");

  const image = createImage();
  image.decoding = "async";
  await waitForImageLoad(image, url);
  try {
    await image.decode?.();
  } catch {
    // Decoding is an optional performance hint; do not fail an already-loaded image.
  }
};

/**
 * URL the reader loads for a generated picture. The persisted-image route is
 * same-origin and authenticated, matching the artwork library and cast art.
 * Host-supplied `imageUrl` values are not verified from the browser (they can
 * be cross-origin or unreachable), so they are only a fallback when no
 * `imageId` exists.
 */
export const sceneImageUrlFor = (asset: { imageId?: string | null; imageUrl?: string | null }): string | null => {
  if (asset.imageId) return `/api/v1/images/${encodeURIComponent(asset.imageId)}`;
  return asset.imageUrl || null;
};
