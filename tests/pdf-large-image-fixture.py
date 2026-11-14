"""Construct a labelled valid PDF whose one image exceeds the decoder pixel cap.
Raster is white; no historical user PDF involved. Streaming compression avoids
allocating its entire uncompressed sample buffer in the fixture generator.
"""
from pathlib import Path
import zlib,hashlib,json
r=Path(__file__).resolve().parent/'fixtures';p=r/'oversized-image.pdf'
c=zlib.compressobj();parts=[];remaining=5001*5000*3
while remaining:
 n=min(remaining,1024*1024);parts.append(c.compress(b'\xff'*n));remaining-=n
parts.append(c.flush());image=b''.join(parts)
content=b'q 595 0 0 842 0 0 cm /Im1 Do Q'
objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',b'<< /Length '+str(len(content)).encode()+b' >>\nstream\n'+content+b'\nendstream',b'<< /Type /XObject /Subtype /Image /Width 5001 /Height 5000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length '+str(len(image)).encode()+b' >>\nstream\n'+image+b'\nendstream',b'<< /Title (CP18 SYNTHETIC FIXTURE: oversized image decoder rejection) >>']
out=bytearray(b'%PDF-1.7\n');offsets=[0]
for i,o in enumerate(objects,1):offsets.append(len(out));out+=f'{i} 0 obj\n'.encode()+o+b'\nendobj\n'
xref=len(out);out+=f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
for off in offsets[1:]:out+=f'{off:010d} 00000 n \n'.encode()
out+=f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode();p.write_bytes(out)
m=json.loads((r/'MANIFEST.json').read_text());m['files']=[x for x in m['files'] if x['file']!=p.name]+[{'file':p.name,'bytes':len(out),'sha256':hashlib.sha256(out).hexdigest(),'origin':'CP18 synthetic oversized-image regression fixture','historical_user_pdf':False}];(r/'MANIFEST.json').write_text(json.dumps(m,indent=2));print(p,len(out))
