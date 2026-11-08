import { describe, expect, it } from "bun:test";
import { areNamesEquivalent, findMatchingCharacterId, normalizeNameToken } from "./nicknames";

describe("normalizeNameToken", () => {
  it("strips honorifics and punctuation", () => {
    expect(normalizeNameToken("Dr. Robert Smith")).toBe("robert smith");
    expect(normalizeNameToken("Lady Marseline")).toBe("marseline");
    expect(normalizeNameToken("Captain 'Bob'")).toBe("bob");
    expect(normalizeNameToken("Detective Vane!")).toBe("vane");
  });
});

describe("areNamesEquivalent", () => {
  it("matches identical names case-insensitively", () => {
    expect(areNamesEquivalent("Robert", "robert")).toBe(true);
    expect(areNamesEquivalent("Marseline Vane", "marseline vane")).toBe(true);
  });

  it("matches nicknames and diminutives", () => {
    expect(areNamesEquivalent("Robert", "Bob")).toBe(true);
    expect(areNamesEquivalent("Bobby", "Rob")).toBe(true);
    expect(areNamesEquivalent("William", "Bill")).toBe(true);
    expect(areNamesEquivalent("Liam", "William")).toBe(true);
    expect(areNamesEquivalent("Katherine", "Kate")).toBe(true);
    expect(areNamesEquivalent("Alexander", "Sasha")).toBe(true);
  });

  it("matches full name with nickname or first name", () => {
    expect(areNamesEquivalent("Robert Smith", "Bob")).toBe(true);
    expect(areNamesEquivalent("Robert Smith", "Bob Smith")).toBe(true);
    expect(areNamesEquivalent("Marseline Vane", "Marseline")).toBe(true);
  });

  it("matches surname to full name", () => {
    expect(areNamesEquivalent("Vane", "Marseline Vane")).toBe(true);
    expect(areNamesEquivalent("Detective Vane", "Marseline Vane")).toBe(true);
  });

  it("does not match different names", () => {
    expect(areNamesEquivalent("Robert Smith", "William Smith")).toBe(false);
    expect(areNamesEquivalent("Bob", "Alice")).toBe(false);
    expect(areNamesEquivalent("Robert", "Richard")).toBe(false);
  });
});

describe("findMatchingCharacterId", () => {
  const library = {
    c1: { id: "c1", name: "Robert Vance", aliases: ["Rob"] },
    c2: { id: "c2", name: "Marseline", aliases: ["Vane"] },
  };

  it("finds existing character by diminutive/nickname", () => {
    expect(findMatchingCharacterId(library, "Bob")).toBe("c1");
    expect(findMatchingCharacterId(library, "Bobby Vance")).toBe("c1");
  });

  it("finds existing character by surname or alias", () => {
    expect(findMatchingCharacterId(library, "Vane")).toBe("c2");
    expect(findMatchingCharacterId(library, "Marseline Vane")).toBe("c2");
  });

  it("returns null for unknown characters", () => {
    expect(findMatchingCharacterId(library, "Thomas")).toBeNull();
  });
});
