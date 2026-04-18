#!/usr/bin/env python3
"""Week02 backend MVP: minimal API server with /api/health."""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from datetime import datetime, timezone


class Handler(BaseHTTPRequestHandler):
    def _json(self, status: int, payload: dict) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self._json(200, {"ok": True})

    def do_GET(self):
        if self.path == "/api/health":
            self._json(
                200,
                {
                    "status": "ok",
                    "service": "fungi-mvp-week02-backend",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "version": "0.1.0",
                },
            )
            return

        if self.path == "/":
            self._json(200, {"message": "Backend running. Use /api/health"})
            return

        self._json(404, {"error": "not_found", "path": self.path})


if __name__ == "__main__":
    host = "0.0.0.0"
    port = 8080
    server = HTTPServer((host, port), Handler)
    print(f"Backend running at http://{host}:{port}")
    server.serve_forever()
