#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

errors=0

echo "[verify] Checking AIFF placement and naming under $repo_root"

# 1) Any AIFF outside samples/ is not allowed
outside=$(find . -type f -iname '*.aiff' \( -path './.*' -prune -o -print \) | grep -v '^\./samples/' || true)
if [[ -n "$outside" ]]; then
  echo "[error] Found AIFF files outside samples/:"
  echo "$outside"
  errors=1
fi

# 2) Ensure AIFFs under samples/ follow samples/<letter>/<first-word>/<filename>.aiff
while IFS= read -r -d '' f; do
  rel="${f#./samples/}"
  IFS='/' read -r d1 d2 fname <<< "$rel"
  if [[ -z "${d1:-}" || -z "${d2:-}" || -z "${fname:-}" ]]; then
    echo "[error] Bad path (needs samples/<letter>/<first-word>/<filename>): $f"
    errors=1
    continue
  fi

  # derive expected first word and first letter from filename
  base="${fname%.*}"
  fw="${base%%[-_ ]*}"
  fw_lc="$(echo "$fw" | tr '[:upper:]' '[:lower:]')"
  exp_letter="${fw_lc:0:1}"

  # checks
  if [[ ! "$d1" =~ ^[a-z]$ ]]; then
    echo "[error] Top folder must be a single lowercase letter: $f"
    errors=1
  fi
  if [[ ! "$d2" =~ ^[a-z0-9_-]+$ ]]; then
    echo "[error] Second folder must be lowercase word (a-z0-9_-): $f"
    errors=1
  fi
  if [[ "$d2" != "$fw_lc" ]]; then
    echo "[error] Second folder ('$d2') must match first word in filename ('$fw_lc'): $f"
    errors=1
  fi
  if [[ "$d1" != "$exp_letter" ]]; then
    echo "[error] First folder ('$d1') must match first letter ('$exp_letter') of first word: $f"
    errors=1
  fi
done < <(find ./samples -type f -iname '*.aiff' -print0 2>/dev/null)

if [[ "$errors" -ne 0 ]]; then
  echo "[verify] ❌ Layout check failed. Please run organize_audio_files.sh or fix paths."
  exit 1
fi

echo "[verify] ✅ Layout check passed."
