# Reproducible PDF journal QA

These fixtures are synthetic and redistributable. They are not a corpus of peer-reviewed translations and do not establish semantic accuracy on arbitrary journals.

## Fixtures

`make-fixtures.py` generates thirteen valid PDFs and four rejected-input samples in `fixtures/`. The manifest records expected page counts, numeric tokens, reading-order markers, sizes, and SHA-256 values. Regeneration uses Python with ReportLab, Pillow, and pypdf.

| Fixture | Purpose |
| --- | --- |
| digital-en.pdf, digital-id.pdf | Digital English and Indonesian text, academic headings, numbers and DOI |
| bilingual-text.pdf | English abstract in a mostly Indonesian document; preserve existing Indonesian prose |
| two-column.pdf | Known left-column-before-right-column order, spanning introduction/conclusion |
| academic-structures.pdf | Table, decimal statistics, negative number, confidence interval, formula and chart |
| scan-en.pdf, scan-id.pdf | Raster-only source requiring English/Indonesian OCR |
| mixed.pdf | Digital page followed by scanned page |
| unsafe-strings.pdf | HTML/script/Markdown strings must remain inert |
| password-protected.pdf | Password handling; fixture password: `journal-test-password` |
| page-limit-301.pdf | Page limit rejection |
| rotated.pdf | Rotation-aware PDF extraction |
| empty.pdf | Explicit image fallback for a blank page |
| corrupt.pdf, json-masquerading.pdf, input.json, input.txt | Invalid or unsupported document rejection |

## Run the browser harness

From the project directory:

```sh
python scripts/test-server.py --port 8765
```

Open `http://127.0.0.1:8765/tests/pdf-browser.html` in the browser. It runs actual `openPdf`/`extract` calls, records outcomes in the page, and sends synthetic test reports to the local test server. The server writes `evidence/browser-pdf-reader.json` after each check and on completion. A `RUNNING` report is not a completed pass.

The test-only POST endpoint and fixture files are development tooling. They are excluded from the static production archive. The deployed application has no upload endpoint.

`reader-browser.cjs` runs the same class of checks through Playwright. It additionally observes request methods and the cold-page dependency footprint. It requires Playwright and a Chromium binary; `CHROMIUM_PATH` and `TEST_ORIGIN` can override their defaults. A local browser launch failure is recorded as `BLOCKED`, never converted to a pass.

## Other checks

```sh
python tests/verify-models.py
python tests/check-release.py --output evidence/release-static.json
```

The model check verifies transport size/hash, decoded size/hash, and full reconstructed hash for every model file. The release check validates static file sizes, explicit PDF-only inputs, removed legacy upload bundles, local dependency references and selected security headers. These checks do not replace actual browser, OCR, translation, export, offline, or usability tests.

## Evidence interpretation

Keep actual execution results separate from test plans. A deterministic fixture passing extraction proves that fixture only. Rendering a table or formula as a source image preserves its appearance; it does not assert that the system recovered editable LaTeX or reconstructed its table semantics. Numeric preservation and source-block coverage do not prove semantic equivalence of translated prose.
