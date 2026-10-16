# Multi-stage production Dockerfile for ScrollSense Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files for monorepo workspace resolution
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install all dependencies for compilation
RUN npm ci

# Copy backend source code and tsconfig
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src

# Compile TypeScript to dist/
RUN npm run build --workspace=backend

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container health check
RUN apk add --no-cache curl

# Copy build artifacts and dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --omit=dev --workspace=backend

COPY --from=builder /app/backend/dist ./backend/dist

# Switch to non-root user
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "backend/dist/server.js"]
