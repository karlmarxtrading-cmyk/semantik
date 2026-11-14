# CP20 structure and Markdown changes

Owned application files: `app/app/layout.js`, `app/app/export.js`.

- AUD-03: references ends on a detected structural heading even when its wording is not in a section-title dictionary. Chapter/Bab/Part/Bagian labels are explicit structural hints. Recognizable citation entries do not end references; reference blocks carry `preservationReason`.
- AUD-07: main standalone Markdown omits optional whole-page images, preserves images needed by visual/formula/table blocks, and stores each SHA-256-distinct payload in one CommonMark image reference definition. Multiple semantic references can still display the same picture, but its bytes occur once. The ZIP's source-page evidence remains optional output and retains page images.
- AUD-09: headings preserve levels below the document title, page markers are provenance comments, ordered/bulleted lines become structured `list-item` records, and contiguous list items render as one list. Source HTML remains escaped. This is a heuristic structure model, not a proof for all books.
- AUD-04/05: `createStreamingMarkdown` consumes one committed page at a time and writes a single OPFS output file when supported. It does not assemble one document-sized string. It verifies page sequence, stable block IDs, and counts before returning the output. It supports committed partial prefixes with explicit incomplete labels.
- OPFS output lifetime: returned File has `exportCleanup()`; the caller must invoke it after the download URL is no longer needed. In browsers without OPFS, a Blob-parts fallback is capped at 32 MiB. A quota/write failure aborts the output; it does not delete source checkpoints.

Validation: `node tests/cp20-structure.mjs` (18 checks, including an explicitly doubled OPFS boundary for commit, cleanup, quota failure and denied-access fallback), inherited `cp19-markdown.mjs` (9), `lifecycle-export.mjs` (9), and `pdf-layout.mjs` passed on edited source. The 1,500-page exporter stress used unique synthetic page strings beyond 2 million characters. It is **not** PDF extraction, translation inference, browser download, physical-device memory qualification, or human semantic review.

Remaining scope: arbitrary layout recovery and cross-page paragraph reconstruction still require broader parser/browser qualification. CommonMark reference images are tested through the supplied Marked/KaTeX renderer; not every Markdown application permits data URIs.

Technical references consulted 2026-11-13:
- https://spec.commonmark.org/0.31.2/ (image/link reference definitions may precede or follow use).
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
- https://developer.chrome.com/docs/capabilities/web-apis/file-system-access

## Integration correction: sparse reference boundary

Actual PDF.js testing found a two-line page (18 pt unknown title + 11 pt paragraph) whose embedded subset font names did not expose bold. The old upper median of item sizes selected 18 pt and misclassified both items as references. Character-weighted font estimation now selects the body font independently of item grouping. A no-bold sparse-page regression was added; all 15 structure checks and 22 inherited layout checks pass. The independent actual-parser test covers original audit fixture and a five-page midbook bibliography with continued references, arbitrary titles, and lists.

## Final integration corrections

A modest running journal title above a continuing citation is now retained as a bibliography continuation; an unfamiliar heading before prose still closes References. The inherited real-parser references-continuation regression and both independent CP20 reference fixtures pass.

The exporter honors `page.preserveVisualSource` independently of the optional full-page-evidence switch. Thus successful OCR of figure labels cannot discard the chart itself. Both standalone and streaming outputs use the shared serializer and deduplicate the image payload. Per-page warnings, incomplete coverage and uncertain mathematics remain visible, and those flags prevent a complete export claim. OCR-needs-review and digital-text are not confused with incomplete coverage.

Final affected suites passed: structure (18), current layout (22), inherited layout, inherited reader (15), actual PDF parser, extraction-boundary controls, geometry (27), Markdown (9), export lifecycle (9), and the two independent real reference fixtures. Each test's stated environment remains authoritative; Node/controlled-boundary results do not establish browser/OCR accuracy.

## Quota-rescue labeling correction

After actual browser quota fault injection exposed a volatile page overlay, `createStreamingMarkdown` accepts explicit `unsavedPages`. It retains those pages in the one-file rescue download while separately reporting available pages and durably saved latest versions. Any unsaved page forces a partial label. Export stats carry the exact unsaved page numbers. New regression passes; structure is now 19/19, and Markdown/export suites reran successfully.
