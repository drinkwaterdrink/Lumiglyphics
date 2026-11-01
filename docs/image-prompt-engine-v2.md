# Lumiglyphics Image Prompt Engine V2

## 1. Overview & Architecture

The **Lumiglyphics Image Prompt Engine V2** is a modular, model-aware prompt compiler and visual directing pipeline. It solves the historical visual novel image-generation dilemma: previously, prompts were compiled into generic comma-separated boilerplate (or uniform prose) without regard for the exact selected model's strengths, syntax biases, token limits, negative prompt support, or aspect ratio.

### The Golden Rule
> **Understand the scene once, choose the shot once, preserve identity once, and translate that visual plan into the wording best suited for the exact selected image model.**

```
+-------------------------------------------------------------------------+
|                              STORY SCENE                                |
|  - Story dialogue & prose     - Active characters & wardrobe overrides  |
|  - Persistent environment     - Character reference portrait anchoring  |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                   CANONICAL VISUAL REPRESENTATION                       |
|  - VisualBrief: scene facts, identities, wardrobe, action, setting      |
|  - ImageOutputPlan: requested vs actual ratio, geometry, dimensions     |
|  - ImageShotSpec: deterministic shot size, angle, lens, composition, DoF|
|  - StyleDNA: structured semantic medium, shading, palette, linework     |
|  - ReferencePlan: identity anchors, character roles, reference images   |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  SEMANTIC PROMPT COMPILER (PromptDocument)              |
|  - P0 (Essential): Identity, cast count, attire, core action, text      |
|  - P1 (Framing & Scene): Camera, composition, setting, lighting         |
|  - P2 (Style & Ambiance): StyleDNA medium, materials, atmosphere        |
|  - P3 (Decorative): Adjectives, subtle texture, secondary flourishes    |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                   MODEL-SPECIFIC SERIALIZER & BUDGET FITTER             |
|  - FLUX.3 Klein: Dense natural prose captions, positive-only            |
|  - GPT Image 2.5: Structured natural-language scene direction           |
|  - Grok Imagine 2.0: Subject/action-first ordered visual prose          |
|  - Qwen Image 3 Pro: High-density compact prose, prompt-expansion aware |
|  - Nano Banana 2.1: Rich semantic spatial blocking, 2.5D layouts        |
|  - Seedream 5.0 Pro: Concise direct scene prose                         |
|  - Anima: Tag-first hybrid with character tag brackets                  |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                 ADAPTIVE PROMPT BUDGET & LINTER                         |
|  - Soft budget range per model complexity                               |
|  - Provider hard ceiling enforcement                                    |
|  - Dynamic linter (detects comma-bloat, contradictory lighting, tags)   |
+-------------------------------------------------------------------------+
```

---

## 2. Core Contracts & Data Structures

### VisualBrief vs ImageShotSpec
- **`VisualBrief` (`src/shared/image-templates.ts`)**: Represents **what** is happening in the narrative beat:
  - `scene`: The location and physical setting.
  - `subjects`: Visible characters, appearance, and attire.
  - `action`: Character movement, physical contact, gestures.
  - `lighting`: Planned ambient lighting from the story.
- **`ImageShotSpec` (`src/shared/image-shot-spec.ts`)**: Represents **how** the camera captures that moment:
  - `intent`: Dramatic purpose (`portrait`, `reaction`, `dialogue`, `action`, `two-shot`, `ensemble`, `environment`).
  - `camera`:
    - `shotSize`: `extreme-close-up` | `close-up` | `medium-close-up` | `medium` | `medium-wide` | `full-body` | `wide` | `establishing` | `macro`.
    - `angle`: `eye-level` | `low-angle` | `high-angle` | `overhead` | `ground-level` | `three-quarter` | `profile` | `over-the-shoulder`.
    - `lens`: `ultrawide` | `wide` | `normal` (50mm) | `portrait` (85mm) | `telephoto` | `macro`.
    - `depthOfField`: `deep` | `moderate` | `shallow` | `selective`.
  - `composition`:
    - `mode`: `centered` | `rule-of-thirds` | `symmetrical` | `layered-depth` | `leading-lines` | `negative-space` | `lateral-ensemble` | `frame-within-frame` | `foreground-obstruction`.
    - `subjectPlacements`: Explicit bounding coordinates/placement hints for multi-subject scenes.
  - `safeArea`: Dialogue overlay reservation (bottom 25% quiet zone).
  - `source`: `'deterministic-fallback'` | `'planner'` | `'manual'`.
  - `revision`: Deterministic variation counter for the **Reframe** action.

