# CP20 bounded pipeline and recovery

Current application modules: `app/app/main.js`, `storage.js`, `pdf-reader.js`, and new `long-document.js`.

## Actual implementation

- New selections with source SHA-256, working IndexedDB and Web Locks use a one-page extraction → atomic source commit → per-block translation/atomic page commit → release/advance pipeline. The next page is not requested before storage finishes. Existing CP19 checkpoints retain their legacy compatibility path. Documents over 64 pages cannot fall back to an unbounded transient session when durable storage/locking is unavailable.
- `openPdf` computes SHA-256 from the already-read source bytes before PDF.js receives them. Checkpoints contain source identity, current build release, translation ruleset, and config signature. A rules/build/config change invalidates machine fields lazily per page while preserving source corrections and previous manual target results.
- `loadCheckpoint({lazy:true})` loads only metadata/source; `loadPage` fetches one page and its edits. `iteratePages` yields sequential records. No whole-document `getAll` occurs on the streaming restore path.
- `commitPage` stores page, its assets, document summary, and job metadata in one guarded IndexedDB transaction. Streaming summaries live in `meta.streamDocument`; the original source File is not rewritten on each block/page. This removes source-Blob write amplification observed while investigating a real-browser QuotaExceededError. Writer generation and job identity reject stale commits. Individual overrides are folded into the committed page and removed so they cannot shadow new invalidations.
- Main state exposes one page with blocks/assets; the previous visible payload can coexist transiently with the current extraction payload until replacement (at most two page payloads). The source PDF itself remains a Blob, and PDF.js has its own parser/worker state. This does not claim one-page total browser RAM.
- Partial source exists before model preparation and inference. Extraction/model failure leaves committed pages reviewable/exportable. Storage failure stops production and retains exactly the active unsaved page. Navigation/reloading that page is blocked until save retry/download; export substitutes the unsaved record into the stored prefix. Save retry commits that retained page explicitly.
- Export passes an async stored-page iterator to `createStreamingMarkdown`. OPFS output is incremental. The optional ZIP path remains available up to 64 pages and 64 MiB materialized payload; it is not the required long-document output.
- Stream preflight checks page count, file bytes, storage estimate, persistence request, and source identity. Initial page classification records a scan/digital indication. Runtime/locking capability checks remain in the app.
- Reader maximum is 2,000 pages / 100 MiB input; one-page text 250,000 chars / 20,000 text items; one-page assets 128 MiB; canvas 6 million pixels; declared image 24 million pixels; graph operations 200,000/page. Stream cumulative text allowance is 100 million characters. These are defensive boundaries, not promises that every class/device within them is qualified.
- Ordinary digital page rasters are not stored when streaming. OCR, formulas, tables, and embedded image pages retain required visual evidence. A page containing embedded raster or vector visuals (including filled paths/shading) sets `preserveVisualSource`, which the exporter honors even when optional full-page evidence is off.
- Unresolved image regions produce a retained image block and incomplete coverage. Such fallback is a failed/unread text result, not translated/preserved success. Incomplete coverage and unverified mathematics prevent the UI from labelling the output complete.

## Tests and evidence

- `node tests/cp20-pipeline.mjs`: controlled actual pipeline/storage test. 1,500 unique controlled pages and >2M characters, one-active-page invariant, same-provenance resume, source corrections/config invalidation, subsequent extraction failure, quota atomic rollback, stale writer rejection, cancelled preparation, storage preflight, forced-to-auto language reset, incomplete-image counters, and a guard proving stream commits never rewrite the source File. Explicit PDF/translation doubles; not actual inference or RAM evidence.
- `node --experimental-vm-modules tests/lifecycle-regression.mjs`: actual main with explicit UI/storage doubles; 16 existing cases passed after integration.
- `node tests/lifecycle-storage.mjs`: eight existing atomicity/ownership cases passed.
- `node --experimental-vm-modules tests/pdf-extract-boundaries.mjs`: current reader/layout + parser/OCR/canvas doubles; successful OCR and empty/failed OCR coverage cases passed.
- `node --experimental-vm-modules tests/pdf-budget-after.mjs`: legacy bounded asset-recovery regression passed; it intentionally verifies legacy whole-document 128MiB protection. New stream processes each page separately and is additionally tested by the capacity suite owned by QA.
- Native real-parser capacity evidence is maintained by QA separately, not duplicated here. Browser evidence is owned by root.

## Remaining limits requiring explicit release decisions

- No claim that Node/fake-IDB one-active-page tests measure browser/WASM/canvas total RAM or qualify a physical minimum device.
- Arbitrary cross-page paragraph/table merging remains inherited heuristic behavior, not a newly proven general capability.
- Source image preservation may retain a full page where individual embedded figure extraction is unavailable; this is deliberate substance preservation, with deduplicated export.
- Optional large-document ZIP is not implemented. Required one-file source/translation/bilingual Markdown uses streaming.
- Ambiguous early source language can require the user to select a language in the existing optional settings.
- Human semantic approval, physical-device tests and actual hosting verification require their own evidence. These pipeline changes do not close those gates.

## Real-browser storage investigation

Root observed QuotaExceededError around page 2 despite a large navigator.storage.estimate quota; immediate manual retry could succeed. This is evidence that the estimate is not a write guarantee. Save diagnostics now retain the actual error name/message/page/stage (last five events), and user messages distinguish quota, access denial and stale ownership. Source Blob rewriting was removed as avoidable write pressure; whether it resolves the observed browser failure is determined by the new browser run, not inferred from unit tests. Partial export uses available-page wording and marks unsaved-page changes explicitly.

## Quota recovery after browser evidence

A later actual-browser probe rejected both independent IndexedDB and OPFS writes despite a large reported storage estimate. Root then removed only the public model cache: measured origin usage fell substantially, the same loaded model continued translating, and checkpoint writes resumed. No source, translated page, user correction or application cache was removed.

The application now handles `QuotaExceededError` by deleting recognized public model-shard/cache-probe entries inside the exact `semantik-model-v1` namespace and retrying the same already-rolled-back atomic mutation once. Unknown entries in that cache and every other namespace are untouched. Worker/session/fingerprint remain intact; engine metadata, persistent UI and document warnings mark offline unavailable until re-prepared. A second quota failure pauses normally. SecurityError, InvalidStateError and DataCloneError never trigger deletion or retry. There is no retry loop and no user-data eviction.

`node --experimental-vm-modules tests/cp20-pipeline-quota-recovery.mjs`: seven narrow actual-main/helper tests pass with controlled storage/cache boundaries. They verify exact namespace/key preservation, active worker retention, one successful retry, failure after exactly one retry, no recovery for non-quota errors, and no false success when model cache is absent. The actual-browser automatic path still requires its own final-build run; the preceding manual recovery is labeled separately.
