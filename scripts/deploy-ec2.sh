#!/usr/bin/env bash
# Run this script on EC2 (e.g. via SSH from GitHub Actions) to pull, build, and restart the gateway.
# Usage: bash -s [BRANCH] [REPO_DIR]
# Default BRANCH: main. Default REPO_DIR: /home/ubuntu/myopenclaw

set -euo pipefail

BRANCH="${1:-main}"
REPO_DIR="${2:-/home/ubuntu/myopenclaw}"
cd "$REPO_DIR"

echo "==> Pulling latest (branch: $BRANCH)..."
git fetch origin
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building (skipping A2UI bundle if sources missing)..."
OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build
pnpm ui:build

echo "==> Restarting gateway..."
systemctl --user restart openclaw-gateway.service || true

echo "==> Deploy done."
systemctl --user is-active openclaw-gateway.service || true
