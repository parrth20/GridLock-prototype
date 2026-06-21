# ClearLane Bengaluru — production image (Next.js standalone output)
# syntax=docker/dockerfile:1

# ---- base: Node + pnpm ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9
WORKDIR /app

# ---- deps: install from the lockfile ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile the Next.js app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- run: minimal runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Public assets, the original GLB models, and the bundled dataset aggregates.
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
# Standalone server + traced node_modules, then the static chunks.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
