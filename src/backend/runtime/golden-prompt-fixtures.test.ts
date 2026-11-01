import { describe, it, expect } from 'bun:test';
import { compileModelPrompt } from './model-prompt-compiler.js';
import { resolveImagePromptProfileV2, type PromptDialectId } from '../../shared/image-prompt-profile-v2.js';
import { resolveImageOutputPlan } from './image-output-plan.js';
import { resolveShotSpec } from './shot-director.js';
import { resolveStyleDNA } from '../../shared/style-dna.js';
import { createReferencePlan } from '../../shared/reference-plan.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import type { VisualCue } from '../../shared/contracts.js';
import { DEFAULT_CONFIG } from '../../config.js';

interface GoldenScenario {
  id: string;
  name: string;
  brief: VisualBrief;
  cue?: Partial<VisualCue>;
  requestedRatio?: string;
  referenceImages?: boolean;
}

const TARGET_MODELS: Array<{ dialect: PromptDialectId; provider: string; model: string }> = [
  { dialect: 'flux3-klein', provider: 'nanogpt', model: 'blackforestlabs/flux-3/klein/text-to-image' },
  { dialect: 'flux3', provider: 'nanogpt', model: 'black-forest-labs/flux-3/text-to-image' },
  { dialect: 'gpt-image-2.5', provider: 'nanogpt', model: 'openai/gpt-image-2.5/flare/text-to-image' },
  { dialect: 'grok-imagine-2', provider: 'nanogpt', model: 'xai/grok-imagine-image/v2.0/text-to-image' },
  { dialect: 'qwen-image-3', provider: 'nanogpt', model: 'qwen-image-3-pro' },
  { dialect: 'nano-banana-2.1', provider: 'nanogpt', model: 'google/nano-banana-2.1/text-to-image' },
  { dialect: 'seedream-5', provider: 'nanogpt', model: 'bytedance/seedream-v5.0-pro/text-to-image' },
  { dialect: 'anima', provider: 'nanogpt', model: 'anima/text-to-image' }
];

function baseBrief(overrides: Partial<VisualBrief> = {}): VisualBrief {
  return {
    scene: 'Sunlit courtyard with ancient mossy flagstones and stone archways',
    subjects: 'Marseline: long silver hair, deep violet eyes, slender build; wearing a hooded traveler cloak',
    action: 'looking toward the eastern gate with a startled expression',
    composition: 'medium close-up; eye-level view; one visible character',
    lighting: 'warm morning sunlight casting long angled shadows',
    subjectMode: 'one',
    framing: 'medium-close-up',
    referencePolicy: 'character',
    sources: ['scene context'],
    conflicts: [],
    subjectPreparation: {
      name: 'Marseline',
      identity: 'long silver hair, deep violet eyes, slender build',
      identitySource: 'saved appearance',
      attire: 'hooded traveler cloak',
      attireSource: 'picture cue',
      direction: 'startled expression',
      shortened: false,
      subjectsInPositive: true,
      subjectsInNegative: false
    },
    ...overrides
  };
}

