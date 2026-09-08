#!/bin/sh
set -e

CONFIG_DIR="${TDRIVE_CONFIG_DIR:-/root/.tdrive}"

# Auto-initialize if config doesn't exist
if [ ! -f "$CONFIG_DIR/config.json" ]; then
  echo ">>> TDrive config not found. Running tdrive init..."
  tdrive init || echo ">>> tdrive init returned non-zero (may need interactive setup)"
  echo ">>> Starting TDrive API server..."
fi

exec python -m api.main
