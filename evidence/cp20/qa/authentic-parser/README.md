# CP20 authentic original textbook: parser capacity supplement

This evidence is **source-parser capacity only**. It is not a translation, OCR, semantic, browser, export, or physical-device acceptance. Final corrected instrumentation result is RESULTS.json; INITIAL_RESULTS.json and initial-run.log preserve the first run. REPLAY_REASON.md explains the small instrumentation correction.

The exact original author-published PDF is Benjamin Crowell, *Light and Matter*, revision2020-05-07,1062pages,85,937,593bytes. Provenance and the embedded license are under tests/fixtures/cp20-authentic; the original PDF stays outside the release tree. The text is actual varied physics prose, with diagrams, mathematical notation, tables, exercises, and references—not generated repetition. The original typeset layout is retained.

Reproduce from cp20:

```bash
python scripts/fetch-cp20-authentic.py --output ../experiments/cp20-authentic
node --max-old-space-size=768 tests/cp20-authentic-parser.mjs ../experiments/cp20-authentic/light-and-matter.pdf
```

The harness checks the input SHA256 and100MiB cap; reads the final-dist release selected by evidence/build/BUILD_MANIFEST.json; calls production openPdf and bounded extract once per page; checks source-item accounting per page; and requires all1062pages and more than2M extracted source characters. Native Canvas and file fetch shims support Node execution. Only one extracted page record is retained at a time. Visual assets are counted and released rather than accumulated; per-page summaries store counts, hashes, and warning strings, not copies of textbook text/images. The ordered text digest uses the harness’s literal \n and \f separators, so reproduce with the supplied harness.

Memory is measured for this Node process. RSS is sampled every100ms with a1536MiB abort cap; kernel maximum RSS comes from process.resourceUsage().maxRSS on Linux. A360s abort deadline bounds the run. These values are not total browser/worker/WASM memory measurements and do not qualify a physical8GB laptop.

Browser OCR is unavailable in this Node harness (`self is not defined`); pages with raster/scan regions remain visibly incomplete in evidence. Source items accounted for means that extracted digital items have an output destination, not that all content on a page has been read or translated correctly. Geometry categories are only the parser’s supported-geometry/uncertain flags, not independent mathematical accuracy. Asset counts include page images and mathematical/table crops; they are not a count of independently verified diagrams.

The remaining end-to-end requirement is an actual browser run on this or another diverse scientific source, with OCR labels, formula/table correctness, bounded storage, pause/resume, complete translation/export, target physical hardware, and bilingual human review independently qualified. This supplement does not close those gates.

## Observed final result

Capacity/source-item accounting: PASS. All 1,062 pages; 2,159,653 extracted source characters; 88,633/88,633 digital items accounted for; 4,684 assets totalling 56,757,057 bytes processed/released; one extracted page active. Elapsed 183.75s. Sampled peak Node RSS 744,804,352 bytes; Linux kernel maximum RSS 824,803,328 bytes (786.59MiB). Product source hashes stayed unchanged on build cp20-8c643bea6962471f.

Content coverage: **INCOMPLETE**, with 646 pages unresolved by Node OCR and 849 warning pages. Translation: **NOT_RUN**. Geometry categories are {'supported-geometry-only': 1809, 'uncertain': 1420}; supported geometry is not independent math correctness. SUMMARY.json binds the final harness and result hashes.
