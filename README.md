# dotfiles

Personal dev environment managed with [chezmoi](https://chezmoi.io) and [mise](https://mise.jdx.dev).
Designed to reproduce an identical environment across macOS and Linux (Ubuntu, Debian, Amazon Linux 2023, CentOS).

## Bootstrap

One command on a fresh machine:

```bash
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply git@github.com-personal:allentv/dotfiles.git
```

chezmoi will prompt for optional installs (Docker, kubectl), apply all configs, then run the setup script.

### What happens during setup

```
Stage 1 (sequential)
  mise

Stage 2 (parallel)
  language runtimes + tools    system packages      docker (optional)
  via mise                     via apt/dnf/brew

Stage 3 (parallel, after stage 2)
  claude code                  oh-my-zsh + p10k     kubectl (optional)
```

Network steps automatically retry up to 3 times. Background jobs are cleaned up on failure or interrupt.

## What's included

### Shell — zsh
- [Oh My Zsh](https://ohmyz.sh) with [Powerlevel10k](https://github.com/romkatv/powerlevel10k) theme
- Plugins: `zsh-autosuggestions`, `zsh-syntax-highlighting`, `web-search`
- Shell integrations: `fzf` (fuzzy history/files), `zoxide` (smart cd), `direnv` (per-dir env vars)
- Aliases: `ls`/`ll`/`lt` → eza, `cat` → bat, `lg` → lazygit

### Languages & runtimes — mise
| Tool | Version |
|------|---------|
| Node.js | LTS |
| Go | latest |
| Rust + cargo | latest |
| Python | latest |
| Bun | latest |
| pnpm | latest |
| uv | latest |

### Shell utilities — mise
| Tool | Replaces | Purpose |
|------|----------|---------|
| `bat` | `cat` | Syntax-highlighted file viewer |
| `delta` | git pager | Syntax-highlighted git diffs |
| `direnv` | manual export | Per-directory env var loading |
| `duf` | `df` | Disk usage overview |
| `dust` | `du` | Visual disk usage |
| `eza` | `ls` | Colour + git-aware directory listing |
| `fzf` | — | Fuzzy finder (history, files, dirs) |
| `jq` | — | JSON processor |
| `k9s` | kubectl CLI | Kubernetes cluster TUI |
| `lazygit` | git CLI | Git TUI |
| `ripgrep` | `grep` | Fast recursive search |
| `yq` | — | YAML/JSON processor |
| `zoxide` | `cd` | Frecency-based directory jumping |

### System packages — apt / dnf / brew
`tmux`, `zsh`, `tree`, `htop`

### Optional installs (prompted at setup)
- **Docker** — via `get.docker.com` on Linux, colima on macOS
- **kubectl** — via mise

### AI tooling
- [Claude Code](https://claude.ai/code) — installed via npm

### Git
- [delta](https://github.com/dandavison/delta) configured as the default pager for diffs, logs and blame
- Set your identity after first apply:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```

### Claude Code
- Plugin configuration and enabled extensions
- Custom statusline showing `user@host`, current directory, git branch, model and context usage
- `SessionStart` hook that detects missing `.claude/settings.local.json` and prompts to load a template
- Permission templates in `~/.claude/templates/` — copy one into a repo with:
  ```bash
  cp ~/.claude/templates/settings.local.default.json .claude/settings.local.json
  ```

## Day-to-day usage

```bash
# Pull latest dotfiles and reapply
chezmoi update

# Preview what chezmoi would change before applying
chezmoi diff

# Edit a managed file (opens in $EDITOR, applies on save)
chezmoi edit ~/.zshrc

# Add a new file to be managed
chezmoi add ~/.config/nvim

# Add a new tool to mise
# 1. Edit dot_config/mise/config.toml
# 2. Run: mise install
```

## Adding optional installs

1. Add a prompt in `.chezmoi.yaml.tmpl`:
   ```
   {{- $installFoo := promptBoolOnce . "installFoo" "Install Foo?" -}}
   ```
   And in `data:`:
   ```yaml
   installFoo: {{ $installFoo }}
   ```

2. Add an install block in `run_once_setup.sh.tmpl`:
   ```bash
   {{ if .installFoo -}}
   install_foo() {
     command -v foo &>/dev/null && return
     with_retry 3 5 <install command>
   }
   {{- end }}
   ```
   Then add `install_foo` to the appropriate stage array.

## Repo structure

```
.chezmoi.yaml.tmpl                      # chezmoi config — optional install prompts
run_once_setup.sh.tmpl                  # parallel bootstrap script (runs once per machine)
dot_gitconfig                           # ~/.gitconfig — delta pager config
dot_zshrc.tmpl                          # ~/.zshrc — zsh + mise + tool integrations
dot_p10k.zsh                            # ~/.p10k.zsh — powerlevel10k prompt config
dot_config/
  mise/
    config.toml                         # ~/.config/mise/config.toml — all tool versions
dot_claude/
  settings.json.tmpl                    # ~/.claude/settings.json — plugins + hooks
  statusline-command.sh                 # custom claude code statusline
  scripts/
    check-local-settings.sh             # session-start hook for permission templates
  templates/
    settings.local.default.json         # default per-repo permission template
```

## Distro compatibility

| | macOS | Ubuntu / Debian | Amazon Linux 2023 | CentOS 7 |
|---|---|---|---|---|
| Package manager | brew | apt | dnf | yum |
| mise tools | ✓ | ✓ | ✓ | ✓ |
| System packages | ✓ | ✓ | ✓ | ✓ † |
| Docker | colima | get.docker.com | get.docker.com | get.docker.com |

† CentOS 7: `htop` requires EPEL (`sudo yum install -y epel-release` before setup).