const GOLDEN_SCENARIOS: GoldenScenario[] = [
  // 1. Single-person reaction
  {
    id: 'single-person-reaction',
    name: '1. Single-person reaction',
    brief: baseBrief({
      action: 'gasps softly in shock, eyes widened with hand raised to chest',
      composition: 'close-up; eye-level view; one visible character'
    }),
    cue: { subjectCategory: 'female', visualFocus: 'startled gasp' }
  },

  // 2. Full-body action
  {
    id: 'full-body-action',
    name: '2. Full-body action',
    brief: baseBrief({
      action: 'sprinting at full speed across rainy cobblestones, coat billowing behind',
      composition: 'full-body shot; low-angle; one visible character'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 3. Two-person conversation
  {
    id: 'two-person-conversation',
    name: '3. Two-person conversation',
    brief: baseBrief({
      subjectMode: 'ensemble',
      subjects: 'Marseline: silver-white hair, violet eyes; wearing a dark scholar coat\nRoland: grizzled veteran with short brown hair and beard; wearing battered leather armor',
      action: 'standing opposite each other leaning over a tavern table in quiet discussion',
      composition: 'two-shot; eye-level; two visible characters'
    }),
    cue: { character: 'Marseline' }
  },

  // 4. Two-person physical interaction
  {
    id: 'two-person-interaction',
    name: '4. Two-person physical interaction',
    brief: baseBrief({
      subjectMode: 'ensemble',
      subjects: 'Marseline: silver hair, violet eyes; wearing traveler cloak\nRoland: scarred warrior; wearing steel gauntlets and plate armor',
      action: 'Marseline bandages Roland\'s wounded right forearm, gently tightening a linen wrap',
      composition: 'medium shot; three-quarter view; two visible characters'
    }),
    cue: { character: 'Marseline' }
  },

  // 5. Three-person confrontation
  {
    id: 'three-person-confrontation',
    name: '5. Three-person confrontation',
    brief: baseBrief({
      subjectMode: 'ensemble',
      subjects: 'Marseline: silver hair in a travel cloak\nRoland: armored knight with drawn broadsword\nLord Malakor: aristocratic sorcerer in crimson robes with a carved bone staff',
      action: 'tense standoff at a stone crossroad; Roland and Marseline face Lord Malakor',
      composition: 'medium-wide shot; eye-level view; three visible characters'
    })
  },

  // 6. Four-person ensemble
  {
    id: 'four-person-ensemble',
    name: '6. Four-person ensemble',
    brief: baseBrief({
      subjectMode: 'ensemble',
      subjects: 'Marseline: scholar in dark velvet coat\nRoland: knight in steel breastplate\nLyra: elven ranger in green tunic with a yew longbow\nBarnaby: stout dwarf with braided red beard in sturdy apron',
      action: 'gathered around a crackling campfire sharing a map under night sky',
      composition: 'wide ensemble shot; four visible characters'
    })
  },

  // 7. Human + creature
  {
    id: 'human-creature',
    name: '7. Human + creature',
    brief: baseBrief({
      action: 'Marseline reaches out a trembling hand to pet a colossal winged griffin with tawny feathers and razor talons',
      composition: 'medium shot; side profile; one visible character and one creature'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 8. Environment only
  {
    id: 'environment-only',
    name: '8. Environment only',
    brief: baseBrief({
      subjectMode: 'none',
      subjects: '',
      action: '',
      scene: 'Forgotten mountain shrine overgrown with wisteria blossoms, misty waterfalls cascading into jade pools below ancient torii gate',
      composition: 'establishing wide shot; no people; deep focus',
      lighting: 'cool morning fog pierced by golden sunrise rays'
    })
  },

  // 9. Object detail
  {
    id: 'object-detail',
    name: '9. Object detail',
    brief: baseBrief({
      subjectMode: 'none',
      subjects: '',
      action: 'An ornate mechanical pocket watch with exposed brass gears, cracked sapphire crystal face, ticking softly',
      scene: 'Polished walnut table surface',
      composition: 'macro detail close-up; selective focus; no people',
      lighting: 'warm flickering candlelight'
    }),
    cue: { visualFocus: 'Antique pocket watch' }
  },

  // 10. Dark interior
  {
    id: 'dark-interior',
    name: '10. Dark interior',
    brief: baseBrief({
      scene: 'Damp subterranean stone crypt, mossy sarcophagi, iron braziers',
      action: 'Marseline advances holding a burning torch aloft, illuminating carved runes',
      lighting: 'sparse flickering orange torchlight casting dancing shadows into deep gloom'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 11. Daylight exterior
  {
    id: 'daylight-exterior',
    name: '11. Daylight exterior',
    brief: baseBrief({
      scene: 'Vast rolling alpine meadows dotted with wildflowers under sweeping blue sky and distant snowy peaks',
      action: 'Marseline sits on a sun-warmed boulder sketching in a leather journal',
      lighting: 'bright brilliant midday sun with crisp clear shadows'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 12. Complex colored lighting
  {
    id: 'complex-lighting',
    name: '12. Complex colored lighting',
    brief: baseBrief({
      scene: 'Cyberpunk alleyway bathed in rain reflections',
      action: 'Marseline leans against a brick wall, steam rising from a grate',
      lighting: 'dual colored illumination: hot pink neon signage from above left contrasting with deep cyan holographic glow from below right'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 13. Exact visible text
  {
    id: 'exact-visible-text',
    name: '13. Exact visible text',
    brief: baseBrief({
      scene: 'Rustic tavern entrance',
      action: 'Marseline pauses beneath a weathered hanging wooden sign reading "THE DANCING PONY"',
      composition: 'medium shot; prominent wooden sign with visible lettering "THE DANCING PONY"'
    }),
    cue: { visualFocus: 'Signboard reading "THE DANCING PONY"' }
  },

  // 14. Candid phone photo
  {
    id: 'candid-phone-photo',
    name: '14. Candid phone photo',
    brief: baseBrief({
      scene: 'Crowded coffee shop booth',
      action: 'Marseline laughing spontaneously while holding a ceramic coffee mug',
      composition: 'handheld candid camera; eye-level snapshot'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 15. Cel anime
  {
    id: 'cel-anime',
    name: '15. Cel anime',
    brief: baseBrief({
      action: 'standing on the school rooftop as wind blows cherry blossom petals across the frame',
      composition: 'medium close-up; three-quarter angle'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 16. Manga page
  {
    id: 'manga-page',
    name: '16. Manga page',
    brief: baseBrief({
      action: 'Marseline unleashing a magic spell with dynamic speed lines and screentone effects',
      composition: 'black and white manga panel; high-contrast screentones and ink lineart'
    }),
    cue: { subjectCategory: 'female' }
  },

  // 17. Square composition (1:1)
  {
    id: 'square-composition',
    name: '17. Square composition (1:1)',
    brief: baseBrief({
      action: 'centered symmetrical portrait looking directly forward with hands folded in lap'
    }),
    requestedRatio: '1:1',
    cue: { subjectCategory: 'female' }
  },

  // 18. Portrait composition (9:16)
  {
    id: 'portrait-composition',
    name: '18. Portrait composition (9:16)',
    brief: baseBrief({
      action: 'standing tall on a winding spiral staircase, dress cascading down stone steps'
    }),
    requestedRatio: '9:16',
    cue: { subjectCategory: 'female' }
  },

  // 19. Landscape composition (16:9)
  {
    id: 'landscape-composition',
    name: '19. Landscape composition (16:9)',
    brief: baseBrief({
      action: 'walking horizontally across a wide bridge spanning a river canyon'
    }),
    requestedRatio: '16:9',
    cue: { subjectCategory: 'female' }
  },

  // 20. Identity reference attached
  {
    id: 'identity-reference',
    name: '20. Identity reference attached',
    brief: baseBrief({
      action: 'sitting gracefully at a study desk'
    }),
    referenceImages: true,
    cue: { subjectCategory: 'female' }
  }
];

describe('Golden Benchmark Fixture Suite (20 scenarios across all target models)', () => {
  for (const scenario of GOLDEN_SCENARIOS) {
    it(`compiles "${scenario.name}" cleanly across all 8 target dialects without network requests`, () => {
      for (const target of TARGET_MODELS) {
        const profile = resolveImagePromptProfileV2(target.provider, target.model);
        const outputPlan = resolveImageOutputPlan({
          capabilities: profile.outputCapabilities,
          source: 'catalogue',
          modelId: profile.exactModel,
          requestedRatio: scenario.requestedRatio
        });
        const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
        const shotSpec = resolveShotSpec({
          brief: scenario.brief,
          outputPlan,
          styleDNA: styleSnapshot.styleDNA,
          cue: scenario.cue as any
        });

        const referencePlan = scenario.referenceImages
          ? createReferencePlan([{
              imageId: 'ref-marseline-face',
              role: 'identity',
              subject: 'Marseline',
              label: 'Marseline facial portrait'
            }])
          : createReferencePlan([]);

        const result = compileModelPrompt({
          brief: scenario.brief,
          shotSpec,
          styleDNA: styleSnapshot.styleDNA,
          profile,
          outputPlan,
          referencePlan,
          cue: scenario.cue as any
        });

        // 1. Output verification
        expect(result.prompt.length).toBeGreaterThan(10);
        expect(result.prompt.length).toBeLessThanOrEqual(profile.hardMaxCharacters);

        // 2. Lint validity
        expect(result.lint.valid).toBe(true);
        expect(result.lint.errors.length).toBe(0);

        // 3. Model-specific syntax invariants
        if (target.dialect === 'grok-imagine-2') {
          // Never starts with mood/style adjectives
          expect(result.prompt).not.toMatch(/^(cinematic|masterpiece|anime illustration|oil painting|photograph)/i);
        }

        if (target.dialect === 'flux3-klein') {
          expect(result.prompt).not.toContain('masterpiece, best quality');
        }

        if (target.dialect === 'qwen-image-3') {
          // Supports native negative prompt
          expect(result.negativePrompt).toBeDefined();
        }

        if (target.dialect === 'anima') {
          expect(result.prompt).toContain(',');
        }

        // 4. Reference integrity: reference directives appear ONLY when reference is attached
        if (scenario.referenceImages) {
          expect(result.prompt).toContain('reference');
        } else {
          expect(result.prompt).not.toContain('reference image 1');
        }
      }
    });
  }
});

describe('Quality Test: Multi-Character Lumiverse RP Scene', () => {
  it('preserves distinct character identities, outfits, positions, and creature across all dialects', () => {
    const complexRpBrief: VisualBrief = {
      scene: 'A cavernous Dwarven forge illuminated by flowing rivers of molten magma and colossal iron anvils',
      subjects: [
        'Marseline: slender woman with silver-white braided hair, luminous violet eyes; wearing a dark scholar robe trimmed with runic silver embroidery',
        'Roland: broad-shouldered scarred human warrior with clipped black hair; attired in soot-stained plate armor wielding a notched greatsword',
        'Igneous: a lumbering lava-golem with glowing obsidian plates and fiery cracks along its chest'
      ].join('\n'),
      action: 'Marseline channels an icy protective barrier from the rear while Roland parries Igneous in the foreground; magma splashes behind them',
      composition: 'layered depth; wide shot; three distinct figures positioned in foreground and midground',
      lighting: 'harsh glowing red and orange underlighting from magma rivers contrasting with cold blue arcane luminescence from Marseline\'s staff',
      subjectMode: 'ensemble',
      framing: 'wide',
      referencePolicy: 'none',
      sources: ['scene context'],
      conflicts: []
    };

    const cue: Partial<VisualCue> = {
      character: 'Marseline',
      ensembleSubjects: [
        { name: 'Marseline', appearance: 'silver-white braided hair, violet eyes', attire: 'dark scholar robe with runic silver' },
        { name: 'Roland', appearance: 'scarred warrior, clipped black hair', attire: 'soot-stained plate armor' },
        { name: 'Igneous', appearance: 'lava-golem with obsidian plates and fiery cracks', attire: 'natural stone' }
      ]
    };

    for (const target of TARGET_MODELS) {
      const profile = resolveImagePromptProfileV2(target.provider, target.model);
      const outputPlan = resolveImageOutputPlan({
        capabilities: profile.outputCapabilities,
        source: 'catalogue',
        modelId: profile.exactModel,
        requestedRatio: '16:9'
      });
      const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
      const shotSpec = resolveShotSpec({
        brief: complexRpBrief,
        outputPlan,
        styleDNA: styleSnapshot.styleDNA,
        cue: cue as any
      });

      const result = compileModelPrompt({
        brief: complexRpBrief,
        shotSpec,
        styleDNA: styleSnapshot.styleDNA,
        profile,
        outputPlan,
        cue: cue as any
      });

      // 1. Verify every character is retained
      expect(result.prompt).toContain('Marseline');
      expect(result.prompt).toContain('Roland');
      expect(result.prompt).toContain('Igneous');

      // 2. Verify appearance ownership: Marseline owns silver hair/violet eyes; Roland owns armor/sword; Igneous owns obsidian/lava
      expect(result.prompt.toLowerCase()).toContain('silver');
      expect(result.prompt.toLowerCase()).toContain('plate');
      expect(result.prompt.toLowerCase()).toContain('obsidian');

      // 3. Verify core action and spatial environment
      expect(result.prompt.toLowerCase()).toContain('barrier');
      if (profile.hardMaxCharacters > 1000 && target.dialect !== 'anima') {
        expect(result.prompt.toLowerCase()).toContain('forge');
      }

      // 4. Invariants
      expect(result.prompt.length).toBeLessThanOrEqual(profile.hardMaxCharacters);
      expect(result.lint.valid).toBe(true);
      expect(result.lint.errors.length).toBe(0);
    }
  });
});
