#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 -m http.server 8000 &
xdg-open http://localhost:8000 >/dev/null 2>&1 &
