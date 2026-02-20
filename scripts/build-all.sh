#!/usr/bin/env bash
set -euo pipefail

BINARY_NAME="sandctl"
VERSION="${SANDCTL_VERSION:-dev}"
COMMIT="${SANDCTL_COMMIT:-unknown}"
BUILD_TIME="${SANDCTL_BUILD_TIME:-unknown}"

TARGETS=(
  "bun-darwin-arm64:${BINARY_NAME}-darwin-arm64"
  "bun-darwin-x64:${BINARY_NAME}-darwin-x64"
  "bun-linux-x64:${BINARY_NAME}-linux-x64"
  "bun-linux-arm64:${BINARY_NAME}-linux-arm64"
)

for entry in "${TARGETS[@]}"; do
  target="${entry%%:*}"
  outfile="${entry##*:}"
  echo "Building ${outfile} (${target})..."
  bun build src/index.ts --compile --target="${target}" --outfile "${outfile}" \
    --define __SANDCTL_VERSION__="\"${VERSION}\"" \
    --define __SANDCTL_COMMIT__="\"${COMMIT}\"" \
    --define __SANDCTL_BUILD_TIME__="\"${BUILD_TIME}\""
done

echo "Build complete."
