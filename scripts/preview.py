import argparse
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--strictPort', action='store_true')
args = parser.parse_args()
server = ThreadingHTTPServer((args.host, args.port), partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent.parent)))
print(f'Roomie development preview ready on port {args.port}', flush=True)
server.serve_forever()
