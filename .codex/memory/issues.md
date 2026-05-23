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

## Backend Login Timing Test Flake

Observed:
- GitHub Actions failed PR #9 in `tests/backend/http/login.test.ts`.
- Failure: one-sample timing ratio for nonexistent user vs wrong password was `3.746...`, above the strict `< 3` assertion.

Root cause:
- Auth code already uses `dummyVerify` for unknown users with the same Argon2 parameters as real password verification.
- The test compared a single measurement from each path while CI was running containerized backend suites in parallel, so one scheduler/Argon2 outlier could fail the assertion.

Fix:
- Added `tests/backend/helpers/timing.ts` to compare median timings across interleaved samples.
- Updated password and login timing tests to use the helper.
- Login timing samples reset Redis rate-limit state before each measurement so the test measures auth timing, not 429 rate limiting.

Verified:
- `npx vitest run -c vitest.backend.config.ts tests/backend/auth/password.test.ts tests/backend/http/login.test.ts` passed locally with login skipped due local Docker/runtime limits.
- `npm run test:backend`, `npm run build`, `npm run build:backend`, and `npm run lint` passed locally.

## Public DNS

Observed:
- `curl -I --max-time 15 https://teamnova.tw1.su` failed with host resolution error from this environment.

Status:
- Requires external DNS/hosting access outside the local repository.
