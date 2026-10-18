import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, type VisualNovelConfig } from "../../config.js";
import { ImageTemplateEditor } from "./image-templates.js";
import { FakeDocument, FakeEvent, FakeNode, installFakeDocument } from "../stage/stage-test-dom.js";

// These tests run the real editor against the project's small DOM adapter.
// A late config echo or an early navigation callback must not destroy newer text.
describe("template workspace", () => {
  let restore: () => void;
  let inputConstructor: unknown;
  let editor: ImageTemplateEditor;
  let mount: FakeNode;
  let patches: Partial<VisualNovelConfig>[];
  let config: VisualNovelConfig;
  beforeEach(() => {
    restore = installFakeDocument();
    inputConstructor = (globalThis as any).HTMLInputElement;
    (globalThis as any).HTMLInputElement = FakeNode;
    (FakeNode.prototype as any).getRootNode = () => FakeDocument;
    mount = new FakeNode("div");
    patches = [];
    config = structuredClone(DEFAULT_CONFIG);
    editor = new ImageTemplateEditor(mount as unknown as HTMLElement, patch => patches.push(patch), () => {});
    editor.setConfig(config);
  });
  afterEach(() => {
    editor?.destroy();
    (globalThis as any).HTMLInputElement = inputConstructor;
    delete (FakeNode.prototype as any).getRootNode;
    restore();
  });
  const node = (selector: string) => mount.querySelector(selector)!;
  const click = (selector: string) => {
    const target = node(selector) as FakeNode & { onclick?: () => void };
    if (target.onclick) target.onclick(); else target.click();
  };
  const input = (selector: string, value: string) => {
    const target = node(selector); target.value = value; target.dispatchEvent(new FakeEvent("input"));
  };
  const open = () => click('[data-open-template="portrait"]');
  const guard = (callback: () => void) => (editor as ImageTemplateEditor & { guardNavigation(callback: () => void): boolean }).guardNavigation(callback);

  test("the list explains purpose, dynamic inclusion and saved default before opening one editor", () => {
    expect(node("[data-template-detail]")?.hidden).toBe(true);
    expect(node('[data-template-row="portrait"]')?.textContent).toContain("expression or reaction");
    expect(node('[data-template-row="portrait"]')?.textContent).toContain("Default");
    expect(mount.querySelectorAll('[data-dynamic-template="portrait"]')).toHaveLength(1);
    open();
    expect(node("[data-template-detail]").hidden).toBe(false);
    expect(node("[data-template-list]").hidden).toBe(true);
    expect(node('[data-t="name"]').value).toBe("Character portrait");
    expect(patches).toHaveLength(0);
  });

  test("unrelated config echoes preserve active exact wording and unsaved state", () => {
    open();
    const wording = "  My exact custom words\n{{subjects}}  ";
    input('[data-t="positive"]', wording);
    editor.setConfig({ ...config, maxImagesPerTurn: 8 });
    expect(node('[data-t="positive"]').value).toBe(wording);
    expect(node("[data-template-status]").textContent).toContain("Unsaved");
    click("[data-save-templates]");
    expect(patches[0]?.imageTemplates?.find(template => template.id === "portrait")?.positive).toBe(wording);
  });

  test("a matching older save echo never acknowledges or overwrites a newer edit", () => {
    open(); input('[data-t="positive"]', "First wording"); click("[data-save-templates]");
    const saved = patches[0]!;
    input('[data-t="positive"]', "Newer wording");
    editor.setConfig({ ...config, ...saved });
    expect(node('[data-t="positive"]').value).toBe("Newer wording");
    expect(node("[data-template-status]").textContent).toContain("Unsaved");
    expect(node("[data-template-save-actions]").hidden).toBe(false);
  });

  test("Stay retains text and Discard resumes the requested navigation", () => {
    open(); input('[data-t="positive"]', "Draft words");
    let navigated = 0;
    expect(guard(() => { navigated++; })).toBe(false);
    expect(node("[data-template-navigation]").hidden).toBe(false);
    click("[data-template-stay]");
    expect(navigated).toBe(0);
    expect(node('[data-t="positive"]').value).toBe("Draft words");
    guard(() => { navigated++; }); click("[data-template-leave-discard]");
    expect(navigated).toBe(1);
    expect(node('[data-t="positive"]').value).toBe(config.imageTemplates[0]!.positive);
    expect(guard(() => { navigated++; })).toBe(true);
    expect(navigated).toBe(2);
  });

  test("Save and leave waits for its matching catalog echo", () => {
    open(); input('[data-t="positive"]', "Keep these words");
    let navigated = 0; guard(() => { navigated++; }); click("[data-template-leave-save]");
    expect(navigated).toBe(0);
    editor.setConfig({ ...config, maxImagesPerTurn: 8 });
    expect(navigated).toBe(0);
    editor.setConfig({ ...config, ...patches[0]! });
    expect(navigated).toBe(1);
    expect(node("[data-template-save-actions]").hidden).toBe(true);
  });

  test("failed saves retain the draft and do not navigate", () => {
    open(); input('[data-t="positive"]', "Keep after failure");
    let navigated = false; guard(() => { navigated = true; }); click("[data-template-leave-save]");
    editor.setSaveError("Storage unavailable");
    expect(navigated).toBe(false);
    expect(node('[data-t="positive"]').value).toBe("Keep after failure");
    expect(node("[data-template-status]").textContent).toContain("draft is retained");
    expect(node("[data-template-navigation]").hidden).toBe(false);
  });

  test("navigation never saves a newer draft using an earlier Save and leave decision", () => {
    open(); input('[data-t="positive"]', "Earlier draft");
    let navigated = false; guard(() => { navigated = true; }); click("[data-template-leave-save]");
    const saved = patches[0]!;
    input('[data-t="positive"]', "Newer draft");
    editor.setConfig({ ...config, ...saved });
    expect(navigated).toBe(false);
    expect(node('[data-t="positive"]').value).toBe("Newer draft");
  });

  test("dynamic mode cannot save an empty inclusion set", () => {
    editor.setConfig({ ...config, dynamicImageTemplates: true });
    for (const checkbox of mount.querySelectorAll("[data-dynamic-template]")) {
      (checkbox as any).checked = false; checkbox.dispatchEvent(new FakeEvent("input"));
    }
    click("[data-save-templates]");
    expect(patches).toHaveLength(0);
    expect(node("[data-template-status]").textContent).toContain("at least one");
  });

  test("browsing the catalog retains each template draft within the same edit session", () => {
    open(); input('[data-t="positive"]', "Portrait draft"); click("[data-template-back]");
    click('[data-open-template="environment"]'); input('[data-t="positive"]', "Place draft");
    click("[data-template-back]"); open();
    expect(node('[data-t="positive"]').value).toBe("Portrait draft");
    click("[data-save-templates]");
    expect(patches[0]?.imageTemplates?.find(template => template.id === "environment")?.positive).toBe("Place draft");
  });

  test("field validation opens collapsed guidance so the invalid field can receive focus", () => {
    open(); input('[data-t="useWhen"]', "x".repeat(1001)); click("[data-save-templates]");
    expect(patches).toHaveLength(0);
    expect(node('[data-t="useWhen"]').getAttribute("aria-invalid")).toBe("true");
    expect((node("[data-template-composition]") as any).open).toBe(true);
    expect(FakeDocument.activeElement).toBe(node('[data-t="useWhen"]'));
  });

  test("the focused editor title follows its draft name without a config echo", () => {
    open(); input('[data-t="name"]', "My portrait");
    expect(node("[data-template-title]").textContent).toBe("My portrait");
    expect(node('[data-t="name"]').value).toBe("My portrait");
    expect(patches).toHaveLength(0);
  });
});