### StyleDNA (`src/shared/style-dna.ts`)
Replaces diffusion quality buzzwords (`"masterpiece, best quality"`) with structured visual properties:
- `medium`: e.g. `'2D anime illustration'`, `'lifelike natural photograph'`, `'hand-painted watercolor on textured paper'`.
- `rendering`, `linework`, `shading`, `texture`, `palette`, `realism`, `surface`, `atmosphere`.
- `lightingOverlay`: Flags intentional lighting changes (e.g. on-camera direct flash).
- `preserve`: Elements that must not be overridden (e.g. `'scene-defined lighting'`, `'subject identity'`).
- `avoidIntent`: Undesirable medium attributes mapped into model-appropriate negative prompts or positive constraints.

### PromptDocument (`src/shared/prompt-document.ts`)
Semantic representation of prompt chunks prioritized into 4 tiers:
- **P0 (Must Not Silently Lose)**: Character identity, cast count, attire ownership, core physical actions, subject-object contact, required exact text.
- **P1 (Framing & Scene)**: Camera angle, shot size, lens feel, setting, environmental state, lighting.
- **P2 (Style & Ambiance)**: Medium, linework, shading, materials, atmosphere.
- **P3 (Decorative)**: Optional adjectives, subtle textures, secondary quality phrasing.

---

## 3. Supported Model Dialects & Behavioral Policies

| Model | Dialect ID | Positive Style | Negative Support | Typical Range | Hard Ceiling | Key Behavioral Signature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FLUX.3 Klein** | `flux3-klein` | Full scene caption | Positive-only | 1,200–2,200 chars | 3,000 chars | High-density narrative prose; no dangling tags or quality buzzwords. |
| **GPT Image 2.5** | `gpt-image-2.5` | Structured prose | Positive-only | 1,000–1,900 chars | 32,000 chars | Natural prose for simple shots; structured photographic sections for complex group scenes. |
| **Grok Imagine 2.0** | `grok-imagine-2` | Ordered visual prose | Positive-only | 700–1,300 chars | 8,000 chars | Subject and action placed strictly first; atmosphere and camera follow. |
| **Qwen Image 3 Pro** | `qwen-image-3` | High-density prose | Native negative | 400–750 chars | 800 chars | Tight adaptive budget; expands instructions only when server prompt-expansion is disabled. |
| **Nano Banana 2.1** | `nano-banana-2.1` | Rich semantic prose | Positive-only | 1,200–2,200 chars | 50,000 chars | Spatial blocking with 2.5D layer instructions (foreground/midground/background). |
| **Seedream 5.0 Pro** | `seedream-5` | Concise direct prose | Positive-only | 800–1,500 chars | 3,000 chars | Economical direct visual phrasing; avoids verbose photographic lectures. |
| **Anima** | `anima` | Tag-first hybrid | Native negative | 400–800 chars | 3,000 chars | Character count tags (`2characters, multiple people`), character tags in brackets, followed by action prose. |

---

## 4. Shot Director & Framing

The **Shot Director** (`src/backend/runtime/shot-director.ts`) chooses camera properties deterministically:
1. **Scene-Aware Intent**: Infers the dramatic beat from the visual brief (single reaction, intimate two-person dialogue, multi-character combat, environment establishing shot).
2. **Aspect-Ratio Blocking**: Adapts composition to the requested geometry:
   - `portrait` (9:16): Prioritizes vertical depth, stacked character blocking, overhead or low angles.
   - `landscape` (16:9): Prioritizes horizontal rule-of-thirds, lateral ensemble staging, leading lines.
   - `square` (1:1): Prioritizes centered framing, circular balance, symmetrical setups.
