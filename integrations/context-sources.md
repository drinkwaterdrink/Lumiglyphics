# Optional current-reference sources

Beta.12 adds status readers in Pictures → Context sources. These are optional and start disabled. Refresh reads each selected source once. It does not generate images, call Lumiglyphics's planner, write companion data, or rewrite saved paragraph snapshots. Imported facts and names remain backend-only in this increment. The UI receives status, bounded record/public-fact counts and snapshot freshness; a usable imported reference/dossier view is a later step.

## LumiBooks

Enable **Read LumiBooks reference status**, save, then Refresh. The adapter feature-detects the host RPC pool and reads `lumi_books.codex.<chatId>`. It verifies the returned user/chat, filters disabled records, and excludes disabled/frozen files. A null snapshot means cleared; a missing endpoint or revoked permission means unavailable. Endpoints may not appear until the first codex activity in a session.

The published codex has no paragraph reveal or viewpoint visibility contract. Appearance/description/status fields are bounded, attributed current reference evidence with **unclassified** visibility. Secret/knowledge tables, notes, goals, relations and arbitrary extra fields are not imported. No assumption that the latest codex state was known at an earlier paragraph is made.

Source contract: [LumiBooks developer documentation](https://github.com/AMousePad/LumiBooks/blob/main/src/codex.md), [published snapshot](https://github.com/AMousePad/LumiBooks/blob/main/src/backend/hooks.ts), [entity schema](https://github.com/AMousePad/LumiBooks/blob/main/src/backend/codex/schema.ts).

## LumiScript

Select an exact published endpoint shaped `lumiscript.<script-slug>.<channel>`. Leaving it blank disables reads. No endpoint discovery, automatic script installation, execution of pasted code, macros, or arbitrary-state interpretation occurs. Choose a lightweight snapshot endpoint published with `api.rpc.sync`; a handler endpoint executes its producer's own read handler, so that producer controls any computation it performs. Lumiglyphics adds no model call.

The endpoint must return this versioned JSON contract (or null after a wipe):

```json
{
  "version": 1,
  "userId": "originating-user-id",
  "chatId": "originating-chat-id",
  "updatedAt": 1791748800000,
  "entities": [
    {
      "id": "npc-aleister",
      "kind": "npc",
      "name": "Aleister",
      "aliases": [],
      "facts": [
        { "field": "appearance", "value": "Dark hair, weathered coat", "visibility": "observed" }
      ]
    }
  ]
}
```

Use the actual producer user/chat and Unix timestamp in milliseconds. Entity kinds: npc, place, object. Fact fields: appearance, description, outfit, condition, owner, location. Visibility: observed, private, unclassified; omitted visibility defaults to unclassified. Do not mark secrets observed. Private/unclassified facts are never sent to the frontend by this reader.

Limits: 32 entities, 128 total facts, 16 facts/entity, 12 aliases/entity, 1,200 characters/fact, 256 KB payload, unique entity IDs and strict version/scope checks. Snapshot time more than one minute into the future is invalid; age over five minutes is labeled older. Each read has a maximum 1,500ms response deadline. The host's underlying RPC read cannot be cancelled, but late results cannot replace a report or saved state. New refreshes/chat switches/source setting changes discard pending results. Config saves are ordered before status refresh.

Source contract: [LumiScript cross-extension RPC](https://github.com/mindbound/lumiscript/blob/master/docs/guides/rpc.md).

## Existing integrations and remaining work

SimTracker retains supported chat JSON visual extraction and the existing visual-context toggle. Warp retains the game/panel/image bridges. This release does not claim stock SimTracker publishes normalized context or that Warp exposes a compatible RPC endpoint. Their normalized adapters, optional planner proposals, field precedence and built-in dossiers remain on the roadmap. No companion extension is required for the reader or image generation.
