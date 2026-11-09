import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { installFakeDocument, FakeNode } from "../stage/stage-test-dom.js";
import { ImageStudio } from "./studio.js";
import type { TurnView, FrontendRequest } from "../../protocol.js";

let restoreDom: (() => void) | undefined;

beforeEach(() => {
  restoreDom = installFakeDocument();
});

afterEach(() => {
  restoreDom?.();
});

function createMockTurn(): TurnView {
  return {
    chatId: "test-chat",
    messageId: "msg-1",
    speaker: "Narrator",
    choices: [],
    sourceFingerprint: "fp-1",
    swipeId: 0,
    revision: 1,
    status: "ready",
    paragraphs: ["Hello world"],
    assets: [
      {
        jobId: "job-1",
        cueId: "cue-1",
        paragraphIndex: 0,
        status: "generated"
      },
      {
        jobId: "job-2",
        cueId: "cue-2",
        paragraphIndex: 0,
        status: "generated"
      }
    ],
    imageRequests: [
      {
        jobId: "job-1",
        requestId: "req-1",
        paragraphIndex: 0,
        model: "flux3",
        provider: "nanogpt",
        connectionId: "conn-1",
        prompt: "A beautiful garden",
        negativePrompt: "blurry",
        state: "review",
        parameters: {},
        referenceSummary: "none",
        createdAt: "now"
      },
      {
        jobId: "job-2",
        requestId: "req-2",
        paragraphIndex: 0,
        model: "flux3",
        provider: "nanogpt",
        connectionId: "conn-1",
        prompt: "A stone pathway",
        negativePrompt: "blurry",
        state: "review",
        parameters: {},
        referenceSummary: "none",
        createdAt: "now"
      }
    ]
  };
}

