# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps (install WITH devDependencies for build) ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# If you use Tailwind, PostCSS needs the config files present here.
RUN npm run build

# ---------- runtime (prune to production) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Render injects PORT; Next will bind to it. Set HOSTNAME for Next 15+.
ENV HOSTNAME=0.0.0.0

COPY package.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=deps  /app/node_modules ./node_modules
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
