import { describe, expect, test } from "bun:test";
import {
  estimateBase64Bytes,
  isStrictTextToImageModel,
  stripDanglingImageReferences,
  sanitizeImagePayloadParameters,
  NANO_GPT_PAYLOAD_LIMIT_BYTES
} from "./image-payload-sanitizer.js";

describe("Image Payload Sanitizer", () => {
  test("estimates base64 byte sizes accurately without scheme", () => {
    // 4 chars base64 = 3 bytes
    expect(estimateBase64Bytes("QUJD")).toBe(3);
    // With data url prefix
    expect(estimateBase64Bytes("data:image/png;base64,QUJD")).toBe(3);
  });

  test("identifies strict text-to-image models", () => {
    expect(isStrictTextToImageModel("nanogpt", "blackforestlabs/flux-3/klein/base/text-to-image")).toBe(true);
    expect(isStrictTextToImageModel("nanogpt", "blackforestlabs/flux-3/klein/text-to-image")).toBe(true);
    expect(isStrictTextToImageModel("nanogpt", "black-forest-labs/flux-3/text-to-image")).toBe(true);
    expect(isStrictTextToImageModel("nanogpt", "blackforestlabs/flux-3/klein/edit-image")).toBe(false);
  });

  test("strips dangling image references from text-to-image requests", () => {
    const raw = {
      size: "1024x1024",
      prompt: "test",
      resolvedReferenceImages: [{ data: "QUJD" }],
      resolvedSourceImages: [{ data: "QUJD" }],
      image: "data:image/png;base64,QUJD"
    };
    const cleaned = stripDanglingImageReferences(raw);
    expect(cleaned.size).toBe("1024x1024");
    expect(cleaned.prompt).toBe("test");
    expect(cleaned.resolvedReferenceImages).toBeUndefined();
    expect(cleaned.resolvedSourceImages).toBeUndefined();
    expect(cleaned.image).toBeUndefined();
  });

  test("purges image references when sending to NanoGPT text-to-image routes", () => {
    const params = {
      size: "1024x1024",
      resolvedReferenceImages: [{ data: "UE9SVFJBSVQ=" }]
    };
    const sanitized = sanitizeImagePayloadParameters(
      params,
      "nanogpt",
      "blackforestlabs/flux-3/klein/base/text-to-image"
    );
    expect(sanitized.size).toBe("1024x1024");
    expect(sanitized.resolvedReferenceImages).toBeUndefined();
  });

  test("preserves reference images for image-to-image models within safe byte limits", () => {
    const params = {
      size: "1024x1024",
      resolvedReferenceImages: [{ data: "UE9SVFJBSVQ=" }]
    };
    const sanitized = sanitizeImagePayloadParameters(
      params,
      "nanogpt",
      "blackforestlabs/flux-3/klein/edit-image"
    );
    expect(sanitized.resolvedReferenceImages).toBeDefined();
    expect(sanitized.resolvedReferenceImages).toHaveLength(1);
  });

  test("drops oversized payloads exceeding 10MB limit on NanoGPT to avoid 413 billings", () => {
    // 14MB base64 string
    const hugeBase64 = "A".repeat(Math.ceil((NANO_GPT_PAYLOAD_LIMIT_BYTES + 1024) * 4 / 3));
    const params = {
      size: "1024x1024",
      resolvedReferenceImages: [{ data: hugeBase64 }]
    };
    const sanitized = sanitizeImagePayloadParameters(
      params,
      "nanogpt",
      "blackforestlabs/flux-3/klein/edit-image"
    );
    expect(sanitized.resolvedReferenceImages).toBeUndefined();
  });
});
