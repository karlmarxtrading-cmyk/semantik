# Source visual inspection

The assistant rendered the actual supplied mathematics_fixture.pdf and the independently generated controls PDF with Poppler and viewed both PNGs on 2026-11-12. This is AI visual inspection of source imagery, not an independent human review and not yet comparison with rendered integrated Markdown.

Audit source image confirms visibly: y=x with raised 2; z=a with lowered i; stacked x+1 over x−1; integral lower 0 and upper 1 of x squared dx equals stacked 1 over 3; A bracketed 2x2 matrix rows 1,2 / 3,4; sin/log function notation; separate strict and non-strict inequalities. Those eight expressions agree structurally with the new geometry AST and LaTeX strings. The footer describes expected structure, but is not consumed by the implementation.

Independent controls image confirms: simultaneous b sub j / super 3; a nested fraction with 1/(u+2) as the numerator and v−3 as denominator; integral 2 to 4 of t cubed dt; a 2x3 alphabetic matrix; a derivative prime; real-set membership; a naked radical with no extensional bar. The last is intentionally unverified. Prose containing p=0.05 remains prose in this prototype.

Integrated exported Markdown must still be rendered by the selected renderer and compared to these source PNGs. This research does not close that gate.
