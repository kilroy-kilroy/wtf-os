# Claude Code Project Rules

## MANDATORY: Before Building or Modifying Anything

1. **SEARCH FIRST**: Before creating any new component, file, or feature:
   - Run `git log --all --oneline -- "**/[feature-name]*"` to find existing implementations
   - Run `grep -r "ComponentName\|feature-name" --include="*.tsx" --include="*.ts"` to find existing code
   - Check if the feature exists in a different branch or was deleted

2. **FIND THE WORKING VERSION**: When asked to "fix" something:
   - Ask: "When did this last work correctly?"
   - Search git history: `git log --all --oneline | grep -i "feature-name"`
   - View the working version: `git show <commit>:<file-path>`
   - Understand what changed before making modifications

3. **DON'T REBUILD - REUSE**: If a component/feature exists anywhere in git history:
   - Restore it from git rather than rebuilding from scratch
   - If it needs modifications, start from the existing version

## Canonical Files (Single Source of Truth)

- **Call Lab Prompts**: `packages/prompts/call-lab/markdown-prompts.ts`
- **Call Lab Pro Report Renderer**: `apps/web/components/console/CallLabProReport.tsx`
- **Dashboard Data**: `apps/web/lib/get-dashboard-data.ts`

## Before Committing

- Verify the change doesn't break existing visual presentation
- Verify the change doesn't remove existing functionality
- If unsure, ask the user before proceeding

## When User Reports Something "Broke"

1. First: Find when it last worked (`git log`)
2. Second: See what changed (`git diff`)
3. Third: Restore the working version if possible
4. Fourth: Only then consider rebuilding
