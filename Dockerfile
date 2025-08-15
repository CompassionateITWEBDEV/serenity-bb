# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
# Copy manifests, but don't fail if some are missing
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Install using whichever lockfile exists; fall back to npm install
RUN set -eux; \
  if [ -f pnpm-lock.yaml ]; then \
    corepack enable && corepack prepare pnpm@10 --activate && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then \
    corepack enable && corepack prepare yarn@stable --activate && yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Make sure Tailwind/PostCSS configs are included in context
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy minimal runtime files
COPY package.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=deps  /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
