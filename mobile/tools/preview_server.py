"""Serve the exported Expo web preview, including client-side route fallbacks."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8092)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / 'dist-web'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(root), **kw)
    def do_GET(self):
        if not (root / self.path.split('?')[0].lstrip('/')).is_file() and not self.path.startswith('/_expo/') and '.' not in self.path.split('?')[0].rsplit('/', 1)[-1]:
            self.path = '/index.html'
        super().do_GET()
    def log_message(self, *_): pass
print(f'Expo preview http://127.0.0.1:{args.port}', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