3. **Dialogue Safe Area**:
   - `auto`: Automatically reserves the lower 25% of the frame as clean, quiet visual space when a dialogue overlay is present.
   - `always`: Enforces dialogue safe area on all narrative shots.
   - `off`: Allows full-bleed subject placement down to the bottom edge.

---

## 5. Review UX & Explicit Iteration Actions

The Review Studio (`src/frontend/image-review/studio.ts`) includes a compact **Prompt Engine** summary and 5 distinct iteration actions:

1. **RETRY IMAGE**: Generates immediately using the exact approved prompt, parameters, and model without altering wording or framing.
2. **REWRITE PROMPT**: Invokes the story-reader model with text tokens to generate fresh descriptive wording while preserving the exact same scene facts, ShotSpec, style, model, and output geometry.
3. **REFRAME**: Increments `shotSpec.revision`, re-evaluates the Shot Director to select an alternative valid camera angle and composition, and recompiles the prompt while keeping scene facts and identities identical.
4. **CHANGE STYLE**: Preserves scene facts and ShotSpec, selects a new `StyleDNA` (e.g. from Anime to Photoreal or Watercolor), and recompiles the model prompt.
5. **FIT TO MODEL**: Compresses the PromptDocument down to fit the model's soft budget range, preserving all P0 identity and action facts while trimming lower-priority decorative adjectives.
6. **MANUAL CAMERA OVERRIDES**: Advanced collapsible panel allowing manual override of Shot Size, Angle, Lens Feel, Composition Mode, Depth of Field, and Safe Area. Setting manual values tags `shotSpec.source = 'manual'`.
7. **SHADOW / COMPARISON MODE**: Displays a side-by-side comparison of the legacy V1 template prompt against the new V2 model-aware prompt with one-click copy buttons, without triggering duplicate paid image generations.

---

## 6. Cache Identity Migration & Reproducibility

The scene cache key (`src/backend/core/scene-image-cache.ts`) uses deterministic canonical JSON hashing.

V2 entries include:
- `promptEngineVersion: 2`
- `serializerRevision`: Current serializer revision string.
- `shotSpecDigest`: 53-bit cyrb53 hash of the canonical `ImageShotSpec`.
- `styleDnaDigest`: 53-bit cyrb53 hash of the canonical `StyleDNA`.
- `outputPlanDigest`: 53-bit cyrb53 hash of the canonical `ImageOutputPlan`.

**Backward Compatibility Guarantee**:
Old V1 generated assets remain valid historical records. Because V1 identities lack the V2 fields, their cache keys remain byte-for-byte identical to their historical values and are never poisoned or collided with V2 generations.

---

## 7. Configuration Settings

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `imagePromptEngineVersion` | `1 \| 2` | `1` (or `2` when upgraded) | Switches between legacy V1 template compiler and model-aware V2 compiler. |
| `imageFramingDirector` | `boolean` | `true` | Enables deterministic shot directing and dynamic framing. |
| `dialogueSafeArea` | `'auto' \| 'always' \| 'off'` | `'auto'` | Controls dialogue overlay safe area protection. |
| `imagePromptDetail` | `'auto' \| 'compact' \| 'standard' \| 'detailed'` | `'auto'` | Controls adaptive prompt verbosity and budget expansion. |

---

## 8. Real Image Benchmark Harness

Developer-only evaluation script: `scripts/benchmark-real-images.ts`.
- **Safety**: Guarded by `RUN_PAID_IMAGE_BENCHMARK=true`. Will never execute paid network requests in automated tests or CI.
- **Dry-run mode**: `bun run scripts/benchmark-real-images.ts` verifies compilation across all 7 model families and saves benchmark output to `.benchmark/`.
- **Rubric**: Scores on identity, wardrobe, cast count, action correctness, spatial correctness, framing, environment, style adherence, text fidelity, and overall aesthetic quality.
