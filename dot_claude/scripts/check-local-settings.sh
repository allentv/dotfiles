#!/bin/bash
# Checks if .claude/settings.local.json exists in the current repo.
# If not, lists available templates and notifies Claude to prompt the user.

if [ -f ".claude/settings.local.json" ]; then
  exit 0
fi

TEMPLATE_DIR="$HOME/.claude/templates"

if [ ! -d "$TEMPLATE_DIR" ]; then
  exit 0
fi

templates=()
while IFS= read -r f; do
  name=$(basename "$f" | sed 's/^settings\.local\.\(.*\)\.json$/\1/')
  templates+=("$name")
done < <(ls "$TEMPLATE_DIR"/settings.local.*.json 2>/dev/null)

if [ ${#templates[@]} -eq 0 ]; then
  exit 0
fi

template_list=$(IFS=', '; echo "${templates[*]}")

printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "No .claude/settings.local.json found in this repo. Available permission templates: %s. Ask the user if they want to load one."}}\n' "$template_list"
