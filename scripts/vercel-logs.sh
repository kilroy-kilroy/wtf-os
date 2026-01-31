#!/bin/bash
# Tail Vercel build/runtime logs for a project
# Requires: VERCEL_TOKEN env var, VERCEL_TEAM_ID env var, and project ID
#
# Usage:
#   VERCEL_TOKEN=xxx VERCEL_TEAM_ID=yyy ./scripts/vercel-logs.sh [project-id]
#
# To get a token: https://vercel.com/account/tokens
# To get project ID: Vercel dashboard -> project -> Settings -> General
# To get team ID: Vercel API -> GET /v2/user -> defaultTeamId

TOKEN="${VERCEL_TOKEN:?Set VERCEL_TOKEN env var (get one at https://vercel.com/account/tokens)}"
PROJECT_ID="${1:-${VERCEL_PROJECT_ID:?Pass project ID as arg or set VERCEL_PROJECT_ID}}"
TEAM_ID="${VERCEL_TEAM_ID:-}"
TEAM_PARAM=""
if [[ -n "$TEAM_ID" ]]; then
  TEAM_PARAM="&teamId=$TEAM_ID"
fi

LINES="${2:-50}"

echo "Fetching recent logs for project: $PROJECT_ID"
echo "================================================"

# Get recent deployments
DEPLOYMENT=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=1${TEAM_PARAM}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['deployments'][0]; print(d['uid'], d['url'], d.get('state',''))" 2>/dev/null)

if [[ -z "$DEPLOYMENT" ]]; then
  echo "Failed to fetch deployments. Check your token, team ID, and project ID."
  exit 1
fi

DEPLOY_ID=$(echo "$DEPLOYMENT" | awk '{print $1}')
DEPLOY_URL=$(echo "$DEPLOYMENT" | awk '{print $2}')
DEPLOY_STATE=$(echo "$DEPLOYMENT" | awk '{print $3}')
echo "Latest deployment: $DEPLOY_URL ($DEPLOY_ID) [$DEPLOY_STATE]"
echo ""

# Fetch build/runtime events
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v2/deployments/$DEPLOY_ID/events?${TEAM_PARAM#&}" \
  -o /tmp/_vercel_events.json 2>/dev/null

python3 -c "
import json, sys
with open('/tmp/_vercel_events.json') as f:
    events = json.load(f)
n = int(sys.argv[1])
for e in events[-n:]:
    payload = e.get('payload', {})
    msg = payload.get('text', '')
    ts = payload.get('date', e.get('created', ''))
    etype = e.get('type', '')
    if msg:
        # Truncate long lines
        print(f'[{etype}] {msg[:300]}')
" "$LINES" 2>/dev/null
