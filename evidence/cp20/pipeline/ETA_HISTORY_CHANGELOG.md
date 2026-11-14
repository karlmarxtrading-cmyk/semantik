# Narrow fixes after cp20-1668833ad37c9dd8

Observed in the real browser: a pause/reload at page 124 followed by replay of saved pages produced an artificially short ETA. The old formula divided this run's elapsed time by absolute document page position, treating cached replay as newly completed work.

Changes are limited to:

1. `long-document.js`: estimate remaining time from the most recent eight fully worked pages in the current run, starting after three samples. Fully restored pages and partially completed resumed pages never enter the throughput sample. Translation, extraction, page-storage sequence and quota policy are unchanged.
2. `main.js`: restore the last five `storageRecoveries` and `storageFailures` records from saved metadata, so the next save does not erase prior diagnostic history. Offline warning restoration already existed.

`ETA_HISTORY_PATCH.diff` is the exact source diff from the deployed cp20-1668833ad37c9dd8 main/pipeline modules. `tests/baseline/cp20-1668-long-document.mjs` retains the original pipeline module, with SHA-256 in its identity JSON, solely for the equivalence regression.

`tests/cp20-pipeline-eta.mjs` has five passing cases: cached replay exclusion, partial-resume exclusion, bounded sample history, actual-main diagnostic-history restoration, and before/after equivalence of complete page records, committed records/summaries, inference request sequences and all non-ETA progress fields. Only wall-clock duration metrics and ETA are excluded from equality; source/target text, statuses, provenance, counts and storage actions must match exactly.

These are controlled tests using explicitly declared PDF/model/storage/DOM boundaries. They do not turn the older full-browser run into a test of the new complete build. The long-run artifact must retain its actual cp20-1668833ad37c9dd8 identity; a new-build UI/reload smoke and explicit component identity comparison provide narrower evidence for the final patch.
