# Image library storage enumeration — beta.26

The host's WorkerHostStorageApi.listFiles() uses readdirSync(searchDir, {recursive:true}) and returns filenames relative to the requested directory. The library incorrectly required every result to start with turns/<chat>/, rejecting real host listings and showing an empty page. Existing mock tests returned root-relative filenames and concealed the mismatch.

Read-only enumeration now prefixes folder-relative results with the validated requested chat directory and normalizes native Windows separators. Root-relative adapter results remain compatible. Foreign chat roots, traversal, absolute paths and malformed entries are rejected. No saved data, image IDs, prompts or files are rewritten. Existing older replies with recoverable saved image references become discoverable without regeneration.

Evidence: https://github.com/prolix-oc/Lumiverse/blob/main/src/spindle/worker-host-storage-api.ts (listFiles, handleUserStorageList), inspected 2026-10-13. SDK reference: https://docs.lumiverse.chat/backend-api/storage/ . Regression reproduced an empty page before the fix, then verified Unix and Windows folder-relative results. Focused library suite:20 passed,0 failed,60 assertions. Existing Chromium mobile library checks and strict typecheck passed. Production build, bundle verification and static scanner passed. No live Lumiverse server, physical Android run or paid generation was performed.

Unified Story/Images History remains a proposed UI improvement rather than part of this bugfix. Current image detail already retains the associated paragraph excerpt; separate History currently displays reader prose.
