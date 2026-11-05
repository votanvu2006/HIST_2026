import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]


def _routes():
    return json.loads((ROOT / "frontend" / "vercel.json").read_text(encoding="utf-8"))["rewrites"]


def test_vercel_sends_api_requests_to_backend_before_spa_fallback():
    routes = _routes()
    api_index = next(i for i, route in enumerate(routes) if route["source"].startswith("/api/"))
    spa_index = next(i for i, route in enumerate(routes) if route["source"] == "/(.*)")

    assert api_index < spa_index
    assert routes[api_index]["destination"].startswith("https://hist-2026-zi6p.vercel.app/api/")
    assert routes[spa_index]["destination"] == "/index.html"


def test_api_rewrites_preserve_the_path_to_the_backend():
    route = next(route for route in _routes() if route["source"].startswith("/api/"))
    paths = (
        "/api/health",
        "/api/chat",
        "/api/transcribe",
        "/api/admin/chat",
        "/api/admin/corpus",
        "/api/admin/metrics",
    )
    pattern = re.compile("^" + route["source"] + "$")

    for path in paths:
        match = pattern.match(path)
        assert match, path
        destination = route["destination"].replace("$1", match.group(1))
        assert destination == "https://hist-2026-zi6p.vercel.app" + path
