# Commands

## Development

```bash
npm install
VITE_API_MODE=mock npm run dev -- --host 127.0.0.1 --port 5173
npm run dev:backend
```

## Verification

```bash
npm run test:frontend
npm run test:backend
npm test
npm run build
npm run build:backend
npm run lint
npm run db:generate
```

## Local Caveats

- `npm run test:backend` uses Vitest + testcontainers. Without a local Docker/container runtime, integration suites are skipped; CI should confirm them.
- `npm run db:generate` should report `No schema changes, nothing to migrate` unless schema was intentionally changed.

## Deploy

```bash
cp .env.example .env
cd docker
docker compose up -d --build
```

After deploy, verify `/healthz`, `/readyz`, SPA fallback, and the core MVP flow.
