# CP20 mathematical geometry qualification

Status: improved implementation, **not full closure of AUD-08**.

`app/app/math-geometry.js` now reconstructs an isolated digital square-root glyph only when a unique explicit overbar determines the radicand. It retains the text-item and vector provenance. Indexed, missing-bar, ambiguous-bar, unknown-text, and out-of-scope cases remain unverified. A separate parenthesized numeral is no longer silently interpreted as an algebraic factor when its spacing makes it an ambiguous equation label.

Legacy PDF curve operators now retain transformed start/control/end points. Modern curves retain their start point too. This closes a safety defect where a nearby curved brace/radical could escape the source-fallback check. OCR text is explicitly excluded from digital mathematical verification even if the module is called directly, and mixed-source item identities remain stable.

Validation commands, from the source root:

```sh
node tests/cp20-math-qualification.mjs
node tests/cp20-math-real-pdf.mjs
```

- `QUALIFICATION.json`: 25 PASS, 0 FAIL; 8 original audit equations parsed through actual PDF.js, source provenance, and synthetic geometry/operator mutations.
- `REAL_PDF_CONTROL.json`: 5 PASS, 0 FAIL; independent literal PDF parsed with PDF.js 6.2.108. The explicit square root becomes `y = \\sqrt{x + 1}`. The curve/brace and ambiguous equation label remain unverified, with source geometry available. The root LaTeX is accepted by KaTeX 0.19.1 with `throwOnError:true` and `trust:false`.
- `CP20_MATH_CONTROL.pdf` and `.png`: independent test input and Poppler-rendered source. Visual inspection confirms the root scope, adjacent curve, separated `(2)`, and retained prose. This is source inspection, not a browser or complete rendered-Markdown comparison.

The two suites are distinct; 30 assertions passed in total. They do not establish OCR mathematical accuracy, human approval, scientific equivalence, or universal PDF support. Tests bind the module SHA-256 in their JSON reports. Rerun them after any geometry change.

Still unqualified: complex/indexed radicals; full piecewise cases and systems; equation-number semantics; formulas in merged/multilevel tables; LaTeX reconstruction from scans. A preserved image is source fallback and must not be counted as successful LaTeX reconstruction. For these classes, AUD-08 remains open until the application, output, and independently reviewed fixtures meet the requested gate.


## Independent pipeline and vector-preservation review

`node --experimental-vm-modules tests/cp20-math-review-lifecycle.mjs` runs four controlled actual-application scenarios: quota failure, storage denial, incomplete OCR coverage, and forced-to-automatic language change. All pass after fixes by the pipeline owner. Its storage/PDF/model/DOM boundaries are doubles; it is not browser or OCR inference evidence.

`node tests/cp20-math-vector-preservation.mjs` creates and parses an independent three-page vector-only PDF, with filled bars, a stroked curve, and shading-only gradient. The production reader stores required source visuals with optional page evidence off. The production streaming exporter embeds all three in one 71,590-byte Markdown, which Marked parses into three image elements. Four checks pass. `VECTOR_PRESERVATION.json` binds the exact tested module hashes.

`VECTOR_SOURCE_1.jpg` and `VECTOR_SOURCE_3.jpg` were visually inspected: bars and gradient are present. Native Canvas does not render PDF font glyphs identically to the browser; this proves vector-figure preservation, not complete raster typography fidelity. Digital text remains in the Markdown. `VECTOR_FIGURES_SOURCE.md` is source extraction, not a translated-document example.
