#!/bin/sh
# Everything that must pass before a commit: build is current, every scene meets the contract,
# and the built plugin's life cycle (switching, failure, disposal) is clean.
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py --check
node tests/scene-contract.cjs
node tests/plugin-lifecycle.cjs
echo "ALL CHECKS PASSED"
