# CP20 test portability changes

1. `cp19-guards.mjs`: the CP19 package put its supplied audit evidence alongside `work/`; the CP20 self-contained checkout now includes the unchanged historical evidence under `audit/`. The validator case path changes from `../../audit/...` to `../audit/...`. The test cases and assertions are unchanged.
2. `lifecycle-export.mjs`: the expected exported release is now the actual source `BUILD_INFO.release`, rather than the CP19-only literal `cp19-development`. This continues checking exact exported release equality with the imported build identity and permits CP20 source and built-release testing.
3. `scripts/run-regressions.py`: output path and label are explicit; the report captures active source hashes before and after the run and calls an inherited manifest `buildReferenceOnly`. A changing source run is identifiable and cannot be presented as final-build qualification.

The first execution after dependency restoration is retained in `regressions-initial/`: 18 suites passed; three failed due to a missing audit path, absent yet-to-be-built `dist/sw.js`, and the CP19-only version literal. Its source changed during the run, so it is an orientation run rather than acceptance evidence.

4. `cp19-geometry.mjs`: only package-root paths changed; unchanged supplied audit/control PDFs are included under `audit/` and `research-math/`. All 27 geometry assertions remain intact.

5. `lifecycle-harness.mjs`: links the actual CP20 long-document helper and extends the explicitly doubled storage surface with the new page-oriented methods. Existing test assertions and old small-document behavior checks are retained.

6. `pdf-inherited-reader.mjs`: the obsolete 301-page rejection changes to acceptance under the requested CP20 long-document contract. A new real 2,001-page repeated-page fixture verifies the retained 2,000-page safety bound. Full 301/1,001/1,500 extraction has independent capacity tests.
7. Reader VM boundary tests now expose native WebCrypto so the new real source SHA-256 computation executes. PDF/OCR/canvas remain explicitly controlled doubles; no crypto stub or assertion removal.

8. `cp20-semantic-runtime.mjs` and the capacity runner now use random UUID temporary worker names. Separate executor processes can expose the same PID, causing one harness cleanup to remove another live harness worker. This is a test infrastructure repair; no product code or model output is replaced. The failed second-run attempt is preserved under `real-inference-4694-historical/`.
