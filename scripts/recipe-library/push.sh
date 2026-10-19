#!/bin/bash
# usage: RECIPE_TOKEN=... scripts/recipe-library/push.sh recipes.json
# Posts validated recipes to /api/admin/recipes-bulk in chunks of 50 (retries a chunk once).
set -u
n=$(node -e "console.log(require(require('path').resolve('$1')).length)")
tmp=$(mktemp)
for ((i=0;i<n;i+=50)); do
  node -e "process.stdout.write(JSON.stringify({recipes:require(require('path').resolve('$1')).slice($i,$i+50)}))" > "$tmp"
  for try in 1 2; do
    out=$(curl -s -m 70 -X POST https://www.dinnerdrop.app/api/admin/recipes-bulk -H 'content-type: application/json' -H "x-image-token: $RECIPE_TOKEN" --data-binary @"$tmp")
    echo "$out" | grep -q '"ok":true' && break
  done
  echo "chunk $i: ${out:-no response}"
done
rm -f "$tmp"
