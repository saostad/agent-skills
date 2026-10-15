#!/usr/bin/env bash
#
# run-muse.sh — run one headless Muse Code implementer round.
#
#   run-muse.sh <repo-root> <prompt-file>
#
# The reviewer (Claude Code) runs this in the background and is notified when
# Muse exits. The sandbox stays on unless MUSE_DISABLE_SANDBOX=1 is set, which
# needs the owner's OK per project (e.g. bwrap can't start inside a container).
# MUSE_MODEL and MUSE_EFFORT override the model and reasoning effort.
set -euo pipefail

repo="${1:?usage: run-muse.sh <repo-root> <prompt-file>}"
prompt="${2:?usage: run-muse.sh <repo-root> <prompt-file>}"
model="${MUSE_MODEL:-muse-spark-1.3-contributor}"
effort="${MUSE_EFFORT:-max}"

# On Windows, Muse installs as muse.cmd, which Git Bash only finds by its full name.
if command -v muse >/dev/null 2>&1; then
  muse=muse
elif command -v muse.cmd >/dev/null 2>&1; then
  muse=muse.cmd
else
  echo "run-muse: FAIL: muse not found on PATH (looked for muse and muse.cmd)" >&2
  exit 1
fi
if [ ! -d "$repo" ]; then
  echo "run-muse: FAIL: repo root not found: $repo" >&2
  exit 1
fi
cd "$repo"
if [ ! -f "$prompt" ]; then
  echo "run-muse: FAIL: prompt file not found: $prompt (relative to $repo)" >&2
  exit 1
fi

args=(exec --model "$model" --reasoning-effort "$effort"
  --trust-workspace --disable-approval --prompt-file "$prompt")
if [ "${MUSE_DISABLE_SANDBOX:-0}" = "1" ]; then
  echo "run-muse: sandbox disabled (MUSE_DISABLE_SANDBOX=1)" >&2
  args+=(--disable-sandbox)
fi

echo "run-muse: $(date -Is) repo=$repo prompt=$prompt model=$model effort=$effort" >&2
exec "$muse" "${args[@]}"
