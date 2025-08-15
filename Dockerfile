# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
# Disable Next telemetry; tell npm to ignore peer-dep conflicts (React 19 vs older libs)
ENV NEXT_TELEMETRY_DISABLED=1 \
    npm_config_legacy_peer_deps=true

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
COPY package.json ./
COPY package-lock.json* ./
# If you truly only use npm, keep it simple:
RUN set -eux; \
  if [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Hot-fix PostCSS config if it's .mjs using CommonJS (prevents "module is not defined in ES module scope")
RUN set -eux; \
  if [ -f postcss.config.mjs ]; then \
    # Overwrite with valid ESM that works for Tailwind v4
    echo 'export default { plugins: { "@tailwindcss/postcss": {} } };' > postcss.config.mjs; \
  fi

RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    npm_config_legacy_peer_deps=true

COPY package.json ./
COPY package-lock.json* ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=deps  /app/node_modules ./node_modules

# Trim dev deps for runtime
RUN npm prune --omit=dev || true

EXPOSE 3000
CMD ["npm", "start"]
