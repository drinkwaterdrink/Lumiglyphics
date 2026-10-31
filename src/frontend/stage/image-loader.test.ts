import assert from "node:assert/strict";
import test from "node:test";

import {
  preloadAndDecodeVnImage,
  type VnLoadableImage,
} from "./image-loader";

class FakeImage implements VnLoadableImage {
  src = "";
  decoding = "";
  complete = true;
  naturalWidth = 100;
  decodeCalls = 0;
  private listeners: Record<string, EventListener[]> = {};

  addEventListener(type: "load" | "error", listener: EventListener): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type]!.push(listener);
    if (type === "error" && this.naturalWidth === 0) {
      queueMicrotask(() => listener(new Event("error")));
    }
  }

  removeEventListener(type: "load" | "error", listener: EventListener): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type]!.filter((l) => l !== listener);
  }

  async decode(): Promise<void> {
    this.decodeCalls += 1;
  }
}

test("scene images decode before the preload promise resolves", async () => {
  const image = new FakeImage();
  await preloadAndDecodeVnImage("scene.webp", () => image);

  assert.equal(image.src, "scene.webp");
  assert.equal(image.decoding, "async");
  assert.equal(image.decodeCalls, 1);
});

test("a failed cached image is rejected", async () => {
  const image = new FakeImage();
  image.naturalWidth = 0;

  await assert.rejects(
    preloadAndDecodeVnImage("broken.webp", () => image),
    /could not be loaded/,
  );
});

test('preloadAndDecodeVnImage resolves even if image.decode hangs', async () => {
  const image = new FakeImage();
  image.decode = () => new Promise(() => {}); // never resolves
  await preloadAndDecodeVnImage('slow-decode.webp', () => image);
  assert.equal(image.src, 'slow-decode.webp');
});
