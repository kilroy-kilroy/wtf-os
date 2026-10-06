# Dependency consolidation — 2026-10-06

This release extracts dependency fixes from Labs PR #213 so they can deploy without the Labs database migration. It does not release the Labs access or analysis changes.

## Included

- Compatible lockfile updates covering Dependabot #202–212, including Next 16.3.8, sharp 0.35.5, undici 7.30.0, ip-address 10.7.3, js-yaml 4.3.2, Vitest 4.1.11, React PDF 4.9.0 and Zod 4.6.5. Direct dependency minimums are raised for the selected upgrades.
- React and React DOM types upgraded together across the workspace, replacing #192 and #193. Shared type overrides eliminate mixed React 18/19 definitions. Use React.JSX for scoped JSX types; remove a tooltip-root ref wrapper whose ref was never used or supported.
- CodeQL action v4.37.4 pinned to verified commit f205ea1c3313d32999d8d6a48b4f6530d4437b38, replacing #199. Checkout/setup-node references are also pinned.
- One root npm Dependabot stream for the shared workspace lockfile. Routine minor/patch changes are grouped; auth, billing, AI, browser runtime and framework updates remain separate. React type changes are grouped together.
- A PR/push workflow runs npm ci, web type checks, web tests and shared utility tests on Node 22, matching the verified Vercel production runtime. This workflow is not itself a branch-protection rule.

## Deferred, not silently treated as fixed

| Former PR | Follow-up and acceptance criteria |
|---|---|
| #200 Anthropic SDK / Supabase SSR | Replace the failing manifest-only bundle with independent root-workspace upgrades. Verify generation/streaming/retries for the SDK and sign-in, cookie refresh, logout, invitation links and protected routes for SSR. Dependabot remains enabled for these packages. |
| #197 Analytics 2 | A real install failed with ERESOLVE through optional SvelteKit/Vite peers. Retain 1.6.1 until the dependency graph is resolved without force/legacy-peer-deps. Then verify browser/server event delivery. Future updates remain enabled. |
| #196 Tailwind 4 | Full PostCSS/CSS/config/shared-component migration and visual regression checks. v4 updates are temporarily ignored until this work is undertaken. This does not resolve the existing Tailwind-chain advisories. |
| #198 TypeScript 7 | Coordinate root and all workspaces, compiler configuration and framework compatibility; do not update just apps/web. v7 temporarily ignored. |
| #195 ESLint 10 | Coordinate root/app/plugin compatibility and run actual lint. v10 temporarily ignored. |
| #194 Node 26 types | Production uses Node 22. Standardize type declarations against that runtime; do not install Node 26 declarations just because available. v26 temporarily ignored. |
| #191 nanoid 6 | Current patched v5 works. v6 drops Node 18/20; verify supported deployment/local runtimes and ID/invite consumers before migration. v6 temporarily ignored. |

The narrow version ignores prevent reopening deliberately deferred major migrations; patch/minor maintenance and unrelated security updates remain enabled. Security updates within an ignored major line may also be suppressed, so audit findings must continue to be reviewed and these ignores removed when migrations begin.

The last dependency audit still reported 17 affected packages (14 high, three moderate, zero critical), concentrated in build tooling and Puppeteer's browser-download/proxy/archive chain. This release is not a claim of a clean audit. The Labs PR includes additional PDF hardening but is a separate release.

Close the superseded/incomplete Dependabot PRs only after this consolidation is merged and its production deployment is verified. Closing a PR preserves its history; deferred work remains listed here.
