# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
COPY package.json ./
COPY package-lock.json* ./
# ignore pnpm/yarn to keep things simple in CI
RUN set -eux; \
  npm config set legacy-peer-deps true; \
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

COPY package.json ./
COPY package-lock.json* ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=deps  /app/node_modules ./node_modules

RUN npm prune --omit=dev || true

EXPOSE 3000
CMD ["npm", "start"]