describe("ImageStudio Engine V3 Features (Phase 2)", () => {
  test("mounts tabbed artwork studio with 6 tabs and switches active panel", () => {
    const sent: FrontendRequest[] = [];
    const mount = new FakeNode("div") as unknown as HTMLElement;
    const studio = new ImageStudio(mount, (req) => sent.push(req), () => {});

    studio.setTurn(createMockTurn());
    studio.open();

    const tabs = (studio as any).root.querySelectorAll(".studio-tab-btn");
    expect(tabs.length).toBe(6);
    const tabNames = Array.from(tabs).map((t: any) => t.dataset.tab);
    expect(tabNames).toEqual(["picture", "prompt", "camera", "style", "model", "history"]);

    // Default tab is picture
    const pictureBtn = Array.from(tabs).find((t: any) => t.dataset.tab === "picture") as any;
    expect(pictureBtn.getAttribute("aria-selected")).toBe("true");

    const picturePanel = (studio as any).root.querySelector('[data-tab-panel="picture"]') as any;
    expect(picturePanel.hidden).toBe(false);

    // Click model tab
    const modelBtn = Array.from(tabs).find((t: any) => t.dataset.tab === "model") as any;
    modelBtn.click();
    expect(modelBtn.getAttribute("aria-selected")).toBe("true");
    expect(pictureBtn.getAttribute("aria-selected")).toBe("false");
    expect(picturePanel.hidden).toBe(true);

    const modelPanel = (studio as any).root.querySelector('[data-tab-panel="model"]') as any;
    expect(modelPanel.hidden).toBe(false);

    studio.destroy();
  });

  test("populates connection dropdown without inventing provider prices", () => {
    const sent: FrontendRequest[] = [];
    const mount = new FakeNode("div") as unknown as HTMLElement;
    const studio = new ImageStudio(mount, (req) => sent.push(req), () => {});

    studio.setConnectionCatalog({
      status: "ready",
      options: [
        {
          id: "conn-recraft",
          name: "Nano-GPT Recraft",
          provider: "nanogpt",
          model: "recraft-v4.1-flash",
          isDefault: true
        },
        {
          id: "conn-flux",
          name: "Nano-GPT FLUX",
          provider: "nanogpt",
          model: "blackforestlabs/flux-3/klein/text-to-image",
          isDefault: false
        }
      ]
    });

    const root = (studio as any).root;
    const select = root.querySelector("[data-artwork-connection]");
    expect(select.children.length).toBe(3); // default + 2 options
    expect(select.children[1].value).toBe("conn-recraft");
    expect(select.children[1].textContent).toContain("Recraft");

    const costEl = root.querySelector("[data-cost-estimate]");
    expect(costEl.textContent).toContain("Price unavailable");
    expect(costEl.textContent).not.toContain("$");

    studio.destroy();
  });

  test("regenerate with model passes connectionId and model in reprepare request", () => {
    const sent: FrontendRequest[] = [];
    const mount = new FakeNode("div") as unknown as HTMLElement;
    const studio = new ImageStudio(mount, (req) => sent.push(req), () => {});

    studio.setConnectionCatalog({
      status: "ready",
      options: [
        {
          id: "conn-flux",
          name: "FLUX Klein",
          provider: "nanogpt",
          model: "blackforestlabs/flux-3/klein/text-to-image",
          isDefault: false
        }
      ]
    });

    studio.setTurn(createMockTurn());
    studio.open();

    const root = (studio as any).root;
    const select = root.querySelector("[data-artwork-connection]");
    select.value = "conn-flux";

    const regenBtn = root.querySelector("[data-regenerate-model-single]");
    regenBtn.click();

    expect(sent.length).toBe(1);
    expect(sent[0]!.type).toBe("vn_reprepare_image_template");
    const reprepare = sent[0] as any;
    expect(reprepare.connectionId).toBe("conn-flux");
    expect(reprepare.model).toBe("blackforestlabs/flux-3/klein/text-to-image");
    expect(reprepare.generate).toBe(true);

    studio.destroy();
  });

  test("batch approve button approves all held reviewable images in scene", () => {
    const sent: FrontendRequest[] = [];
    const mount = new FakeNode("div") as unknown as HTMLElement;
    const studio = new ImageStudio(mount, (req) => sent.push(req), () => {});

    studio.setTurn(createMockTurn());
    studio.open();

    const root = (studio as any).root;
    const batchBtn = root.querySelector("[data-batch-approve]");
    expect(batchBtn.hidden).toBe(false);
    expect(batchBtn.textContent).toContain("Approve all held (2)");

    batchBtn.click();

    const reviewRequests = sent.filter(r => r.type === "vn_image_review");
    expect(reviewRequests.length).toBe(2);
    expect((reviewRequests[0] as any).requestId).toBe("req-1");
    expect((reviewRequests[0] as any).action).toBe("generate");
    expect((reviewRequests[1] as any).requestId).toBe("req-2");
    expect((reviewRequests[1] as any).action).toBe("generate");

    studio.destroy();
  });

  test("supports unified all-in-one artwork studio layout with quick navigation", () => {
    const sent: FrontendRequest[] = [];
    const mount = new FakeNode("div") as unknown as HTMLElement;
    const studio = new ImageStudio(mount, (req) => sent.push(req), () => {});

    studio.setTurn(createMockTurn());
    studio.open();

    const root = (studio as any).root;
    const toggleBtn = root.querySelector("[data-layout-mode-toggle]");
    expect(toggleBtn).not.toBeNull();

    // Toggle to unified mode
    toggleBtn.click();
    expect(toggleBtn.textContent).toContain("All in One");

    // In unified mode, all panels are accessible and visible simultaneously
    const panels = root.querySelectorAll(".studio-tab-panel");
    expect(panels.length).toBe(6);
    for (const panel of panels) {
      expect(panel.hidden).toBe(false);
    }

    // Quick-jump pill navigation updates active tab state
    const promptBtn = Array.from(root.querySelectorAll(".studio-tab-btn")).find((t: any) => t.dataset.tab === "prompt") as any;
    promptBtn.click();
    expect(promptBtn.getAttribute("aria-selected")).toBe("true");

    studio.destroy();
  });
});
