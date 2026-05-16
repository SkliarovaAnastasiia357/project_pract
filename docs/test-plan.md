# Teamnova Sprint 5 Test Plan

Дата: 2026-05-16

## Frontend Contract Tests

Commands:
- `npm run test:frontend`
- `npm run build`

Coverage targets:
- `mockApi` supports registration, login, profile, project CRUD, search, applications and session restore.
- `httpApi` maps frontend methods to the expected REST endpoints and refresh flow.
- Route list includes all MVP protected and public routes.
- Home task board reflects Sprint 5 finalization state.
- Existing Sprint 3 and Sprint 4 checklist tests remain green.

Negative cases:
- Invalid auth/profile/project input returns field-level errors.
- Duplicate skills and duplicate applications are rejected.
- Unauthorized token access fails.
- Own project cannot receive an application from its owner.

## Backend Tests

Commands:
- `npm run test:backend`
- `npm run build:backend`

Coverage targets:
- Auth remains green after profile/project/search/application routes.
- Profile and skill routes require auth.
- Project CRUD enforces ownership.
- Search endpoints return projects/users by keyword and skills.
- Application endpoints enforce duplicate and owner permission rules.

Infrastructure note:
- Backend integration suites use testcontainers and require a local Docker/container runtime.
- If Docker is unavailable locally, skipped integration suites must be confirmed by CI before final merge.

## Browser Smoke

Command:
- `VITE_API_MODE=mock npm run dev -- --host 127.0.0.1 --port 5173`

Scenarios:
1. Register owner account and land on `/home`.
2. Reload or open a protected route directly and confirm mock-session restore keeps the user authenticated.
3. Fill profile bio and add a skill.
4. Create a project with stack `React, TypeScript`.
5. Register/login participant, add skill `React`, search project, send application.
6. Login as owner, open incoming requests, accept or reject application.
7. Inspect `/home`, `/profile`, `/projects/new`, `/search`, `/requests` for Sprint 5 copy and obvious layout issues.

## Documentation Checks

Commands:
- `npm run build`
- Manual read-through of `docs/README.md`, `docs/status.md`, `docs/plans.md`, `docs/testing/*.md`.

Pass criteria:
- Commands in documentation match `package.json`.
- Public routes and API routes match the current code.
- Sprint 5 dates and scope are represented consistently.
- Deployment limitations are explicit when external DNS/hosting cannot be verified locally.

## Presentation Checks

Artifact:
- `docs/presentation/teamnova-final-sprint5.pptx`

Pass criteria:
- Deck is editable PowerPoint.
- Slides cover problem, solution, audience, MVP, architecture, demo flow, QA, deployment and final results.
- Facts match README and implemented code.
- Rendered preview pages are legible and do not show layout clipping.

## Full Release Gate

Commands:
- `npm run test:frontend`
- `npm run test:backend`
- `npm run build`
- `npm run build:backend`
- `npm run lint`
- `npm run db:generate`

Pass criteria:
- All runnable local checks pass.
- Any skipped check has a documented infrastructure reason.
- Browser smoke passes.
- Documentation and presentation are updated.
- `git diff` contains only Sprint 5 scope changes.
