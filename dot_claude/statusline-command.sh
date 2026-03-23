#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract values from JSON
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
model=$(echo "$input" | jq -r '.model.display_name // ""')
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Get username and hostname
user=$(whoami)
host=$(hostname -s)

# Shorten path: replace $HOME with ~
short_dir="${cwd#$HOME}"
if [ "$short_dir" != "$cwd" ]; then
  short_dir="~$short_dir"
fi

# Initialize git info
git_info=""

# Check if we're in a git repository (skip optional locks to avoid issues)
if git -C "$cwd" --no-optional-locks rev-parse --git-dir > /dev/null 2>&1; then
  # Get current branch name
  branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null || git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)

  if [ -n "$branch" ]; then
    # Check for uncommitted changes (skip optional locks)
    if ! git -C "$cwd" --no-optional-locks diff --quiet 2>/dev/null || ! git -C "$cwd" --no-optional-locks diff --cached --quiet 2>/dev/null; then
      # Has uncommitted changes
      git_info=$(printf " \033[33m(%s *)\033[0m" "$branch")
    else
      # Clean repository
      git_info=$(printf " \033[32m(%s)\033[0m" "$branch")
    fi
  fi
fi

# Build context part only when available
ctx_part=""
if [ -n "$remaining" ]; then
  ctx_part=$(printf " \033[90m| ctx: %.0f%% left\033[0m" "$remaining")
fi

# Format: user@host ~/path/to/dir (git-branch *) [model] | ctx: N% left
printf "\033[1;32m%s@%s\033[0m:\033[1;34m%s\033[0m%s \033[1;35m[%s]\033[0m%s" \
  "$user" "$host" "$short_dir" "$git_info" "$model" "$ctx_part"
