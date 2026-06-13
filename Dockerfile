FROM node:20-alpine AS base

# 1. 의존성 설치 스테이지
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# 2. 빌드 스테이지
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 메모리 부족 방지를 위해 힙 사이즈 확장 및 텔레메트리 비활성화
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# 3. 실행 스테이지
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# standalone 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 마이그레이션 파일 및 스크립트 복사
COPY --from=builder --chown=nextjs:nodejs /app/drizzle-pg ./drizzle-pg
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/migrate.js ./migrate.js

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 마이그레이션 실행 후 서버 시작
CMD ["sh", "-c", "node migrate.js && node server.js"]
