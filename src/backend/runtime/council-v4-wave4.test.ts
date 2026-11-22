import { expect, test } from 'bun:test';
import { loadPresentationRuleDocument, updatePresentationRuleDocument } from './storage.js';
import { managePresentationRules } from './presentation-rules.js';
import { compileModelPrompt } from './model-prompt-compiler.js';
import { BUILTIN_IMAGE_TEMPLATES, templateSnapshot } from '../../shared/image-templates.js';
import { resolveImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import { resolveImageOutputPlan } from '../../shared/image-output-plan.js';
import { resolveShotSpec } from './shot-director.js';
import { DEFAULT_CONFIG } from '../../config.js';
import { DisplayRuleExecutor, type DisplayWorker } from '../../frontend/stage/display-rule-executor.js';
import { renderPanelRule } from '../../frontend/stage/panel-rules.js';

function createMockSpindle(initialStore: Record<string, unknown> = {}) {
  const store = { ...initialStore };
  return {
    store,
    api: {
      chats: {
        get: async (chatId: string) => ({ id: chatId }),
      },
      userStorage: {
        getJson: async (path: string, opts?: { fallback?: unknown }) => {
          return path in store ? structuredClone(store[path]) : (opts?.fallback ?? null);
        },
        setJson: async (path: string, value: unknown) => {
          store[path] = structuredClone(value);
        },
      },
    } as any,
  };
}

test('Wave 4: storage reads legacy presentation-entities.json fallback and writes to presentation-rules.json', async () => {
  const legacyRule = {
    id: 'r1',
    name: 'Legacy Rule',
    scope: 'chat',
    enabled: true,
    priority: 50,
    savedOrder: 1,
    when: { kind: 'dialogue' },
    then: { kind: 'prefer_template', templateId: 'portrait' },
  };
  const { api, store } = createMockSpindle({
    'chats/chat-1/presentation-entities.json': { version: 1, revision: 2, rules: [legacyRule] },
  });

  const loaded = await loadPresentationRuleDocument(api, 'chat', 'chat-1', 'user-1');
  expect(loaded.revision).toBe(2);
  expect(loaded.rules).toHaveLength(1);
  expect(loaded.rules[0]!.id).toBe('r1');

  const saved = await updatePresentationRuleDocument(api, 'chat', 'chat-1', 'user-1', 2, (cur) => ({
    ...cur,
    revision: cur.revision + 1,
  }));
  expect(saved.revision).toBe(3);
  expect(store['chats/chat-1/presentation-rules.json']).toBeDefined();
});

test('Wave 4: managePresentationRules preserves savedOrder when editing an existing rule in-place', async () => {
  const r1 = {
    id: 'rule-a',
    name: 'First',
    scope: 'chat',
    enabled: true,
    priority: 50,
    savedOrder: 3,
    when: { kind: 'dialogue' },
    then: { kind: 'prefer_template', templateId: 'portrait' },
  };
  const r2 = {
    id: 'rule-b',
    name: 'Second',
    scope: 'chat',
    enabled: true,
    priority: 50,
    savedOrder: 7,
    when: { kind: 'location_changed' },
    then: { kind: 'prefer_template', templateId: 'environment' },
  };
  const { api } = createMockSpindle({
    'chats/chat-2/presentation-rules.json': { version: 1, revision: 1, rules: [r1, r2] },
    'config.json': DEFAULT_CONFIG,
  });

  const updated = await managePresentationRules(api, {
    type: 'vn_presentation_rules',
    version: 1,
    requestId: 'req-1',
    chatId: 'chat-2',
    action: 'save',
    scope: 'chat',
    expectedRevision: 1,
    rule: {
      id: 'rule-a',
      name: 'First Edited',
      enabled: true,
      priority: 50,
      when: { kind: 'dialogue' },
      then: { kind: 'prefer_template', templateId: 'portrait' },
    },
  }, 'user-1');

  const edited = updated.chat?.rules.find((r) => r.id === 'rule-a');
  expect(edited?.name).toBe('First Edited');
  expect(edited?.savedOrder).toBe(3);
});

test('Wave 4: compileModelPrompt injects template-directive and custom negative when template differs from builtin', () => {
  const baseTemplate = BUILTIN_IMAGE_TEMPLATES.find((t) => t.id === 'portrait')!;
  const customized = templateSnapshot({
    ...baseTemplate,
    positive: '{{style}}\nCustom sepia film grain with dramatic chiaroscuro rim light.\n{{subjects}}\n{{scene}}\n{{action}}',
    negative: '{{negative}}, neon glow, plastic sheen',
  });
  const profile = resolveImagePromptProfileV2('openai', 'flux3-klein', DEFAULT_CONFIG);
  const outputPlan = resolveImageOutputPlan({ modelId: 'flux3-klein' });
  const brief = {
    scene: 'A rain-swept cobblestone alley at midnight.',
    subjects: 'Mira Vance, silver hair, dark trenchcoat.',
    action: 'Holding an old brass lantern.',
    composition: 'portrait, one visible character',
    lighting: 'Cool moonlight.',
    subjectMode: 'one' as const,
    framing: 'portrait' as const,
    referencePolicy: 'character' as const,
    sources: ['test'],
    conflicts: [],
  };
  const shotSpec = resolveShotSpec({ brief, outputPlan, template: customized });
  const result = compileModelPrompt({
    brief,
    shotSpec,
    styleDNA: {},
    profile: { ...profile, negativePolicy: 'native' },
    outputPlan,
    template: customized,
  });

  expect(result.document.sections.some((s) => s.id === 'template-directive')).toBe(true);
  expect(result.prompt).toContain('Custom sepia film grain');
  expect(result.negativePrompt).toContain('neon glow, plastic sheen');
});

test('Wave 4: DisplayRuleExecutor isolates failing rules without rolling back earlier rules and reports line number', async () => {
  // Build a fake worker that executes the real displayWorkerProgram logic in-process
  const mockWorkerFactory = (): DisplayWorker => {
    const worker: DisplayWorker = {
      onmessage: null,
      onerror: null,
      postMessage(data: any) {
        let text = data.text as string;
        const issues: Array<{ line: number; message: string }> = [];
        for (const rule of data.rules) {
          try {
            const pattern = new RegExp(rule.source, rule.flags);
            const nextText = text.replace(pattern, rule.replacement);
            if (nextText.length > 100000) throw new Error('output-limit');
            text = nextText;
          } catch (error) {
            issues.push({
              line: Number.isInteger(rule.line) ? rule.line : 0,
              message: error instanceof Error && error.message === 'output-limit'
                ? 'Display rule output exceeded the 100,000-character limit.'
                : 'A display rule could not run.',
            });
          }
        }
        queueMicrotask(() => worker.onmessage?.({ data: { text, issues, generation: data.generation } }));
      },
      terminate() {},
    };
    queueMicrotask(() => worker.onmessage?.({ data: { ready: true } }));
    return worker;
  };

  const executor = new DisplayRuleExecutor(mockWorkerFactory);
  // Line 1: valid replacement "hello" -> "hi"
  // Line 2: explodes output > 100,000 chars
  const rulesSource = `/hello/g => hi\n/a/g => bbb`;
  const res = await executor.evaluate({
    text: 'hello ' + 'a'.repeat(50000),
    rulesSource,
    generation: 'gen-1',
  });

  // Rule 1's transformation survived; Rule 2 failed cleanly and reported line 2
  expect(res.text.startsWith('hi ')).toBe(true);
  expect(res.issues.some((i) => i.line === 2 && i.message.includes('100,000-character limit'))).toBe(true);
});

test('Wave 4: renderPanelRule statically rejects ReDoS hazardous regex patterns before creating a worker', async () => {
  await expect(
    renderPanelRule('aaaaaaaaaaaaaaaaaaaa!', {
      id: 'redos-1',
      title: 'Evil Regex',
      pattern: '(a+)+',
      flags: 'g',
      template: '<div>$1</div>',
    }, 0)
  ).rejects.toThrow(/catastrophic backtracking/i);
});
