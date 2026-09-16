#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 server.py &
xdg-open http://localhost:8000 >/dev/null 2>&1 &
