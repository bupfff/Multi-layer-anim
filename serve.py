#!/usr/bin/env python3
"""
Tiny static server for this folder, with caching turned OFF.

python -m http.server sends Last-Modified, and browsers will happily keep
serving a stale assets/js/showcase.js or assets/css/showcase.css from cache
after you edit it — which looks exactly like "my change did nothing".
This sends no-store instead, so every reload gets the file you just saved.

Usage:  python3 serve.py [port]
        (start.command does this for you)
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep the console readable: only report problems
        status = str(args[1]) if len(args) > 1 else ""
        if status.startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    handler = partial(NoCacheHandler, directory=directory)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {directory} on http://localhost:{port}  (no-cache)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
