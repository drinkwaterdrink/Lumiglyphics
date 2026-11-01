import { describe, expect, it } from 'bun:test';
import {
  extractLocationDNA,
  extractTemporaryConditions,
  buildVisualContinuity,
  formatLocationDNAToClause,
  injectContinuityIntoPromptDocument
} from './visual-continuity.js';
import { createPromptDocument } from '../../shared/prompt-document.js';
import type { SceneState } from '../../shared/contracts.js';

describe('Visual Continuity Engine & Location DNA (Phase 4)', () => {
  const sampleScene = {
    sceneId: "scene-1",
    revision: 1,
    startParagraph: 0,
    character: "Nadine Pruitt",
    cast: ["Nadine Pruitt"],
    attire: "canvas work apron over faded sleeveless midi dress",
    environment: {
      location: "Pruitt farmhouse kitchen",
      description: "Screen door wide open, pine porch boards",
      persistentElements: ["gray-green mugs drying on counter", "dish towels"],
      timeOfDay: "late afternoon",
      weather: "rain mist",
      lighting: "soft overcast daylight"
    },
    subjectCategory: "female"
  } as unknown as SceneState;

  const samplePassage = `Nadine stands half in the kitchen doorway and half out of it, one arm holding the screen door wide so rain mist drifts across the boards at her bare feet. Gray slip smudges her forearm and the nails of both hands. Behind her: gray-green mugs drying on counter.`;

  it('extracts architectural features, materials and props into Location DNA', () => {
    const locDNA = extractLocationDNA(sampleScene, samplePassage);
    expect(locDNA.name).toContain('Pruitt farmhouse kitchen');
    expect(locDNA.dominantMaterials).toContain('pine wood');
    expect(locDNA.prominentProps.some(p => p.includes('mugs'))).toBe(true);
    expect(locDNA.lightingAtmosphere).toContain('late afternoon');
    expect(locDNA.lightingAtmosphere).toContain('rain mist');

    const clause = formatLocationDNAToClause(locDNA);
    expect(clause).toContain('Setting: Pruitt farmhouse kitchen');
    expect(clause).toContain('pine wood');
  });

  it('extracts temporary physical conditions accurately', () => {
    const conditions = extractTemporaryConditions('Nadine Pruitt', samplePassage);
    expect(conditions.some(c => c.includes('rain mist'))).toBe(true);
    expect(conditions.some(c => c.includes('slip') || c.includes('smudges'))).toBe(true);
    expect(conditions.some(c => c.includes('bare feet'))).toBe(true);
  });

  it('tracks visual continuity across turns and preserves persistent attire and conditions', () => {
    const turn1 = buildVisualContinuity('chat-1', sampleScene, samplePassage);
    expect(turn1.characters['nadine pruitt']?.activeAttire).toBe('canvas work apron over faded sleeveless midi dress');
    expect(turn1.characters['nadine pruitt']?.temporaryConditions.length).toBeGreaterThan(0);

    // Turn 2 with brief dialogue where attire isn't explicitly re-mentioned
    const turn2 = buildVisualContinuity('chat-1', { ...sampleScene, attire: null }, 'She looked up and nodded.', turn1);
    expect(turn2.characters['nadine pruitt']?.activeAttire).toBe('canvas work apron over faded sleeveless midi dress');
    expect(turn2.characters['nadine pruitt']?.temporaryConditions.length).toBeGreaterThan(0);
  });

  it('injects visual continuity into PromptDocument sections', () => {
    const continuity = buildVisualContinuity('chat-1', sampleScene, samplePassage);
    const doc = createPromptDocument('flux3-klein', [
      { id: 'subject-action', priority: 0, required: true, compressible: false, text: 'Nadine stands in the doorway' },
      { id: 'environment', priority: 1, required: true, compressible: true, text: 'A cozy rustic kitchen' }
    ]);

    const enhanced = injectContinuityIntoPromptDocument(doc, continuity, 'Nadine Pruitt');
    const p0 = enhanced.sections.find(s => s.id === 'subject-action');
    const p1 = enhanced.sections.find(s => s.id === 'environment');

    expect(p0?.text).toContain('with rain mist');
    expect(p1?.text).toContain('Pruitt farmhouse kitchen');
  });
});
