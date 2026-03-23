# CLAUDE.md — dotfiles

This is a personal dotfiles repo managed with [chezmoi](https://chezmoi.io).
Read this before making any changes.

## Chezmoi file naming conventions

Chezmoi maps repo filenames to filesystem paths using prefixes and suffixes:

| Repo name | Filesystem path | Notes |
|---|---|---|
| `dot_zshrc.tmpl` | `~/.zshrc` | `dot_` → `.`, `.tmpl` → rendered via Go templates |
| `dot_gitconfig` | `~/.gitconfig` | plain file, copied as-is |
| `dot_config/mise/config.toml` | `~/.config/mise/config.toml` | nested directories work the same way |
| `dot_config/mise/settings.toml` | `~/.config/mise/settings.toml` | mise behaviour settings (jobs, etc.) |
| `dot_claude/settings.json.tmpl` | `~/.claude/settings.json` | |
| `private_dot_ssh/config` | `~/.ssh/config` | `private_` → permissions set to 600/700 |
| `run_once_setup.sh.tmpl` | runs once on `chezmoi apply` | `run_once_` = idempotent; re-runs if file content changes |
| `.chezmoi.yaml.tmpl` | chezmoi config itself | rendered first; provides `data:` values to all other templates |

**Always use `dot_` prefix** for files that belong in `~/` with a leading dot.
**Use `.tmpl` suffix** only when the file needs `{{ .variable }}` substitution or OS conditionals.

## Template variables

Variables are defined in `.chezmoi.yaml.tmpl` under `data:` and referenced in `.tmpl` files as `{{ .variableName }}`.

Current variables:
- `{{ .installDocker }}` — bool, whether to install Docker
- `{{ .installKubectl }}` — bool, whether to install kubectl
- `{{ .chezmoi.homeDir }}` — built-in, expands to `~`

**Do not hardcode absolute paths** in any `.tmpl` file. Always use `{{ .chezmoi.homeDir }}`.

## Smoke tests

`tests/` contains a Docker-based smoke test that validates the full bootstrap on a clean machine.

```
tests/
  Dockerfile.ubuntu   # ubuntu:24.04 image — runs chezmoi bootstrap then verify.sh
  chezmoi.yaml        # pre-fills all prompts (installDocker/installKubectl = false)
  verify.sh           # checks mise, languages, shell utils, system packages all exist
  run.sh              # orchestrator — run with: ./tests/run.sh
```

Run locally (requires Docker):
```bash
./tests/run.sh
```

When adding a new required tool, add a `check` call for it in `tests/verify.sh`.
When adding a new optional prompt variable, add it to `tests/chezmoi.yaml`.

## How to add a mise-managed tool

Edit `dot_config/mise/config.toml` — add one line under the appropriate section:

```toml
mytool = "latest"
```

That's it. The existing `install_languages` function in `run_once_setup.sh.tmpl` runs
`mise install` which picks up all tools in the config. No other changes needed.

## How to add a system package (apt/dnf/brew)

Add one line to `run_once_setup.sh.tmpl` inside `install_system_packages`:

```bash
command -v mypkg &>/dev/null || with_retry 3 5 pkg_install mypkg
```

If the command name differs from the package name, use explicit check:
```bash
command -v mytool &>/dev/null || with_retry 3 5 pkg_install my-tool-pkg
```

## How to add an optional install

Optional installs are prompted once per machine at `chezmoi init`.

**Step 1** — `.chezmoi.yaml.tmpl`, add two lines:
```
{{- $installFoo := promptBoolOnce . "installFoo" "Install Foo?" -}}
```
And in `data:`:
```yaml
installFoo: {{ $installFoo }}
```

**Step 2** — `run_once_setup.sh.tmpl`, add a guarded function:
```bash
{{ if .installFoo -}}
install_foo() {
  command -v foo &>/dev/null && return
  with_retry 3 5 <install command>
}
{{- end }}
```

**Step 3** — add `install_foo` to the correct stage array (stage 2 if independent, stage 3 if it needs mise/zsh):
```bash
{{ if .installFoo }}STAGE2_JOBS+=(install_foo){{ end }}
```

## Bootstrap script structure

`run_once_setup.sh.tmpl` runs in three stages:

```
Stage 1 (sequential): mise
Stage 2 (parallel):   install_languages  install_system_packages  [install_docker]
Stage 3 (parallel):   install_claude     install_ohmyzsh          [install_kubectl]
```

- All network calls are wrapped in `with_retry 3 <delay>`.
- A `trap cleanup EXIT INT TERM` kills orphaned background jobs on any exit.
- `SETUP_FAILED=1` must be set before `exit 1` to preserve debug logs.
- Every install function must start with an idempotency check (`command -v X && return`).

## Claude Code config

`dot_claude/settings.json.tmpl` → `~/.claude/settings.json`

- Absolute paths in hooks must use `{{ .chezmoi.homeDir }}`, not `~` or hardcoded paths.
- Plugin state (`enabledPlugins`) is managed here.
- The `SessionStart` hook (`dot_claude/scripts/check-local-settings.sh`) checks for `.claude/settings.local.json` and prompts to load a template if absent.

Permission templates live in `dot_claude/templates/`. Add new templates as `settings.local.<name>.json`.

## Rules — what not to do

- **No secrets.** No tokens, passwords, API keys, or bearer headers anywhere in the repo.
- **No absolute paths.** Use `{{ .chezmoi.homeDir }}` in templates, `$HOME` in shell scripts.
- **No company-specific config.** No internal hostnames, private registries, org-specific env vars, or internal proxy URLs.
- **No machine-specific permissions.** Per-repo tool permissions belong in `.claude/settings.local.json` (gitignored), not here.
- **Wrap all network calls in `with_retry`.** Fresh EC2 instances have unreliable connectivity.
- **All install functions must be idempotent.** Check before installing; never assume a clean slate.

## Cross-platform requirements

Every script must work on:
- macOS (brew)
- Ubuntu / Debian (apt-get)
- Amazon Linux 2023 (dnf)
- CentOS 7 (yum)

Package manager is detected once at startup via `detect_pkg_manager` and stored in `$PKG_MANAGER`.
Use `pkg_install <name>` rather than calling apt/brew directly.

## Committing changes

This repo uses the personal GitHub account (`allentv`), not the work org.
The local git config is already set — do not modify it.

Commit in logical groups. Use conventional commit prefixes:
- `chore:` for config/tooling changes
- `feat:` for new tools or capabilities
- `fix:` for corrections
- `docs:` for README/CLAUDE.md changes

Push via: `git push` (remote is `git@github.com-personal:allentv/dotfiles.git`)
