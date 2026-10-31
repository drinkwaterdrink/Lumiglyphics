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
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error("The scene image could not be loaded."));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      image.removeEventListener?.("load", onLoad as EventListener);
      image.removeEventListener?.("error", onError as EventListener);
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

    image.addEventListener?.("load", onLoad as EventListener, { once: true });
    image.addEventListener?.("error", onError as EventListener, { once: true });

    timer = setTimeout(() => {
      onLoad();
    }, 2500);

    image.src = url;

    if (image.complete && image.naturalWidth > 0) {
      onLoad();
    }
  });
};

/** Loads and decodes an image before the visible scene points at its URL. */
export const preloadAndDecodeVnImage = async (
  url: string,
  createImage: VnImageFactory = () => (typeof Image === "function" ? new Image() : ({ complete: true, naturalWidth: 100, src: "", decode: async () => {}, addEventListener: (_e: string, cb: any) => setTimeout(cb, 0), removeEventListener() {} } as unknown as VnLoadableImage)),
): Promise<void> => {
  if (!url.trim()) throw new Error("A scene image URL is required.");

  const image = createImage();
  image.decoding = "async";
  image.src = url;
  await waitForImageLoad(image, url);
  try {
    if (typeof image.decode === "function") {
      await Promise.race([
        image.decode(),
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);
    }
  } catch {
    // Decoding is an optional performance hint; do not fail an already-loaded image.
  }
};
