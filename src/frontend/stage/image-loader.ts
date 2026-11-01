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

const IMAGE_LOAD_TIMEOUT_MS = 15_000;
const IMAGE_DECODE_TIMEOUT_MS = 4_000;

const waitForImageLoad = (image: VnLoadableImage, url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("The scene image timed out while loading."));
    }, IMAGE_LOAD_TIMEOUT_MS);
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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
    const decodePromise = image.decode?.();
    if (decodePromise) {
      await Promise.race([
        decodePromise,
        new Promise<void>((resolve) => setTimeout(resolve, IMAGE_DECODE_TIMEOUT_MS)),
      ]);
    }
  } catch {
    // Decoding is an optional performance hint; do not fail an already-loaded image.
  }
};

export const sceneImageCandidatesFor = (asset: { imageId?: string | null; imageUrl?: string | null }): string[] => {
  const candidates: string[] = [];
  if (asset.imageId) {
    candidates.push(`/api/v1/images/${encodeURIComponent(asset.imageId)}`);
  }
  if (asset.imageUrl && asset.imageUrl.trim()) {
    const trimmed = asset.imageUrl.trim();
    if (!candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  }
  return candidates;
};

/**
 * URL the reader loads for a generated picture. The persisted-image route is
 * same-origin and authenticated, matching the artwork library and cast art.
 * Host-supplied `imageUrl` values are not verified from the browser (they can
 * be cross-origin or unreachable), so they are only a fallback when no
 * `imageId` exists.
 */
export const sceneImageUrlFor = (asset: { imageId?: string | null; imageUrl?: string | null }): string | null => {
  return sceneImageCandidatesFor(asset)[0] ?? null;
};
