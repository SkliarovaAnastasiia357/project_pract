# Teamnova MVP Test Plan

Дата: 2026-05-12

## Backend Tests

Commands:
- `npm run test:backend`
- `npm run build:backend`

Coverage targets:
- Auth remains green after new routes.
- `GET/PATCH /api/profile`.
- `POST/DELETE /api/profile/skills`.
- `GET/POST/GET/:id/PUT/:id/DELETE/:id /api/projects`.
- `GET /api/search/projects` and `GET /api/search/users`.
- `POST /api/projects/:id/applications`, `GET /api/applications/incoming`, `PATCH /api/applications/:id`.

Negative cases:
- 401 without token.
- 404 on missing project/application.
- 403 when editing another user's project or application.
- 409 on duplicate pending/decided application.
- Validation errors on required/too-long project/profile fields.

## Frontend Contract Tests

Commands:
- `npm run test:frontend`
- `npm run build`

Coverage targets:
- `mockApi` supports the full MVP cycle across multiple users.
- Route list includes search and requests pages.
- Existing auth/profile/project checklists remain green.
- `httpApi` maps frontend methods to the expected REST endpoints.

## Full Gate

Commands:
- `npm test`
- `npm run build`
- `npm run build:backend`
- `npm run lint`
- `npm run db:generate`

Pass criteria:
- Frontend tests pass.
- Backend tests pass.
- TypeScript build passes.
- Drizzle reports `No schema changes, nothing to migrate`.
- Documentation references the same routes and commands as the code.
- In CI, Docker/testcontainers suites must run instead of being skipped.

## Manual Demo Script

1. Register owner account and create a project with stack `React, TypeScript`.
2. Register participant account, fill bio, add skill `React`.
3. Search projects by `React`, open project card, submit application.
4. Search users by `React`.
5. Log in as owner, open incoming requests, accept or reject the participant request.
