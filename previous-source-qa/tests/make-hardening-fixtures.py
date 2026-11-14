"""Reproduce bounded-text and resumed-reference PDF regression fixtures."""
from pathlib import Path
from reportlab.pdfgen import canvas

directory = Path(__file__).parent / 'fixtures'

c = canvas.Canvas(str(directory / 'text-limit.pdf'), pagesize=(595, 842), invariant=1)
c.setTitle('Synthetic adversarial text-size fixture')
c.setFont('Helvetica', 12)
c.drawString(30, 800, 'This complete first page must remain available.')
c.showPage()
c.setFont('Helvetica', 0.001)
c.drawString(30, 800, 'A' * 250001)
c.save()

c = canvas.Canvas(str(directory / 'references-continuation.pdf'), pagesize=(595, 842), invariant=1)
c.setTitle('Synthetic bibliography checkpoint fixture')
c.setFont('Helvetica-Bold', 16)
c.drawString(40, 790, 'References')
c.setFont('Helvetica', 10)
c.drawString(40, 750, 'Smith, A. (2025). Education research. doi:10.1234/first')
c.showPage()
c.setFont('Helvetica-Bold', 13)
c.drawString(40, 790, 'Journal of Synthetic Studies')
c.setFont('Helvetica', 10)
c.drawString(40, 750, 'Jones, B. (2026). Follow-up research. doi:10.1234/second')
c.save()
