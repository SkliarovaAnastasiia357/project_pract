# syntax=docker/dockerfile:1.7

# Stage 1 — build Vite bundle
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --prefer-offline --no-audit --no-fund
COPY tsconfig.json vite.config.ts* ./
COPY index.html ./
COPY src ./src
# Same-origin: no VITE_API_BASE_URL needed — nginx proxies /api to the api service.
ENV VITE_API_MODE=http
RUN npx tsc --noEmit && npx vite build

# Stage 2 — nginx runtime serving the static bundle + proxying /api
FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
