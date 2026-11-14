# CP19 geometry reconstruction prototype

This module is portable browser ES module code with no Node dependency. It reads real normalized PDF.js text geometry and stroked path operators. It contains no fixture coordinates or lookup of known formula strings. All 8 mathematical expressions in the supplied audit PDF reconstruct through the same algorithm. Source PDFs are never corrected mathematically.

`regression-results.json` records current module SHA-256, source PDF SHA-256 and 27 passing tests. The independent generated PDF is labeled synthetic and differs in content, coordinates, scale, CTM, nested structure, dimensions and unsupported radical control. These are parser tests, not translation inference, browser tests or independent mathematical review.

## API

```js
const vectors = extractMathVectors(await page.getOperatorList(), viewport, pdfjs.OPS);
const math = reconstructMath(normalizeItems(content, viewport, pdfjs), vectors, {pageNumber});
const ordinary = analyzeLayout(math.remainingItems, layoutOptions);
```

Each `regions[]` entry contains:

- `id`, page-relative `bbox: [x, y, width, height]` in the same viewport coordinates as `normalizeItems`.
- `ast`, `sourceText`, `sourceItemIds`, `vectorIds` preserving evidence.
- `verified` meaning only *supported geometry reconstruction*, not accuracy of translation, correct mathematical assertions or human review.
- `latex` is null whenever the region is unverified. Never substitute `sourceText` as if it were verified LaTeX.
- `warnings` with specific unsupported/ambiguous reasons.

Keep the original page text/vector evidence in the checkpoint. Add math regions to layout in page/column reading order, taking care that a math region spanning multiple baselines is an atom (not detached numerator/denominator blocks). `consumedItemIds` are page-local PDF.js `sourceIndex` IDs; do not treat them as globally unique. Do not translate any verified region. Use the verified LaTeX in `$$...$$`. Preserve every unverified region through an actual PDF raster crop (with a small clamped margin) embedded in the standalone Markdown, plus a concise uncertainty marker. It is not acceptable to omit unsupported scientific content.

Inline paragraphs and tables require integration decisions: this prototype intentionally leaves prose items containing inline values alone rather than stealing an entire prose line into a display formula. It does not yet split text-run offsets or reconstruct formula regions inside prose/table structure. The exporter should use its own protected-inline parser and must not assert these cases are covered by this geometry test suite.

`toLatex(text)` returns `{latex, verified, warnings}` for supported compact source symbols, Unicode scripts/primes, named functions and set notation. Unsupported symbols and literal TeX control sequences are not trusted. A naked radical is unverified because radicand extent is unavailable. The function is *not* an unrestricted LaTeX parser; do not feed existing verified LaTeX back through it.

## Implemented evidence

- Baseline/size/nearest-base superscripts and subscripts, including simultaneous bounds.
- Stroked vector fractions, recursively combined inside-out (nested fraction PDF control).
- Spatial integral/sum/product limits when geometry is unambiguous.
- Two vertical vector brackets, four inward hooks, aligned rectangular cell grid → bracketed matrix.
- Independent inequality regions, absolute values, names of functions, Unicode scientific symbols.
- PDF.js6 optimized paths and common legacy straight path encoding; actual graphics-state CTM handling.
- Uncertainty for unknown symbols, unbounded radical, unsupported nearby curves, rotated math, unresolved glyph attachment and dangling relations.

## Mandatory limits

This does not close all of F01's broad scientific scope. Radical overbars, vector arrows/accents, piecewise/system braces, large parentheses built from glyph pieces, complex sigma/limit placement, inline prose/tables, equation numbers, multi-line derivations, font-encoding failures and scanned mathematical OCR still need evidence. Some are conservatively marked unverified; scientific PDFs outside tested patterns must retain source imagery. Do not claim all mathematical structures have been proven.

Render the **new integrated exported Markdown** through the target renderer and compare the result with the actual source PDF. String/AST tests alone do not satisfy F01/F04 visual acceptance. No such browser or visual equivalence claim is included here.

## Re-run

From repository workspace root:

```sh
python cp19/research-math/make-controls.py
node cp19/research-math/regression.mjs
```

The main module is `math-geometry.js`; no production file has been edited by this research task.
