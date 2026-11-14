# Fresh recovery acceptance: FAIL / NOT PRODUCTION READY

Build: cp20-2e4d8ef18eb32385. Actual engine: 20 translated, 0 rejected, 42 inference calls, 0 cache hits.
AI review: {'critical': 12, 'major': 4, 'minor': 3, 'adequate': 1}. Human approvals: 0. Counts are sample-specific, not population accuracy.

Guard acceptance is not semantic correctness. All source and actual targets are preserved in AI_REVIEW.json and INFERENCE.json. Product remains frozen; this corpus has not been used for tuning.

| ID | Severity | Finding |
|---|---|---|
| F01-en-id | critical | bounded becomes terikat; need not hold becomes tidak harus pegang. Mathematical predicate corrupted. |
| F02-en-id | critical | Matrix inverse becomes memiliki terbalik, failing to preserve the inverse-matrix concept. |
| F03-en-id | critical | Diluting becomes Membagikan (distributing). Operation on solution changes. |
| F04-en-id | major | Reaction rate becomes tingkat reaksi and equilibrium yield hasil keseimbangan. Terminology needs correction. |
| F05-en-id | major | Frequentist becomes requentist; repeated-sampling coverage awkward. Numbers/negation preserved, terminology not ready. |
| F06-en-id | critical | Random assignment becomes Tugas acak. Technical assignment concept lost; confounding remains konfounding. |
| F07-en-id | critical | Price ceiling becomes literal langit-langit; quantities of goods become pembeli kuantitas and penjual kuantitas; seller offer relation omitted. |
| F08-en-id | critical | Economic goods becomes baik / kebaikan yang lebih rendah. Inferior-good concept lost. |
| F09-en-id | major | Outcomes narrowed to hasil pemeriksaannya and doubled as pemeriksaannya diperiksa. Timing survives; wording requires correction. |
| F10-en-id | adequate | Causality, incomplete table, raw measurements, further checks and non-guarantee preserved in this sample. |
| F01-id-en | critical | Attains maximum disappears into limited to maximum value. Boundedness and maximum attainment merged. |
| F02-id-en | major | Determinant sufficiency recoverable, but Determinan is not zero sufficient condition is malformed and scope ambiguous. |
| F03-id-en | critical | Mengencerkan becomes Expand; amount of solute becomes number of substances. Operation and quantity meaning changed. |
| F04-id-en | critical | Equilibrium constant becomes balance of the balance; equilibrium yield becomes greater balance. Essential concepts omitted. |
| F05-id-en | critical | Frequentist becomes frequency; fixed parameter lying inside becomes parameters remain within it. Scientific interpretation changed. |
| F06-id-en | critical | Perancu (confounding) becomes role. Causal-design proposition changed. |
| F07-id-en | critical | Quantity purchased versus supplied becomes amount of buyers and number of sellers offered. Compared with becomes rather than. |
| F08-id-en | minor | Inferior-good concept and negation preserved; need not increases is grammar error. |
| F09-id-en | minor | Timing, reduced opportunity and non-proof preserved. Final clause lacks is. |
| F10-id-en | minor | Core causal/non-guarantee propositions preserved. Distribution less precise than provision; tense shifts. |
