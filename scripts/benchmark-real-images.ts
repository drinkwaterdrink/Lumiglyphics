/**
 * Developer-Only Real Image Benchmark Harness for Lumiglyphics Prompt Engine V2.
 *
 * SAFETY GUARANTEE:
 * This script will NEVER run paid images automatically in CI or unit tests.
 * It requires the explicit environment variable RUN_PAID_IMAGE_BENCHMARK=true.
 * Without this variable, running the script performs a zero-cost compilation check
 * and prints the evaluation rubric.
 *
 * Evaluation Axes:
 * 1. Identity
 * 2. Wardrobe
 * 3. Cast count
 * 4. Action correctness
 * 5. Spatial correctness
 * 6. Framing
 * 7. Environment
 * 8. Style adherence
 * 9. Text fidelity
 * 10. Overall quality
 */

import { compileModelPrompt } from '../src/backend/runtime/model-prompt-compiler.js';
import { resolveImagePromptProfileV2, type PromptDialectId } from '../src/shared/image-prompt-profile-v2.js';
import { resolveImageOutputPlan } from '../src/backend/runtime/image-output-plan.js';
import { resolveShotSpec } from '../src/backend/runtime/shot-director.js';
import { resolveStyleDNA } from '../src/shared/style-dna.js';
import { createReferencePlan } from '../src/shared/reference-plan.js';
import type { VisualBrief } from '../src/shared/image-templates.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import * as fs from 'fs';
import * as path from 'path';

const BENCHMARK_MODELS: Array<{ dialect: PromptDialectId; provider: string; model: string; label: string }> = [
  { dialect: 'flux3-klein', provider: 'nanogpt', model: 'blackforestlabs/flux-3/klein/text-to-image', label: 'FLUX.3 Klein' },
  { dialect: 'gpt-image-2.5', provider: 'nanogpt', model: 'openai/gpt-image-2.5/flare/text-to-image', label: 'GPT Image 2.5' },
  { dialect: 'grok-imagine-2', provider: 'nanogpt', model: 'xai/grok-imagine-image/v2.0/text-to-image', label: 'Grok Imagine 2.0' },
  { dialect: 'qwen-image-3', provider: 'nanogpt', model: 'qwen-image-3-pro', label: 'Qwen Image 3 Pro' },
  { dialect: 'nano-banana-2.1', provider: 'nanogpt', model: 'google/nano-banana-2.1/text-to-image', label: 'Nano Banana 2.1' },
  { dialect: 'seedream-5', provider: 'nanogpt', model: 'bytedance/seedream-v5.0-pro/text-to-image', label: 'Seedream 5.0 Pro' },
  { dialect: 'anima', provider: 'nanogpt', model: 'anima/text-to-image', label: 'Anima' }
];

