CP18 PDF/MATHEMATICS AUDIT EVIDENCE

Main result: pdf_math_findings.json
Actual math fixture: mathematics_fixture.pdf (rendered and visually checked)
Actual extraction/output: math_node_extraction.json, MATHEMATICS_ACTUAL_SOURCE_EXPORT.md
Additional actual PDF coverage probe: repeated_images_fixture.pdf, repeated_image_result.json

Reproduce from this folder, with the source release still at ../../source/r/7a8e787a497535f5:
  python3 make_math_fixture.py
  "$CODEX_PRIMARY_RUNTIME_NODE" extract_math_node.mjs
  python3 make_repeated_image_fixture.py
  "$CODEX_PRIMARY_RUNTIME_NODE" repeated_image_probe.mjs

The runtime must supply @napi-rs/canvas at CODEX_PRIMARY_RUNTIME_NODE_MODULES.
Node parser harness uses actual uploaded PDF.js and exact application functions.
Environment shims are explicitly listed in math_node_extraction.json.
This is not a full browser/OCR/model end-to-end test.

extract_math_browser.mjs is a separate browser harness. It requires an HTTP
server serving audit_cp18 at 127.0.0.1:8783. It was attempted but Chromium
was blocked by OS socket restrictions before any application code loaded.
No browser success is claimed.

Fixture PNG files are Poppler renders of the synthetic PDFs, not browser
screenshots. They are included to make the source mathematical structure
and image-only text regions easy to verify.
