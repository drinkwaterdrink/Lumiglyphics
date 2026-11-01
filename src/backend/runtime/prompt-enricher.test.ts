import { describe, expect, it } from 'bun:test';
import {
  isHighCapacityModel,
  getMaxBudgetForModel,
  buildPromptEnrichmentPrompt,
  applyPromptEnrichment
} from './prompt-enricher.js';
import { createPromptDocument } from '../../shared/prompt-document.js';
import type { VisualBrief } from '../../shared/image-templates.js';

describe('Prompt Enricher for High-Capacity Models (Phase 5)', () => {
  it('correctly detects high capacity models and scales character budget', () => {
    expect(isHighCapacityModel('recraft-v4.1')).toBe(true);
    expect(isHighCapacityModel('recraft-instant')).toBe(true);
    expect(isHighCapacityModel('grok-imagine')).toBe(true);
    expect(isHighCapacityModel('flux-3-pro')).toBe(true);
    expect(isHighCapacityModel('sdxl')).toBe(false);

    expect(getMaxBudgetForModel('recraft-v4.1', 'ultra')).toBe(9800);
    expect(getMaxBudgetForModel('recraft-v4.1', 'detailed')).toBe(5000);
    expect(getMaxBudgetForModel('flux-3-klein', 'ultra')).toBe(3800);
  });

  it('builds instruction prompt for story LLM with sensory directives', () => {
    const mockBrief: VisualBrief = {
      scene: 'Rustic kitchen threshold',
      subjects: 'Nadine Pruitt',
      action: 'Holding the screen door',
      composition: 'medium close-up',
      lighting: 'rain mist daylight',
      subjectMode: 'one',
      framing: 'portrait',
      referencePolicy: 'character',
      sources: [],
      conflicts: []
    };

    const prompt = buildPromptEnrichmentPrompt({
      brief: mockBrief,
      detailLevel: 'ultra'
    });

    expect(prompt).toContain('10,000-character capacity');
    expect(prompt).toContain('fine fabric weaves, drape');
    expect(prompt).toContain('Holding the screen door');
    expect(prompt).toContain('Rustic kitchen threshold');
  });

  it('applies enriched sensory prose to PromptDocument', () => {
    const baseDoc = createPromptDocument('flux3-klein', [
      { id: 'subject-action', priority: 0, required: true, compressible: false, text: 'Nadine stands in doorway' },
      { id: 'style-medium', priority: 1, required: true, compressible: true, text: 'Cinematic photograph' }
    ]);

    const enrichedProse = 'A cinematic close-up of Nadine standing in the weathered kitchen doorway. Rain mist drifts across the raw pine boards at her bare feet, fine droplets catching the late afternoon daylight...';
    const result = applyPromptEnrichment(baseDoc, enrichedProse, 'flux3-klein');

    const p0 = result.sections.find(s => s.id === 'enriched-cinematic-prose');
    expect(p0).toBeDefined();
    expect(p0?.text).toContain('Rain mist drifts across the raw pine boards');
    expect(result.sections.some(s => s.id === 'style-medium')).toBe(true);
  });
});
