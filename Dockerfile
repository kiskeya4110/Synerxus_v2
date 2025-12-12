# =============================================================================
# Synerxus Dockerfile
# Multi-stage build for optimal image size and security
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment for build
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 synerxus

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy only necessary files from builder
COPY --from=builder --chown=synerxus:nodejs /app/dist ./dist
COPY --from=builder --chown=synerxus:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=synerxus:nodejs /app/package.json ./package.json

# Copy migrations for database setup
COPY --from=builder --chown=synerxus:nodejs /app/migrations ./migrations

# Switch to non-root user
USER synerxus

# Expose the application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
