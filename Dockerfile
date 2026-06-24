# Dockerfile for ForexOS API
FROM node:20-alpine AS base

# Install dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/

# Install dependencies
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeapp

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER nodeapp

EXPOSE 3001

CMD ["node", "dist/index.js"]
