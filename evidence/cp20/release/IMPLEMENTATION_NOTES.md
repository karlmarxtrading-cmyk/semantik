# CP20 release/offline implementation

Implemented AUD-06: `offline.js` imports generated `BUILD_INFO` and validates the full manifest before cache mutation. Schema, exact release/version/source hash/base/model hashes, cache name, required shell records, path canonicality, duplicates, nonnegative safe sizes, per-asset 25 MiB limit and SHA-256 shape are checked. Every actual cached/fetched asset still requires exact size and SHA-256 verification. An older CP18 name is rejected instead of making a hard-coded name permissive.

Implemented AUD-11: build inventory now includes model notice and all licenses. Generated service worker serves these with the same size/hash verification as code, including after network removal. Unknown current-release paths remain rejected; engine model verification is preserved separately.

Additional update fix: `--retain-from` validates the prior release inventory and copies immutable old namespaces, refusing collisions or unsafe paths. It leaves the active HTML/worker CP20. Old active tabs can fetch old lazy modules after deployment; the worker still does not call skipWaiting or delete old caches. `build-with-history.py` reproduces exact CP19 using a ~307 KB overlay plus unchanged shared model/runtime bytes, verifies historical release identity, then builds CP20 retaining CP19. This does not assert reverse checkpoint migration from CP20 to CP19.

Tests: `tests/cp20-offline-release.mjs` executes exact built modules and actual asset bytes in Node VM, controlling browser Cache/Fetch and lifecycle event boundaries. Eleven checks passed on isolated build: CP20 identity, 12 malformed-manifest mutations, lazy shell install, complete actual manifest cache, offline notice/licenses, cached navigation/reprepare, corrupt-cache/tampered-network rejection, unknown-path/model routing, abort/quota, prior worker plus retained lazy imports, cache retention. These are not browser/hosting/device qualification. Earlier isolated results are pre-final and must be rerun for the packaged build.

Canonical final commands (working directory source root):

```bash
python3 scripts/build-with-history.py
python3 scripts/verify-final.py
node --experimental-vm-modules tests/cp20-offline-release.mjs dist evidence/cp20/release /workspace/scratch/17677088ccfd/baseline/deploy
```

The last optional argument supplies the verified original CP19 deploy for the update-retention probe; without it, ten tests still execute and the explicit prior-worker probe is not run. In this session that path is an extracted user attachment. No private host credentials are required or written.

Scope remaining: actual browser active-job install/wait/activate, offline PDF/scan + inference after reload, Cloudflare CSP/MIME/cache/byte behavior and deployment rollback. Record them separately as PASS/FAIL/NOT_RUN/BLOCKED. Controlled tests do not close those gates.

## Final candidate verification

`cp20-4130d88aca38edb8` has now been rerun: offline/release 11/11 PASS; source model files16/16 PASS and five static header paths PASS; deployed current+retained model files32/32 PASS at stored-shard, decoded-shard and reconstructed-file hash levels. Independent build reproduces all598 production files with identical bytes and SHA-256. The active preview also has31 temporary `qa/` harness files; these are recorded separately and must be excluded from deploy packaging. See `FINAL_BINDING.json` for exact evidence identities. No active application/build input was changed.

## Superseding final-long candidate verification

`cp20-4694bad623ed9b19` supersedes the earlier candidate after storage/export/ID corrections. Offline regression 11/11 PASS; final static verification PASS; canonical reconstruction reproduces all 598 production assets exactly. Model files are unchanged: exact raw bytes match source, current deploy and retained CP19; decoded/full-model proof is retained under `prior-candidates/` and explicitly referenced rather than falsely presented as new reconstruction. Five static cache-header paths pass again. `FINAL_BINDING.json` now binds this current build.

## Current packaged candidate

`cp20-1668833ad37c9dd8` is the latest verified candidate after quota-helper and semantic-v4 changes. Exact isolated candidate and canonical rebuild both contain 598 production files and match the current manifest. Offline suite ran all 11 tests including prior-release lazy imports. Active preview additionally retains the old 4694 namespace for an in-progress long test and contains QA fixtures; neither is part of the final package. Use `cp20-next-dist` or the canonical manifest selection for packaging. `FINAL_BINDING.json` is authoritative over earlier candidate notes.

## Final ETA/history candidate

`cp20-8c643bea6962471f` is the final build after ETA sampling and storage-event history restoration. Exact source-manifest comparison against1668 changes only `app/main.js` and `app/long-document.js`. The five controlled ETA/history regression checks match the final source hashes, including narrow exact record/write/inference-request/non-ETA progress parity; this is not a new long-document inference run. Final release tests, static checks, full598-file independent build parity, model byte equivalence, and five header-rule simulations pass. Package only `cp20-final-dist` or canonical manifest files. Live preview retains earlier1668/4694 namespaces and QA exclusively for ongoing tests. Current authoritative evidence remains `FINAL_BINDING.json`.
