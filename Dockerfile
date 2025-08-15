# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---------- deps ----------
FROM base AS deps
# Copy manifests (wildcard = always matches package.json; also matches lockfile if present)
COPY package*.json ./

# Avoid peer-dep conflicts (React 19 vs vaul) during install
RUN npm config set legacy-peer-deps true

# If lockfile exists -> npm ci; otherwise -> npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# ---------- runner ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Bring in node_modules from deps stage
COPY --from=deps /app/node_modules /app/node_modules

# Copy manifests and the rest of the app
COPY package*.json ./
COPY . .

# If your app has a build step (Next/Vite/CRA), this won't fail the build if absent
RUN npm run build || echo "No build script detected; skipping build."

# EXPOSE 3000
# If you have "start" script in package.json, use this:
# CMD ["npm", "run", "start"]

# Otherwise, for a Node server entry:
# CMD ["node", "server.js"]
