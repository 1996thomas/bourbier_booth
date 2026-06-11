#!/usr/bin/env python3
"""
Bourbier Mirror — local print server
Listens on localhost:9456, receives POST /print from the web app,
and sends the image to the thermal printer via CUPS (lp).

Usage:
    # Printer already registered in CUPS — pass its name:
    python3 server.py bourbier

    # Pass USB URI directly — auto-registers under the name "bourbier":
    python3 server.py "usb://EPSON/TM-T88V?serial=544552468263250000"
"""

import base64
import json
import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer

CUPS_NAME = "bourbier"   # name used when auto-registering via URI


def register_printer(uri: str) -> str:
    """Register URI in CUPS as CUPS_NAME (idempotent). Returns the name to use with lp."""
    # Check if already registered
    check = subprocess.run(["lpstat", "-p", CUPS_NAME], capture_output=True)
    if check.returncode == 0:
        print(f"[print-server] Printer '{CUPS_NAME}' already registered — skipping lpadmin")
        return CUPS_NAME

    print(f"[print-server] Registering '{CUPS_NAME}' → {uri}")
    result = subprocess.run(
        ["lpadmin", "-p", CUPS_NAME, "-E", "-v", uri, "-m", "everywhere"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        # "everywhere" (IPP driverless) may not work for USB receipt printers.
        # Fall back to "raw" which passes the rasterised PNG straight through.
        print(f"[print-server] 'everywhere' driver failed, retrying with 'raw'…")
        result = subprocess.run(
            ["lpadmin", "-p", CUPS_NAME, "-E", "-v", uri, "-o", "raw"],
            capture_output=True, text=True,
        )
    if result.returncode != 0:
        raise RuntimeError(f"lpadmin failed: {result.stderr.strip()}")

    # Accept jobs and enable
    subprocess.run(["cupsaccept", CUPS_NAME], capture_output=True)
    subprocess.run(["cupsenable", CUPS_NAME], capture_output=True)
    print(f"[print-server] Printer '{CUPS_NAME}' registered OK")
    return CUPS_NAME


arg = sys.argv[1] if len(sys.argv) > 1 else None
if arg and arg.startswith("usb://"):
    PRINTER = register_printer(arg)
else:
    PRINTER = arg   # None → CUPS default, or an already-registered name


class Handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self._cors()
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path != "/print":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length))
        except Exception:
            self._error(400, "Invalid JSON")
            return

        data_url = body.get("imageBase64", "")
        if not data_url:
            self._error(400, "Missing imageBase64")
            return

        # Strip data URL prefix  (data:image/png;base64,XXXX)
        if "," in data_url:
            data_url = data_url.split(",", 1)[1]

        try:
            img_bytes = base64.b64decode(data_url)
        except Exception:
            self._error(400, "Invalid base64")
            return

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(img_bytes)
            tmp = f.name

        try:
            cmd = ["lp", "-o", "fit-to-page", "-o", "media=Custom.80x297mm"]
            if PRINTER:
                cmd += ["-d", PRINTER]
            cmd.append(tmp)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or f"lp exited {result.returncode}")
            self._ok({"ok": True, "job": result.stdout.strip()})
            print(f"[print-server] Print OK — {result.stdout.strip()}")
        except Exception as e:
            self._error(500, str(e))
            print(f"[print-server] Print ERROR — {e}")
        finally:
            os.unlink(tmp)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _ok(self, data: dict):
        body = json.dumps(data).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, code: int, msg: str):
        body = json.dumps({"error": msg}).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"[print-server] {fmt % args}")


if __name__ == "__main__":
    host = "127.0.0.1"
    port = 9456
    printer_label = PRINTER or "(CUPS default)"
    print(f"[print-server] Listening on http://{host}:{port}  →  {printer_label}")
    HTTPServer((host, port), Handler).serve_forever()
