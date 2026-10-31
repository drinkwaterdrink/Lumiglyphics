import assert from "node:assert/strict";
import test from "node:test";

import {
  preloadAndDecodeVnImage,
  sceneImageUrlFor,
  type VnLoadableImage,
} from "./image-loader";

class FakeImage implements VnLoadableImage {
  src = "";
  decoding = "";
  complete = true;
  naturalWidth = 100;
  decodeCalls = 0;

  addEventListener(): void {}
  removeEventListener(): void {}

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


test("reader pictures load the same-origin persisted-image route when an imageId exists", () => {
  assert.equal(
    sceneImageUrlFor({ imageId: "abc 123", imageUrl: "https://provider.example/cdn/x.png" }),
    "/api/v1/images/abc%20123",
  );
});

test("host imageUrl is only a fallback when no imageId exists", () => {
  assert.equal(sceneImageUrlFor({ imageUrl: "/legacy.png" }), "/legacy.png");
  assert.equal(sceneImageUrlFor({ imageId: null, imageUrl: "" }), null);
});
