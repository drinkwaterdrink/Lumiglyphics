# Exact prompt fixtures

`expected.json` records 44 fictional outputs: the registry's 11 dialect keys across solo, ensemble, environment and long-budget scenarios. These supplement the existing 20-scenario semantic benchmark suite. NovelAI intentionally shares Anima's serializer; solo tag dialects identify by appearance rather than names. Solo scenarios include a recorded identity reference, current green coat, camera framing and dialogue safe area; native-negative dialects retain explicit negative strings. Long inputs use an 1,800-character combined ceiling.

The test never rewrites expectations. When changing serializers, inspect each affected prompt/negative/warnings diff and the identity, outfit, ensemble, reference and budget invariants before accepting new expected strings. Do not regenerate this file merely to make failures disappear. No image or model APIs are used.
