FROM node:20-alpine AS base

# Use Alibaba Cloud mirror for faster downloads in China
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install PostgreSQL and utilities in the base image
RUN apk add --no-cache postgresql postgresql-contrib openrc su-exec netcat-openbsd

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set a dummy DATABASE_URL for prisma generate (doesn't need to be valid)
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy?schema=public
ENV DATABASE_URL=${DATABASE_URL}

# Skip database initialization during build
ENV SKIP_DB_INIT=true

# Generate Prisma Client for Alpine Linux
RUN npx prisma generate

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN mkdir -p /var/lib/postgresql/data \
    && chown -R postgres:postgres /var/lib/postgresql/data \
    && chmod 700 /var/lib/postgresql/data

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Don't switch user here - let the entrypoint script handle it
# USER nextjs

EXPOSE 3000

ENV PORT 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]