# Active Work

## Current Task

Prepare the final Teamnova branch for merge into `main`: integrate the latest release work, remove the visible "Sprint 2" label from final docs, verify the app, push, and open a PR.

## Branch

- Current branch: `codex/sprint5-docs-deck`
- Remote: `origin`
- PR base: `origin/main`
- Production branch check: no `prod`, `production`, `last`, or `version` refs exist locally or on `origin`; use `main` as the production-ready base.

## Implemented On Final Branch

- Branch is based on `origin/main` and contains the Sprint 5 app polish and final docs/deck commits.
- Added `ApiClient.restoreSession`.
- `httpApi.restoreSession` uses `/api/auth/refresh`.
- `mockApi.restoreSession` restores the latest active mock session from localStorage-backed mock DB.
- `AuthProvider` boots through `apiClient.restoreSession`.
- Updated Sprint 5 home board and user-facing UI copy.
- Updated docs: README, plan/status/test-plan, test cases, module progress, Sprint 5 checklist.
- Added final deck: `docs/presentation/teamnova-final-sprint5.pptx`.
- Removed the final docs heading that exposed "Спринт 2"; the auth section is now "Аутентификация и безопасность".

## Verification

- `npm run test:frontend` passed.
- `npm run test:backend` passed locally with 31 passed and 49 skipped because Docker/testcontainers runtime is unavailable.
- `npm run build` passed.
- `npm run build:backend` passed.
- `npm run lint` passed.
- `npm run db:generate` reported no schema changes.
- Vite preview smoke returned `200 text/html` for `/`, `/login`, `/search`, `/requests`, and `/projects/new`.
- Search confirmed no `спринт 2` / `sprint 2` / `sprint2` text remains in `src`, `tests`, `docs`, `dist`, or the final pptx slide XML.

## Open Items

- Commit the final README/memory update, push, and open the PR to `main`.
- GitHub Actions must confirm backend integration suites.
- External DNS/hosting for `https://teamnova.tw1.su` requires infrastructure access.
