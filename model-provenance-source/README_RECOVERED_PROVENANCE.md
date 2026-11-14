# Recovered model and engine provenance (historical CP16)

These files are supporting source and evidence only. They do not replace the CP17 PDF-only application or CP18 working source.

Recovered from the verified CP16 recovery archive, following its CP15 → CP14 recovery → CP14 Stage 1 → CP13 inheritance chain. Every recovered file matches the CP16 canonical workspace hash. All 30 actual model files in CP17 match actual CP16 bytes. Reapplying the original CP17 CSP closure patch to the recovered CP16 worker yields the exact CP17 baseline worker SHA-256.

`docs/engine/parity-id-en.json` and `parity-en-id.json` are historical four-input-per-direction conversion parity results against converted PyTorch, not a fresh CP18 run, not native Marian C++ parity, and not domain accuracy. `PUBLISHED_NATIVE_OUTPUT_PARITY.json` is likewise retained historical evidence with its original limits.

Conversion recipes are in `scripts/model-conversion/convert_models.py`; exact environment and dependency pins are in `docs/engine/CONVERSION_ENVIRONMENT_LOCK.txt` and `requirements-conversion-lock.txt`. The recipe expects original OPUS NPZ archives/extractions at its documented hard-coded paths. Those original NPZ inputs were not included in this bounded recovery. Their expected origins and hashes are in `SOURCE_TO_CONVERSION_PROVENANCE.json`. Current shipped quantized models are already present in the CP18 application; no replacement or requantization was performed.

Historical `src/` and package/lock files are retained for engine maintenance, including old non-PDF UI source. They must never be copied into CP18 deploy output. CP18's active application remains under the separate app/ folder and is PDF-only.

`tests/engine-patch-csp.py` is preserved verbatim from the CP17 source/QA package. For an isolated replay within this folder, create assets/ and evidence/, copy dist-reference/engine.worker-R5yojCJO.js to assets/engine.worker-4c3dcfee.js, then run python3 tests/engine-patch-csp.py. Do not run this historical replay against the active CP18 app. The independent replay receipt is in evidence/provenance/CP16_TO_CP17_WORKER_REPRODUCTION.json.
