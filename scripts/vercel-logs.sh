#!/bin/bash
# Tail Vercel runtime logs for a project
# Requires: VERCEL_TOKEN env var and VERCEL_PROJECT_ID (or pass as args)
#
# Usage:
#   VERCEL_TOKEN=xxx ./scripts/vercel-logs.sh [project-id]
#
# To get a token: https://vercel.com/account/tokens
# To get project ID: Vercel dashboard -> project -> Settings -> General

TOKEN="${VERCEL_TOKEN:?Set VERCEL_TOKEN env var (get one at https://vercel.com/account/tokens)}"
PROJECT_ID="${1:-${VERCEL_PROJECT_ID:?Pass project ID as arg or set VERCEL_PROJECT_ID}}"

echo "Fetching recent logs for project: $PROJECT_ID"
echo "================================================"

# Get recent deployments
DEPLOYMENT=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['deployments'][0]; print(d['uid'], d['url'])" 2>/dev/null)

if [[ -z "$DEPLOYMENT" ]]; then
  echo "Failed to fetch deployments. Check your token and project ID."
  exit 1
fi

DEPLOY_ID=$(echo "$DEPLOYMENT" | awk '{print $1}')
DEPLOY_URL=$(echo "$DEPLOYMENT" | awk '{print $2}')
echo "Latest deployment: $DEPLOY_URL ($DEPLOY_ID)"
echo ""

# Fetch runtime logs (last 100)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v2/deployments/$DEPLOY_ID/events?limit=100&direction=backward" \
  | python3 -c "
import sys, json
events = json.load(sys.stdin)
for e in reversed(events):
    ts = e.get('date', '')
    msg = e.get('text', e.get('message', ''))
    level = e.get('level', 'info')
    if msg:
        print(f'[{ts}] [{level}] {msg}')
" 2>/dev/null
