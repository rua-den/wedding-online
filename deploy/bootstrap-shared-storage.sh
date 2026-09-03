#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${1:-$(pwd)}"
APP_NAME="${PM2_APP_NAME:-huy-nhi-wedding}"
SHARED="$APP_ROOT/shared"
ROOT_ENV="$APP_ROOT/.env"
ROOT_DATA="$APP_ROOT/data"
ROOT_UPLOADS="$APP_ROOT/public/uploads"

case "$APP_ROOT" in
  /*) ;;
  *) APP_ROOT="$(cd "$APP_ROOT" && pwd)"; SHARED="$APP_ROOT/shared"; ROOT_ENV="$APP_ROOT/.env"; ROOT_DATA="$APP_ROOT/data"; ROOT_UPLOADS="$APP_ROOT/public/uploads" ;;
esac

[ "$APP_ROOT" != "/" ] || { echo "Refusing to use / as APP_ROOT" >&2; exit 1; }
mkdir -p "$APP_ROOT/public" "$SHARED"

if [ -e "$SHARED/data" ] && [ ! -d "$SHARED/data" ]; then
  echo "$SHARED/data exists but is not a directory" >&2
  exit 1
fi
if [ -e "$SHARED/uploads" ] && [ ! -d "$SHARED/uploads" ]; then
  echo "$SHARED/uploads exists but is not a directory" >&2
  exit 1
fi

if [ -d "$SHARED/data" ] && [ ! -L "$ROOT_DATA" ] && [ -d "$ROOT_DATA" ]; then
  if [ -n "$(find "$SHARED/data" -mindepth 1 -maxdepth 1 -print -quit)" ] && [ -n "$(find "$ROOT_DATA" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    echo "Both $SHARED/data and $ROOT_DATA contain data. Refusing to merge automatically." >&2
    exit 1
  fi
fi
if [ -d "$SHARED/uploads" ] && [ ! -L "$ROOT_UPLOADS" ] && [ -d "$ROOT_UPLOADS" ]; then
  if [ -n "$(find "$SHARED/uploads" -mindepth 1 -maxdepth 1 -print -quit)" ] && [ -n "$(find "$ROOT_UPLOADS" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    echo "Both $SHARED/uploads and $ROOT_UPLOADS contain files. Refusing to merge automatically." >&2
    exit 1
  fi
fi

WAS_RUNNING=0
if command -v pm2 >/dev/null 2>&1 && pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  WAS_RUNNING=1
  pm2 stop "$APP_NAME"
fi

restart_app() {
  if [ "$WAS_RUNNING" -eq 1 ]; then
    pm2 start "$APP_NAME" >/dev/null 2>&1 || pm2 restart "$APP_NAME" >/dev/null 2>&1 || true
  fi
}
trap restart_app EXIT

if [ ! -e "$SHARED/.env" ]; then
  [ -f "$ROOT_ENV" ] || { echo "Missing $ROOT_ENV. Create the production .env before bootstrapping." >&2; exit 1; }
  mv "$ROOT_ENV" "$SHARED/.env"
elif [ -f "$ROOT_ENV" ] && [ ! -L "$ROOT_ENV" ]; then
  cmp -s "$ROOT_ENV" "$SHARED/.env" || {
    echo "Both $ROOT_ENV and $SHARED/.env exist with different contents. Reconcile them manually." >&2
    exit 1
  }
  rm "$ROOT_ENV"
fi
rm -f "$ROOT_ENV"
ln -s "$SHARED/.env" "$ROOT_ENV"

if [ ! -e "$SHARED/data" ]; then
  if [ -L "$ROOT_DATA" ]; then
    echo "$ROOT_DATA is already a symlink but $SHARED/data is missing." >&2
    exit 1
  elif [ -d "$ROOT_DATA" ]; then
    mv "$ROOT_DATA" "$SHARED/data"
  else
    mkdir -p "$SHARED/data"
  fi
elif [ -d "$ROOT_DATA" ] && [ ! -L "$ROOT_DATA" ] && [ -z "$(find "$SHARED/data" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  cp -a "$ROOT_DATA/." "$SHARED/data/"
  rm -rf "$ROOT_DATA"
fi
rm -rf "$ROOT_DATA"
ln -s "$SHARED/data" "$ROOT_DATA"
mkdir -p "$SHARED/data/backups"

if [ ! -e "$SHARED/uploads" ]; then
  if [ -L "$ROOT_UPLOADS" ]; then
    echo "$ROOT_UPLOADS is already a symlink but $SHARED/uploads is missing." >&2
    exit 1
  elif [ -d "$ROOT_UPLOADS" ]; then
    mv "$ROOT_UPLOADS" "$SHARED/uploads"
  else
    mkdir -p "$SHARED/uploads"
  fi
elif [ -d "$ROOT_UPLOADS" ] && [ ! -L "$ROOT_UPLOADS" ] && [ -z "$(find "$SHARED/uploads" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  cp -a "$ROOT_UPLOADS/." "$SHARED/uploads/"
  rm -rf "$ROOT_UPLOADS"
fi
rm -rf "$ROOT_UPLOADS"
ln -s "$SHARED/uploads" "$ROOT_UPLOADS"

trap - EXIT
restart_app

echo "Shared storage ready:"
echo "  env:     $SHARED/.env"
echo "  data:    $SHARED/data"
echo "  uploads: $SHARED/uploads"
echo "Legacy paths now point to shared storage, so the current manual PM2 deployment can keep running until CD is enabled."
