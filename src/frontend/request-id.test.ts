import { expect, test } from "bun:test";
import { bindFrontendUuidProvider, createUiId, unbindFrontendUuidProvider } from "./request-id.js";

test("never relies on crypto.randomUUID() for plain-HTTP safety", () => {
  const id = createUiId({
    randomUUID: () => "should-not-be-called",
    getRandomValues(arr) {
      for (let i = 0; i < arr.length; i += 1) arr[i] = i + 1;
      return arr;
    },
  });
  expect(id).not.toBe("should-not-be-called");
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("uses Spindle ctx.uuid.v4() when frontend-uuid-v1 is available and falls back cleanly on unbind", () => {
  let count = 0;
  bindFrontendUuidProvider({
    host: { capabilities: { "frontend-uuid-v1": 1 } },
    uuid: { v4: () => `spindle-uuid-${++count}` },
  });
  expect(createUiId()).toBe("spindle-uuid-1");
  expect(createUiId()).toBe("spindle-uuid-2");

  unbindFrontendUuidProvider();
  const fallback = createUiId();
  expect(fallback).not.toStartWith("spindle-uuid-");
  expect(fallback.length).toBeGreaterThan(8);
});

test("generates RFC 4122 v4 UUIDs via getRandomValues when randomUUID is absent", () => {
  const id = createUiId({
    getRandomValues(arr) {
      for (let i = 0; i < arr.length; i += 1) arr[i] = i + 1;
      return arr;
    },
  });
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("non-security UI IDs remain distinct without a secure-context crypto API", () => {
  const ids = Array.from({ length: 100 }, () => createUiId(null));
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9-]{1,64}$/);
  expect(createUiId({})).toMatch(/^lg-/);
});
