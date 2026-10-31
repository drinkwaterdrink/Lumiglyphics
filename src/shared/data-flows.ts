/**
 * Describes where story text goes for each enabled feature. Pure and shared so
 * the settings panel and tests read the same rules. Only what the settings
 * actually enable is listed.
 *
 * Lumiglyphics sends text through two kinds of destination:
 *  - the Lumiverse connection the user picked (text, image, or speech provider), and
 *  - a direct third-party API (System One), which Lumiglyphics calls itself.
 */
export type DataFlowInput = {
  enabled: boolean;
  generateImages: boolean;
  useNativeCardImages: boolean;
  systemOneMode: "off" | "compare" | "on";
  systemOneApiUrl: string;
  speech: { enabled: boolean };
};

export type DataFlow = {
  id: "planner" | "images" | "speech" | "system_one";
  label: string;
  /** What leaves Lumiverse for this feature. */
  sends: string;
  /** Who receives it, in plain words. */
  destination: string;
  /** True when the receiver is outside the user's Lumiverse connections. */
  thirdParty: boolean;
};

/** Host name for display, or the raw text when the URL does not parse. */
export function displayHost(url: string): string {
  try {
    return new URL(url.trim()).host || url.trim();
  } catch {
    return url.trim();
  }
}

export function describeDataFlows(config: DataFlowInput): DataFlow[] {
  const flows: DataFlow[] = [];
  if (config.enabled) {
    flows.push({
      id: "planner",
      label: "Story reader",
      sends: "The latest reply, recent scene context and cast notes",
      destination: "Your Lumiverse text connection (Story reader connection, or Lumiverse default)",
      thirdParty: false,
    });
  }
  if (config.enabled && config.generateImages && !config.useNativeCardImages) {
    flows.push({
      id: "images",
      label: "Pictures",
      sends: "Image prompts written from the scene, with visible appearance and setting details",
      destination: "Your Lumiverse image connection",
      thirdParty: false,
    });
  }
  if (config.speech.enabled) {
    flows.push({
      id: "speech",
      label: "Speech (TTS)",
      sends: "The visible text of each paragraph as it is read aloud",
      destination: "Your Lumiverse speech provider",
      thirdParty: false,
    });
  }
  if (config.systemOneMode !== "off") {
    flows.push({
      id: "system_one",
      label: "System One",
      sends: "Paragraph text (up to 3,000 characters each), character names and the previous scene. Sent only when a System One key is saved.",
      destination: `${displayHost(config.systemOneApiUrl)}, a third-party API outside Lumiverse`,
      thirdParty: true,
    });
  }
  return flows;
}
