# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app

# Disable telemetry and tell npm to ignore peer-dep conflicts
# (needed because you're on React 19 with some libs that declare React 18 peers)
ENV NEXT_TELEMETRY_DISABLED=1 \
    npm_config_legacy_peer_deps=true

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
# Only npm manifests — do NOT bring pnpm/yarn files into the image
COPY package.json ./
COPY package-lock.json* ./

# Always use npm (never pnpm/yarn)
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

# Safety net: if postcss.config.mjs exists but used CJS, overwrite with valid ESM
# (prevents "module is not defined in ES module scope")
RUN set -eux; \
  if [ -f postcss.config.mjs ]; then \
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

# Minimal files needed to run
COPY package.json ./
COPY package-lock.json* ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=deps  /app/node_modules ./node_modules

# Trim devDependencies for smaller runtime
RUN npm prune --omit=dev || true

EXPOSE 3000
CMD ["npm", "start"]
