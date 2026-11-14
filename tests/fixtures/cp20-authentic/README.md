# Authentic scientific source fixture

Light and Matter by Benjamin Crowell, revision May7,2020. The author’s [official book page](https://www.lightandmatter.com/lm/) directly links to [this author-uploaded Internet Archive edition](https://archive.org/details/lm_20220102). The original [PDF](https://archive.org/download/lm_20220102/lm.pdf) was downloaded byte-for-byte for testing:1,062pages;85,937,593bytes;SHA25643bc4835b63fe4dca599fe14982596b54a261e4d01af9c23a48070ca88bde105.

The embedded copyright page states CC BY-SA3.0 except third-party photographs/drawings listed in the photo credits. Those credits remain in the intact original PDF. The archive metadata says4.0; we record3.0 from the exact file. This is a real original-layout physics textbook, with varied prose, figures, equations, tables, exercises, and references. It is not a synthetic repeated template.

The qualification uses the final-dist production reader one page per call; it does not invoke translation or claim visual/semantic correctness. Actual unresolved OCR and uncertain math remain unresolved. See evidence/cp20/qa/authentic-parser.

Re-fetch only if missing, with urllib or curl, and verify MANIFEST.json SHA256 before testing. Do not substitute an archive OCR derivative or another edition.

The book itself is deliberately excluded from the release source package: the checked bytes reside only in scratch outside the cp20 tree. Retained deliverables are small provenance/license records, the exact-hash fetcher, the harness, and per-page numeric evidence. To reproduce from the cp20 directory:

```bash
python scripts/fetch-cp20-authentic.py --output ../experiments/cp20-authentic
node --max-old-space-size=768 tests/cp20-authentic-parser.mjs ../experiments/cp20-authentic/light-and-matter.pdf
```

Requires built final dist, restored locked QA dependencies, and Node24. The harness loads the release identified by evidence/build/BUILD_MANIFEST.json, checks the original PDF hash, extracts one page at a time, samples memory, retains only counts/hashes/warnings, and invokes no translation model. Its PASS is strictly the bounded source-parser capacity and item-accounting criterion; overallContentCoverageStatus stays INCOMPLETE when OCR regions are unresolved.
