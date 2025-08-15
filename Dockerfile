# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
# Copy manifests (any that exist)
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Install using whichever lockfile exists; allow pnpm to resolve if lock is stale
# (prevents CI failures from "ERR_PNPM_OUTDATED_LOCKFILE")
RUN set -eux; \
  if [ -f pnpm-lock.yaml ]; then \
    corepack enable && corepack prepare pnpm@10 --activate && pnpm install --no-frozen-lockfile; \
  elif [ -f yarn.lock ]; then \
    corepack enable && corepack prepare yarn@stable --activate && yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

# ---------- build ----------
FROM base AS build
# Bring in installed node_modules and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build (Tailwind/PostCSS must be present as devDeps)
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js 15 binds to HOSTNAME; Render sets PORT
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Minimal runtime files
COPY package.json ./
# Also copy lockfiles so we can prune correctly per package manager
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Built assets and public
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Use the same node_modules we built with, then prune to production
COPY --from=deps /app/node_modules ./node_modules

# Prune devDependencies based on the detected tool
RUN set -eux; \
  if [ -f pnpm-lock.yaml ]; then \
    corepack enable && corepack prepare pnpm@10 --activate && pnpm prune --prod; \
  elif [ -f yarn.lock ]; then \
    corepack enable && corepack prepare yarn@stable --activate && yarn workspaces focus --all --production || true; \
    # fallback if no workspaces:
    yarn install --production --ignore-scripts --prefer-offline || true; \
  else \
    npm prune --omit=dev; \
  fi

EXPOSE 3000
# Start must bind to Render's PORT
CMD ["npm", "start"]
