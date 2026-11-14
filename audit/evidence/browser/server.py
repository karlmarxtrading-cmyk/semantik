from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

SOURCE = Path(__file__).resolve().parents[2] / 'source'
CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data: blob:; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SOURCE), **kwargs)
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if self.path.startswith('/r/') else 'no-cache')
        super().end_headers()
    def log_message(self, fmt, *args):
        pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--port', type=int, default=8765)
    args=parser.parse_args()
    print(f'Serving unchanged CP18 at http://127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
