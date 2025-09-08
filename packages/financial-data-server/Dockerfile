# Financial Data MCP Server Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S financial-server -u 1001

WORKDIR /app

# Copy production dependencies and built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create directories for logs and cache
RUN mkdir -p /app/logs /app/cache && \
    chown -R financial-server:nodejs /app

# Switch to non-root user
USER financial-server

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check')" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Metadata
LABEL maintainer="MCP Builder Team"
LABEL description="Financial Data MCP Server with OAuth2 and real-time market data"
LABEL version="1.0.0"

# Start the application
CMD ["node", "dist/index.js"]