# Multi-stage Dockerfile for Next.js (Node 20 LTS)
# Builds the app and runs it with `next start` on port 3000

# 1) Base image
FROM node:20-bookworm AS base
WORKDIR /app

# 2) Install all dependencies (including dev) for building
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 3) Build the Next.js application
FROM base AS builder
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Optional: build any data/cache your app needs before `next build`
# RUN npm run build-cache
RUN npm run build

# 4) Install only production dependencies for the runtime image
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 5) Runtime image (small, production-only)
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy necessary runtime artifacts only
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY package.json ./

USER nextjs

# Start Next.js server
CMD ["npm", "run", "start"]