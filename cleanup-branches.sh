#!/bin/bash
# Cleanup script: Delete all merged branches except main
# Run this locally with: bash cleanup-branches.sh
#
# This will delete 47 remote branches that have been merged into main.
# After running, you can delete this script.

set -e

echo "Fetching latest remote state..."
git fetch --prune origin

echo ""
echo "The following remote branches will be deleted:"
echo "================================================"

BRANCHES=(
  "claude/add-assessment-to-inner-circle-l8BuR"
  "claude/add-dashboard-tooltips-01Bes3tG7cg8PWBPhXBvQwsV"
  "claude/add-research-chain-uVa2V"
  "claude/add-vercel-analytics-TPPhV"
  "claude/authorize-wtf-os-access-6IvBB"
  "claude/coaching-email-templates-CRBQz"
  "claude/cleanup-merged-branches-zaocj"
  "claude/debug-login-issues-P3qbR"
  "claude/debug-loops-emails-yv76y"
  "claude/discovery-lab-feature-01GThnjgYpUwhW4NcpQSqhEs"
  "claude/email-form-submission-XUTFf"
  "claude/email-sequence-after-assessment-9RK73"
  "claude/enhance-calllab-review-2V37u"
  "claude/fireflies-api-integration-avcoH"
  "claude/fix-beehiiv-integration-4hRrp"
  "claude/fix-build-failure-0cc94"
  "claude/fix-build-failure-HnxiD"
  "claude/fix-discovery-lab-name-fields-HcA5K"
  "claude/fix-hardcoded-webhook-url-zyoZL"
  "claude/fix-password-reset-018JzsMBhSpH7KpqeZLEyaZf"
  "claude/fix-stripe-webhook-xYFKY"
  "claude/fix-stuck-query-LUtqi"
  "claude/fix-supabase-security-O0vrl"
  "claude/fix-vercel-build-errors-JO3xF"
  "claude/growthOS-login-assessment-vWpfT"
  "claude/implement-assessment-spec-LDl1k"
  "claude/improve-agency-assessment-85aW4"
  "claude/improve-agency-assessment-pi0Lv"
  "claude/improve-assessment-readability-7Pe4c"
  "claude/investigate-stripe-webhooks-LiWZC"
  "claude/list-app-urls-LQTyq"
  "claude/macro-patterns-list-01Aqk2LrCnHGCaTt2C372ev4"
  "claude/persist-assessment-org-data-zpGqX"
  "claude/replicate-wtf-os-feature-sgnF1"
  "claude/resume-growth-os-phase1-01HJRmDiCFew4hDujjuy1pvo"
  "claude/review-discoverylab-pro-v2-xRyvW"
  "claude/review-macro-patterns-01X5gHyRTRpgm1M6Ekx5jvQ6"
  "claude/review-prd-plan-Y7xFU"
  "claude/setup-claude-sdk-0129c9D3q2cp3rFMDiiF12rR"
  "claude/update-logo-favicon-TPA6Q"
  "claude/update-roadmap-call-details-nk3H9"
  "claude/update-sample-reports-egxWE"
  "claude/view-client-reports-unTUS"
  "claude/wtf-assessment-example-Vpuiq"
  "claude/wtf-growth-os-phase1-01Ajrx1nBC9uQu9WEhP1FX7J"
  "claude/zoom-integration-review-9Ujs1"
  "claude/zoom-integration-setup-3q79Y"
  "vercel/vercel-web-analytics-to-nextjs-d7tvcw"
)

for branch in "${BRANCHES[@]}"; do
  echo "  $branch"
done

echo ""
echo "Total: ${#BRANCHES[@]} branches"
echo ""
read -p "Proceed with deletion? (y/N) " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
deleted=0
failed=0

for branch in "${BRANCHES[@]}"; do
  if git push origin --delete "$branch" 2>/dev/null; then
    echo "  Deleted: $branch"
    ((deleted++))
  else
    echo "  Skipped (already deleted or error): $branch"
    ((failed++))
  fi
done

echo ""
echo "Done! Deleted $deleted branches. Skipped $failed."
echo ""
echo "Cleaning up local tracking refs..."
git fetch --prune origin
echo "Cleanup complete. Only 'main' remains."
