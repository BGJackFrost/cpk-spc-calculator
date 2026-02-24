# ============================================
# SPC/CPK Calculator - Dockerfile
# ============================================
# Multi-stage build for optimized production image
# ============================================

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S spc -u 1001 -G nodejs

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/client/public ./client/public

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R spc:nodejs /app

# Switch to non-root user
USER spc

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV OFFLINE_MODE=true
ENV AUTH_MODE=local
ENV STORAGE_MODE=local
ENV LLM_MODE=disabled

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/trpc/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
