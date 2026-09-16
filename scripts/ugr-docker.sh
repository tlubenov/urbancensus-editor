#!/bin/sh
# Run a command in Node 22 with this repository mounted at /work (the host has no Node).
set -e
repo="$(cd "$(dirname "$0")/.." && pwd)"
exec docker run --rm -i \
  -u "$(id -u):$(id -g)" \
  -e HOME=/tmp -e CI=true \
  -v "$repo":/work -w /work \
  node:22-bookworm "$@"
