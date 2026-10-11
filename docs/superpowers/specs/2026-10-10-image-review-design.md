# Lumiglyphics image review design

The user approved beginning implementation on October 10, 2026 after asking for one final design pass. Their existing image settings must remain usable. Primary providers are NanoGPT and OpenRouter through the image connections exposed by their Lumiverse installation.

## First release

Extend Cue 1.7.0-beta at commit 842d397d34bbb2952153f33739c8b13e70d5177b locally. Give Lumiglyphics its own manifest identity and attribute the upstream source. Do not publish the source or claim live provider compatibility without verification.

Add a persisted Review before generating setting, initially on. Keep global model, preset and parameter configuration in the existing settings panel. Add an Image prompts inspector accessible in the VN overlay. Each candidate shows paragraph, request state, resolved model/provider, positive/negative text, safe parameter values and reference summary. Allow local prompt/negative/parameter edits, Generate and Skip for waiting requests, and Prepare replacement for completed/failed/cancelled requests. Retain the previous image until its replacement succeeds. Old assets without recorded requests must say the original request is unavailable.

The inspector remains available with review off. Automatic generation records the actual extension request before dispatch. Review mode is captured at batch start. Toggle changes apply to the next image batch; switching it off leaves already held requests waiting. Targeted replacements always ask for review. Already dispatched work cannot be undone. Closing/swiping/switching chats aborts pending approvals and stale work. No approval is transferable between user, chat, turn, swipe, request ID or profile revision.

## Request boundary

Introduce an optional request transform/gate at the existing generator's final provider boundary, after reference resolution. It receives the fully compiled DTO; manual approval returns that DTO with explicitly validated local edits. Freeze the resolved connection, model and exposed defaults. Recheck the profile revision immediately before dispatch. This preserves existing reference capture dependencies instead of presenting an incomplete early preview.

Preparation remains bounded by existing scheduler concurrency in this first release. Only ready drafts can be approved; later candidates say they await preparation. There is no auto-approval for unseen dependent drafts and no misleading Approve all button. Reference-dependent drafts appear after the earlier capture resolves. A full prepare-all scheduler separation is deferred.

Edited/manual requests bypass cache reuse and cannot store under the original compiled key. Unedited automatic cache behavior remains intact. Cached assets without request provenance are reported accurately.

Persist at most 32 safe request records and 512,000 serialized characters per turn, prioritizing active drafts, separately from jobs: request ID, job ID, paragraph, prompts, provider/model/connection revision, redacted settings and review/prepared/approved/skipped/cancelled state. Keep raw reference bytes and credentials out of UI/history; full pending request payloads live only in backend memory. Record prepared/approved text separately from later UI drafts; these labels do not imply provider dispatch or success. Invalid input must not spend an image request. Structured NovelAI base captions must stay consistent with edited positive/negative text.

## Scope and validation

No new direct NanoGPT/OpenRouter key management or independent provider client. Use spindle.imageGen and the host's configured profiles. Parameter editing is advanced JSON with supported-controls notices; a complete model-specific visual parameter editor, style-format conversion, image gallery, camera changes, multi-character drawing and live intermediate previews are follow-ups.

Tests cover zero calls before approval, exact edits sent once, skip/cancel, duplicate/stale approval, profile drift, redaction/validation, automatic recording, source/user boundaries and replacement preservation. Run full unit suite, typecheck, build and browser inspector/settings checks. Distinguish mocked/browser verification from real Lumiverse/provider execution.
