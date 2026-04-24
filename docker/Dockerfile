# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Use npm install instead of ci: lock file was generated with npm 11, image ships npm 10
RUN npm install --no-audit --no-fund --prefer-offline 2>&1 | grep -v "^npm warn EBADENGINE"

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# package.json required: NodeNext tsc uses "type":"module" to determine ESM output
COPY package.json tsconfig.json tsconfig.backend.json ./
COPY src/backend ./src/backend
RUN npx tsc -p tsconfig.backend.json
# Copy migrations alongside compiled JS so runtime migrator resolves them via __dirname
RUN mkdir -p dist/db && cp -R src/backend/db/migrations dist/db/migrations

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/index.js"]