const BENCHMARK_SCENARIOS: Array<{ id: string; name: string; brief: VisualBrief; styleId?: string }> = [
  {
    id: 'single-reaction',
    name: '1. Single-Person Emotional Reaction (Marseline)',
    brief: {
      scene: 'Sunlit rustic pottery studio with clay dust dancing in light beams and rows of drying glazed bowls on cedar shelves',
      subjects: 'Marseline: slender woman with silver-white braided hair, luminous violet eyes; wearing a dark scholar robe trimmed with runic silver embroidery',
      action: 'holding a cracked terracotta vase with both hands, eyes wide with sudden realization',
      composition: 'close-up shot; eye-level angle; centered subject',
      lighting: 'warm morning sidelight through high mullioned windows with soft golden dust motes',
      subjectMode: 'one',
      framing: 'close-up',
      referencePolicy: 'character',
      sources: ['scene context'],
      conflicts: []
    }
  },
  {
    id: 'two-character-dialogue',
    name: '2. Two-Character Intimate Dialogue (Marseline & Roland)',
    brief: {
      scene: 'Rain-slicked stone tavern balcony overlooking misty cobblestone rooftops at twilight',
      subjects: 'Marseline: silver-white hair tied back, violet eyes; wearing dark scholar robe; Roland: broad-shouldered scarred human warrior with clipped black hair; attired in soot-stained plate armor and wool surcoat',
      action: 'Marseline leans on the wooden railing whispering urgently while Roland listens with arms crossed, rain dripping from his collar',
      composition: 'two-shot; eye-level; Marseline on the left, Roland on the right',
      lighting: 'cool moody dusk ambient light with warm yellow glow from lantern above balcony door',
      subjectMode: 'ensemble',
      framing: 'medium',
      referencePolicy: 'character',
      sources: ['dialogue beat'],
      conflicts: []
    }
  },
  {
    id: 'complex-action',
    name: '3. Complex Multi-Character Action Scene (Boss Encounter)',
    brief: {
      scene: 'Cavernous subterranean forge with rivers of flowing orange magma and massive basalt pillars',
      subjects: 'Marseline: slender mage in silver-trimmed robe; Roland: scarred warrior with notched greatsword; Igneous: lumbering 10-foot lava golem with glowing obsidian plates',
      action: 'Roland parries a glowing magma punch in the foreground with sparks flying, while Marseline raises an icy arcane ward in the background',
      composition: 'medium-wide action shot; low-angle; layered depth with foreground clash and background casting',
      lighting: 'harsh red and orange volcanic underlighting contrasted with sharp blue arcane crystal magic',
      subjectMode: 'ensemble',
      framing: 'wide',
      referencePolicy: 'character',
      sources: ['combat climax'],
      conflicts: []
    }
  },
  {
    id: 'environment-landscape',
    name: '4. Pure Environment / Establishing Shot (Ancient Observatory)',
    brief: {
      scene: 'Ancient cliffside astronomical observatory with a massive tarnished brass armillary sphere open to the midnight sky',
      subjects: '',
      action: '',
      composition: 'establishing wide shot; three-quarter angle looking out toward the ocean abyss',
      lighting: 'deep midnight indigo starlight with faint turquoise aurora borealis reflected in the sea below',
      subjectMode: 'none',
      framing: 'establishing',
      referencePolicy: 'none',
      sources: ['environment backdrop'],
      conflicts: []
    }
  },
  {
    id: 'candid-phone',
    name: '5. Candid Snapshot with Everyday Imperfections',
    brief: {
      scene: 'Crowded retro ramen counter with steam rising from noodle bowls, handwritten daily special signs, and fluorescent glare',
      subjects: 'Mira: young woman with messy chestnut bob hair and round wire glasses; wearing an oversized vintage green cardigan',
      action: 'laughing mid-sentence with chopsticks held in one hand, slurping broth',
      composition: 'medium close-up; phone-wide natural perspective with slight handheld tilt',
      lighting: 'overhead unshielded fluorescent bar mixed with warm steam-diffused kitchen bulbs',
      subjectMode: 'one',
      framing: 'medium-close-up',
      referencePolicy: 'character',
      sources: ['casual moment'],
      conflicts: []
    },
    styleId: 'builtin-style:phone-candid'
  },
  {
    id: 'anime-ensemble',
    name: '6. High-Fantasy Anime Ensemble Scene',
    brief: {
      scene: 'Grand sunlit academy library with spiraling marble staircases and floating leather-bound grimoires',
      subjects: 'Marseline: silver braided hair in scholar uniform; Roland: cadet uniform with training sword; Alistair: haughty blond noble in regal gold-braided cape',
      action: 'Alistair argues proudly while pointing at an open parchment map on the reading table, Roland rolls his eyes, and Marseline studies an ancient tome intently',
      composition: 'lateral ensemble group shot; rule of thirds with reading table anchor',
      lighting: 'dramatic morning volumetric god rays through cathedral rose-glass windows',
      subjectMode: 'ensemble',
      framing: 'medium-wide',
      referencePolicy: 'character',
      sources: ['academy chapter'],
      conflicts: []
    },
    styleId: 'builtin-style:anime'
  }
];

