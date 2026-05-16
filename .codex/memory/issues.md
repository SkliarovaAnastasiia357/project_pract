# Issues And Verified Fixes

## Mock Session Restore

Observed:
- In mock mode, registering a user and then directly opening `/projects/new` could redirect to `/login`.
- Root cause: `AuthProvider` always called HTTP refresh bootstrap, which failed in mock mode and left in-memory auth empty even though mock DB still had an active session.

Fix:
- Added `ApiClient.restoreSession`.
- `mockApi.restoreSession` reads the active local mock session.
- `httpApi.restoreSession` keeps the production `/api/auth/refresh` path.
- `AuthProvider` now boots through `apiClient.restoreSession`.

Verified:
- `npm run test:frontend` includes a regression test.
- Targeted browser smoke confirmed direct `/projects/new` opens while authenticated in mock mode.

## Local Docker/Testcontainers

Observed:
- Backend test command locally reports 31 passed, 49 skipped.

Cause:
- Local Docker/container runtime is unavailable.

Status:
- Not fixed in repo; CI must validate integration suites.

## Public DNS

Observed:
- `curl -I --max-time 15 https://teamnova.tw1.su` failed with host resolution error from this environment.

Status:
- Requires external DNS/hosting access outside the local repository.
