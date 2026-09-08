#!/bin/sh
set -e

CONFIG_DIR="${TDRIVE_CONFIG_DIR:-/root/.tdrive}"

# Wait for tdrive init to be run manually (needs Telegram API credentials)
if [ ! -f "$CONFIG_DIR/config.json" ]; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║ TDrive is not initialized yet.                          ║"
  echo "║                                                          ║"
  echo "║ Run these commands in another terminal:                  ║"
  echo "║   docker exec -it <container> tdrive init               ║"
  echo "║   docker exec -it <container> tdrive login              ║"
  echo "║                                                          ║"
  echo "║ Waiting for config.json to appear...                     ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  while [ ! -f "$CONFIG_DIR/config.json" ]; do
    sleep 5
  done
  echo ">>> Config found! Starting TDrive API server..."
fi

exec python -m api.main
