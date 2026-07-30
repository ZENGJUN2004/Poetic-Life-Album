FROM node:18 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files and prisma schema first
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure Prisma client is generated with the full source
RUN npx prisma generate

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Enable standalone output for Vercel-style optimized build
ENV NEXT_OUTPUT=standalone

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy the standalone output (Next.js runtime)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy node_modules for runtime (prisma, next-auth, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Copy prisma schema for runtime access
COPY --from=builder /app/prisma ./prisma

# Copy package.json for reference
COPY --from=builder /app/package.json ./

# Ensure upload directory exists
RUN mkdir -p /app/public/uploads

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose the port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Ensure DATABASE_URL is always available in standalone runtime (SQLite at /app/prisma/dev.db)
ENV DATABASE_URL="file:/app/prisma/dev.db"
# NEXTAUTH secret fallback (avoid MissingSecretError when auth still called somewhere)
ENV NEXTAUTH_SECRET="prd-nextauth-secret-fallback-do-not-use-for-real-auth"
# AI fallback defaults
ENV MODEL_PROVIDER=openrouter
ENV VISION_MODEL=openrouter/claude-3-opus
ENV WRITER_MODEL=openrouter/claude-3-opus
ENV PLANNER_MODEL=openrouter/claude-3-sonnet
ENV LOCAL_STORAGE_PATH=/app/public/uploads

# Start the server with auto-migration
CMD ["sh", "-c", "npx prisma db push 2>/dev/null; node server.js"]
