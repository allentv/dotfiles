#!/usr/bin/env bash
# Smoke-test: verify key tools are available after chezmoi apply.
# Exit 0 = all checks pass; exit 1 = one or more checks failed.

set -euo pipefail

PASS=0
FAIL=0
FAILURES=()

check() {
  local label="$1"
  shift
  if "$@" &>/dev/null; then
    echo "  [OK]  $label"
    ((PASS++)) || true
  else
    echo "  [FAIL] $label"
    ((FAIL++)) || true
    FAILURES+=("$label")
  fi
}

echo "=== Smoke test starting ==="

# mise itself
check "mise installed"        command -v mise

# Shell
check "zsh installed"         command -v zsh
check "tmux installed"        command -v tmux

# mise-managed languages (sourcing mise shims)
export PATH="$HOME/.local/bin:$PATH"
eval "$(mise activate bash)" 2>/dev/null || true

check "node available"        command -v node
check "go available"          command -v go
check "python available"      command -v python3

# CLI tools installed via mise
check "jq available"          command -v jq
check "ripgrep (rg) available" command -v rg
check "bat available"         command -v bat
check "eza available"         command -v eza
check "fzf available"         command -v fzf
check "zoxide available"      command -v zoxide
check "lazygit available"     command -v lazygit
check "delta available"       command -v delta
check "yq available"          command -v yq

# System packages
check "htop available"        command -v htop
check "tree available"        command -v tree
check "curl available"        command -v curl
check "git available"         command -v git

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [[ ${FAIL} -gt 0 ]]; then
  echo "Failed checks:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
