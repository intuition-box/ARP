#!/usr/bin/env bash
# The OASF classifier measurement of task 79 (ADR 0150), result in data/measurements/oasf-classifier-2026-11-09.json.
# usage: bash scripts/measure/oasf-classifier/run.sh <work-dir> data/catalogue
# <work-dir> holds the npm package (pkg/: npm install --save-exact @huggingface/transformers@3.7.5),
# the downloaded models (models/) and the outputs (out/), outside the repository. Run from any directory
# other than <work-dir>/pkg; nothing here writes outside <work-dir>.
set -euo pipefail
C="$1"; D="$2"; S="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$C/out"
python3 -I "$S/prep.py" "$D/oasf-1.1.0-skills.json" "$D/oasf-skill-tags-proposal-13579.json" "$D/skill-facts.json" "$C/out/texts.json"
node "$S/embed.mjs" "$C/pkg" "$C/models" "$C/out/texts.json" "$C/out/emb-minilm.json" \
  Xenova/all-MiniLM-L6-v2 751bff37182d3f1213fa05d7196b954e230abad9 mean
node "$S/embed.mjs" "$C/pkg" "$C/models" "$C/out/texts.json" "$C/out/emb-bge-small.json" \
  Xenova/bge-small-en-v1.5 ea104dacec62c0de699686887e3f920caeb4f3e3 cls \
  "Represent this sentence for searching relevant passages: "
python3 -I "$S/classify.py" "$C/out/texts.json" "$C/out/metrics.json" \
  minilm="$C/out/emb-minilm.json" bge-small="$C/out/emb-bge-small.json"
