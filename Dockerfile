# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
# Copy manifests
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Force npm (ignore pnpm/yarn) to avoid lockfile/tooling mismatches
RUN set -eux; \
  rm -f pnpm-lock.yaml yarn.lock; \
  if [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Minimal runtime files + built assets
COPY package.json ./
COPY package-lock.json* ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=deps  /app/node_modules ./node_modules

# Prune devDependencies for runtime
RUN if [ -f package-lock.json ]; then npm prune --omit=dev; else npm prune --omit=dev || true; fi

EXPOSE 3000
CMD ["npm", "start"]
