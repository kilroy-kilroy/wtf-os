#!/bin/bash
# Smoke test: hit key routes and report status codes
# Usage: ./scripts/smoke-test.sh https://your-deployment-url.vercel.app

BASE_URL="${1:?Usage: smoke-test.sh <base-url>}"
FAIL=0

routes=(
  "/"
  "/growthos"
  "/growthos/assessment"
  "/api/growthos"
)

echo "Smoke testing: $BASE_URL"
echo "================================"

for route in "${routes[@]}"; do
  url="${BASE_URL}${route}"

  if [[ "$route" == "/api/growthos" ]]; then
    # API route expects POST, so check for 405 (method not allowed) which means it's alive
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
    if [[ "$status" == "405" || "$status" == "200" || "$status" == "401" ]]; then
      echo "  PASS  $route -> $status (API alive)"
    else
      echo "  FAIL  $route -> $status"
      FAIL=1
    fi
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
    if [[ "$status" == "200" || "$status" == "307" || "$status" == "308" ]]; then
      echo "  PASS  $route -> $status"
    else
      echo "  FAIL  $route -> $status"
      FAIL=1
    fi
  fi
done

echo "================================"
if [[ $FAIL -eq 0 ]]; then
  echo "All routes passed."
else
  echo "Some routes FAILED."
  exit 1
fi
