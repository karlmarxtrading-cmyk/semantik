# CP20 qualification envelope — declared before new capacity runs

Date: 2026-11-13. This file records the intended tests, not a promise of support.

- Input/product target: one PDF, local Indonesian ↔ English, one self-contained Markdown output; 300, 301, 1,000, 1,001 and 1,500 pages. The intended parser safety envelope is at most 2,000 pages / 100 MiB input with per-page limits retained. Capacity beyond the tested classes is not qualified.
- Digital capacity classes: synthetic one-column pages across mathematics, chemistry, economics, statistics, ecology, education, engineering, history and research methods. Every page and paragraph carries a trace ID. Numeric data and domain rotate; this is not one translated page reused thousands of times. There remain recurring sentence templates, which must be reported in cache/inference accounting.
- Rich text: 1,001 pages, 2,525,945 generator source characters and 13,013 unique ID-bearing paragraphs, independently crossing the previous 2,000,000-character ceiling. This is a parser/storage/export workload unless actual inference is separately recorded.
- Separate regressions: digital two-column, password, malformed PDF, rotated text, tables, equations, mixed scan and image-only scan fixtures already supplied. Node image-coverage/OCR planning does not qualify OCR model accuracy or browser OCR.
- Runtime available here: Linux container, Node 24.22.1, locked native Canvas 0.1.100 / PDF.js 6.2.108. fake-indexeddb 6.2.5 is a controlled storage boundary, not browser durability or quota behavior. Marked 17.0.1 plus KaTeX 0.19.1 is the declared Markdown test renderer.
- Device promises: no physical low-memory device, mobile device, sleep/wake hardware, or minimum hardware contract is qualified by Node or a cloud browser. No extrapolated time promise for real 1,500-page books.
- Memory: record Node RSS, heapUsed, external and arrayBuffers where measured. Node RSS is not total browser/worker/WASM/Canvas RAM. Never report heap as RAM total. Sampled peaks can miss short-lived maxima.
- Inference: actual model runs must record model hashes, direction, cold/warm timing, segments submitted, sentence cache hits and output status. Synthetic parser-only, doubles, or source-preserving exports cannot satisfy the mandatory complete-translation gate.
- Hosting: local preview cannot qualify Cloudflare response headers, immutable bytes, offline, update or rollback. Those results require the final actual build and separately observed network/service-worker behavior.
- Quality: AI-authored fixtures and AI review are labeled. Human reviewer approvals begin and remain 0 until actual independent review is supplied. No percentage accuracy is derived from guard pass counts.

Mandatory production decisions remain PASS, FAIL, NOT_RUN or BLOCKED per gate. Partial technical progress is described without converting an unrun gate into PASS.

## Observed qualification stop before the identifier repair

The first actual long-model attempt on build cp20-4130d88aca38edb8 was stopped after 116 committed pages because an identifier-only first sentence rejected the whole paragraph before scientific prose inference. The partial results are retained under `real-inference-before-identifier-fix/`. This is recorded as FAIL and is not long-document completion. A generic identifier handling repair and new build are required before continuing the acceptance run.
