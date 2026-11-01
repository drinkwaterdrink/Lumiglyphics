import { expect, test } from "bun:test";
import { describeDataFlows, displayHost, type DataFlowInput } from "./data-flows.js";

const base: DataFlowInput = {
  enabled: true,
  generateImages: true,
  useNativeCardImages: false,
  systemOneMode: "off",
  systemOneApiUrl: "https://api.typesafe.ai",
  speech: { enabled: false },
};

test("with defaults only the story reader sends text, to the user's own connection", () => {
  const flows = describeDataFlows(base);
  expect(flows.map((flow) => flow.id)).toEqual(["planner", "images"]);
  expect(flows.every((flow) => !flow.thirdParty)).toBe(true);
});

test("System One is listed as third party only when it is on", () => {
  expect(describeDataFlows(base).some((flow) => flow.id === "system_one")).toBe(false);
  const flows = describeDataFlows({ ...base, systemOneMode: "compare" });
  const systemOne = flows.find((flow) => flow.id === "system_one");
  expect(systemOne?.thirdParty).toBe(true);
  expect(systemOne?.destination).toContain("api.typesafe.ai");
  expect(systemOne?.sends).toContain("Paragraph text");
});

test("a disabled reader sends nothing from the planner or pictures", () => {
  expect(describeDataFlows({ ...base, enabled: false }).map((flow) => flow.id)).toEqual([]);
});

test("native card images remove the picture flow; speech adds its own flow", () => {
  const flows = describeDataFlows({ ...base, useNativeCardImages: true, speech: { enabled: true } });
  expect(flows.map((flow) => flow.id)).toEqual(["planner", "speech"]);
});

test("displayHost shows the host and keeps unparseable input readable", () => {
  expect(displayHost("https://example.test/v1/systemone")).toBe("example.test");
  expect(displayHost("not a url")).toBe("not a url");
});
