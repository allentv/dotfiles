# AGENTS.md — dotfiles

This is a personal dotfiles repo managed with [chezmoi](https://chezmoi.io) and [mise](https://mise.jdx.dev).
This file provides context for AI agents working in this repo. Also read `CLAUDE.md` for full conventions.

## What this repo does

Applies an identical personal dev environment to any machine via one command:

```bash
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply git@github.com-personal:allentv/dotfiles.git
```

Chezmoi manages config file placement; a single `run_once_setup.sh.tmpl` script handles all installation
in parallel stages.

## Key concepts to understand before making changes

### chezmoi naming
Files in this repo map to `~/` via prefixes:
- `dot_foo` → `~/.foo`
- `dot_config/bar` → `~/.config/bar`
- `foo.tmpl` → rendered as a Go template before being written
- `run_once_*.sh` → executed once per machine on `chezmoi apply`

### Tool installation layers
| Layer | File | Mechanism |
|---|---|---|
| Language runtimes + CLI tools | `dot_config/mise/config.toml` | `mise install` |
| mise behaviour (parallelism etc.) | `dot_config/mise/settings.toml` | read by mise on startup |
| System packages | `run_once_setup.sh.tmpl` → `install_system_packages` | apt / dnf / yum / brew |
| Optional tools | `run_once_setup.sh.tmpl` + `.chezmoi.yaml.tmpl` | prompted at init, conditional install |

### Parallel install stages
```
Stage 1: mise
Stage 2: languages (mise)  +  system packages  +  docker (optional)
Stage 3: claude code        +  oh-my-zsh        +  kubectl (optional)
```

## Common tasks

### Add a CLI tool managed by mise
Add one line to `dot_config/mise/config.toml`:
```toml
mytool = "latest"
```

### Add a required system package
Add to `install_system_packages` in `run_once_setup.sh.tmpl`:
```bash
command -v mytool &>/dev/null || with_retry 3 5 pkg_install mypackage
```

### Add an optional install
1. Add `promptBoolOnce` to `.chezmoi.yaml.tmpl`
2. Add guarded `install_X` function in `run_once_setup.sh.tmpl`
3. Add to the appropriate stage array

See `CLAUDE.md` for the exact pattern.

### Run smoke tests (requires Docker)
```bash
./tests/run.sh
```
This builds `tests/Dockerfile.ubuntu`, runs the full chezmoi bootstrap inside it, then executes `tests/verify.sh`. Add checks there when adding new required tools.

### Add a new dotfile
```bash
chezmoi add ~/path/to/file
```
Then commit the resulting `dot_*` file.

## Hard rules

- **No secrets** — no tokens, keys, or credentials anywhere in the repo
- **No absolute paths** — use `{{ .chezmoi.homeDir }}` in `.tmpl` files, `$HOME` in shell scripts
- **No company-specific config** — internal hostnames, private registries, or org-specific env vars must not appear
- **Idempotent installs** — every install function must check before installing
- **Cross-platform** — changes must work on macOS, Ubuntu/Debian, Amazon Linux 2023, and CentOS 7
- **Network calls need retry** — wrap with `with_retry 3 <delay_secs> <command>`

## Repository structure

```
CLAUDE.md                               # Claude Code specific conventions (read this too)
AGENTS.md                               # this file
.chezmoi.yaml.tmpl                      # optional install prompts + template data
run_once_setup.sh.tmpl                  # parallel bootstrap (runs once per machine)
dot_gitconfig                           # ~/.gitconfig
dot_zshrc.tmpl                          # ~/.zshrc
dot_p10k.zsh                            # ~/.p10k.zsh (powerlevel10k config)
dot_config/mise/config.toml             # ~/.config/mise/config.toml
dot_config/mise/settings.toml          # ~/.config/mise/settings.toml (behaviour settings)
dot_claude/
  settings.json.tmpl                    # ~/.claude/settings.json
  statusline-command.sh                 # claude code statusline script
  scripts/check-local-settings.sh       # session-start hook
  templates/settings.local.default.json # default permission template
tests/
  Dockerfile.ubuntu                     # smoke test image (ubuntu:24.04)
  chezmoi.yaml                          # pre-fills prompts for non-interactive test runs
  verify.sh                             # checks all key tools are present post-bootstrap
  run.sh                                # orchestrator: ./tests/run.sh
```

## Git

- Personal GitHub account: `allentv` — not the work org
- Remote: `git@github.com-personal:allentv/dotfiles.git`
- Local git config is already set with personal name/email — do not change it
- Commit convention: `chore:`, `feat:`, `fix:`, `docs:`
