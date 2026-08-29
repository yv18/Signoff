#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-uploads}"

if [ ! -f "$UPLOAD_DIR/icons/linkedin.png" ]; then
  echo "[entrypoint] rendering social icons into $UPLOAD_DIR/icons ..."
  node src/scripts/build-icons.js || echo "[entrypoint] icon render failed, continuing"
fi

exec "$@"
