#!/bin/sh

set -eu

minimum_node_major=20

if ! command -v git >/dev/null 2>&1; then
  echo "Missing: git"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Missing: Node.js ${minimum_node_major}+"
  exit 1
fi

node_major=$(node -p "Number(process.versions.node.split('.')[0])")
if [ "$node_major" -lt "$minimum_node_major" ]; then
  echo "Node.js ${minimum_node_major}+ is required; found $(node --version)"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Missing: npm"
  exit 1
fi

echo "Ready"
echo "git: $(git --version)"
echo "node: $(node --version)"
echo "npm: $(npm --version)"