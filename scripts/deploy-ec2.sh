#!/usr/bin/env bash
# Run this script on EC2 (e.g. via SSH from GitHub Actions) to pull, build, and restart the gateway.
# Usage: bash -s [BRANCH] [REPO_DIR]
# Default BRANCH: main. Default REPO_DIR: /home/ubuntu/myopenclaw

set -euo pipefail

BRANCH="${1:-main}"
REPO_DIR="${2:-/home/ubuntu/myopenclaw}"
cd "$REPO_DIR"
REPO_DIR_REAL="$(realpath -m "$REPO_DIR")"
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"

PRESERVE_LOCAL_FILES=(
  "openclaw.json"
)

preserve_tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$preserve_tmp_dir"
}
trap cleanup EXIT

preserved_files=()
for file in "${PRESERVE_LOCAL_FILES[@]}"; do
  if [ -f "$REPO_DIR/$file" ]; then
    mkdir -p "$(dirname "$preserve_tmp_dir/$file")"
    cp "$REPO_DIR/$file" "$preserve_tmp_dir/$file"
    preserved_files+=("$file")
  fi
done

resolve_configured_workspace_dir() {
  if [ ! -f "$OPENCLAW_CONFIG_PATH" ]; then
    realpath -m "$HOME/.openclaw/workspace"
    return
  fi
  OPENCLAW_CONFIG_PATH="$OPENCLAW_CONFIG_PATH" node -e '
const fs = require("fs");
const os = require("os");
const path = require("path");
const configPath = process.env.OPENCLAW_CONFIG_PATH;
let workspace = "";
try {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  workspace = String(cfg?.agents?.defaults?.workspace ?? "").trim();
} catch {}
if (!workspace) {
  workspace = path.join(os.homedir(), ".openclaw", "workspace");
}
if (workspace.startsWith("~")) {
  workspace = path.join(os.homedir(), workspace.slice(1));
}
process.stdout.write(path.resolve(workspace));
'
}

configured_workspace_dir="$(resolve_configured_workspace_dir)"
workspace_restore_needed=0
if [ -d "$configured_workspace_dir" ] && [[ "$configured_workspace_dir" == "$REPO_DIR_REAL"* ]]; then
  echo "⚠️  Workspace is inside repo checkout: $configured_workspace_dir"
  echo "   Backing up workspace to preserve agent identity/memory across deploy reset."
  cp -a "$configured_workspace_dir" "$preserve_tmp_dir/workspace-backup"
  workspace_restore_needed=1
fi

WORKSPACE_FILE_NAMES=(
  "AGENTS.md"
  "SOUL.md"
  "TOOLS.md"
  "IDENTITY.md"
  "USER.md"
  "BOOTSTRAP.md"
  "HEARTBEAT.md"
  "MEMORY.md"
  "memory.md"
)

repo_workspace_files=()
for file in "${WORKSPACE_FILE_NAMES[@]}"; do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    repo_workspace_files+=("$file")
  fi
done

if [ "${#repo_workspace_files[@]}" -gt 0 ]; then
  echo "⚠️  Warning: tracked workspace/persona files detected in repo ($REPO_DIR):"
  printf '   - %s\n' "${repo_workspace_files[@]}"
  echo "   These files belong in ~/.openclaw/workspace and may be overwritten by git reset --hard."
fi

echo "==> Pulling latest (branch: $BRANCH)..."
git fetch origin
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

if [ "$workspace_restore_needed" -eq 1 ] && [ -d "$preserve_tmp_dir/workspace-backup" ]; then
  echo "==> Restoring workspace directory..."
  rm -rf "$configured_workspace_dir"
  mkdir -p "$(dirname "$configured_workspace_dir")"
  cp -a "$preserve_tmp_dir/workspace-backup" "$configured_workspace_dir"
fi

if [ "${#preserved_files[@]}" -gt 0 ]; then
  echo "==> Restoring preserved local config files..."
  for file in "${preserved_files[@]}"; do
    cp "$preserve_tmp_dir/$file" "$REPO_DIR/$file"
    echo "   restored $file"
  done
fi

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building (skipping A2UI bundle if sources missing)..."
OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build
pnpm ui:build

echo "==> Restarting gateway..."
systemctl --user restart openclaw-gateway.service || true

echo "==> Deploy done."
systemctl --user is-active openclaw-gateway.service || true
