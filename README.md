# dotfiles

Personal dev environment config managed with [chezmoi](https://chezmoi.io).

## What's included

| Config | Tool |
|--------|------|
| `dot_claude/` | Claude Code — settings, hooks, scripts, templates |
| `dot_config/mise/config.toml` | mise — node (lts), go, rust, python (all latest) |

## Bootstrap a new machine

```bash
# 1. Install chezmoi
sh -c "$(curl -fsLS get.chezmoi.io)"

# 2. Apply dotfiles (prompts for secrets on first run)
chezmoi init --apply git@github.com:you/dotfiles.git
```

On first run chezmoi will prompt for:
- **OTEL bearer token** — or set `OTEL_TOKEN` env var to skip the prompt
- **OTEL employee identifier** — or set `OTEL_EMPLOYEE` env var

The `run_once_` scripts will then install mise and Claude Code automatically.

## Updating

```bash
# Pull latest and reapply
chezmoi update
```

## Adding new config

```bash
# Add a file to be managed by chezmoi
chezmoi add ~/.config/nvim

# Edit a managed file
chezmoi edit ~/.claude/settings.json

# Preview what chezmoi would change
chezmoi diff
```

## Machine-specific permissions

Repo-specific or machine-specific tool permissions should go in
`.claude/settings.local.json` (gitignored per repo). Use the
`~/.claude/templates/` to store named permission presets and load
them per repo — Claude will prompt you at session start if none exists.

## Structure

```
.chezmoi.yaml.tmpl                  # chezmoi config + secret prompts
run_once_01-install-mise.sh         # installs mise (runs once per machine)
run_once_02-install-claude.sh       # installs Claude Code via mise+npm
run_once_03-install-languages.sh    # installs go, rust, python via mise
dot_config/
  mise/config.toml                  # ~/.config/mise/config.toml — global tool versions
dot_claude/
  settings.json.tmpl                # ~/.claude/settings.json (templated)
  statusline-command.sh             # custom status line
  scripts/
    check-local-settings.sh         # SessionStart hook: prompt for template
  templates/
    settings.local.default.json     # default permissions template
```
