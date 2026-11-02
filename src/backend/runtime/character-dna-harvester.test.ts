import { describe, expect, it } from 'bun:test';
import {
  buildCharacterDNAAutoFillPrompt,
  parseCharacterDNALlmOutput,
  loadCharacterDNALibrary,
  saveCharacterDNA,
  getEffectiveCharacterDNA
} from './character-dna-harvester.js';
import { createEmptyCharacterDNA, extractDNAPartsFromText } from '../../shared/character-dna.js';

describe('Character DNA Harvester & Persistence', () => {
  it('extracts traits heuristically from character prose', () => {
    const prose = `Nadine Pruitt is a petite human woman with shoulder-length chestnut brown hair and sharp hazel eyes. She has fair skin with freckles across her nose and wears a stiff canvas apron.`;
    const extracted = extractDNAPartsFromText(prose);

    expect(extracted.hair?.color).toBe('brown');
    expect(extracted.hair?.length).toBe('shoulder-length');
    expect(extracted.eyes?.color).toBe('hazel');
    expect(extracted.eyes?.shape).toBe('sharp');
    expect(extracted.build?.height).toBe('petite');
    expect(extracted.build?.gender).toBe('woman');
    expect(extracted.build?.species).toBe('human');
    expect(extracted.distinguishingFeatures).toContain('freckles');
    expect(extracted.signatureOutfit).toContain('stiff canvas apron');
  });

  it('builds auto-fill prompt and parses LLM JSON response', () => {
    const prompt = buildCharacterDNAAutoFillPrompt('Nadine', 'Story text about Nadine in the kitchen');
    expect(prompt).toContain('Nadine');
    expect(prompt).toContain('JSON format required:');

    const llmJson = `\`\`\`json
{
  "name": "Nadine",
  "hair": {
    "color": "auburn",
    "length": "shoulder-length",
    "style": "messy bun"
  },
  "eyes": {
    "color": "hazel",
    "shape": "almond-shaped"
  },
  "build": {
    "height": "petite",
    "bodyType": "slender",
    "skinTone": "pale with freckles",
    "gender": "female",
    "species": "human"
  },
  "signatureOutfit": "canvas work apron over sleeveless dress",
  "distinguishingFeatures": ["clay under fingernails", "pink-tipped ears"],
  "colorPalette": ["#5a6b5c", "#8b5a2b", "#d8cbb5"]
}
\`\`\``;

    const parsed = parseCharacterDNALlmOutput(llmJson);
    expect(parsed).not.toBeNull();
    expect(parsed?.hair?.color).toBe('auburn');
    expect(parsed?.hair?.style).toBe('messy bun');
    expect(parsed?.eyes?.color).toBe('hazel');
    expect(parsed?.build?.height).toBe('petite');
    expect(parsed?.distinguishingFeatures).toContain('clay under fingernails');
    expect(parsed?.colorPalette).toHaveLength(3);
  });

  it('saves and reloads Character DNA library in storage', async () => {
    const storage = new Map<string, unknown>();
    const fakeSpindle: any = {
      userStorage: {
        getJson: async (path: string, opts: any) => storage.get(path) ?? opts?.fallback ?? null,
        setJson: async (path: string, value: any) => { storage.set(path, value); }
      }
    };

    const nadine = createEmptyCharacterDNA('Nadine Pruitt', 'nadine');
    nadine.hair.color = 'chestnut';
    nadine.locked = true;

    await saveCharacterDNA(fakeSpindle, 'test-chat', nadine);

    const loaded = await loadCharacterDNALibrary(fakeSpindle, 'test-chat');
    expect(loaded.characters['nadine']).toBeDefined();
    expect(loaded.characters['nadine']?.hair.color).toBe('chestnut');
    expect(loaded.characters['nadine']?.locked).toBe(true);

    const effective = await getEffectiveCharacterDNA(fakeSpindle, 'test-chat', 'Nadine Pruitt');
    expect(effective?.name).toBe('Nadine Pruitt');
  });
});