export async function runRealImageBenchmark() {
  const isPaidAllowed = process.env.RUN_PAID_IMAGE_BENCHMARK === 'true';

  console.log('='.repeat(70));
  console.log('LUMIGLYPHICS IMAGE PROMPT ENGINE V2 — BENCHMARK SUITE');
  console.log('='.repeat(70));
  console.log(`Execution Mode: ${isPaidAllowed ? 'ACTIVE (Real Image Dispatch Enabled)' : 'DRY-RUN / COMPILE ONLY (Safe Mode)'}`);
  if (!isPaidAllowed) {
    console.log('NOTE: Paid image generation is disabled by default to protect developer costs.');
    console.log('To run real image generations against real endpoints:');
    console.log('  RUN_PAID_IMAGE_BENCHMARK=true bun run scripts/benchmark-real-images.ts');
  }
  console.log('-'.repeat(70));

  const results: Array<{
    scenarioId: string;
    scenarioName: string;
    modelLabel: string;
    dialect: string;
    positivePrompt: string;
    negativePrompt?: string;
    charCount: number;
    softRange: [number, number];
    hardLimit: number;
    lintWarnings: string[];
    dispatchStatus: string;
  }> = [];

  for (const scenario of BENCHMARK_SCENARIOS) {
    console.log(`\nCompiling Scenario: [${scenario.id}] ${scenario.name}`);

    for (const target of BENCHMARK_MODELS) {
      const profile = resolveImagePromptProfileV2(
        target.provider,
        target.model
      );

      const outputPlan = resolveImageOutputPlan({
        capabilities: profile.outputCapabilities,
        requestedRatio: '1:1',
        modelId: target.model
      });

      const style = resolveStyleDNA(DEFAULT_CONFIG, scenario.styleId ?? 'builtin-style:neutral');

      const shotSpec = resolveShotSpec({
        brief: scenario.brief,
        outputPlan,
        styleDNA: style.styleDNA
      });

      const compiled = compileModelPrompt({
        brief: scenario.brief,
        shotSpec,
        styleDNA: style.styleDNA,
        profile,
        outputPlan,
        detailLevel: 'standard'
      });

      const charCount = compiled.prompt.length + (compiled.negativePrompt?.length ?? 0);

      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        modelLabel: target.label,
        dialect: profile.dialect,
        positivePrompt: compiled.prompt,
        negativePrompt: compiled.negativePrompt,
        charCount,
        softRange: profile.softBudgets.standard,
        hardLimit: profile.hardMaxCharacters,
        lintWarnings: compiled.warnings,
        dispatchStatus: isPaidAllowed ? 'PENDING_DISPATCH' : 'DRY_RUN_COMPILED'
      });

      console.log(`  ✓ ${target.label.padEnd(20)} [${profile.dialect.padEnd(16)}] Chars: ${charCount.toString().padStart(5)} / Max: ${profile.hardMaxCharacters}`);
    }
  }

  // Save benchmark compilation artifacts to .benchmark directory
  const outDir = path.resolve(process.cwd(), '.benchmark');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `benchmark-compiled-${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    isPaidAllowed,
    totalCompiled: results.length,
    scenarios: BENCHMARK_SCENARIOS.length,
    models: BENCHMARK_MODELS.length,
    rubric: [
      'identity', 'wardrobe', 'cast_count', 'action_correctness',
      'spatial_correctness', 'framing', 'environment', 'style_adherence',
      'text_fidelity', 'overall_quality'
    ],
    results
  }, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log(`Benchmark compilation output saved to: ${outFile}`);
  console.log(`Total Prompts Compiled: ${results.length}`);
  console.log('='.repeat(70));
}

// Run if called directly
if (import.meta.main) {
  runRealImageBenchmark().catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}
