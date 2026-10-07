#!/usr/bin/env bash
# Harness setup, idempotent. Usage: bash scripts/setup-claude-harness.sh [--silent]

SILENT="${1:-}"
log() { [ "$SILENT" != "--silent" ] && echo "$@"; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

SOURCE_HOOKS_DIR="$REPO_ROOT/node_modules/@tron/claude-config/managed/git-hooks"
if [ ! -d "$SOURCE_HOOKS_DIR" ]; then
  SOURCE_HOOKS_DIR="$REPO_ROOT/managed/git-hooks"
fi

# Resolve hooks dir the same way postinstall.js does (worktrees + core.hooksPath).
GIT_HOOKS_DIR=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  if git config --get core.hooksPath >/dev/null 2>&1; then
    log "git hooks skipped: core.hooksPath is managed by another tool"
    GIT_HOOKS_DIR=""
  else
    HOOKS_REL=$(git rev-parse --git-path hooks 2>/dev/null)
    if [ -n "$HOOKS_REL" ]; then
      GIT_HOOKS_DIR="$REPO_ROOT/$HOOKS_REL"
    fi
  fi
fi

# Package manager detection — used for install instructions
detect_pm() {
  if [ -f "$REPO_ROOT/bun.lockb" ] || [ -f "$REPO_ROOT/bun.lock" ]; then
    echo "bun"
  elif [ -f "$REPO_ROOT/pnpm-lock.yaml" ]; then
    echo "pnpm"
  else
    echo "npm"
  fi
}
PM=$(detect_pm)

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log " Claude Enforcement Harness — Setup"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 0. Sync tron-kit rules to project scope (add/remove language folders as needed)
SYNC_TRON_RULES="$REPO_ROOT/node_modules/@tron/claude-config/scripts/sync-tron-rules.js"
if [ -f "$SYNC_TRON_RULES" ]; then
  if ! node "$SYNC_TRON_RULES" "$REPO_ROOT" 2>&1; then
    [ "$SILENT" != "--silent" ] && log "   ⚠ tron-kit rules sync failed (reinstall @tron/claude-config)"
  fi
fi

# 1. Install git hooks
log ""
log "📎 Installing git hooks..."
if [ -z "$GIT_HOOKS_DIR" ]; then
  log "   ⚠ skipped (core.hooksPath set or not a git repo)"
else
  mkdir -p "$GIT_HOOKS_DIR"
  for hook in pre-commit pre-push; do
    src="$SOURCE_HOOKS_DIR/$hook"
    dst="$GIT_HOOKS_DIR/$hook"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
      chmod +x "$dst"
      log "   ✓ $hook installed"
    else
      log "   ⚠ $src not found — skipping $hook"
    fi
  done
fi

# 2. Ensure .claude directory and token files are gitignored
GITIGNORE="$REPO_ROOT/.gitignore"
for entry in ".claude/.commit-authorized" ".claude/.pr-body-draft.md" ".claude/.harness-last-update" ".cursor/" ".omc/"; do
  if ! grep -qF "$entry" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
    log "   ✓ Added $entry to .gitignore"
  fi
done

# 3. Check required tools
log ""
log "🔍 Checking required tools..."

MISSING=()

if [ -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core" ]; then
  log "   ✓ workflow-engine"
else
  log "   ✗ workflow-engine — MISSING"
  MISSING+=("workflow-engine")
fi

ENSURE_GRAPH="$REPO_ROOT/node_modules/@tron/claude-config/scripts/lib/ensure-tron-graph.js"
if [ -f "$ENSURE_GRAPH" ]; then
  if node "$ENSURE_GRAPH"; then
    log "   ✓ tron-graph"
  else
    log "   ✗ tron-graph — install failed (required)"
    MISSING+=("tron-graph")
  fi
elif node -e "
  const fs = require('fs');
  const os = require('os');
  const p = require('path').join(os.homedir(), '.claude', '.mcp.json');
  if (!fs.existsSync(p)) process.exit(1);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!(d.mcpServers || {})['tron-graph']) process.exit(1);
" 2>/dev/null; then
  log "   ✓ tron-graph"
else
  log "   ✗ tron-graph — NOT REGISTERED in ~/.claude/.mcp.json"
  MISSING+=("tron-graph")
fi

# 4. Print install instructions for missing tools
if [ ${#MISSING[@]} -gt 0 ]; then
  log ""
  log "⚠️  Missing tools. Install instructions:"
  for tool in "${MISSING[@]}"; do
    case "$tool" in
      workflow-engine)
        log "   workflow-engine: npm rebuild @tron/claude-config (re-runs postinstall)"
        ;;
      tron-graph)
        log "   tron-graph: node node_modules/@tron/claude-config/scripts/lib/ensure-tron-graph.js"
        ;;
    esac
  done
  log ""
  log "Re-run this script after installing missing tools."
  exit 1
fi

log ""
log "✅ Harness installed successfully."
log ""
exit 0
