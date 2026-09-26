#!/bin/bash
# Double-click this file to run the local copy of the animejs.com homepage.
cd "$(dirname "$0")" || exit 1

PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done

echo "Serving $(pwd)"
echo "Open http://localhost:$PORT  (Ctrl-C here to stop)"
( sleep 1; open "http://localhost:$PORT" ) &
exec python3 serve.py "$PORT"
