#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=================================================="
echo "  TRENDSCOPE AI — NILE DELTA EDITION"
echo "  Building & Starting Unified Server (Single Link)"
echo "=================================================="

if [ ! -d ".venv" ]; then
  echo "Python virtualenv .venv not found. Creating and installing backend requirements..."
  python3 -m venv .venv
  ./.venv/bin/pip install -r backend/requirements.txt
fi

echo "Building frontend into dist/ ..."
npm run build

echo ""
echo "Unified App & API: http://localhost:8000"
echo "Press Ctrl+C to stop."
echo ""

exec ./.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000

