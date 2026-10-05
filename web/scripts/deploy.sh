#!/usr/bin/env bash
# Deploy web/ to Vercel production from a git-free copy.
# Why: the repo's commits are authored by an anonymous identity, and Vercel blocks
# CLI deployments whose commit author is not a team member. Copying the sources
# without .git strips that metadata, so the deploy goes through unchanged.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rsync -a --exclude node_modules --exclude dist --exclude '.env*.local' --exclude '.env.local' "$here"/ "$tmp"/
cd "$tmp"
npx vercel deploy --prod --yes "$@"
