#!/usr/bin/env bash
# Run smoke tests locally using Docker.
# Usage:
#   ./tests/run.sh            # test Ubuntu only
#   ./tests/run.sh --all      # test all platforms (when more Dockerfiles added)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_ALL="${1:-}"

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local dockerfile="$2"
  local image="dotfiles-smoke-${name}"

  echo ""
  echo "━━━ Testing: ${name} ━━━"

  if docker build \
       --file "${REPO_ROOT}/${dockerfile}" \
       --tag "${image}" \
       "${REPO_ROOT}" \
       && docker run --rm "${image}"; then
    echo "✓ ${name} passed"
    ((PASS++)) || true
  else
    echo "✗ ${name} FAILED"
    ((FAIL++)) || true
  fi
}

run_test "ubuntu" "tests/Dockerfile.ubuntu"

if [[ "$RUN_ALL" == "--all" ]]; then
  # Placeholder: add more Dockerfiles here as needed
  # run_test "amazonlinux" "tests/Dockerfile.amazonlinux"
  echo "(--all: only Ubuntu Dockerfile exists currently)"
fi

echo ""
echo "━━━ Smoke test summary: ${PASS} passed, ${FAIL} failed ━━━"
[[ $FAIL -eq 0 ]]
